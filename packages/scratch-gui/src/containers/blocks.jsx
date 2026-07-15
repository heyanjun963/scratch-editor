import bindAll from 'lodash.bindall';
import debounce from 'lodash.debounce';
import defaultsDeep from 'lodash.defaultsdeep';
import makeToolboxXML from '../lib/make-toolbox-xml';
import PropTypes from 'prop-types';
import React from 'react';
import VMScratchBlocks from '../lib/blocks';
import VM from '@scratch/scratch-vm';

import analytics from '../lib/analytics';
import log from '../lib/log.js';
import Prompt from './prompt.jsx';
import BlocksComponent from '../components/blocks/blocks.jsx';
import ExtensionLibrary from './extension-library.jsx';
import extensionData from '../lib/libraries/extensions/index.jsx';
import CustomProcedures from './custom-procedures.jsx';
import errorBoundaryHOC from '../lib/error-boundary-hoc.jsx';
import {BLOCKS_DEFAULT_SCALE, STAGE_DISPLAY_SIZES} from '../lib/layout-constants';
import DropAreaHOC from '../lib/drop-area-hoc.jsx';
import DragConstants from '../lib/drag-constants';
import defineDynamicBlock from '../lib/define-dynamic-block';
import {DEFAULT_MODE, getColorsForMode, colorModeMap} from '../lib/settings/color-mode';
import {CAT_BLOCKS_THEME} from '../lib/settings/theme';
import generatePythonCode from '../lib/python-codegen';
import {manifestToExtensionObject} from '../lib/custom-extension/manifest-to-extension';
import {registerPythonCodegenManifest} from '../lib/custom-extension/codegen-registry';
import {builtinProductManifests} from '../lib/custom-extension/builtin-product-manifests';
import {
    injectExtensionBlockIcons,
    injectExtensionCategoryMode,
    getExtensionColors
} from '../lib/settings/color-mode/blockHelpers';

import {connect} from 'react-redux';
import {updateToolbox} from '../reducers/toolbox';
import {activateColorPicker} from '../reducers/color-picker';
import {closeExtensionLibrary, openSoundRecorder, openConnectionModal} from '../reducers/modals';
import {activateCustomProcedures, deactivateCustomProcedures} from '../reducers/custom-procedures';
import {setConnectionModalExtensionId} from '../reducers/connection-modal';
import {PYTHON_EDITOR_MODE} from '../reducers/mode';
import {appendPythonConsole, updatePythonCode} from '../reducers/python-coding';
import {updateMetrics} from '../reducers/workspace-metrics';
import {isTimeTravel2020} from '../reducers/time-travel';

import {
    activateTab,
    SOUNDS_TAB_INDEX
} from '../reducers/editor-tab';

const addFunctionListener = (object, property, callback) => {
    const oldFn = object[property];
    object[property] = function (...args) {
        const result = oldFn.apply(this, args);
        callback.apply(this, result);
        return result;
    };
};

const DroppableBlocks = DropAreaHOC([
    DragConstants.BACKPACK_CODE
])(BlocksComponent);

const pythonExtensionIds = [
    'pythonControl',
    'pythonOperators',
    'pythonText',
    'pythonVariables',
    'pythonList',
    'pythonFunction',
    'pythonNative'
];

const builtinProductExtensionIds = Object.keys(builtinProductManifests);

const disabledFlyoutBlocks = {
    pythonNative_currentTime: '当前时间积木暂未开放'
};

const disabledFlyoutBlockClass = 'company-disabled-flyout-block';
const disabledFlyoutBlockListenerKey = '__companyDisabledFlyoutListener';

// Python 模式只展示 Python 基础分类、内置产品库和用户已导入的自定义拓展分类。
const makePythonToolboxXML = (categoriesXML, customExtensionIds) => {
    const allowedExtensionIds = pythonExtensionIds.concat(
        builtinProductExtensionIds,
        String(customExtensionIds || '').split(',').filter(Boolean)
    );
    return [
        '<xml style="display: none">',
        ...categoriesXML
            .filter(categoryInfo => allowedExtensionIds.includes(categoryInfo.id))
            .map(categoryInfo => categoryInfo.xml),
        '</xml>'
    ].join('\n');
};

