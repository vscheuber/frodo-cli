import cp from 'child_process';
import { promisify } from 'util';

const exec = promisify(cp.exec);
const CMD = 'frodo authn describe --help';
const { stdout } = await exec(CMD);

test("CLI help interface for 'authn describe' should be expected english", async () => {
    expect(stdout).toMatchSnapshot();
});
