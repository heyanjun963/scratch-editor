import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import VM from '@scratch/scratch-vm';

import {
    ProductExtensionLibraryComponent
} from '../../../src/components/product-extension-library/product-extension-library';
import {normalizeCustomExtensionManifest} from '../../../src/lib/custom-extension/manifest-schema';
import {readCustomExtensionPackageBuffer} from '../../../src/lib/custom-extension/package-reader';
import {
    downloadRemoteLibraryPackage,
    loadRemoteLibraryCatalog
} from '../../../src/lib/custom-extension/remote-library-client';
import {
    getLatestCachedRemotePackage,
    loadCachedRemotePackages
} from '../../../src/lib/custom-extension/remote-library-cache';

jest.mock('../../../src/lib/custom-extension/package-reader', () => ({
    ...jest.requireActual('../../../src/lib/custom-extension/package-reader'),
    readCustomExtensionPackageBuffer: jest.fn()
}));

jest.mock('../../../src/lib/custom-extension/remote-library-client', () => ({
    ...jest.requireActual('../../../src/lib/custom-extension/remote-library-client'),
    downloadRemoteLibraryPackage: jest.fn(),
    loadRemoteLibraryCatalog: jest.fn()
}));

const manifest = normalizeCustomExtensionManifest({
    formatVersion: 1,
    id: 'mydevice',
    name: 'My Device',
    version: '1.0.0',
    blocks: [{
        opcode: 'run',
        blockType: 'command',
        text: 'run',
        arguments: {},
        codegen: {python: {template: 'run()'}}
    }]
});

const intl = {
    locale: 'zh-cn',
    formatMessage: (message, values = {}) => Object.keys(values).reduce(
        (text, key) => text.replace(`{${key}}`, values[key]),
        message.defaultMessage
    )
};

