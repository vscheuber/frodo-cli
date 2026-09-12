/**
 * The interactive list/drill-down view behind `frodo debug --topic journey`.
 *
 * @remarks
 * Built the same way `escapableSelect` (`EscapableSelectPrompt.ts`) is: a
 * small `@inquirer/core` `createPrompt` component, redrawn in place rather
 * than using an alternate-screen full-TUI approach. The one addition this
 * prompt needs beyond that pattern is `useEffect`-driven polling -- it owns
 * a `JourneyDebugAggregator` for its whole lifetime and refreshes it on a
 * 5-second interval (matching `frodo log tail`'s existing poll cadence),
 * re-rendering the list live as journeys start, progress, and finish.
 *
 * List and drill-down are two render modes of the *same* running prompt,
 * not two separate prompts -- `Enter` switches `viewMode` to `'detail'`,
 * `Escape` switches it back to `'list'` (never resolving the prompt), so
 * polling keeps running underneath a drill-down view exactly as it does
 * behind the list. The prompt only actually resolves (exits `frodo debug`)
 * on `Escape` from the top-level list.
 *
 * An empty session list is a normal, expected state -- it can take seconds
 * or minutes for a real journey to start -- and is rendered as a plain
 * waiting message, never as an error or a blank screen.
 */
import {
  createPrompt,
  isDownKey,
  isEnterKey,
  isUpKey,
  useEffect,
  useKeypress,
  usePagination,
  usePrefix,
  useState,
} from '@inquirer/core';

import { JourneyDebugAggregator, type JourneySession } from '../../ops/JourneyDebugAggregator';
import c from '../ColorTheme';

