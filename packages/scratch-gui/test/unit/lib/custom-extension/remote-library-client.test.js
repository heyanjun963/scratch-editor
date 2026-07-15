import {
    MAX_REMOTE_PACKAGE_SIZE,
    compareVersions,
    downloadRemoteLibraryPackage,
    loadRemoteLibraryCatalog
} from '../../../../src/lib/custom-extension/remote-library-client';

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
        await expect(loadRemoteLibraryCatalog({fetchImpl})).resolves.toEqual([
            expect.objectContaining({packageId: 'aimecanum', version: '0.3.0'})
        ]);
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
