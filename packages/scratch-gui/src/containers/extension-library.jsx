import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import VM from '@scratch/scratch-vm';
import {defineMessages, injectIntl} from 'react-intl';
import {connect} from 'react-redux';
import intlShape from '../lib/intlShape.js';

import extensionLibraryContent from '../lib/libraries/extensions/index.jsx';

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';
import downloadBlob from '../lib/download-blob';
import {
    normalizeCustomExtensionManifest,
    serializeCustomExtensionManifest
} from '../lib/custom-extension/manifest-schema';
import {manifestToExtensionObject} from '../lib/custom-extension/manifest-to-extension';
import {
    registerPythonCodegenManifest,
    unregisterPythonCodegenManifest
} from '../lib/custom-extension/codegen-registry';
import {
    deleteIconURL,
    exportIconURL,
    getManifestIconURL,
    importIconURL
} from '../lib/custom-extension/library-store';
import {
    loadDesktopInstalledCustomExtensionLibraries,
    removeInstalledCustomExtensionLibrary,
    saveInstalledCustomExtensionLibraries,
    upsertInstalledCustomExtensionLibrary
} from '../lib/custom-extension/persistence';
import {
    installCustomExtensionLibrary,
    removeCustomExtensionLibrary,
    setCustomExtensionLibraries
} from '../reducers/custom-extensions';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    },
    extensionUrl: {
        defaultMessage: 'Enter the URL of the extension',
        description: 'Prompt for unoffical extension url',
        id: 'gui.extensionLibrary.extensionUrl'
    },
    importCustomExtension: {
        defaultMessage: 'Import Custom Library',
        description: 'Name for importing a custom extension library',
        id: 'gui.extensionLibrary.importCustomExtension'
    },
    importCustomExtensionDescription: {
        defaultMessage: 'Import a local manifest.json file.',
        description: 'Description for importing a custom extension library',
        id: 'gui.extensionLibrary.importCustomExtensionDescription'
    },
    exportCustomExtension: {
        defaultMessage: 'Export {name}',
        description: 'Name for exporting a custom extension library',
        id: 'gui.extensionLibrary.exportCustomExtension'
    },
    exportCustomExtensionDescription: {
        defaultMessage: 'Download this custom library manifest.',
        description: 'Description for exporting a custom extension library',
        id: 'gui.extensionLibrary.exportCustomExtensionDescription'
    },
    deleteCustomExtension: {
        defaultMessage: 'Delete {name}',
        description: 'Name for deleting a custom extension library',
        id: 'gui.extensionLibrary.deleteCustomExtension'
    },
    deleteCustomExtensionDescription: {
        defaultMessage: 'Remove this custom library from the current session.',
        description: 'Description for deleting a custom extension library',
        id: 'gui.extensionLibrary.deleteCustomExtensionDescription'
    },
    importSuccess: {
        defaultMessage: 'Imported custom library: {name}',
        description: 'Success message after importing a custom extension library',
        id: 'gui.extensionLibrary.importCustomExtensionSuccess'
    },
    importFailure: {
        defaultMessage: 'Failed to import custom library: {message}',
        description: 'Failure message after importing a custom extension library',
        id: 'gui.extensionLibrary.importCustomExtensionFailure'
    },
    customExtensionDescription: {
        defaultMessage: 'Custom Python blocks · {version}',
        description: 'Description for a custom extension library card',
        id: 'gui.extensionLibrary.customExtensionDescription'
    }
});