class Blocks extends React.Component {
    constructor (props) {
        super(props);
        this.ScratchBlocks = VMScratchBlocks(props.vm);
        bindAll(this, [
            'attachVM',
            'detachVM',
            'getToolboxXML',
            'handleCategorySelected',
            'handleConnectionModalStart',
            'handleDrop',
            'handleStatusButtonUpdate',
            'handleOpenSoundRecorder',
            'handlePromptStart',
            'handlePromptCallback',
            'handlePromptClose',
            'handleCustomProceduresClose',
            'onScriptGlowOn',
            'onScriptGlowOff',
            'onBlockGlowOn',
            'onBlockGlowOff',
            'handleMonitorsUpdate',
            'handleExtensionAdded',
            'handleBlocksInfoUpdate',
            'ensurePythonExtensions',
            'refreshToolboxXML',
            'onTargetsUpdate',
            'onPythonConsole',
            'onVisualReport',
            'onWorkspaceUpdate',
            'onPythonWorkspaceChange',
            'onWorkspaceMetricsChange',
            'setBlocks',
            'setLocale'
        ]);
        this.ScratchBlocks.dialog.setPrompt(this.handlePromptStart);
        this.ScratchBlocks.ScratchVariables.setPromptHandler(
            this.handlePromptStart
        );
        this.ScratchBlocks.StatusIndicatorLabel.statusButtonCallback = this.handleConnectionModalStart;
        this.ScratchBlocks.recordSoundCallback = this.handleOpenSoundRecorder;

        this.state = {
            prompt: null
        };
        this.onTargetsUpdate = debounce(this.onTargetsUpdate, 100);
        this.onPythonWorkspaceChange = debounce(this.onPythonWorkspaceChange, 100);
        this.toolboxUpdateQueue = [];
        this.loadingPythonNativeExtension = false;
    }
    componentDidMount () {
        this.ScratchBlocks = VMScratchBlocks(this.props.vm, this.props.useCatBlocks);
        this.ScratchBlocks.dialog.setPrompt(this.handlePromptStart);
        this.ScratchBlocks.StatusIndicatorLabel.statusButtonCallback = this.handleConnectionModalStart;
        this.ScratchBlocks.recordSoundCallback = this.handleOpenSoundRecorder;

        this.ScratchBlocks.FieldColourSlider.activateEyedropper_ = this.props.onActivateColorPicker;
        this.ScratchBlocks.ScratchProcedures.externalProcedureDefCallback = this.props.onActivateCustomProcedures;
        this.ScratchBlocks.ScratchMsgs.setLocale(this.props.locale);

        const workspaceConfig = defaultsDeep({},
            Blocks.defaultOptions,
            this.props.options,
            {
                rtl: this.props.isRtl,
                toolbox: this.props.toolboxXML,
                theme: new this.ScratchBlocks.Theme(
                    this.props.colorMode,
                    getColorsForMode(this.props.colorMode)
                ),
                // TODO: use scratch-blocks constants instead of bare strings
                scratchTheme: this.props.useCatBlocks ? 'catblocks' : 'classic'
            }
        );
        this.workspace = this.ScratchBlocks.inject(this.blocks, workspaceConfig);
        this.workspace.registerToolboxCategoryCallback(
            'VARIABLE',
            this.ScratchBlocks.ScratchVariables.getVariablesCategory
        );
        this.workspace.registerToolboxCategoryCallback(
            'PROCEDURE',
            this.ScratchBlocks.ScratchProcedures.getProceduresCategory
        );

        this.toolboxUpdateChangeListener = event => {
            if (
                event.type === this.ScratchBlocks.Events.VAR_CREATE ||
                event.type === this.ScratchBlocks.Events.VAR_RENAME ||
                event.type === this.ScratchBlocks.Events.VAR_DELETE ||
                (event.type === this.ScratchBlocks.Events.BLOCK_DELETE &&
                    event.oldJson.type === 'procedures_definition') ||
                // Only refresh the toolbox when procedure block creations are
                // triggered by undoing a deletion (implied by recordUndo being
                // false on the event).
                (event.type === this.ScratchBlocks.Events.BLOCK_CREATE &&
                    event.json.type === 'procedures_definition' &&
                    !event.recordUndo)
            ) {
                this.requestToolboxUpdate();
            }
        };
        this.workspace.addChangeListener(this.toolboxUpdateChangeListener);

        // Register buttons under new callback keys for creating variables,
        // lists, and procedures from extensions.

        const toolboxWorkspace = this.workspace.getFlyout().getWorkspace();

        const varListButtonCallback = type =>
            (() => this.ScratchBlocks.ScratchVariables.createVariable(this.workspace, null, type));
        const procButtonCallback = () => {
            this.ScratchBlocks.ScratchProcedures.createProcedureDefCallback(this.workspace);
        };

        toolboxWorkspace.registerButtonCallback('MAKE_A_VARIABLE', varListButtonCallback(''));
        toolboxWorkspace.registerButtonCallback('MAKE_A_LIST', varListButtonCallback('list'));
        toolboxWorkspace.registerButtonCallback('MAKE_A_PROCEDURE', procButtonCallback);

        // Store the xml of the toolbox that is actually rendered.
        // This is used in componentDidUpdate instead of prevProps, because
        // the xml can change while e.g. on the costumes tab.
        this._renderedToolboxXML = this.props.toolboxXML;

        // @todo change this when blockly supports UI events
        addFunctionListener(this.workspace, 'translate', this.onWorkspaceMetricsChange);
        addFunctionListener(this.workspace, 'zoom', this.onWorkspaceMetricsChange);
        this.workspace.getToolbox().selectItemByPosition(0);

        this.attachVM();
        this.ensurePythonExtensions();
        // Only update blocks/vm locale when visible to avoid sizing issues
        // If locale changes while not visible it will get handled in didUpdate
        if (this.props.isVisible) {
            this.setLocale();
        }

        window.addEventListener('load-extension', () => {
            this.props.vm.extensionManager.loadExtensionURL('faceSensing').then(() => {
                this.handleCategorySelected('faceSensing');
            });
        });
    }
    shouldComponentUpdate (nextProps, nextState) {
        return (
            this.state.prompt !== nextState.prompt ||
            this.props.isVisible !== nextProps.isVisible ||
            this._renderedToolboxXML !== nextProps.toolboxXML ||
            this.props.extensionLibraryVisible !== nextProps.extensionLibraryVisible ||
            this.props.customProceduresVisible !== nextProps.customProceduresVisible ||
            this.props.editorMode !== nextProps.editorMode ||
            this.props.customExtensionIds !== nextProps.customExtensionIds ||
            this.props.locale !== nextProps.locale ||
            this.props.anyModalVisible !== nextProps.anyModalVisible ||
            this.props.stageSize !== nextProps.stageSize
        );
    }
    componentDidUpdate (prevProps) {
        // If any modals are open, call hideChaff to close z-indexed field editors
        if (this.props.anyModalVisible && !prevProps.anyModalVisible) {
            this.ScratchBlocks.hideChaff();
        }

        if (this.props.editorMode !== prevProps.editorMode) {
            this.ensurePythonExtensions();
            this.requestToolboxUpdate();
            this.onPythonWorkspaceChange();
        }

        if (this.props.customExtensionIds !== prevProps.customExtensionIds) {
            this.ensurePythonExtensions();
        }

        // Only rerender the toolbox when the blocks are visible and the xml is
        // different from the previously rendered toolbox xml.
        // Do not check against prevProps.toolboxXML because that may not have been rendered.
        if (this.props.isVisible && this.props.toolboxXML !== this._renderedToolboxXML) {
            this.requestToolboxUpdate();
        }

        if (this.props.isVisible === prevProps.isVisible) {
            if (this.props.stageSize !== prevProps.stageSize) {
                // force workspace to redraw for the new stage size
                window.dispatchEvent(new Event('resize'));
            }
            return;
        }
        // @todo hack to resize blockly manually in case resize happened while hidden
        // @todo hack to reload the workspace due to gui bug #413
        if (this.props.isVisible) { // Scripts tab
            this.workspace.setVisible(true);
            if (prevProps.locale !== this.props.locale || this.props.locale !== this.props.vm.getLocale()) {
                // call setLocale if the locale has changed, or changed while the blocks were hidden.
                // vm.getLocale() will be out of sync if locale was changed while not visible
                this.setLocale();
            } else {
                this.props.vm.refreshWorkspace();
            }

            window.dispatchEvent(new Event('resize'));
        } else {
            this.workspace.setVisible(false);
        }
    }
    componentWillUnmount () {
        this.detachVM();
        // Hide any open field editor and move Blockly focus to the workspace
        // root before disposing. Without this, BlockSvg.dispose() detects the
        // focused element is inside a block and schedules a stale
        // setTimeout(() => focusTree(workspace)), which fires after the
        // workspace is unregistered and throws
        // "Attempted to focus unregistered tree" (scratch-blocks#3460).
        //
        // focusNode(workspace) — not focusTree(workspace) — is used here
        // because focusTree would restore focus to whatever was previously
        // focused in this workspace (likely the same block about to be
        // disposed). focusNode pins focus to the workspace root directly,
        // ensuring no block is focused when dispose() runs.
        this.ScratchBlocks.WidgetDiv.hide();
        this.ScratchBlocks.getFocusManager().focusNode(this.workspace);
        this.workspace.dispose();
        clearTimeout(this.toolboxUpdateTimeout);

        // Clear the flyout blocks so that they can be recreated on mount.
        this.props.vm.clearFlyoutBlocks();
    }
    requestToolboxUpdate () {
        clearTimeout(this.toolboxUpdateTimeout);
        this.toolboxUpdateTimeout = setTimeout(() => {
            this.updateToolbox();
        }, 0);
    }
    setLocale () {
        this.ScratchBlocks.ScratchMsgs.setLocale(this.props.locale);
        this.props.vm.setLocale(this.props.locale, this.props.messages)
            .then(() => {
                this.workspace.getFlyout().setRecyclingEnabled(false);
                this.props.vm.refreshWorkspace();
                this.requestToolboxUpdate();
                this.withToolboxUpdates(() => {
                    this.workspace.getFlyout().setRecyclingEnabled(true);
                });
            });
    }