describe('ProductExtensionLibrary user extensions', () => {
    let loadedExtensionIds;
    let vm;
    let props;

    beforeEach(() => {
        window.localStorage.clear();
        window.alert = jest.fn();
        window.confirm = jest.fn(() => true);
        downloadRemoteLibraryPackage.mockReset();
        loadRemoteLibraryCatalog.mockReset().mockResolvedValue([]);
        readCustomExtensionPackageBuffer.mockReset();
        loadedExtensionIds = new Set(['mydevice']);
        vm = Object.create(VM.prototype);
        vm.emitWorkspaceUpdate = jest.fn();
        vm.addListener = jest.fn();
        vm.removeListener = jest.fn();
        vm.extensionManager = {
            isExtensionLoaded: jest.fn(extensionId => loadedExtensionIds.has(extensionId)),
            registerExtensionObject: jest.fn(extensionId => {
                loadedExtensionIds.add(extensionId);
                return Promise.resolve();
            }),
            unregisterExtensionObject: jest.fn(extensionId => {
                loadedExtensionIds.delete(extensionId);
                return Promise.resolve();
            })
        };
        props = {
            installedLibraries: [{enabled: true, manifest}],
            intl,
            onBuiltinExtensionSelect: jest.fn(),
            onCategorySelected: jest.fn(),
            onInstallCustomExtensionLibrary: jest.fn(),
            onRemoveCustomExtensionLibrary: jest.fn(),
            onRequestClose: jest.fn(),
            onSetCustomExtensionLibraries: jest.fn(),
            onSetCustomExtensionLibraryEnabled: jest.fn(),
            vm
        };
    });

    test('keeps local packages out of module extensions', async () => {
        const {container} = render(<ProductExtensionLibraryComponent {...props} />);
        await waitFor(() => expect(screen.getByRole('button', {name: '检查版本'}).disabled).toBe(false));

        expect(container.querySelector('input[type="file"]').getAttribute('accept')).toContain('.mpext');

        fireEvent.click(screen.getByRole('button', {name: '模块扩展'}));
        expect(screen.queryByText('My Device')).toBeNull();

        fireEvent.click(screen.getByRole('button', {name: '用户拓展'}));
        expect(screen.getByText('My Device')).toBeTruthy();
    });

    test('renders only products from the legacy main controller catalog', async () => {
        render(<ProductExtensionLibraryComponent {...props} />);
        await waitFor(() => expect(screen.getByRole('button', {name: '检查版本'}).disabled).toBe(false));

        [
            'AI机甲双驱车',
            'AI机甲麦轮车',
            'AI机甲四足机器人',
            'AI机甲四足竞赛版',
            'AI机甲六足机器人',
            'miniHexa',
            'AiDoggy'
        ].forEach(name => expect(screen.getByText(name)).toBeTruthy());
        ['MechDog', 'TonyBot', 'Qbot', 'AIBlocks 控制板', 'CoreX 控制器']
            .forEach(name => expect(screen.queryByText(name)).toBeNull());
        expect(screen.getByText('miniHexa').closest('article').getAttribute('title')).toBe('miniHexa');
    });

    test('renders the product version as an inert label', async () => {
        loadRemoteLibraryCatalog.mockResolvedValueOnce([{
            packageId: 'aimecanum',
            name: 'AI机甲麦轮车',
            version: '0.2.2',
            status: 'published',
            asset: 'aimecanum-0.2.2.sbext',
            downloadUrl: 'https://raw.githubusercontent.com/company/extensions/aimecanum-0.2.2.sbext',
            sha256: 'a'.repeat(64)
        }]);
        loadedExtensionIds.clear();
        render(<ProductExtensionLibraryComponent {...props} />);

        await waitFor(() => expect(screen.getByText('0.2.1')).toBeTruthy());
        expect(screen.queryByText('0.2.2')).toBeNull();
        expect(screen.queryByRole('combobox')).toBeNull();

        fireEvent.click(screen.getByText('0.2.1'));
        expect(vm.extensionManager.registerExtensionObject).not.toHaveBeenCalled();
        expect(props.onRequestClose).not.toHaveBeenCalled();
    });

    test('unloads a user extension without deleting its package', async () => {
        render(<ProductExtensionLibraryComponent {...props} />);
        await waitFor(() => expect(screen.getByRole('button', {name: '检查版本'}).disabled).toBe(false));
        fireEvent.click(screen.getByRole('button', {name: '用户拓展'}));
        fireEvent.click(screen.getByRole('button', {name: '卸载'}));

        await waitFor(() => expect(vm.extensionManager.unregisterExtensionObject).toHaveBeenCalledWith('mydevice'));
        expect(props.onSetCustomExtensionLibraryEnabled).toHaveBeenCalledWith('mydevice', false);
        expect(props.onRemoveCustomExtensionLibrary).not.toHaveBeenCalled();
        expect(vm.emitWorkspaceUpdate).toHaveBeenCalled();
        expect(screen.getByText('My Device')).toBeTruthy();
        expect(screen.getByRole('button', {name: '加载'})).toBeTruthy();
    });

    test('downloads and caches a confirmed product update', async () => {
        const remotePackage = {
            packageId: 'aimecanum',
            name: 'AI机甲麦轮车',
            version: '0.3.0',
            status: 'published',
            asset: 'aimecanum-0.3.0.sbext',
            downloadUrl: 'https://github.com/company/extensions/aimecanum-0.3.0.sbext',
            sha256: 'a'.repeat(64)
        };
        const remoteManifest = normalizeCustomExtensionManifest({
            formatVersion: 1,
            id: 'aimecanum',
            name: 'AI机甲麦轮车',
            version: '0.3.0',
            blocks: [{
                opcode: 'run',
                blockType: 'command',
                text: 'run',
                arguments: {},
                codegen: {python: {template: 'run()'}}
            }]
        });
        loadRemoteLibraryCatalog
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([remotePackage]);
        const downloadedRemotePackage = {
            ...remotePackage,
            provider: 'gitee',
            repository: 'wdadsd/scratch-product-extensions',
            resolvedDownloadUrl: 'https://gitee.com/api/v5/repos/wdadsd/scratch-product-extensions/contents/' +
                'dist/aimecanum-0.3.0.sbext?ref=main',
            resolvedSourceType: 'gitee-contents'
        };
        downloadRemoteLibraryPackage.mockResolvedValue({
            data: new Uint8Array([1, 2, 3]).buffer,
            remotePackage: downloadedRemotePackage
        });
        readCustomExtensionPackageBuffer.mockResolvedValue(remoteManifest);
        loadedExtensionIds.clear();

        render(<ProductExtensionLibraryComponent {...props} />);
        await waitFor(() => expect(screen.getByRole('button', {name: '检查版本'}).disabled).toBe(false));
        fireEvent.click(screen.getByRole('button', {name: '检查版本'}));

        await waitFor(() => expect(downloadRemoteLibraryPackage).toHaveBeenCalledWith(remotePackage));
        expect(window.confirm).toHaveBeenCalled();
        expect(getLatestCachedRemotePackage(loadCachedRemotePackages(), 'aimecanum')).toMatchObject({
            version: '0.3.0',
            provider: 'gitee',
            repository: 'wdadsd/scratch-product-extensions',
            resolvedDownloadUrl: downloadedRemotePackage.resolvedDownloadUrl,
            resolvedSourceType: 'gitee-contents',
            manifest: {version: '0.3.0'}
        });
        expect(screen.getByText('0.3.0')).toBeTruthy();
    });
});
