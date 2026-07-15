import {normalizeCustomExtensionManifest} from '../../../../src/lib/custom-extension/manifest-schema';
import {
    getLatestCachedRemotePackage,
    loadCachedRemotePackages,
    saveCachedRemotePackages,
    upsertCachedRemotePackage
} from '../../../../src/lib/custom-extension/remote-library-cache';

const createCachedPackage = version => ({
    packageId: 'aimecanum',
    version,
    provider: 'github',
    repository: 'company/extensions',
    tag: `aimecanum-v${version}`,
    asset: `aimecanum-${version}.sbext`,
    downloadUrl: `https://github.com/company/extensions/releases/${version}`,
    sha256: 'a'.repeat(64),
    cachedAt: '2026-07-15T00:00:00.000Z',
    manifest: normalizeCustomExtensionManifest({
        formatVersion: 1,
        id: 'aimecanum',
        name: 'AI机甲麦轮车',
        version,
        blocks: [{
            opcode: 'run',
            blockType: 'command',
            text: 'run',
            arguments: {},
            codegen: {python: {template: 'run()'}}
        }]
    })
});

describe('remote product extension cache', () => {
    beforeEach(() => window.localStorage.clear());

    test('persists verified manifests and keeps historical versions', () => {
        const first = createCachedPackage('0.2.1');
        const second = createCachedPackage('0.3.0');
        const cachedPackages = upsertCachedRemotePackage(
            upsertCachedRemotePackage([], first),
            second
        );

        saveCachedRemotePackages(cachedPackages);
        const restoredPackages = loadCachedRemotePackages();
        expect(restoredPackages).toHaveLength(2);
        expect(getLatestCachedRemotePackage(restoredPackages, 'aimecanum')).toMatchObject({
            version: '0.3.0',
            manifest: {version: '0.3.0'}
        });
    });

    test('ignores a cache entry whose version does not match its manifest', () => {
        const cachedPackage = createCachedPackage('0.2.1');
        window.localStorage.setItem(
            'scratchGui.remoteProductExtensionPackages.v1',
            JSON.stringify([{...cachedPackage, version: '0.3.0'}])
        );
        expect(loadCachedRemotePackages()).toEqual([]);
    });
});
