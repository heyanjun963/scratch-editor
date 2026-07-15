import {
    normalizeCustomExtensionManifest,
    serializeCustomExtensionManifest
} from './manifest-schema';

const STORAGE_KEY = 'scratchGui.customExtensionLibraries.v1';

// 浏览器模式只依赖 localStorage；桌面模式还会额外写入 Electron userData。
const canUseLocalStorage = () => {
    try {
        return typeof window !== 'undefined' && Boolean(window.localStorage);
    } catch {
        return false;
    }
};

// Redux 中同时保存安装包和启用状态；enabled=false 表示保留包但不注册到 VM。
const manifestToLibrary = (manifest, enabled = true) => ({
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    enabled,
    manifest
});

// 兼容旧版只保存 manifest 的记录，新记录使用 {manifest, enabled} 保存卸载状态。
const storedValueToLibrary = storedValue => {
    const rawManifest = storedValue && storedValue.manifest ? storedValue.manifest : storedValue;
    const enabled = storedValue && storedValue.manifest ? storedValue.enabled !== false : true;
    return manifestToLibrary(normalizeCustomExtensionManifest(rawManifest), enabled);
};

// 通过 preload 暴露的桌面持久化 API，浏览器运行时不存在。
const getDesktopCustomExtensionApi = () => (
    typeof window !== 'undefined' ?
        window.scratchDesktopCustomExtensions :
        null
);

// 从 localStorage 恢复已导入库，坏数据直接跳过，避免启动时阻塞编辑器。
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
                    return storedValueToLibrary(manifest);
                } catch {
                    return null;
                }
            })
            .filter(Boolean);
    } catch {
        return [];
    }
};

// 保存时同时写 localStorage 和桌面 userData，保证浏览器/桌面两种入口兼容。
const saveInstalledCustomExtensionLibraries = installedLibraries => {
    const manifests = installedLibraries.map(library => ({
        enabled: library.enabled !== false,
        manifest: serializeCustomExtensionManifest(library.manifest)
    }));

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

// 桌面端优先读取 userData，可跨 Electron 窗口和应用重启保留导入库。
const loadDesktopInstalledCustomExtensionLibraries = async () => {
    const desktopApi = getDesktopCustomExtensionApi();
    if (!desktopApi || typeof desktopApi.load !== 'function') return null;

    const payload = await desktopApi.load();
    const manifests = payload && Array.isArray(payload.manifests) ? payload.manifests : [];
    return manifests
        .map(manifest => {
            try {
                return storedValueToLibrary(manifest);
            } catch {
                return null;
            }
        })
        .filter(Boolean);
};

// 相同 id 的库再次导入时覆盖旧版本。
const upsertInstalledCustomExtensionLibrary = (installedLibraries, manifest) => (
    installedLibraries
        .filter(library => library.manifest.id !== manifest.id)
        .concat([manifestToLibrary(manifest, true)])
);

// 加载/卸载只切换 enabled，不删除用户已经导入的包内容。
const setInstalledCustomExtensionLibraryEnabled = (installedLibraries, extensionId, enabled) => (
    installedLibraries.map(library => (
        library.manifest.id === extensionId ? {...library, enabled} : library
    ))
);

// 删除库时只按 manifest id 过滤，调用方负责卸载 VM 和 codegen 模板。
const removeInstalledCustomExtensionLibrary = (installedLibraries, extensionId) => (
    installedLibraries.filter(library => library.manifest.id !== extensionId)
);

export {
    loadInstalledCustomExtensionLibraries,
    loadDesktopInstalledCustomExtensionLibraries,
    removeInstalledCustomExtensionLibrary,
    saveInstalledCustomExtensionLibraries,
    setInstalledCustomExtensionLibraryEnabled,
    upsertInstalledCustomExtensionLibrary
};