const POLL_INTERVAL_MS = 5000;
const MAX_DETAIL_EVENTS = 20;

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h${minutes % 60}m`;
}

function statusLabel(session: JourneySession): string {
  switch (session.status) {
    case 'finished':
      return c.positive('finished');
    case 'failed':
      return c.negative('failed');
    case 'abandoned':
      return c.warning('abandoned');
    case 'suspended':
      // No live signal reliably distinguishes "genuinely suspended" from
      // "just running long" yet (see JourneyDebugAggregator's own remarks)
      // -- this branch is kept for forward-compatibility but nothing sets
      // it today.
      return c.warning('suspended');
    case 'running':
    default:
      return 'running';
  }
}

function renderListRow(session: JourneySession, isActive: boolean): string {
  const now = Date.now();
  const pin = session.pinned ? '\u{1F4CC} ' : '  ';
  const tree = session.treeName ?? c.muted('(unknown tree)');
  const who = session.user ? ` ${c.muted(`as ${session.user}`)}` : '';
  const age = c.muted(`${formatElapsed(now - session.startedAt)} ago`);
  const extra =
    session.status === 'failed' && session.failureReason
      ? ` ${c.muted(`- ${session.failureReason}`)}`
      : session.lastNode
        ? ` ${c.muted(`@ ${session.lastNode}`)}`
        : '';
  const line = `${pin}[${statusLabel(session)}] ${tree}${who} ${age}${extra}`;
  const cursor = isActive ? '› ' : '  ';
  return isActive ? c.command(`${cursor}${line}`) : `${cursor}${line}`;
}

function renderDetail(session: JourneySession): string {
  const now = Date.now();
  const lines = [
    `${c.emphasis('Transaction:')} ${session.transactionId}`,
    `${c.emphasis('Journey:')} ${session.treeName ?? c.muted('(unknown)')}`,
    `${c.emphasis('Status:')} ${statusLabel(session)}${session.pinned ? c.muted(' (pinned)') : ''}`,
  ];
  if (session.user) lines.push(`${c.emphasis('User:')} ${session.user}`);
  lines.push(
    `${c.emphasis('Started:')} ${formatElapsed(now - session.startedAt)} ago`,
    `${c.emphasis('Last activity:')} ${formatElapsed(now - session.lastEventAt)} ago`,
    `${c.emphasis('Nodes visited:')} ${session.nodeCount}`
  );
  if (session.failureReason) {
    lines.push(`${c.negative('Failure:')} ${session.failureReason}`);
  }
  lines.push('', c.emphasis('Recent events:'));
  const shown = session.events.slice(-MAX_DETAIL_EVENTS);
  const omitted = session.events.length - shown.length;
  if (omitted > 0) lines.push(c.muted(`  (${omitted} earlier events omitted)`));
  if (shown.length === 0) {
    lines.push(c.muted('  (none yet)'));
  } else {
    for (const event of shown) lines.push(`  ${event}`);
  }
  return lines.join('\n');
}

type ViewMode = 'list' | 'detail';

const journeyDebugPromptImpl = createPrompt<void, Record<string, never>>(
  (_config, done) => {
    const aggregator = useState(() => new JourneyDebugAggregator())[0];
    const [sessions, setSessions] = useState<JourneySession[]>([]);
    const [warning, setWarning] = useState<string | undefined>(undefined);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [active, setActive] = useState(0);
    const [detailId, setDetailId] = useState<string | undefined>(undefined);
    const [done_, setDone] = useState(false);
    const prefix = usePrefix({ status: done_ ? 'done' : 'idle' });

    useEffect(() => {
      let cancelled = false;
      let inFlight = false;
      const runPoll = async () => {
        if (inFlight || cancelled) return;
        inFlight = true;
        // Reset to this cycle's outcome only -- a warning is a transient
        // "something went wrong just now" signal, not a permanent banner.
        // Without this, a single early hiccup (e.g. one export failure)
        // would stay pinned on screen forever even once later polls
        // succeed cleanly.
        let latestWarning: string | undefined;
        await aggregator.poll((message) => {
          latestWarning = message;
        });
        if (!cancelled) {
          setWarning(latestWarning);
          setSessions(aggregator.getSessions());
        }
        inFlight = false;
      };
      void runPoll();
      const interval = setInterval(() => void runPoll(), POLL_INTERVAL_MS);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }, [aggregator]);

    const clampedActive = sessions.length
      ? Math.min(active, sessions.length - 1)
      : 0;
    const detailSession = detailId
      ? sessions.find((s) => s.transactionId === detailId)
      : undefined;

    useKeypress((key) => {
      if (done_) return;
      if (viewMode === 'detail') {
        if (key.name === 'escape') {
          setViewMode('list');
        } else if (key.name === 'p' && detailSession) {
          aggregator.togglePin(detailSession.transactionId);
          setSessions(aggregator.getSessions());
        }
        return;
      }
      // list mode
      if (key.name === 'escape') {
        setDone(true);
        done();
      } else if (isEnterKey(key) && sessions.length) {
        setDetailId(sessions[clampedActive].transactionId);
        setViewMode('detail');
      } else if (key.name === 'p' && sessions.length) {
        aggregator.togglePin(sessions[clampedActive].transactionId);
        setSessions(aggregator.getSessions());
      } else if ((isUpKey(key) || isDownKey(key)) && sessions.length) {
        const offset = isUpKey(key) ? -1 : 1;
        setActive(
          (clampedActive + offset + sessions.length) % sessions.length
        );
      }
    });

    if (done_) {
      return `${prefix} Journey debugging ended.`;
    }

    const warningLine = warning ? c.warning(warning) : '';

    if (viewMode === 'detail' && detailSession) {
      return [
        `${prefix} ${c.heading('Journey detail')}`,
        renderDetail(detailSession),
        '',
        c.muted('(p pin/unpin · esc back to list)'),
        warningLine,
      ]
        .filter(Boolean)
        .join('\n');
    }

    if (sessions.length === 0) {
      return [
        `${prefix} ${c.heading('Debugging journeys')}`,
        c.muted(
          'No journey activity detected yet -- waiting for a journey to start (this can take a few minutes)...'
        ),
        c.muted('(esc exit)'),
        warningLine,
      ]
        .filter(Boolean)
        .join('\n');
    }

    const page = usePagination({
      items: sessions,
      active: clampedActive,
      renderItem: ({ item, isActive }) => renderListRow(item, isActive),
      pageSize: 15,
      loop: true,
    });

    return [
      `${prefix} ${c.heading('Debugging journeys')} ${c.muted(`(${sessions.length} tracked)`)}`,
      page,
      c.muted('(↑↓ navigate · enter drill-down · p pin/unpin · esc exit)'),
      warningLine,
    ]
      .filter(Boolean)
      .join('\n');
  }
);

/**
 * Runs the interactive journey-debugging session until the user presses
 * Escape from the top-level list. Assumes `state`/credentials are already
 * set up by the caller (same convention as `frodo debug`'s other topics).
 */
export async function runJourneyDebugPrompt(): Promise<void> {
  await journeyDebugPromptImpl({});
}