    updateToolbox () {
        this.toolboxUpdateTimeout = false;

        const scale = this.workspace.getFlyout().getWorkspace().scale;
        const selectedCategoryName = this.workspace
            .getToolbox()
            .getSelectedItem()
            .getName();
        const selectedCategoryScrollPosition =
            this.workspace
                .getFlyout()
                .getCategoryScrollPosition(selectedCategoryName) * scale;
        const offsetWithinCategory =
            this.workspace.getFlyout().getWorkspace()
                .getMetrics().viewTop -
            selectedCategoryScrollPosition;

        this.workspace.updateToolbox(this.props.toolboxXML);
        this.workspace.getToolbox().runAfterRerender(() => {
            const newCategoryScrollPosition = this.workspace
                .getFlyout()
                .getCategoryScrollPosition(selectedCategoryName);
            if (newCategoryScrollPosition) {
                this.workspace
                    .getFlyout()
                    .getWorkspace()
                    .scrollbar.setY(
                        (newCategoryScrollPosition * scale) + offsetWithinCategory
                    );
            }
        });
        this.workspace.getToolbox().runAfterRerender(() => {
            this.applyFlyoutBlockAvailability();
        });
        this.workspace.getToolbox().forceRerender();
        this._renderedToolboxXML = this.props.toolboxXML;
        this.applyFlyoutBlockAvailability();

        const queue = this.toolboxUpdateQueue;
        this.toolboxUpdateQueue = [];
        queue.forEach(fn => fn());
    }

