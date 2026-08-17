const test = require('tap').test;
const fs = require('fs');
const JSZip = require('jszip');
const path = require('path');

const BlockType = require('../../src/extension-support/block-type');
const VirtualMachine = require('../../src');
const makeTestStorage = require('../fixtures/make-test-storage');

test('host extension ID loader registers a declarative extension before project installation', async t => {
    const vm = new VirtualMachine();
    vm.attachStorage(makeTestStorage());
    const extensionManager = vm.extensionManager;
    const calls = [];
    const loader = extensionId => {
        calls.push(extensionId);
        return extensionManager.registerExtensionObject(extensionId, {
            getInfo: () => ({
                id: extensionId,
                name: 'Declarative test extension',
                blocks: [{
                    opcode: 'command',
                    blockType: BlockType.COMMAND,
                    text: 'command'
                }]
            }),
            command: () => {}
        }).then(() => true);
    };

    extensionManager.setExtensionIdLoader(loader);
    const fixturePath = path.resolve(__dirname, '../fixtures/default.sb3');
    const zip = await JSZip.loadAsync(fs.readFileSync(fixturePath));
    const project = JSON.parse(await zip.file('project.json').async('string'));
    project.extensions = ['declarativeTest'];
    project.targets[0].blocks.command = {
        opcode: 'declarativeTest_command',
        next: null,
        parent: null,
        inputs: {},
        fields: {},
        shadow: false,
        topLevel: true,
        x: 0,
        y: 0
    };
    zip.file('project.json', JSON.stringify(project));
    const projectData = await zip.generateAsync({type: 'nodebuffer'});

    await vm.loadProject(projectData);

    t.same(calls, ['declarativeTest']);
    t.equal(extensionManager.isExtensionLoaded('declarativeTest'), true);
    t.equal(vm.runtime.targets[0].blocks.getBlock('command').opcode, 'declarativeTest_command');
    vm.quit();
});

test('extension ID loader validates the host callback', t => {
    const vm = new VirtualMachine();

    t.throws(
        () => vm.extensionManager.setExtensionIdLoader('invalid'),
        TypeError
    );
    t.doesNotThrow(() => vm.extensionManager.setExtensionIdLoader(null));
    vm.quit();
    t.end();
});
