import {
    loadInstalledCustomExtensionLibraries,
    saveInstalledCustomExtensionLibraries
} from '../../../../src/lib/custom-extension/persistence';

const manifest = {
    formatVersion: 1,
    id: 'mydevice',
    name: 'My Device',
    version: '1.0.0',
    blocks: [{
        opcode: 'run',
        blockType: 'command',
        text: 'run',
        arguments: {},
        codegen: {python: {template: 'run()'}}
    }]
};

describe('custom extension persistence', () => {
    beforeEach(() => window.localStorage.clear());

    test('persists an installed but unloaded user package', () => {
        saveInstalledCustomExtensionLibraries([{
            enabled: false,
            manifest
        }]);

        expect(loadInstalledCustomExtensionLibraries()).toEqual([
            expect.objectContaining({
                enabled: false,
                manifest: expect.objectContaining({id: 'mydevice'})
            })
        ]);
    });

    test('loads legacy manifest-only records as enabled', () => {
        window.localStorage.setItem('scratchGui.customExtensionLibraries.v1', JSON.stringify([manifest]));

        expect(loadInstalledCustomExtensionLibraries()[0]).toEqual(expect.objectContaining({
            enabled: true
        }));
    });
});
