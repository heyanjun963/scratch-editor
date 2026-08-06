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

describe('Blocks container category selection', () => {
    test('defers a remote extension category until the toolbox contains it', () => {
        let categoryItem = null;
        const toolbox = {
            getToolboxItemById: jest.fn(() => categoryItem),
            setSelectedItem: jest.fn()
        };
        const instance = {
            pendingCategoryId: null,
            withToolboxUpdates: callback => callback(),
            workspace: {getToolbox: () => toolbox}
        };
        instance.selectPendingCategory = Blocks.prototype.selectPendingCategory.bind(instance);

        Blocks.prototype.handleCategorySelected.call(instance, 'aimech');

        expect(toolbox.setSelectedItem).not.toHaveBeenCalled();
        expect(instance.pendingCategoryId).toBe('aimech');

        categoryItem = {id: 'aimech'};
        Blocks.prototype.selectPendingCategory.call(instance);

        expect(toolbox.setSelectedItem).toHaveBeenCalledWith(categoryItem);
        expect(instance.pendingCategoryId).toBeNull();
    });
});

describe('Blocks container modal layout', () => {
    test('recalculates Blockly layout after the extension library closes', () => {
        const resizeListener = jest.fn();
        const props = {
            anyModalVisible: false,
            customExtensionIds: '',
            editorMode: PYTHON_EDITOR_MODE,
            isVisible: true,
            locale: 'zh-cn',
            stageSize: 'large',
            toolboxXML: '<xml/>'
        };
        const instance = {
            _renderedToolboxXML: props.toolboxXML,
            props,
            ScratchBlocks: {hideChaff: jest.fn()},
            ensurePythonExtensions: jest.fn(),
            onPythonWorkspaceChange: jest.fn(),
            requestToolboxUpdate: jest.fn()
        };

        window.addEventListener('resize', resizeListener);
        Blocks.prototype.componentDidUpdate.call(instance, {
            ...props,
            anyModalVisible: true
        });
        window.removeEventListener('resize', resizeListener);

        expect(resizeListener).toHaveBeenCalledTimes(1);
    });
});

describe('Blocks container Python toolbox', () => {
    test('keeps a loaded remote-only product category', () => {
        const target = {
            id: 'stage',
            isStage: true,
            getCostumes: () => [{name: 'Backdrop1'}],
            getSounds: () => []
        };
        const instance = {
            props: {
                colorMode: 'default',
                customExtensionIds: '',
                editorMode: PYTHON_EDITOR_MODE,
                vm: {
                    editingTarget: target,
                    runtime: {
                        getBlocksXML: () => [{
                            id: 'aimech',
                            xml: '<category toolboxitemid="aimech"><block type="aimech_start_thread"></block></category>'
                        }],
                        getTargetForStage: () => target
                    }
                }
            }
        };

        const toolboxXML = Blocks.prototype.getToolboxXML.call(instance);

        expect(toolboxXML).toContain('toolboxitemid="aimech"');
        expect(toolboxXML).toContain('aimech_start_thread');
    });
});
