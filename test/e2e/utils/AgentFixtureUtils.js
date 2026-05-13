import { stageFixture, clearFixture } from './TestUtils.js';

/**
 * @deprecated Use stageFixture from TestUtils instead.
 * Stage recording data for replay mode.
 */
export async function stageRecordingData(command, env) {
    return stageFixture(command, env);
}

/**
 * @deprecated Use clearFixture from TestUtils instead.
 * Clear recording data after test execution.
 */
export async function clearRecordingData(command, env) {
    return clearFixture(command, env);
}