    // 在 flyout 层禁用暂未开放的积木，阻止拖拽和点击并给出统一提示。
    applyFlyoutBlockAvailability () {
        const flyoutWorkspace = this.workspace &&
            this.workspace.getFlyout() &&
            this.workspace.getFlyout().getWorkspace();
        if (!flyoutWorkspace || typeof flyoutWorkspace.getAllBlocks !== 'function') return;

        const blocks = flyoutWorkspace.getAllBlocks(false);
        blocks.forEach(block => {
            const reason = this.props.editorMode === PYTHON_EDITOR_MODE ?
                disabledFlyoutBlocks[block.type] : null;
            const disabled = Boolean(reason);
            if (typeof block.setDisabledReason === 'function') {
                block.setDisabledReason(disabled, 'companyAvailability');
            }
            if (typeof block.setMovable === 'function') {
                block.setMovable(!disabled);
            }
            if (typeof block.setEditable === 'function') {
                block.setEditable(!disabled);
            }
            if (typeof block.setTooltip === 'function' && reason) {
                block.setTooltip(reason);
            }
            if (typeof block.getSvgRoot === 'function') {
                const svgRoot = block.getSvgRoot();
                if (svgRoot) {
                    svgRoot.classList.toggle(disabledFlyoutBlockClass, disabled);
                    if (disabled) {
                        svgRoot.setAttribute('data-disabled-reason', reason);
                        svgRoot.setAttribute('title', reason);
                        if (!svgRoot[disabledFlyoutBlockListenerKey]) {
                            svgRoot[disabledFlyoutBlockListenerKey] = event => {
                                const disabledReason = svgRoot.getAttribute('data-disabled-reason');
                                if (!disabledReason) return;
                                event.preventDefault();
                                event.stopPropagation();
                                this.ScratchBlocks.dialog.alert(disabledReason);
                            };
                            svgRoot.addEventListener('pointerdown', svgRoot[disabledFlyoutBlockListenerKey], true);
                            svgRoot.addEventListener('click', svgRoot[disabledFlyoutBlockListenerKey], true);
                        }
                    } else {
                        svgRoot.removeAttribute('data-disabled-reason');
                        svgRoot.removeAttribute('title');
                        if (svgRoot[disabledFlyoutBlockListenerKey]) {
                            svgRoot.removeEventListener('pointerdown', svgRoot[disabledFlyoutBlockListenerKey], true);
                            svgRoot.removeEventListener('click', svgRoot[disabledFlyoutBlockListenerKey], true);
                            delete svgRoot[disabledFlyoutBlockListenerKey];
                        }
                    }
                }
            }
        });
    }

    withToolboxUpdates (fn) {
        // if there is a queued toolbox update, we need to wait
        if (this.toolboxUpdateTimeout) {
            this.toolboxUpdateQueue.push(fn);
        } else {
            fn();
        }
    }

    attachVM () {
        this.workspace.addChangeListener(this.props.vm.blockListener);
        this.workspace.addChangeListener(this.onPythonWorkspaceChange);
        this.flyoutWorkspace = this.workspace
            .getFlyout()
            .getWorkspace();
        this.flyoutWorkspace.addChangeListener(this.props.vm.flyoutBlockListener);
        this.flyoutWorkspace.addChangeListener(this.props.vm.monitorBlockListener);
        this.props.vm.addListener('SCRIPT_GLOW_ON', this.onScriptGlowOn);
        this.props.vm.addListener('SCRIPT_GLOW_OFF', this.onScriptGlowOff);
        this.props.vm.addListener('BLOCK_GLOW_ON', this.onBlockGlowOn);
        this.props.vm.addListener('BLOCK_GLOW_OFF', this.onBlockGlowOff);
        this.props.vm.addListener('VISUAL_REPORT', this.onVisualReport);
        this.props.vm.addListener('workspaceUpdate', this.onWorkspaceUpdate);
        this.props.vm.addListener('targetsUpdate', this.onTargetsUpdate);
        this.props.vm.addListener('MONITORS_UPDATE', this.handleMonitorsUpdate);
        this.props.vm.addListener('EXTENSION_ADDED', this.handleExtensionAdded);
        this.props.vm.addListener('BLOCKSINFO_UPDATE', this.handleBlocksInfoUpdate);
        this.props.vm.addListener('PERIPHERAL_CONNECTED', this.handleStatusButtonUpdate);
        this.props.vm.addListener('PERIPHERAL_DISCONNECTED', this.handleStatusButtonUpdate);
        if (this.props.vm.runtime) {
            this.props.vm.runtime.addListener('PYTHON_NATIVE_CONSOLE', this.onPythonConsole);
        }
    }
    detachVM () {
        if (this.workspace) {
            this.workspace.removeChangeListener(this.onPythonWorkspaceChange);
        }
        if (this.props.vm.runtime) {
            this.props.vm.runtime.removeListener('PYTHON_NATIVE_CONSOLE', this.onPythonConsole);
        }
        this.props.vm.removeListener('SCRIPT_GLOW_ON', this.onScriptGlowOn);
        this.props.vm.removeListener('SCRIPT_GLOW_OFF', this.onScriptGlowOff);
        this.props.vm.removeListener('BLOCK_GLOW_ON', this.onBlockGlowOn);
        this.props.vm.removeListener('BLOCK_GLOW_OFF', this.onBlockGlowOff);
        this.props.vm.removeListener('VISUAL_REPORT', this.onVisualReport);
        this.props.vm.removeListener('workspaceUpdate', this.onWorkspaceUpdate);
        this.props.vm.removeListener('targetsUpdate', this.onTargetsUpdate);
        this.props.vm.removeListener('MONITORS_UPDATE', this.handleMonitorsUpdate);
        this.props.vm.removeListener('EXTENSION_ADDED', this.handleExtensionAdded);
        this.props.vm.removeListener('BLOCKSINFO_UPDATE', this.handleBlocksInfoUpdate);
        this.props.vm.removeListener('PERIPHERAL_CONNECTED', this.handleStatusButtonUpdate);
        this.props.vm.removeListener('PERIPHERAL_DISCONNECTED', this.handleStatusButtonUpdate);
    }

    updateToolboxBlockValue (id, value) {
        this.withToolboxUpdates(() => {
            const block = this.workspace
                .getFlyout()
                .getWorkspace()
                .getBlockById(id);
            if (block) {
                block.inputList[0].fieldRow[0].setValue(value);
            }
        });
    }

