import {TextDecoder} from 'util';

import {
    DEFAULT_REMOTE_CATALOG_SOURCES,
    MAX_REMOTE_PACKAGE_SIZE,
    compareVersions,
    downloadRemoteLibraryPackage,
    loadRemoteLibraryCatalog
} from '../../../../src/lib/custom-extension/remote-library-client';

global.TextDecoder = TextDecoder;

const remotePackage = {
    packageId: 'aimecanum',
    name: 'AI机甲麦轮车',
    version: '0.3.0',
    status: 'published',
    asset: 'aimecanum-0.3.0.sbext',
    downloadUrl: 'https://github.com/company/extensions/aimecanum-0.3.0.sbext',
    sha256: 'a'.repeat(64)
};

describe('remote product extension client', () => {
    test('compares stable and prerelease semantic versions', () => {
        expect(compareVersions('0.3.0', '0.2.1')).toBe(1);
        expect(compareVersions('1.0.0-beta.2', '1.0.0-beta.1')).toBe(1);
        expect(compareVersions('1.0.0', '1.0.0-beta.2')).toBe(1);
        expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    });

    test('loads only published catalog packages', async () => {
        const fetchImpl = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                formatVersion: 1,
                packages: [remotePackage, {...remotePackage, packageId: 'draft-product', status: 'draft'}]
            })
        });
        await expect(loadRemoteLibraryCatalog({
            catalogUrl: 'https://example.com/catalog.json',
            fetchImpl
        })).resolves.toEqual([
            expect.objectContaining({packageId: 'aimecanum', version: '0.3.0'})
        ]);
    });

    test('accepts Mind+ MPEXT assets while keeping SBEXT compatibility', async () => {
        const mindPlusPackage = {
            ...remotePackage,
            asset: 'aidoggy-0.1.0.mpext',
            downloadUrl: 'https://example.com/aidoggy-0.1.0.mpext'
        };
        const fetchImpl = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({formatVersion: 1, packages: [mindPlusPackage, remotePackage]})
        });

        await expect(loadRemoteLibraryCatalog({
            catalogUrl: 'https://example.com/catalog.json',
            fetchImpl
        })).resolves.toEqual([
            expect.objectContaining({asset: 'aidoggy-0.1.0.mpext'}),
            expect.objectContaining({asset: 'aimecanum-0.3.0.sbext'})
        ]);
    });

    test('loads a catalog from Gitee Contents and adds a Gitee package source', async () => {
        const catalog = JSON.stringify({
            formatVersion: 1,
            packages: [{...remotePackage, name: 'AI Mecanum'}]
        });
        const fetchImpl = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                type: 'file',
                encoding: 'base64',
                content: btoa(catalog),
                size: catalog.length
            })
        });

        await expect(loadRemoteLibraryCatalog({
            catalogSources: [DEFAULT_REMOTE_CATALOG_SOURCES[0]],
            fetchImpl
        })).resolves.toEqual([
            expect.objectContaining({
                packageId: 'aimecanum',
                sources: [
                    expect.objectContaining({
                        type: 'gitee-contents',
                        repository: 'wdadsd/scratch-product-extensions',
                        path: 'dist/aimecanum-0.3.0.sbext'
                    }),
                    expect.objectContaining({type: 'direct', url: remotePackage.downloadUrl})
                ]
            })
        ]);
        expect(fetchImpl).toHaveBeenCalledWith(
            'https://gitee.com/api/v5/repos/wdadsd/scratch-product-extensions/contents/catalog.json?ref=main',
            {cache: 'no-store'}
        );
    });

    test('falls back to the direct catalog when Gitee is unavailable', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const fetchImpl = jest.fn()
            .mockResolvedValueOnce({ok: false, status: 503})
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({formatVersion: 1, packages: [remotePackage]})
            });

        await expect(loadRemoteLibraryCatalog({fetchImpl})).resolves.toEqual([
            expect.objectContaining({packageId: 'aimecanum'})
        ]);
        expect(fetchImpl).toHaveBeenCalledTimes(2);
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining('loadRemoteLibraryCatalog'),
            expect.any(Error)
        );
        warn.mockRestore();
    });

    test('rejects a downloaded package when SHA256 does not match', async () => {
        const fetchImpl = jest.fn().mockResolvedValue({
            ok: true,
            arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer)
        });
        await expect(downloadRemoteLibraryPackage(remotePackage, {
            fetchImpl,
            sha256Impl: () => Promise.resolve('b'.repeat(64))
        })).rejects.toThrow('SHA256 校验失败');
    });

    test('rejects an asset path that can escape the dist directory', async () => {
        await expect(downloadRemoteLibraryPackage({
            ...remotePackage,
            asset: '../aimecanum-0.3.0.sbext'
        })).rejects.toThrow('拓展包 asset');
    });

    test('returns verified release bytes', async () => {
        const data = new Uint8Array([1, 2, 3]).buffer;
        await expect(downloadRemoteLibraryPackage(remotePackage, {
            fetchImpl: () => Promise.resolve({ok: true, arrayBuffer: () => Promise.resolve(data)}),
            sha256Impl: () => Promise.resolve('a'.repeat(64))
        })).resolves.toMatchObject({
            data,
            remotePackage: {packageId: 'aimecanum'}
        });
    });

    test('decodes and verifies a package from Gitee Contents', async () => {
        const giteePackage = {
            ...remotePackage,
            sources: [{
                type: 'gitee-contents',
                repository: 'wdadsd/scratch-product-extensions',
                ref: 'main',
                path: 'dist/aimecanum-0.3.0.sbext'
            }]
        };
        const fetchImpl = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                type: 'file',
                encoding: 'base64',
                content: btoa(String.fromCharCode(1, 2, 3)),
                size: 3
            })
        });

        const result = await downloadRemoteLibraryPackage(giteePackage, {
            fetchImpl,
            sha256Impl: () => Promise.resolve('a'.repeat(64))
        });

        expect(Array.from(new Uint8Array(result.data))).toEqual([1, 2, 3]);
        expect(result.remotePackage).toMatchObject({
            provider: 'gitee',
            repository: 'wdadsd/scratch-product-extensions',
            downloadUrl: remotePackage.downloadUrl,
            resolvedDownloadUrl: expect.stringContaining('/contents/dist/aimecanum-0.3.0.sbext'),
            resolvedSourceType: 'gitee-contents'
        });
    });

    test('uses the direct package source when the Gitee package fails verification', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const giteePackage = {
            ...remotePackage,
            sources: [{
                type: 'gitee-contents',
                repository: 'wdadsd/scratch-product-extensions',
                ref: 'main',
                path: 'dist/aimecanum-0.3.0.sbext'
            }, {
                type: 'direct',
                url: remotePackage.downloadUrl
            }]
        };
        const fetchImpl = jest.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    type: 'file',
                    encoding: 'base64',
                    content: btoa(String.fromCharCode(9)),
                    size: 1
                })
            })
            .mockResolvedValueOnce({
                ok: true,
                arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer)
            });
        const sha256Impl = jest.fn()
            .mockResolvedValueOnce('b'.repeat(64))
            .mockResolvedValueOnce('a'.repeat(64));

        await expect(downloadRemoteLibraryPackage(giteePackage, {
            fetchImpl,
            sha256Impl
        })).resolves.toMatchObject({
            remotePackage: {
                packageId: 'aimecanum',
                resolvedSourceType: 'direct'
            }
        });
        expect(fetchImpl).toHaveBeenCalledTimes(2);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });

    test('rejects a package larger than the remote size limit', async () => {
        const arrayBuffer = jest.fn();
        await expect(downloadRemoteLibraryPackage(remotePackage, {
            fetchImpl: () => Promise.resolve({
                ok: true,
                headers: {get: () => String(MAX_REMOTE_PACKAGE_SIZE + 1)},
                arrayBuffer
            })
        })).rejects.toThrow('大小超过');
        expect(arrayBuffer).not.toHaveBeenCalled();
    });
});
