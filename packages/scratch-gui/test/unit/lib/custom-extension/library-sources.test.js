import {
    LIBRARY_SOURCE_TYPES,
    createUserLibraryItem,
    resolveProductLibraryItem
} from '../../../../src/lib/custom-extension/library-sources';

describe('custom extension library sources', () => {
    const catalogItem = {
        id: 'aimecanum',
        name: 'AI机甲麦轮车',
        version: '0.2.1',
        latestVersion: '0.2.1',
        status: 'available'
    };
    const bundledManifest = {id: 'aimecanum', version: '0.2.1'};

    test('uses the bundled manifest when no verified remote cache exists', () => {
        expect(resolveProductLibraryItem(catalogItem, bundledManifest)).toMatchObject({
            source: LIBRARY_SOURCE_TYPES.BUNDLED_DEFAULT,
            manifest: bundledManifest,
            offlineManifest: bundledManifest,
            bundledDefaultManifest: bundledManifest,
            cachedRemoteManifest: null,
            packageId: 'aimecanum',
            remoteSource: {
                packageId: 'aimecanum',
                type: LIBRARY_SOURCE_TYPES.REMOTE_REGISTRY
            }
        });
    });

    test('keeps the verified remote package as the offline manifest', () => {
        const remoteManifest = {id: 'aimecanum', version: '0.3.0'};
        expect(resolveProductLibraryItem({...catalogItem, status: 'planned'}, bundledManifest, {
            manifest: remoteManifest,
            version: '0.3.0'
        })).toMatchObject({
            source: LIBRARY_SOURCE_TYPES.REMOTE_CACHE,
            manifest: remoteManifest,
            offlineManifest: remoteManifest,
            cachedRemoteManifest: remoteManifest,
            bundledDefaultManifest: bundledManifest,
            status: 'available',
            version: '0.3.0',
            latestVersion: '0.3.0'
        });
    });

    test('uses a newer bundled package instead of an older remote cache', () => {
        const newerBundledManifest = {id: 'aimecanum', version: '0.2.2'};
        const olderCachedManifest = {id: 'aimecanum', version: '0.2.1'};
        expect(resolveProductLibraryItem(
            {...catalogItem, version: '0.2.2', latestVersion: '0.2.2'},
            newerBundledManifest,
            {manifest: olderCachedManifest, version: '0.2.1'},
            {packageId: 'aimecanum', version: '0.2.1'}
        )).toMatchObject({
            source: LIBRARY_SOURCE_TYPES.BUNDLED_DEFAULT,
            manifest: newerBundledManifest,
            version: '0.2.2',
            latestVersion: '0.2.2'
        });
    });

    test('shows the catalog version while continuing to use the offline manifest', () => {
        expect(resolveProductLibraryItem(catalogItem, bundledManifest, null, {
            packageId: 'aimecanum',
            version: '0.3.0'
        })).toMatchObject({
            source: LIBRARY_SOURCE_TYPES.BUNDLED_DEFAULT,
            manifest: bundledManifest,
            version: '0.2.1',
            latestVersion: '0.3.0',
            remoteSource: {
                package: {version: '0.3.0'}
            }
        });
    });

    test('marks a remote-only product as downloadable before it is cached', () => {
        expect(resolveProductLibraryItem(
            {...catalogItem, id: 'new-product', status: 'planned'},
            null,
            null,
            {packageId: 'new-product', version: '1.0.0'}
        )).toMatchObject({
            source: LIBRARY_SOURCE_TYPES.REMOTE_REGISTRY,
            manifest: null,
            status: 'downloadable',
            latestVersion: '1.0.0'
        });
    });

    test('maps an installed local package to the user source', () => {
        expect(createUserLibraryItem({
            enabled: false,
            manifest: {id: 'mydevice', name: 'My Device', version: '1.0.0'}
        })).toMatchObject({
            id: 'mydevice',
            source: LIBRARY_SOURCE_TYPES.USER_LOCAL,
            enabled: false,
            categoryId: 'user'
        });
    });
});