    onTargetsUpdate () {
        if (this.props.vm.editingTarget && this.workspace.getFlyout()) {
            ['glide', 'move', 'set'].forEach(prefix => {
                this.updateToolboxBlockValue(`${prefix}x`, Math.round(this.props.vm.editingTarget.x).toString());
                this.updateToolboxBlockValue(`${prefix}y`, Math.round(this.props.vm.editingTarget.y).toString());
            });
        }
    }
    onWorkspaceMetricsChange () {
        const target = this.props.vm.editingTarget;
        if (target && target.id) {
            // Dispatch updateMetrics later, since onWorkspaceMetricsChange may be (very indirectly)
            // called from a reducer, i.e. when you create a custom procedure.
            // TODO: Is this a vehement hack?
            setTimeout(() => {
                this.props.updateMetrics({
                    targetID: target.id,
                    scrollX: this.workspace.scrollX,
                    scrollY: this.workspace.scrollY,
                    scale: this.workspace.scale
                });
            }, 0);
        }
    }
    onScriptGlowOn (data) {
        this.ScratchBlocks.glowStack(data.id, true);
    }
    onScriptGlowOff (data) {
        this.ScratchBlocks.glowStack(data.id, false);
    }
    onBlockGlowOn (/* data */) {
        // No-op, support may be added in the future
    }
    onBlockGlowOff (/* data */) {
        // No-op, support may be added in the future
    }
    onVisualReport (data) {
        this.ScratchBlocks.reportValue(data.id, data.value);
    }
    getToolboxXML () {
        // Use try/catch because this requires digging pretty deep into the VM
        // Code inside intentionally ignores several error situations (no stage, etc.)
        // Because they would get caught by this try/catch
        try {
            let {editingTarget: target, runtime} = this.props.vm;
            const stage = runtime.getTargetForStage();
            if (!target) target = stage; // If no editingTarget, use the stage

            const stageCostumes = stage.getCostumes();
            const targetCostumes = target.getCostumes();
            const targetSounds = target.getSounds();
            const dynamicBlocksXML = injectExtensionCategoryMode(
                this.props.vm.runtime.getBlocksXML(target),
                this.props.colorMode
            );
            if (this.props.editorMode === PYTHON_EDITOR_MODE) {
                return makePythonToolboxXML(dynamicBlocksXML, this.props.customExtensionIds);
            }
            return makeToolboxXML(false, target.isStage, target.id, dynamicBlocksXML,
                targetCostumes[targetCostumes.length - 1].name,
                stageCostumes[stageCostumes.length - 1].name,
                targetSounds.length > 0 ? targetSounds[targetSounds.length - 1].name : '',
                getColorsForMode(this.props.colorMode)
            );
        } catch {
            return null;
        }
    }
    onWorkspaceUpdate (data) {
        // When we change sprites, update the toolbox to have the new sprite's blocks
        const toolboxXML = this.getToolboxXML();
        if (toolboxXML) {
            this.props.updateToolboxState(toolboxXML);
        }

        if (this.props.vm.editingTarget && !this.props.workspaceMetrics.targets[this.props.vm.editingTarget.id]) {
            this.onWorkspaceMetricsChange();
        }

        // Disable Blockly events during workspace reload. In Blockly v2, Events.fire()
        // enqueues events for async dispatch (after rendering), so the old pattern of
        // removing and re-adding the blockListener no longer prevents spurious events
        // from reaching the VM — the queued events fire after the listener is re-added.
        // Disabling events entirely during the load ensures nothing is queued.
        this.workspace.removeChangeListener(this.toolboxUpdateChangeListener);
        try {
            this.ScratchBlocks.Events.disable();
            const dom = this.ScratchBlocks.utils.xml.textToDom(data.xml);
            this.ScratchBlocks.clearWorkspaceAndLoadFromXml(dom, this.workspace);
        } catch (error) {
            // The workspace is likely incomplete. What did update should be
            // functional.
            //
            // Instead of throwing the error, by logging it and continuing as
            // normal lets the other workspace update processes complete in the
            // gui and vm, which lets the vm run even if the workspace is
            // incomplete. Throwing the error would keep things like setting the
            // correct editing target from happening which can interfere with
            // some blocks and processes in the vm.
            if (error.message) {
                error.message = `Workspace Update Error: ${error.message}`;
            }
            log.error(error);
        } finally {
            this.ScratchBlocks.Events.enable();
        }

        if (this.props.vm.editingTarget && this.props.workspaceMetrics.targets[this.props.vm.editingTarget.id]) {
            const {scrollX, scrollY, scale} = this.props.workspaceMetrics.targets[this.props.vm.editingTarget.id];
            this.workspace.scrollX = scrollX;
            this.workspace.scrollY = scrollY;
            this.workspace.scale = scale;
            this.workspace.resize();
        }

        // Clear the undo state of the workspace since this is a
        // fresh workspace and we don't want any changes made to another sprites
        // workspace to be 'undone' here.
        this.workspace.clearUndo();
        this.onPythonWorkspaceChange();
        // Let events get flushed before readding the toolbox-updater listener
        // to avoid unneeded refreshes.
        requestAnimationFrame(() => {
            setTimeout(() => {
                this.workspace.addChangeListener(
                    this.toolboxUpdateChangeListener
                );
            });
        });
    }
    handleMonitorsUpdate (monitors) {
        // Update the checkboxes of the relevant monitors.
        // TODO: What about monitors that have fields? See todo in scratch-vm blocks.js changeBlock:
        // https://github.com/LLK/scratch-vm/blob/2373f9483edaf705f11d62662f7bb2a57fbb5e28/src/engine/blocks.js#L569-L576
        const flyout = this.workspace.getFlyout();
        for (const monitor of monitors.values()) {
            const blockId = monitor.get('id');
            const isVisible = monitor.get('visible');
            flyout.setCheckboxState(blockId, isVisible);
            // We also need to update the isMonitored flag for this block on the VM, since it's used to determine
            // whether the checkbox is activated or not when the checkbox is re-displayed (e.g. local variables/blocks
            // when switching between sprites).
            const block = this.props.vm.runtime.monitorBlocks.getBlock(blockId);
            if (block) {
                block.isMonitored = isVisible;
            }
        }
    }
    // Python 模式下工作区有变化就重新生成右侧代码文本。
    onPythonWorkspaceChange () {
        if (this.props.editorMode !== PYTHON_EDITOR_MODE) return;
        const code = generatePythonCode(this.workspace);
        this.props.updatePythonCodeState(code);
    }
    // VM 内预览态的 Python 原生积木输出会走 runtime event 汇入控制台。
    onPythonConsole (data) {
        if (this.props.editorMode !== PYTHON_EDITOR_MODE) return;
        this.props.appendPythonConsoleLine(data && data.message ? data.message : String(data));
    }
    handleExtensionAdded (categoryInfo) {
        analytics.event({
            category: 'extensions',
            action: 'added',
            label: categoryInfo.id
        });

        const defineBlocks = blockInfoArray => {
            if (blockInfoArray && blockInfoArray.length > 0) {
                const staticBlocksJson = [];
                const dynamicBlocksInfo = [];
                blockInfoArray.forEach(blockInfo => {
                    if (blockInfo.info && blockInfo.info.isDynamic) {
                        dynamicBlocksInfo.push(blockInfo);
                    } else if (blockInfo.json) {
                        staticBlocksJson.push(injectExtensionBlockIcons(blockInfo.json, this.props.colorMode));
                    }
                    // otherwise it's a non-block entry such as '---'
                });

                this.ScratchBlocks.defineBlocksWithJsonArray(staticBlocksJson);
                dynamicBlocksInfo.forEach(blockInfo => {
                    // This is creating the block factory / constructor -- NOT a specific instance of the block.
                    // The factory should only know static info about the block: the category info and the opcode.
                    // Anything else will be picked up from the XML attached to the block instance.
                    const extendedOpcode = `${categoryInfo.id}_${blockInfo.info.opcode}`;
                    const blockDefinition =
                        defineDynamicBlock(this.ScratchBlocks, categoryInfo, blockInfo, extendedOpcode);
                    this.ScratchBlocks.Blocks[extendedOpcode] = blockDefinition;
                });
            }
        };

        // scratch-blocks implements a menu or custom field as a special kind of block ("shadow" block)
        // these actually define blocks and MUST run regardless of the UI state
        defineBlocks(
            Object.getOwnPropertyNames(categoryInfo.customFieldTypes)
                .map(fieldTypeName => categoryInfo.customFieldTypes[fieldTypeName].scratchBlocksDefinition));
        defineBlocks(categoryInfo.menus);
        defineBlocks(categoryInfo.blocks);
        // Note that Blockly uses the UK spelling of "colour", so fields that
        // interact directly with Blockly follow that convention, while Scratch
        // code uses the US spelling of "color".
        let colourPrimary = categoryInfo.color1;
        let colourSecondary = categoryInfo.color2;
        let colourTertiary = categoryInfo.color3;
        let colourQuaternary = categoryInfo.color3;
        if (this.props.colorMode !== DEFAULT_MODE) {
            const colors = getExtensionColors(this.props.colorMode);
            colourPrimary = colors.colourPrimary;
            colourSecondary = colors.colourSecondary;
            colourTertiary = colors.colourTertiary;
            colourQuaternary = colors.colourQuaternary;
        }
        this.ScratchBlocks.getMainWorkspace()
            .getTheme()
            .setBlockStyle(categoryInfo.id, {
                colourPrimary,
                colourSecondary,
                colourTertiary,
                colourQuaternary
            });
        this.ScratchBlocks.getMainWorkspace()
            .getTheme()
            .setBlockStyle(`${categoryInfo.id}_selected`, {
                colourPrimary: colourQuaternary,
                colourSecondary: colourQuaternary,
                colourTertiary: colourQuaternary,
                colourQuaternary: colourQuaternary
            });
        this.ScratchBlocks.getMainWorkspace().setTheme(
            this.ScratchBlocks.getMainWorkspace().getTheme()
        );
        // Update the toolbox with new blocks if possible
        const toolboxXML = this.getToolboxXML();
        if (toolboxXML) {
            this.props.updateToolboxState(toolboxXML);
        }
    }
    handleBlocksInfoUpdate (categoryInfo) {
        // @todo Later we should replace this to avoid all the warnings from redefining blocks.
        this.handleExtensionAdded(categoryInfo);
    }
    // Python 基础拓展或自定义库加载完成后，需要重新生成 toolbox XML。
    refreshToolboxXML () {
        const toolboxXML = this.getToolboxXML();
        if (toolboxXML) {
            this.props.updateToolboxState(toolboxXML);
        }
    }
    // 进入 Python 模式时自动加载基础 Python 拓展，并注册用户自定义拓展库。
    ensurePythonExtensions () {
        if (this.props.editorMode !== PYTHON_EDITOR_MODE) return;
        if (this.loadingPythonNativeExtension) return;
        const pendingExtensionIds = pythonExtensionIds.filter(
            extensionId => !this.props.vm.extensionManager.isExtensionLoaded(extensionId)
        );
        // 自定义拓展库既要注册 VM 积木，也要注册 Python 模板，否则只显示不产码。
        const registerCustomExtensions = () => Promise.all(this.props.customExtensionLibraries
            .filter(library => library.enabled !== false)
            .map(library => {
                const manifest = library.manifest;
                registerPythonCodegenManifest(manifest);
                if (this.props.vm.extensionManager.isExtensionLoaded(manifest.id)) {
                    return Promise.resolve();
                }
                return this.props.vm.extensionManager.registerExtensionObject(
                    manifest.id,
                    manifestToExtensionObject(manifest)
                );
            }));
        if (!pendingExtensionIds.length) {
            registerCustomExtensions()
                .then(() => {
                    this.refreshToolboxXML();
                })
                .catch(error => {
                    log.error(error);
                    this.refreshToolboxXML();
                });
            return;
        }

        this.loadingPythonNativeExtension = true;
        Promise.all(pendingExtensionIds.map(extensionId => (
            this.props.vm.extensionManager.loadExtensionURL(extensionId)
        )))
            .then(registerCustomExtensions)
            .catch(error => {
                log.error(error);
            })
            .finally(() => {
                this.loadingPythonNativeExtension = false;
                this.refreshToolboxXML();
            });
    }
    handleCategorySelected (categoryId) {
        const extension = extensionData.find(ext => ext.extensionId === categoryId);
        if (extension && extension.launchPeripheralConnectionFlow) {
            this.handleConnectionModalStart(categoryId);
        }

        this.withToolboxUpdates(() => {
            const toolbox = this.workspace.getToolbox();
            toolbox.setSelectedItem(toolbox.getToolboxItemById(categoryId));
        });
    }
    setBlocks (blocks) {
        this.blocks = blocks;
    }
    handlePromptStart (message, defaultValue, callback, optTitle, optVarType) {
        const p = {prompt: {callback, message, defaultValue}};
        p.prompt.title = optTitle ? optTitle :
            this.ScratchBlocks.Msg.VARIABLE_MODAL_TITLE;
        p.prompt.varType = typeof optVarType === 'string' ?
            optVarType : this.ScratchBlocks.SCALAR_VARIABLE_TYPE;
        p.prompt.showVariableOptions = // This flag means that we should show variable/list options about scope
            optVarType !== this.ScratchBlocks.BROADCAST_MESSAGE_VARIABLE_TYPE &&
            p.prompt.title !== this.ScratchBlocks.Msg.RENAME_VARIABLE_MODAL_TITLE &&
            p.prompt.title !== this.ScratchBlocks.Msg.RENAME_LIST_MODAL_TITLE;
        p.prompt.showCloudOption = (optVarType === this.ScratchBlocks.SCALAR_VARIABLE_TYPE) && this.props.canUseCloud;
        this.setState(p);
    }
    handleConnectionModalStart (extensionId) {
        this.props.onOpenConnectionModal(extensionId);
    }
    handleStatusButtonUpdate () {
        this.workspace.getFlyout().refreshStatusButtons();
    }
    handleOpenSoundRecorder () {
        this.props.onOpenSoundRecorder();
    }

