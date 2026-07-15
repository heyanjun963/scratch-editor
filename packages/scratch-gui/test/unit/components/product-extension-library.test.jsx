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
        render(<ProductExtensionLibraryComponent {...props} />);
        await waitFor(() => expect(screen.getByRole('button', {name: '检查版本'}).disabled).toBe(false));

        fireEvent.click(screen.getByRole('button', {name: '模块扩展'}));
        expect(screen.queryByText('My Device')).toBeNull();

        fireEvent.click(screen.getByRole('button', {name: '用户拓展'}));
        expect(screen.getByText('My Device')).toBeTruthy();
    });

    test('renders the product version as an inert label', async () => {
        loadedExtensionIds.clear();
        render(<ProductExtensionLibraryComponent {...props} />);

        await waitFor(() => expect(screen.getByText('0.2.1')).toBeTruthy());
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
        downloadRemoteLibraryPackage.mockResolvedValue({
            data: new Uint8Array([1, 2, 3]).buffer,
            remotePackage
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
            manifest: {version: '0.3.0'}
        });
        expect(screen.getByText('0.3.0')).toBeTruthy();
    });
});
