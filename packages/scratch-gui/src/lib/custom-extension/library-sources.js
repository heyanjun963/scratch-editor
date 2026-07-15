const LIBRARY_SOURCE_TYPES = Object.freeze({
    BUNDLED_DEFAULT: 'bundled-default',
    REMOTE_CACHE: 'remote-cache',
    REMOTE_REGISTRY: 'remote-registry',
    USER_LOCAL: 'user-local'
});

// 离线优先使用最近一次校验成功的缓存包；内置配置只在没有有效缓存时作为最后兜底。
const resolveProductLibraryItem = (catalogItem, bundledManifest, cachedRemotePackage = null) => {
    const packageId = catalogItem.packageId || catalogItem.id;
    const hasBundledDefault = Boolean(bundledManifest || catalogItem.extensionId);
    const cachedRemoteManifest = cachedRemotePackage && cachedRemotePackage.manifest ?
        cachedRemotePackage.manifest :
        null;
    const offlineManifest = cachedRemoteManifest || bundledManifest || null;
    return {
        ...catalogItem,
        packageId,
        source: cachedRemoteManifest ?
            LIBRARY_SOURCE_TYPES.REMOTE_CACHE :
            (hasBundledDefault ? LIBRARY_SOURCE_TYPES.BUNDLED_DEFAULT : LIBRARY_SOURCE_TYPES.REMOTE_REGISTRY),
        manifest: offlineManifest,
        offlineManifest,
        cachedRemoteManifest,
        bundledDefaultManifest: bundledManifest || null,
        status: cachedRemoteManifest ? 'available' : catalogItem.status,
        version: offlineManifest && offlineManifest.version ? offlineManifest.version : catalogItem.version,
        latestVersion: cachedRemotePackage && cachedRemotePackage.version ?
            cachedRemotePackage.version :
            catalogItem.latestVersion,
        remoteSource: {
            type: LIBRARY_SOURCE_TYPES.REMOTE_REGISTRY,
            packageId
        }
    };
};

// 本地导入包只进入“用户拓展”，enabled 区分已经安装和当前加载两个状态。
const createUserLibraryItem = library => ({
    id: library.manifest.id,
    name: library.manifest.name,
    version: library.manifest.version,
    latestVersion: library.manifest.version,
    status: 'available',
    categoryId: 'user',
    categoryLabel: '用户拓展',
    source: LIBRARY_SOURCE_TYPES.USER_LOCAL,
    enabled: library.enabled !== false,
    manifest: library.manifest
});

export {
    LIBRARY_SOURCE_TYPES,
    createUserLibraryItem,
    resolveProductLibraryItem
};
