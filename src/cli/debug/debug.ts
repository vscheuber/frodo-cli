import { frodo } from '@rockcarver/frodo-lib';
import { Option } from 'commander';

import { debugTail, type DebugTopic } from '../../ops/DebugLogOps';
import { ensureLogApiCredentials } from '../../ops/LogOps';
import { printMessage } from '../../utils/Console';
import { runJourneyDebugPrompt } from '../../utils/interactive/JourneyDebugPrompt';
import { FrodoCommand } from '../FrodoCommand';

const { CLOUD_DEPLOYMENT_TYPE_KEY } = frodo.utils.constants;
const deploymentTypes = [CLOUD_DEPLOYMENT_TYPE_KEY];

export default function setup() {
  const program = new FrodoCommand(
    'debug',
    ['realm'],
    deploymentTypes
  ).withStability('experimental');

  program
    .description(
      'Interactively debug Identity Cloud activity for one functional area — for journeys, this launches a live, self-updating list of in-flight/recent journey executions (detected from the log stream) to drill into; other topics print a smart-filtered log tail instead.'
    )
    .addOption(
      new Option('--topic <topic>', 'Functional area to debug.')
        .choices(['journey', 'oauth', 'saml', 'sync', 'all'])
        .default('all')
    )
    .addHelpText(
      'after',
      `Notes:\n` +
        `  'journey' is interactive: a live, color-coded list of journey executions (running/finished/failed/abandoned), built from the log stream and each tree's own definition. Select one to drill into its node-by-node history. Press 'p' to pin a session so it's never auto-evicted (e.g. a long-running IDV or magic-link flow); Esc backs out one level, then exits.\n` +
        `  'oauth' is a smart-filtered passive log tail, verified against real log traffic on a live tenant.\n` +
        `  'saml' and 'sync' are best-effort passive tails: recognized by naming convention only, not yet verified against a real SAML SSO flow or IDM reconciliation run. Unrecognized events still print a short generic summary — never silently dropped, never raw JSON.\n`
    )
    .action(async (host, user, password, options, command) => {
      command.handleDefaultArgsAndOpts(host, user, password, options, command);

      const foundCredentials = await ensureLogApiCredentials(deploymentTypes);
      if (!foundCredentials) {
        printMessage('No log api credentials found!', 'error');
        process.exitCode = 1;
        program.help();
        return;
      }

      const topic = options.topic as DebugTopic;
      if (topic === 'journey') {
        await runJourneyDebugPrompt();
        return;
      }
      printMessage(`Debugging topic '${topic}'...`, 'info');
      await debugTail(topic);
    });

  return program;
}
