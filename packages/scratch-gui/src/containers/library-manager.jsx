import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import VM from '@scratch/scratch-vm';
import {connect} from 'react-redux';
import {defineMessages, injectIntl} from 'react-intl';

import LibraryManagerComponent from '../components/library-manager/library-manager.jsx';
import intlShape from '../lib/intlShape.js';
import downloadBlob from '../lib/download-blob';
import {serializeCustomExtensionManifest} from '../lib/custom-extension/manifest-schema';
import {manifestToExtensionObject} from '../lib/custom-extension/manifest-to-extension';
import {readCustomExtensionPackage} from '../lib/custom-extension/package-reader';
import {
    registerPythonCodegenManifest,
    unregisterPythonCodegenManifest
} from '../lib/custom-extension/codegen-registry';
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
import {closeLibraryManager} from '../reducers/modals';

const messages = defineMessages({
    importSuccess: {
        defaultMessage: 'Imported custom library: {name}',
        description: 'Success message after importing a custom extension library',
        id: 'gui.libraryManager.importSuccess'
    },
    importFailure: {
        defaultMessage: 'Failed to import custom library: {message}',
        description: 'Failure message after importing a custom extension library',
        id: 'gui.libraryManager.importFailure'
    }
});

class LibraryManager extends React.PureComponent {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleDeleteLibrary',
            'handleExportLibrary',
            'handleImportFile',
            'installManifest',
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
                if (this.props.installedLibraries.length) {
                    saveInstalledCustomExtensionLibraries(this.props.installedLibraries);
                }
            })
            .catch(() => {});
    }
    installManifest (manifest) {
        const previousLibrary = this.props.installedLibraries.find(
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
        return unloadPromise
            .then(() => extensionManager.registerExtensionObject(
                manifest.id,
                manifestToExtensionObject(manifest)
            ))
            .then(() => {
                saveInstalledCustomExtensionLibraries(
                    upsertInstalledCustomExtensionLibrary(this.props.installedLibraries, manifest)
                );
                this.props.onInstallCustomExtensionLibrary(manifest);
                // eslint-disable-next-line no-alert
                alert(this.props.intl.formatMessage(messages.importSuccess, {name: manifest.name}));
            });
    }
    handleImportFile (event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        readCustomExtensionPackage(file)
            .then(manifest => this.installManifest(manifest))
            .catch(error => {
                // eslint-disable-next-line no-alert
                alert(this.props.intl.formatMessage(messages.importFailure, {message: error.message}));
            })
            .finally(() => {
                event.target.value = null;
            });
    }
    handleExportLibrary (manifest) {
        if (!manifest) return;
        const blob = new Blob([
            JSON.stringify(serializeCustomExtensionManifest(manifest), null, 2)
        ], {type: 'application/json'});
        downloadBlob(`${manifest.id}.custom-extension.json`, blob);
    }
    handleDeleteLibrary (manifest) {
        if (!manifest) return;
        unregisterPythonCodegenManifest(manifest);
        const unloadPromise = this.props.vm.extensionManager.unregisterExtensionObject ?
            this.props.vm.extensionManager.unregisterExtensionObject(manifest.id) :
            Promise.resolve();
        unloadPromise.then(() => {
            saveInstalledCustomExtensionLibraries(
                removeInstalledCustomExtensionLibrary(this.props.installedLibraries, manifest.id)
            );
            this.props.onRemoveCustomExtensionLibrary(manifest.id);
        });
    }
    render () {
        return (
            <LibraryManagerComponent
                installedLibraries={this.props.installedLibraries}
                onDeleteLibrary={this.handleDeleteLibrary}
                onExportLibrary={this.handleExportLibrary}
                onImportFile={this.handleImportFile}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
}

LibraryManager.propTypes = {
    installedLibraries: PropTypes.arrayOf(PropTypes.shape({
        manifest: PropTypes.shape({
            id: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            version: PropTypes.string.isRequired
        }).isRequired
    })),
    intl: intlShape.isRequired,
    onInstallCustomExtensionLibrary: PropTypes.func.isRequired,
    onRemoveCustomExtensionLibrary: PropTypes.func.isRequired,
    onRequestClose: PropTypes.func.isRequired,
    onSetCustomExtensionLibraries: PropTypes.func.isRequired,
    vm: PropTypes.instanceOf(VM).isRequired
};

LibraryManager.defaultProps = {
    installedLibraries: []
};

const mapStateToProps = state => ({
    installedLibraries: state.scratchGui.customExtensions.installedLibraries,
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    onInstallCustomExtensionLibrary: manifest => dispatch(installCustomExtensionLibrary(manifest)),
    onRemoveCustomExtensionLibrary: extensionId => dispatch(removeCustomExtensionLibrary(extensionId)),
    onRequestClose: () => dispatch(closeLibraryManager()),
    onSetCustomExtensionLibraries: installedLibraries => dispatch(setCustomExtensionLibraries(installedLibraries))
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(LibraryManager));
