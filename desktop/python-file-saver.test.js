const assert = require('node:assert/strict');
const test = require('node:test');

const {savePythonFile, sanitizePythonFilename} = require('./python-file-saver');

test('sanitizes the suggested Python filename', () => {
    assert.equal(sanitizePythonFilename('demo:project.sb3'), 'demo_project.py');
    assert.equal(sanitizePythonFilename(''), 'project.py');
});

test('does not write a file when the save dialog is cancelled', async () => {
    let writeCalled = false;
    const result = await savePythonFile({
        browserWindow: {},
        code: 'print("cancelled")',
        dialog: {
            showSaveDialog: async () => ({canceled: true})
        },
        suggestedName: 'cancelled',
        writeFile: async () => {
            writeCalled = true;
        }
    });

    assert.deepEqual(result, {canceled: true});
    assert.equal(writeCalled, false);
});

test('writes UTF-8 Python code to the selected path', async () => {
    const writes = [];
    const result = await savePythonFile({
        browserWindow: {},
        code: 'print("saved")',
        dialog: {
            showSaveDialog: async (_window, options) => {
                assert.equal(options.defaultPath, 'demo.py');
                return {canceled: false, filePath: 'C:\\output\\demo.py'};
            }
        },
        suggestedName: 'demo.sb3',
        writeFile: async (...args) => writes.push(args)
    });

    assert.deepEqual(writes, [['C:\\output\\demo.py', 'print("saved")', 'utf8']]);
    assert.deepEqual(result, {canceled: false, filePath: 'C:\\output\\demo.py'});
});

test('rejects invalid or oversized Python code before opening a dialog', async () => {
    const dialog = {
        showSaveDialog: async () => {
            throw new Error('dialog should not open');
        }
    };

    await assert.rejects(() => savePythonFile({code: null, dialog}), /must be a string/);
    await assert.rejects(() => savePythonFile({code: 'x'.repeat(5 * 1024 * 1024 + 1), dialog}), /too large/);
});
