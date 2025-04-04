import { Option } from 'commander';

import { describeConnectionProfile } from '../../ops/ConnectionProfileOps';
import { FrodoCommand } from '../FrodoCommand';

export default function setup() {
  const program = new FrodoCommand('frodo conn describe', [
    'realm',
    'username',
    'password',
    'type',
    'insecure',
    'curlirize',
  ]);

  program
    .description('Describe connection profile.')
    .addOption(new Option('--show-secrets', 'Show passwords and secrets.'))
    .action(
      // implement command logic inside action handler
      async (host, options, command) => {
        command.handleDefaultArgsAndOpts(host, options, command);
        describeConnectionProfile(host, options.showSecrets);
      }
      // end command logic inside action handler
    );

  return program;
}
