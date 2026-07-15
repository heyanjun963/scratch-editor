import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import VM from '@scratch/scratch-vm';

import {
    ProductExtensionLibraryComponent
} from '../../../src/components/product-extension-library/product-extension-library';
import {normalizeCustomExtensionManifest} from '../../../src/lib/custom-extension/manifest-schema';

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

    test('keeps local packages out of module extensions', () => {
        render(<ProductExtensionLibraryComponent {...props} />);

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
        fireEvent.click(screen.getByRole('button', {name: '用户拓展'}));
        fireEvent.click(screen.getByRole('button', {name: '卸载'}));

        await waitFor(() => expect(vm.extensionManager.unregisterExtensionObject).toHaveBeenCalledWith('mydevice'));
        expect(props.onSetCustomExtensionLibraryEnabled).toHaveBeenCalledWith('mydevice', false);
        expect(props.onRemoveCustomExtensionLibrary).not.toHaveBeenCalled();
        expect(vm.emitWorkspaceUpdate).toHaveBeenCalled();
        expect(screen.getByText('My Device')).toBeTruthy();
        expect(screen.getByRole('button', {name: '加载'})).toBeTruthy();
    });
});