    /*
     * Pass along information about proposed name and variable options (scope and isCloud)
     * and additional potentially conflicting variable names from the VM
     * to the variable validation prompt callback used in scratch-blocks.
     */
    handlePromptCallback (input, variableOptions) {
        this.state.prompt.callback(
            input,
            this.props.vm.runtime.getAllVarNamesOfType(this.state.prompt.varType),
            variableOptions);
        this.handlePromptClose();
    }
    handlePromptClose () {
        this.setState({prompt: null});
    }
    handleCustomProceduresClose (data) {
        this.props.onRequestCloseCustomProcedures(data);
        const ws = this.workspace;
        this.updateToolbox();
        ws.getToolbox().selectCategoryByName('myBlocks');
    }
    handleDrop (dragInfo) {
        fetch(dragInfo.payload.bodyUrl)
            .then(response => response.json())
            .then(blocks => this.props.vm.shareBlocksToTarget(blocks, this.props.vm.editingTarget.id))
            .then(() => {
                this.props.vm.refreshWorkspace();
            });
    }
    render () {
        const {
            anyModalVisible,
            appendPythonConsoleLine,
            canUseCloud,
            customProceduresVisible,
            editorMode,
            extensionLibraryVisible,
            options,
            stageSize,
            vm,
            isRtl,
            isVisible,
            onActivateColorPicker,
            onOpenConnectionModal,
            onOpenSoundRecorder,
            updateToolboxState,
            onActivateCustomProcedures,
            onRequestCloseExtensionLibrary,
            onRequestCloseCustomProcedures,
            toolboxXML,
            updateMetrics: updateMetricsProp,
            updatePythonCodeState,
            useCatBlocks,
            workspaceMetrics,
            colorMode,
            ...props
        } = this.props;

        return (
            <React.Fragment>
                <DroppableBlocks
                    componentRef={this.setBlocks}
                    onDrop={this.handleDrop}
                    {...props}
                />
                {this.state.prompt ? (
                    <Prompt
                        defaultValue={this.state.prompt.defaultValue}
                        isStage={vm.runtime.getEditingTarget().isStage}
                        showListMessage={this.state.prompt.varType === this.ScratchBlocks.LIST_VARIABLE_TYPE}
                        label={this.state.prompt.message}
                        showCloudOption={this.state.prompt.showCloudOption}
                        showVariableOptions={this.state.prompt.showVariableOptions}
                        title={this.state.prompt.title}
                        vm={vm}
                        onCancel={this.handlePromptClose}
                        onOk={this.handlePromptCallback}
                    />
                ) : null}
                {extensionLibraryVisible ? (
                    <ExtensionLibrary
                        editorMode={editorMode}
                        vm={vm}
                        onCategorySelected={this.handleCategorySelected}
                        onRequestClose={onRequestCloseExtensionLibrary}
                    />
                ) : null}
                {customProceduresVisible ? (
                    <CustomProcedures
                        options={{
                            media: options.media
                        }}
                        onRequestClose={this.handleCustomProceduresClose}
                        colorMode={colorMode}
                    />
                ) : null}
            </React.Fragment>
        );
    }
}

