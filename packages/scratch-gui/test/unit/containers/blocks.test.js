import {Blocks} from '../../../src/containers/blocks.jsx';
import {PYTHON_EDITOR_MODE} from '../../../src/reducers/mode';

describe('Blocks container onWorkspaceUpdate', () => {
    let instance;

    beforeEach(() => {
        // Minimal mock instance — just enough for onWorkspaceUpdate to run
        instance = {
            getToolboxXML: jest.fn().mockReturnValue(null),
            onPythonWorkspaceChange: jest.fn(),
            onWorkspaceMetricsChange: jest.fn(),
            toolboxUpdateChangeListener: jest.fn(),
            props: {
                vm: {editingTarget: null},
                workspaceMetrics: {targets: {}},
                updateToolboxState: jest.fn()
            },
            workspace: {
                removeChangeListener: jest.fn(),
                addChangeListener: jest.fn(),
                clearUndo: jest.fn()
            },
            ScratchBlocks: {
                Events: {
                    disable: jest.fn(),
                    enable: jest.fn()
                },
                utils: {
                    xml: {
                        textToDom: jest.fn().mockReturnValue(document.createElement('xml'))
                    }
                },
                clearWorkspaceAndLoadFromXml: jest.fn()
            }
        };
    });

    test('Events.enable() is called after a successful workspace load', () => {
        Blocks.prototype.onWorkspaceUpdate.call(instance, {xml: '<xml/>'});

        expect(instance.ScratchBlocks.Events.disable).toHaveBeenCalled();
        expect(instance.ScratchBlocks.Events.enable).toHaveBeenCalled();
    });

    test('Events.enable() is called even when clearWorkspaceAndLoadFromXml throws', () => {
        instance.ScratchBlocks.clearWorkspaceAndLoadFromXml.mockImplementation(() => {
            throw new Error('workspace load failed');
        });

        Blocks.prototype.onWorkspaceUpdate.call(instance, {xml: '<xml/>'});

        expect(instance.ScratchBlocks.Events.disable).toHaveBeenCalled();
        expect(instance.ScratchBlocks.Events.enable).toHaveBeenCalled();
    });

    test('Events.enable() is called even when textToDom throws', () => {
        instance.ScratchBlocks.utils.xml.textToDom.mockImplementation(() => {
            throw new Error('XML parse failed');
        });

        Blocks.prototype.onWorkspaceUpdate.call(instance, {xml: 'invalid xml'});

        expect(instance.ScratchBlocks.Events.disable).toHaveBeenCalled();
        expect(instance.ScratchBlocks.Events.enable).toHaveBeenCalled();
    });
});

describe('Blocks container ensurePythonExtensions', () => {
    test('does not automatically load the Python native toolbox category', () => {
        const extensionManager = {
            isExtensionLoaded: jest.fn().mockReturnValue(false),
            loadExtensionURL: jest.fn().mockResolvedValue()
        };
        const instance = {
            loadingPythonNativeExtension: false,
            props: {
                editorMode: PYTHON_EDITOR_MODE,
                customExtensionLibraries: [],
                vm: {extensionManager}
            },
            refreshToolboxXML: jest.fn()
        };

        Blocks.prototype.ensurePythonExtensions.call(instance);

        expect(extensionManager.loadExtensionURL.mock.calls.map(([extensionId]) => extensionId)).toEqual([
            'pythonControl',
            'pythonOperators',
            'pythonText',
            'pythonVariables',
            'pythonList',
            'pythonFunction'
        ]);
    });
});
