import {
    normalizeCustomExtensionManifest,
    serializeCustomExtensionManifest
} from './manifest-schema';

const STORAGE_KEY = 'scratchGui.customExtensionLibraries.v1';

const canUseLocalStorage = () => {
    try {
        return typeof window !== 'undefined' && Boolean(window.localStorage);
    } catch {
        return false;
    }
};

const manifestToLibrary = manifest => ({
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    manifest
});

const getDesktopCustomExtensionApi = () => (
    typeof window !== 'undefined' ?
        window.scratchDesktopCustomExtensions :
        null
);

const loadInstalledCustomExtensionLibraries = () => {
    if (!canUseLocalStorage()) return [];

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const manifests = JSON.parse(raw);
        if (!Array.isArray(manifests)) return [];
        return manifests
            .map(manifest => {
                try {
                    return manifestToLibrary(normalizeCustomExtensionManifest(manifest));
                } catch {
                    return null;
                }
            })
            .filter(Boolean);
    } catch {
        return [];
    }
};

const saveInstalledCustomExtensionLibraries = installedLibraries => {
    const manifests = installedLibraries.map(library => (
        serializeCustomExtensionManifest(library.manifest)
    ));

    if (canUseLocalStorage()) {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(manifests));
        } catch {
            // Ignore persistence failures. Import/export should still work in-memory.
        }
    }

    const desktopApi = getDesktopCustomExtensionApi();
    if (desktopApi && typeof desktopApi.save === 'function') {
        desktopApi.save(manifests).catch(() => {});
    }
};

const loadDesktopInstalledCustomExtensionLibraries = async () => {
    const desktopApi = getDesktopCustomExtensionApi();
    if (!desktopApi || typeof desktopApi.load !== 'function') return null;

    const payload = await desktopApi.load();
    const manifests = payload && Array.isArray(payload.manifests) ? payload.manifests : [];
    return manifests
        .map(manifest => {
            try {
                return manifestToLibrary(normalizeCustomExtensionManifest(manifest));
            } catch {
                return null;
            }
        })
        .filter(Boolean);
};

const upsertInstalledCustomExtensionLibrary = (installedLibraries, manifest) => (
    installedLibraries
        .filter(library => library.manifest.id !== manifest.id)
        .concat([manifestToLibrary(manifest)])
);

const removeInstalledCustomExtensionLibrary = (installedLibraries, extensionId) => (
    installedLibraries.filter(library => library.manifest.id !== extensionId)
);

export {
    loadInstalledCustomExtensionLibraries,
    loadDesktopInstalledCustomExtensionLibraries,
    removeInstalledCustomExtensionLibrary,
    saveInstalledCustomExtensionLibraries,
    upsertInstalledCustomExtensionLibrary
};