Blocks.propTypes = {
    anyModalVisible: PropTypes.bool,
    canUseCloud: PropTypes.bool,
    customExtensionIds: PropTypes.string,
    customExtensionLibraries: PropTypes.arrayOf(PropTypes.shape({
        enabled: PropTypes.bool,
        manifest: PropTypes.shape({
            id: PropTypes.string
        })
    })),
    customProceduresVisible: PropTypes.bool,
    extensionLibraryVisible: PropTypes.bool,
    isRtl: PropTypes.bool,
    isVisible: PropTypes.bool,
    locale: PropTypes.string.isRequired,
    messages: PropTypes.objectOf(PropTypes.string),
    onActivateColorPicker: PropTypes.func,
    onActivateCustomProcedures: PropTypes.func,
    onOpenConnectionModal: PropTypes.func,
    onOpenSoundRecorder: PropTypes.func,
    onRequestCloseCustomProcedures: PropTypes.func,
    onRequestCloseExtensionLibrary: PropTypes.func,
    options: PropTypes.shape({
        media: PropTypes.string,
        zoom: PropTypes.shape({
            controls: PropTypes.bool,
            wheel: PropTypes.bool,
            startScale: PropTypes.number
        }),
        comments: PropTypes.bool,
        collapse: PropTypes.bool
    }),
    stageSize: PropTypes.oneOf(Object.keys(STAGE_DISPLAY_SIZES)).isRequired,
    colorMode: PropTypes.oneOf(Object.keys(colorModeMap)),
    editorMode: PropTypes.string,
    toolboxXML: PropTypes.string,
    updateMetrics: PropTypes.func,
    updateToolboxState: PropTypes.func,
    appendPythonConsoleLine: PropTypes.func,
    updatePythonCodeState: PropTypes.func,
    useCatBlocks: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired,
    workspaceMetrics: PropTypes.shape({
        targets: PropTypes.objectOf(PropTypes.object)
    })
};

