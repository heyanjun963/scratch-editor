import {normalizeCustomExtensionManifest, serializeCustomExtensionManifest} from './manifest-schema';
import {compareVersions} from './remote-library-client';

const STORAGE_KEY = 'scratchGui.remoteProductExtensionPackages.v1';

const canUseLocalStorage = () => {
    try {
        return typeof window !== 'undefined' && Boolean(window.localStorage);
    } catch {
        return false;
    }
};

const normalizeCachedRemotePackage = cachedPackage => {
    const packageId = String(cachedPackage && cachedPackage.packageId || '');
    const version = String(cachedPackage && cachedPackage.version || '');
    const sha256 = String(cachedPackage && cachedPackage.sha256 || '').toLowerCase();
    const manifest = normalizeCustomExtensionManifest(cachedPackage.manifest);
    compareVersions(version, version);
    if (!/^[a-z][a-z0-9_-]*$/.test(packageId) || !/^[a-f0-9]{64}$/.test(sha256)) {
        throw new Error('远程产品缓存元数据不合法');
    }
    if (manifest.id !== packageId || manifest.version !== version) {
        throw new Error('远程产品缓存与 manifest 不一致');
    }
    return {
        packageId,
        version,
        provider: String(cachedPackage.provider || ''),
        repository: String(cachedPackage.repository || ''),
        tag: String(cachedPackage.tag || ''),
        asset: String(cachedPackage.asset || ''),
        downloadUrl: String(cachedPackage.downloadUrl || ''),
        resolvedDownloadUrl: String(cachedPackage.resolvedDownloadUrl || ''),
        resolvedSourceType: String(cachedPackage.resolvedSourceType || ''),
        sha256,
        cachedAt: String(cachedPackage.cachedAt || ''),
        manifest
    };
};

// localStorage 在 Web 和 Electron 中都会持久化；损坏条目单独跳过，不影响其他离线产品。
const loadCachedRemotePackages = () => {
    if (!canUseLocalStorage()) return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const cachedPackages = JSON.parse(raw);
        if (!Array.isArray(cachedPackages)) return [];
        return cachedPackages.map(cachedPackage => {
            try {
                return normalizeCachedRemotePackage(cachedPackage);
            } catch {
                return null;
            }
        }).filter(Boolean);
    } catch {
        return [];
    }
};

const saveCachedRemotePackages = cachedPackages => {
    if (!canUseLocalStorage()) return;
    const serializedPackages = cachedPackages.map(cachedPackage => ({
        ...cachedPackage,
        manifest: serializeCustomExtensionManifest(cachedPackage.manifest)
    }));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializedPackages));
};

// 相同产品和版本只保留最后一次校验结果，不删除其他历史版本，为项目版本锁定预留缓存。
const upsertCachedRemotePackage = (cachedPackages, cachedPackage) => cachedPackages
    .filter(item => !(item.packageId === cachedPackage.packageId && item.version === cachedPackage.version))
    .concat([normalizeCachedRemotePackage(cachedPackage)]);

const getLatestCachedRemotePackage = (cachedPackages, packageId) => cachedPackages
    .filter(cachedPackage => cachedPackage.packageId === packageId)
    .sort((left, right) => compareVersions(right.version, left.version))[0] || null;

export {
    getLatestCachedRemotePackage,
    loadCachedRemotePackages,
    saveCachedRemotePackages,
    upsertCachedRemotePackage
};
