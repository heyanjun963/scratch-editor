import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import VM from '@scratch/scratch-vm';

import {
    ProductExtensionLibraryComponent
} from '../../../src/components/product-extension-library/product-extension-library';
import {normalizeCustomExtensionManifest} from '../../../src/lib/custom-extension/manifest-schema';
import {builtinProductManifests} from '../../../src/lib/custom-extension/builtin-product-manifests';
import {
    composeProductModuleManifest,
    getEnabledProductModuleIds,
    setProductModuleState
} from '../../../src/lib/custom-extension/product-module-support';
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

    test('enables only migrated sensors supported by the loaded product', async () => {
        const {rerender} = render(<ProductExtensionLibraryComponent {...props} />);
        await waitFor(() => expect(screen.getByRole('button', {name: '检查版本'}).disabled).toBe(false));
        fireEvent.click(screen.getByRole('button', {name: '模块扩展'}));

        expect(document.querySelector('article[title="旋钮"]')).toBeNull();
        expect(screen.getAllByText('旋钮')[0].closest('article').title).toContain('占位拓展');

        loadedExtensionIds.add('aihexa');
        rerender(<ProductExtensionLibraryComponent {...props} />);

        expect(document.querySelector('article[title="旋钮"]')).toBeTruthy();
        expect(document.querySelector('article[title="温湿度传感器"]')).toBeTruthy();
        expect(document.querySelector('article[title="六路巡线传感器"]')).toBeTruthy();
        expect(document.querySelector('article[title="四路巡线传感器"]')).toBeTruthy();
        expect(document.querySelector('article[title="旋钮四路巡线传感器"]')).toBeTruthy();
    });

    test('adds supported sensors to one shared input module extension', async () => {
        let extensionAddedHandler = null;
        loadedExtensionIds.add('aihexa');
        vm.addListener.mockImplementation((event, handler) => {
            if (event === 'EXTENSION_ADDED') extensionAddedHandler = handler;
        });
        vm.extensionManager.registerExtensionObject.mockImplementation((extensionId, extensionObject) => {
            loadedExtensionIds.add(extensionId);
            extensionAddedHandler({id: extensionId});
            return Promise.resolve(extensionObject);
        });

        render(<ProductExtensionLibraryComponent {...props} />);
        await waitFor(() => expect(screen.getByRole('button', {name: '检查版本'}).disabled).toBe(false));
        fireEvent.click(screen.getByRole('button', {name: '模块扩展'}));
        fireEvent.click(document.querySelector('article[title="旋钮"]'));

        await waitFor(() => expect(vm.extensionManager.registerExtensionObject).toHaveBeenCalledWith(
            'sensor',
            expect.any(Object)
        ));
        fireEvent.click(document.querySelector('article[title="声音传感器"]'));

        await waitFor(() => expect(vm.extensionManager.registerExtensionObject).toHaveBeenCalledTimes(2));
        const extensionObject = vm.extensionManager.registerExtensionObject.mock.calls[1][1];
        expect(extensionObject.getInfo().blocks.filter(block => block.subCategory)).toEqual([
            {subCategory: '旋钮'},
            {subCategory: '声音传感器'}
        ]);
        expect(getEnabledProductModuleIds(vm, 'sensor')).toEqual(['knob', 'sound-sensor']);
        expect(props.onCategorySelected).toHaveBeenLastCalledWith('sensor');
    });

    test('clears shared sensor state when switching the main product', async () => {
        let extensionAddedHandler = null;
        const sensorManifest = composeProductModuleManifest(builtinProductManifests.sensor, ['knob']);
        setProductModuleState(vm, 'sensor', ['knob'], sensorManifest);
        loadedExtensionIds.add('aihexa');
        loadedExtensionIds.add('sensor');
        vm.addListener.mockImplementation((event, handler) => {
            if (event === 'EXTENSION_ADDED') extensionAddedHandler = handler;
        });
        vm.extensionManager.registerExtensionObject.mockImplementation(extensionId => {
            loadedExtensionIds.add(extensionId);
            extensionAddedHandler({id: extensionId});
            return Promise.resolve();
        });

        render(<ProductExtensionLibraryComponent {...props} />);
        await waitFor(() => expect(screen.getByRole('button', {name: '检查版本'}).disabled).toBe(false));
        fireEvent.click(screen.getByText('AI机甲四足机器人').closest('article'));
        fireEvent.click(screen.getByRole('button', {name: '确定加载'}));

        await waitFor(() => expect(vm.extensionManager.unregisterExtensionObject).toHaveBeenCalledWith('sensor'));
        expect(getEnabledProductModuleIds(vm, 'sensor')).toEqual([]);
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

        await waitFor(() => expect(screen.getByText('0.2.3')).toBeTruthy());
        expect(screen.queryByText('0.2.4')).toBeNull();
        expect(screen.queryByRole('combobox')).toBeNull();

        fireEvent.click(screen.getByText('0.2.3'));
        expect(vm.extensionManager.registerExtensionObject).not.toHaveBeenCalled();
        expect(props.onRequestClose).not.toHaveBeenCalled();
    });

    test('renders a remote-only product as installable', async () => {
        loadRemoteLibraryCatalog.mockResolvedValueOnce([{
            packageId: 'aimech',
            name: 'AI机甲双驱车',
            version: '1.0.0',
            status: 'published',
            asset: 'aimech-1.0.0.mpext',
            downloadUrl: 'https://github.com/company/extensions/aimech-1.0.0.mpext',
            sha256: 'a'.repeat(64)
        }]);

        render(<ProductExtensionLibraryComponent {...props} />);

        const card = await screen.findByText('AI机甲双驱车').then(title => title.closest('article'));
        expect(card.className).not.toContain('cardDisabled');
        expect(card.getAttribute('title')).toBe('AI机甲双驱车');
        expect(screen.getByText('远程版本可下载安装。')).toBeTruthy();
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
