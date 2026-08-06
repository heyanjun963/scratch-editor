const assert = require('node:assert/strict');
const path = require('path');
const test = require('node:test');

const {
    createGuiServerSpawnConfig,
    createShutdownHandler,
    getGuiServerMode,
    stopChildProcess
} = require('./process-lifecycle');

test('GUI server runs webpack directly so its process can be reclaimed', () => {
    const workspaceRoot = path.resolve(__dirname, '..');
    const config = createGuiServerSpawnConfig(workspaceRoot, 8601, {EXAMPLE: 'value'});

    assert.equal(config.command, process.execPath);
    assert.deepEqual(config.args, [
        path.join(workspaceRoot, 'node_modules', 'webpack', 'bin', 'webpack.js'),
        'serve'
    ]);
    assert.equal(config.options.cwd, path.join(workspaceRoot, 'packages', 'scratch-gui'));
    assert.equal(config.options.env.PORT, '8601');
    assert.equal(config.options.env.EXAMPLE, 'value');
});

test('unknown occupied ports are rejected instead of silently reused', () => {
    assert.equal(getGuiServerMode(true, true), 'external');
    assert.equal(getGuiServerMode(false, true), 'occupied');
    assert.equal(getGuiServerMode(false, false), 'start');
});

test('stopChildProcess terminates only a running managed child', () => {
    const runningChild = {
        exitCode: null,
        killed: false,
        signalCode: null,
        kill: () => {
            runningChild.killed = true;
            return true;
        }
    };

    assert.equal(stopChildProcess(runningChild), true);
    assert.equal(stopChildProcess(runningChild), false);
    assert.equal(stopChildProcess(null), false);
});

test('shutdown terminates every managed child and exits only once', () => {
    const killed = [];
    const children = ['electron', 'gui'].map(name => ({
        exitCode: null,
        killed: false,
        signalCode: null,
        kill: () => {
            killed.push(name);
            return true;
        }
    }));
    const exitCodes = [];
    const shutdown = createShutdownHandler(() => children, code => exitCodes.push(code));

    shutdown(130);
    shutdown(1);

    assert.deepEqual(killed, ['electron', 'gui']);
    assert.deepEqual(exitCodes, [130]);
});