class ExtensionLibrary extends React.PureComponent {
    constructor (props) {
        super(props);
        this.fileInputRef = React.createRef();
        bindAll(this, [
            'handleFileInputChange',
            'handleItemSelect',
            'restoreDesktopCustomExtensionLibraries'
        ]);
    }
    componentDidMount () {
        this.restoreDesktopCustomExtensionLibraries();
    }
    restoreDesktopCustomExtensionLibraries () {
        loadDesktopInstalledCustomExtensionLibraries()
            .then(installedLibraries => {
                if (!installedLibraries) return;
                if (installedLibraries.length) {
                    saveInstalledCustomExtensionLibraries(installedLibraries);
                    this.props.onSetCustomExtensionLibraries(installedLibraries);
                    return;
                }
                if (this.props.customExtensionLibraries.length) {
                    saveInstalledCustomExtensionLibraries(this.props.customExtensionLibraries);
                }
            })
            .catch(() => {});
    }
    handleFileInputChange (event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const manifest = normalizeCustomExtensionManifest(JSON.parse(reader.result));
                const previousLibrary = this.props.customExtensionLibraries.find(
                    library => library.manifest.id === manifest.id
                );
                if (previousLibrary) {
                    unregisterPythonCodegenManifest(previousLibrary.manifest);
                }
                registerPythonCodegenManifest(manifest);
                const extensionManager = this.props.vm.extensionManager;
                const unloadPromise = extensionManager.isExtensionLoaded(manifest.id) ?
                    extensionManager.unregisterExtensionObject(manifest.id) :
                    Promise.resolve();
                unloadPromise
                    .then(() => extensionManager.registerExtensionObject(
                        manifest.id,
                        manifestToExtensionObject(manifest)
                    ))
                    .then(() => {
                        saveInstalledCustomExtensionLibraries(
                            upsertInstalledCustomExtensionLibrary(this.props.customExtensionLibraries, manifest)
                        );
                        this.props.onInstallCustomExtensionLibrary(manifest);
                        // eslint-disable-next-line no-alert
                        alert(this.props.intl.formatMessage(messages.importSuccess, {name: manifest.name}));
                    })
                    .catch(error => {
                        // eslint-disable-next-line no-alert
                        alert(this.props.intl.formatMessage(messages.importFailure, {message: error.message}));
                    });
            } catch (error) {
                // eslint-disable-next-line no-alert
                alert(this.props.intl.formatMessage(messages.importFailure, {message: error.message}));
            } finally {
                event.target.value = null;
            }
        };
        reader.onerror = () => {
            // eslint-disable-next-line no-alert
            alert(this.props.intl.formatMessage(messages.importFailure, {message: file.name}));
            event.target.value = null;
        };
        reader.readAsText(file);
    }
    handleItemSelect (item) {
        if (item.customExtensionAction === 'import') {
            this.fileInputRef.current.click();
            return;
        }

        if (item.customExtensionAction === 'export') {
            const manifest = item.customExtensionManifest;
            const blob = new Blob([
                JSON.stringify(serializeCustomExtensionManifest(manifest), null, 2)
            ], {type: 'application/json'});
            downloadBlob(`${manifest.id}.custom-extension.json`, blob);
            return;
        }

        if (item.customExtensionAction === 'delete') {
            const manifest = item.customExtensionManifest;
            unregisterPythonCodegenManifest(manifest);
            const unloadPromise = this.props.vm.extensionManager.unregisterExtensionObject ?
                this.props.vm.extensionManager.unregisterExtensionObject(manifest.id) :
                Promise.resolve();
            unloadPromise.then(() => {
                saveInstalledCustomExtensionLibraries(
                    removeInstalledCustomExtensionLibrary(this.props.customExtensionLibraries, manifest.id)
                );
                this.props.onRemoveCustomExtensionLibrary(manifest.id);
            });
            return;
        }

        if (item.customExtensionManifest) {
            const manifest = item.customExtensionManifest;
            registerPythonCodegenManifest(manifest);
            const loadPromise = this.props.vm.extensionManager.isExtensionLoaded(manifest.id) ?
                Promise.resolve() :
                this.props.vm.extensionManager.registerExtensionObject(
                    manifest.id,
                    manifestToExtensionObject(manifest)
                );
            loadPromise.then(() => {
                this.props.onCategorySelected(manifest.id);
            });
            return;
        }

        const id = item.extensionId;
        let url = item.extensionURL ? item.extensionURL : id;
        if (!item.disabled && !id) {
            // eslint-disable-next-line no-alert
            url = prompt(this.props.intl.formatMessage(messages.extensionUrl));
        }
        if (id && !item.disabled) {
            if (this.props.vm.extensionManager.isExtensionLoaded(url)) {
                this.props.onCategorySelected(id);
            } else {
                this.props.vm.extensionManager.loadExtensionURL(url).then(() => {
                    this.props.onCategorySelected(id);
                });
            }
        }
    }
    getCustomExtensionLibraryItems () {
        const customLibraries = this.props.customExtensionLibraries
            .map(library => library.manifest)
            .flatMap(manifest => ([
                {
                    name: manifest.name,
                    extensionId: manifest.id,
                    rawURL: getManifestIconURL(manifest),
                    iconURL: getManifestIconURL(manifest),
                    insetIconURL: getManifestIconURL(manifest),
                    description: this.props.intl.formatMessage(messages.customExtensionDescription, {
                        version: manifest.version
                    }),
                    featured: true,
                    modes: ['python'],
                    customExtensionManifest: manifest
                },
                {
                    name: this.props.intl.formatMessage(messages.exportCustomExtension, {name: manifest.name}),
                    extensionId: `${manifest.id}Export`,
                    rawURL: exportIconURL,
                    iconURL: exportIconURL,
                    insetIconURL: exportIconURL,
                    description: this.props.intl.formatMessage(messages.exportCustomExtensionDescription),
                    featured: false,
                    modes: ['python'],
                    customExtensionAction: 'export',
                    customExtensionManifest: manifest
                },
                {
                    name: this.props.intl.formatMessage(messages.deleteCustomExtension, {name: manifest.name}),
                    extensionId: `${manifest.id}Delete`,
                    rawURL: deleteIconURL,
                    iconURL: deleteIconURL,
                    insetIconURL: deleteIconURL,
                    description: this.props.intl.formatMessage(messages.deleteCustomExtensionDescription),
                    featured: false,
                    modes: ['python'],
                    customExtensionAction: 'delete',
                    customExtensionManifest: manifest
                }
            ]));

        return [
            {
                name: this.props.intl.formatMessage(messages.importCustomExtension),
                extensionId: 'customExtensionImport',
                rawURL: importIconURL,
                iconURL: importIconURL,
                insetIconURL: importIconURL,
                description: this.props.intl.formatMessage(messages.importCustomExtensionDescription),
                featured: true,
                modes: ['python'],
                customExtensionAction: 'import',
                keepLibraryOpenOnSelect: true
            },
            ...customLibraries
        ];
    }
    render () {
        const extensionLibraryThumbnailData = extensionLibraryContent
            .concat(this.getCustomExtensionLibraryItems())
            .filter(extension => !extension.modes || extension.modes.includes(this.props.editorMode))
            .map(extension => ({
                rawURL: extension.iconURL || extensionIcon,
                ...extension
            }));
        return (
            <React.Fragment>
            <LibraryComponent
                data={extensionLibraryThumbnailData}
                filterable={false}
                id="extensionLibrary"
                title={this.props.intl.formatMessage(messages.extensionTitle)}
                visible={this.props.visible}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
            />
            <input
                accept=".json,application/json"
                ref={this.fileInputRef}
                style={{display: 'none'}}
                type="file"
                onChange={this.handleFileInputChange}
            />
            </React.Fragment>
        );
    }
}

ExtensionLibrary.propTypes = {
    customExtensionLibraries: PropTypes.arrayOf(PropTypes.shape({
        manifest: PropTypes.shape({
            id: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            version: PropTypes.string.isRequired
        }).isRequired
    })),
    editorMode: PropTypes.string,
    intl: intlShape.isRequired,
    onInstallCustomExtensionLibrary: PropTypes.func,
    onRemoveCustomExtensionLibrary: PropTypes.func,
    onSetCustomExtensionLibraries: PropTypes.func,
    onCategorySelected: PropTypes.func,
    onRequestClose: PropTypes.func,
    visible: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired
};

ExtensionLibrary.defaultProps = {
    customExtensionLibraries: []
};

const mapStateToProps = state => ({
    customExtensionLibraries: state.scratchGui.customExtensions.installedLibraries
});

const mapDispatchToProps = dispatch => ({
    onInstallCustomExtensionLibrary: manifest => dispatch(installCustomExtensionLibrary(manifest)),
    onRemoveCustomExtensionLibrary: extensionId => dispatch(removeCustomExtensionLibrary(extensionId)),
    onSetCustomExtensionLibraries: installedLibraries => dispatch(setCustomExtensionLibraries(installedLibraries))
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(ExtensionLibrary));
