import {
    loadInstalledCustomExtensionLibraries,
    removeInstalledCustomExtensionLibrary,
    upsertInstalledCustomExtensionLibrary
} from '../lib/custom-extension/persistence';

const INSTALL_CUSTOM_EXTENSION_LIBRARY = 'scratch-gui/custom-extensions/INSTALL_CUSTOM_EXTENSION_LIBRARY';
const REMOVE_CUSTOM_EXTENSION_LIBRARY = 'scratch-gui/custom-extensions/REMOVE_CUSTOM_EXTENSION_LIBRARY';
const SET_CUSTOM_EXTENSION_LIBRARIES = 'scratch-gui/custom-extensions/SET_CUSTOM_EXTENSION_LIBRARIES';

const initialState = {
    installedLibraries: loadInstalledCustomExtensionLibraries()
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;

    switch (action.type) {
    case SET_CUSTOM_EXTENSION_LIBRARIES:
        return {
            ...state,
            installedLibraries: action.installedLibraries
        };
    case INSTALL_CUSTOM_EXTENSION_LIBRARY: {
        const installedLibraries = upsertInstalledCustomExtensionLibrary(state.installedLibraries, action.manifest);
        return {
            ...state,
            installedLibraries
        };
    }
    case REMOVE_CUSTOM_EXTENSION_LIBRARY:
        return {
            ...state,
            installedLibraries: removeInstalledCustomExtensionLibrary(state.installedLibraries, action.extensionId)
        };
    default:
        return state;
    }
};

const installCustomExtensionLibrary = manifest => ({
    type: INSTALL_CUSTOM_EXTENSION_LIBRARY,
    manifest
});

const removeCustomExtensionLibrary = extensionId => ({
    type: REMOVE_CUSTOM_EXTENSION_LIBRARY,
    extensionId
});

const setCustomExtensionLibraries = installedLibraries => ({
    type: SET_CUSTOM_EXTENSION_LIBRARIES,
    installedLibraries
});

export {
    reducer as default,
    initialState as customExtensionsInitialState,
    installCustomExtensionLibrary,
    removeCustomExtensionLibrary,
    setCustomExtensionLibraries
};