Blocks.defaultOptions = {
    zoom: {
        controls: true,
        wheel: true,
        pinch: true,
        startScale: BLOCKS_DEFAULT_SCALE
    },
    move: {
        wheel: true
    },
    grid: {
        spacing: 40,
        length: 2,
        colour: '#ddd'
    },
    comments: true,
    collapse: false,
    sounds: false,
    trashcan: false,
    modalInputs: false
};

Blocks.defaultProps = {
    isVisible: true,
    options: Blocks.defaultOptions,
    colorMode: DEFAULT_MODE,
    customExtensionLibraries: []
};

const mapStateToProps = state => {
    const customExtensionLibraries = state.scratchGui.customExtensions.installedLibraries
        .filter(library => library.enabled !== false);
    return {
        anyModalVisible: (
            Object.keys(state.scratchGui.modals).some(key => state.scratchGui.modals[key]) ||
            state.scratchGui.mode.isFullScreen
        ),
        extensionLibraryVisible: state.scratchGui.modals.extensionLibrary,
        isRtl: state.locales.isRtl,
        locale: state.locales.locale,
        messages: state.locales.messages,
        toolboxXML: state.scratchGui.toolbox.toolboxXML,
        editorMode: state.scratchGui.mode.editorMode,
        customExtensionIds: customExtensionLibraries
            .map(library => library.manifest.id)
            .join(','),
        customExtensionLibraries,
        customProceduresVisible: state.scratchGui.customProcedures.active,
        workspaceMetrics: state.scratchGui.workspaceMetrics,
        useCatBlocks: isTimeTravel2020(state) || state.scratchGui.settings.theme === CAT_BLOCKS_THEME
    };
};

const mapDispatchToProps = dispatch => ({
    onActivateColorPicker: callback => dispatch(activateColorPicker(callback)),
    onActivateCustomProcedures: (data, callback) => dispatch(activateCustomProcedures(data, callback)),
    onOpenConnectionModal: id => {
        dispatch(setConnectionModalExtensionId(id));
        dispatch(openConnectionModal());
    },
    onOpenSoundRecorder: () => {
        dispatch(activateTab(SOUNDS_TAB_INDEX));
        dispatch(openSoundRecorder());
    },
    onRequestCloseExtensionLibrary: () => {
        dispatch(closeExtensionLibrary());
    },
    onRequestCloseCustomProcedures: data => {
        dispatch(deactivateCustomProcedures(data));
    },
    updateToolboxState: toolboxXML => {
        dispatch(updateToolbox(toolboxXML));
    },
    updateMetrics: metrics => {
        dispatch(updateMetrics(metrics));
    },
    updatePythonCodeState: code => {
        dispatch(updatePythonCode(code));
    },
    appendPythonConsoleLine: consoleText => {
        dispatch(appendPythonConsole(consoleText));
    }
});

export {Blocks};
export default errorBoundaryHOC('Blocks')(
    connect(
        mapStateToProps,
        mapDispatchToProps
    )(Blocks)
);
