/**
 * Follow this process to write e2e tests for the CLI project:
 *
 * 1. Test if all the necessary mocks for your tests already exist.
 *    In mock mode, run the command you want to test with the same arguments
 *    and parameters exactly as you want to test it, for example:
 *
 *    $ FRODO_MOCK=1 frodo conn save https://openam-frodo-dev.forgeblocks.com/am volker.scheuber@forgerock.com Sup3rS3cr3t!
 *
 *    If your command completes without errors and with the expected results,
 *    all the required mocks already exist and you are good to write your
 *    test and skip to step #4.
 *
 *    If, however, your command fails and you see errors like the one below,
 *    you know you need to record the mock responses first:
 *
 *    [Polly] [adapter:node-http] Recording for the following request is not found and `recordIfMissing` is `false`.
 *
 * 2. Record mock responses for your exact command.
 *    In mock record mode, run the command you want to test with the same arguments
 *    and parameters exactly as you want to test it, for example:
 *
 *    $ FRODO_MOCK=record frodo conn save https://openam-frodo-dev.forgeblocks.com/am volker.scheuber@forgerock.com Sup3rS3cr3t!
 *
 *    Wait until you see all the Polly instances (mock recording adapters) have
 *    shutdown before you try to run step #1 again.
 *    Messages like these indicate mock recording adapters shutting down:
 *
 *    Polly instance 'conn/4' stopping in 3s...
 *    Polly instance 'conn/4' stopping in 2s...
 *    Polly instance 'conn/save/3' stopping in 3s...
 *    Polly instance 'conn/4' stopping in 1s...
 *    Polly instance 'conn/save/3' stopping in 2s...
 *    Polly instance 'conn/4' stopped.
 *    Polly instance 'conn/save/3' stopping in 1s...
 *    Polly instance 'conn/save/3' stopped.
 *
 * 3. Validate your freshly recorded mock responses are complete and working.
 *    Re-run the exact command you want to test in mock mode (see step #1).
 *
 * 4. Write your test.
 *    Make sure to use the exact command including number of arguments and params.
 *
 * 5. Commit both your test and your new recordings to the repository.
 *    Your tests are likely going to reside outside the frodo-lib project but
 *    the recordings must be committed to the frodo-lib project.
 */

/*
FRODO_MOCK=record FRODO_HOST=https://openam-frodo-dev.forgeblocks.com/am frodo email template import --raw -i activation -f test/e2e/exports/all-separate/email/template/raw/emailTemplate-activation.test.json
FRODO_MOCK=record FRODO_HOST=https://openam-frodo-dev.forgeblocks.com/am frodo email template import --template-id activation --file test/e2e/exports/all/allEmailTemplates.template.email.json
FRODO_MOCK=record FRODO_HOST=https://openam-frodo-dev.forgeblocks.com/am frodo email template import --raw -f test/e2e/exports/all/allEmailTemplates.template.email.json
FRODO_MOCK=record FRODO_HOST=https://openam-frodo-dev.forgeblocks.com/am frodo email template import --file test/e2e/exports/all/allEmailTemplates.template.email.json
FRODO_MOCK=record FRODO_HOST=https://openam-frodo-dev.forgeblocks.com/am frodo email template import -af test/e2e/exports/all/allEmailTemplates.template.email.json
FRODO_MOCK=record FRODO_HOST=https://openam-frodo-dev.forgeblocks.com/am frodo email template import --all --file test/e2e/exports/all/allEmailTemplates.template.email.json
FRODO_MOCK=record FRODO_HOST=https://openam-frodo-dev.forgeblocks.com/am frodo email template import --raw -A
FRODO_MOCK=record FRODO_HOST=https://openam-frodo-dev.forgeblocks.com/am frodo email template import --all-separate
*/
import cp from 'child_process';
import { promisify } from 'util';
import { removeAnsiEscapeCodes, testImportAllSeparate } from './utils/TestUtils';
import { connection as c } from './utils/TestConfig';

const exec = promisify(cp.exec);

process.env['FRODO_MOCK'] = '1';
const env = {
    env: process.env,
};
env.env.FRODO_HOST = c.host;
env.env.FRODO_SA_ID = c.saId;
env.env.FRODO_SA_JWK = c.saJwk;

const allAlphaEmailTemplatesExport = "test/e2e/exports/all/allEmailTemplates.template.email.json";
const emailTemplateActivationRawExport = "test/e2e/exports/all-separate/email/template/raw/emailTemplate-activation.test.json";

describe('frodo email template import', () => {
    test(`"frodo email template import --raw -i activation -f ${emailTemplateActivationRawExport}": should import the email template with the id "activation" from the file "${emailTemplateActivationRawExport}"`, async () => {
        const CMD = `frodo email template import --raw -i activation -f ${emailTemplateActivationRawExport}`;
        const { stdout } = await exec(CMD, env);
        expect(removeAnsiEscapeCodes(stdout)).toMatchSnapshot();
    });

    test(`"frodo email template import --template-id activation --file ${allAlphaEmailTemplatesExport}": should import the email template with the id "activation" from the file "${allAlphaEmailTemplatesExport}"`, async () => {
        const CMD = `frodo email template import --template-id activation --file ${allAlphaEmailTemplatesExport}`;
        const { stdout } = await exec(CMD, env);
        expect(removeAnsiEscapeCodes(stdout)).toMatchSnapshot();
    });

    test(`"frodo email template import --raw -f ${emailTemplateActivationRawExport}": should import the first email template from the file "${emailTemplateActivationRawExport}"`, async () => {
        const CMD = `frodo email template import --raw -f ${emailTemplateActivationRawExport}`;
        const { stdout } = await exec(CMD, env);
        expect(removeAnsiEscapeCodes(stdout)).toMatchSnapshot();
    });

    test(`"frodo email template import --file ${allAlphaEmailTemplatesExport}": should import the first email template from the file "${allAlphaEmailTemplatesExport}"`, async () => {
        const CMD = `frodo email template import --file ${allAlphaEmailTemplatesExport}`;
        const { stdout } = await exec(CMD, env);
        expect(removeAnsiEscapeCodes(stdout)).toMatchSnapshot();
    });

    test(`"frodo email template import -af ${allAlphaEmailTemplatesExport}": should import all email templates from the file "${allAlphaEmailTemplatesExport}"`, async () => {
        const CMD = `frodo email template import -af ${allAlphaEmailTemplatesExport}`;
        const { stdout } = await exec(CMD, env);
        expect(removeAnsiEscapeCodes(stdout)).toMatchSnapshot();
    });

    test(`"frodo email template import --all --file ${allAlphaEmailTemplatesExport}": should import all email templates from the file "${allAlphaEmailTemplatesExport}"`, async () => {
        const CMD = `frodo email template import --all --file ${allAlphaEmailTemplatesExport}`;
        const { stdout } = await exec(CMD, env);
        expect(removeAnsiEscapeCodes(stdout)).toMatchSnapshot();
    });

    test(`"frodo email template import --raw -A": should import all email templates from the current directory"`, async () => {
        const CMD = `frodo email template import --raw -A`;
        await testImportAllSeparate(CMD, env, 'email/template/raw');
    });

    test(`"frodo email template import --all-separate": should import all email templates from the current directory"`, async () => {
        const CMD = `frodo email template import --all-separate`;
        await testImportAllSeparate(CMD, env, 'email/template');
    });

});