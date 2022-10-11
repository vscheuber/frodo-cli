import { Command } from 'commander';
import { Authenticate, Journey, state } from '@rockcarver/frodo-lib';
import yesno from 'yesno';
import * as common from '../cmd_common.js';

const { getTokens } = Authenticate;
const { findOrphanedNodes, removeOrphanedNodes } = Journey;

const program = new Command('frodo journey prune');

program
  .description(
    'Prune orphaned configuration artifacts left behind after deleting authentication trees. You will be prompted before any destructive operations are performed.'
  )
  .helpOption('-h, --help', 'Help')
  .showHelpAfterError()
  .addArgument(common.hostArgumentM)
  .addArgument(common.realmArgument)
  .addArgument(common.userArgument)
  .addArgument(common.passwordArgument)
  .addOption(common.deploymentOption)
  .addOption(common.insecureOption)
  .action(
    // implement command logic inside action handler
    async (host, realm, user, password, options) => {
      state.default.session.setTenant(host);
      state.default.session.setRealm(realm);
      state.default.session.setUsername(user);
      state.default.session.setPassword(password);
      state.default.session.setDeploymentType(options.type);
      state.default.session.setAllowInsecureConnection(options.insecure);
      if (await getTokens()) {
        console.log(
          `Pruning orphaned configuration artifacts in realm "${state.default.session.getRealm()}"...`
        );
        const orphanedNodes = await findOrphanedNodes();
        if (orphanedNodes.length > 0) {
          const ok = await yesno({
            question: 'Prune (permanently delete) orphaned nodes? (y|n):',
          });
          if (ok) {
            await removeOrphanedNodes(orphanedNodes);
          }
        } else {
          console.log('No orphaned nodes found.');
        }
      }
    }
    // end command logic inside action handler
  );

program.parse();