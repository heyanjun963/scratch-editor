import classNames from 'classnames';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {defineMessages, injectIntl} from 'react-intl';
import VM from '@scratch/scratch-vm';

import intlShape from '../../lib/intlShape.js';
import downloadBlob from '../../lib/download-blob';
import {builtinProductManifests} from '../../lib/custom-extension/builtin-product-manifests';
import {productExtensionCatalog} from '../../lib/custom-extension/product-extension-catalog.js';
import {
    LIBRARY_SOURCE_TYPES,
    createUserLibraryItem,
    resolveProductLibraryItem
} from '../../lib/custom-extension/library-sources';
import {serializeCustomExtensionManifest} from '../../lib/custom-extension/manifest-schema';
import {manifestToExtensionObject} from '../../lib/custom-extension/manifest-to-extension';
import {
    readCustomExtensionPackage,
    readCustomExtensionPackageBuffer
} from '../../lib/custom-extension/package-reader';
import {
    compareVersions,
    downloadRemoteLibraryPackage,
    loadRemoteLibraryCatalog
} from '../../lib/custom-extension/remote-library-client';
import {
    getLatestCachedRemotePackage,
    loadCachedRemotePackages,
    saveCachedRemotePackages,
    upsertCachedRemotePackage
} from '../../lib/custom-extension/remote-library-cache';
import {
    registerPythonCodegenManifest,
    unregisterPythonCodegenManifest
} from '../../lib/custom-extension/codegen-registry';
import {
    loadDesktopInstalledCustomExtensionLibraries,
    removeInstalledCustomExtensionLibrary,
    saveInstalledCustomExtensionLibraries,
    setInstalledCustomExtensionLibraryEnabled,
    upsertInstalledCustomExtensionLibrary
} from '../../lib/custom-extension/persistence';
import {
    installCustomExtensionLibrary,
    removeCustomExtensionLibrary,
    setCustomExtensionLibraries,
    setCustomExtensionLibraryEnabled
} from '../../reducers/custom-extensions';

import styles from './product-extension-library.css';

const messages = defineMessages({
    title: {
        defaultMessage: '选择一个扩展',
        description: 'Title for the product extension library',
        id: 'gui.productExtensionLibrary.title'
    },
    back: {
        defaultMessage: '返回',
        description: 'Back button in the product extension library',
        id: 'gui.productExtensionLibrary.back'
    },
    uploadMode: {
        defaultMessage: '上传模式',
        description: 'Upload mode label in the product extension library',
        id: 'gui.productExtensionLibrary.uploadMode'
    },
    mainExtensions: {
        defaultMessage: '主控扩展',
        description: 'Main extensions tab in the product extension library',
        id: 'gui.productExtensionLibrary.mainExtensions'
    },
    moduleExtensions: {
        defaultMessage: '模块扩展',
        description: 'Module extensions tab in the product extension library',
        id: 'gui.productExtensionLibrary.moduleExtensions'
    },
    userExtensions: {
        defaultMessage: '用户拓展',
        description: 'User extensions tab in the product extension library',
        id: 'gui.productExtensionLibrary.userExtensions'
    },
    searchPlaceholder: {
        defaultMessage: '搜索',
        description: 'Search placeholder for the product extension library',
        id: 'gui.productExtensionLibrary.searchPlaceholder'
    },
    advancedFilter: {
        defaultMessage: '高级筛选',
        description: 'Advanced filter label in the product extension library',
        id: 'gui.productExtensionLibrary.advancedFilter'
    },
    boards: {
        defaultMessage: '机器人',
        description: 'Main board chip in the product extension library',
        id: 'gui.productExtensionLibrary.boards'
    },
    kits: {
        defaultMessage: '控制器',
        description: 'Kit chip in the product extension library',
        id: 'gui.productExtensionLibrary.kits'
    },
    inputModule: {
        defaultMessage: '输入模块',
        description: 'Input module category filter in the product extension library',
        id: 'gui.productExtensionLibrary.inputModule'
    },
    powerModule: {
        defaultMessage: '动力模块',
        description: 'Power module category filter in the product extension library',
        id: 'gui.productExtensionLibrary.powerModule'
    },
    outputModule: {
        defaultMessage: '输出模块',
        description: 'Output module category filter in the product extension library',
        id: 'gui.productExtensionLibrary.outputModule'
    },
    communicationModule: {
        defaultMessage: '通信模块',
        description: 'Communication module category filter in the product extension library',
        id: 'gui.productExtensionLibrary.communicationModule'
    },
    functionModule: {
        defaultMessage: '功能模块',
        description: 'Function module category filter in the product extension library',
        id: 'gui.productExtensionLibrary.functionModule'
    },
    loaded: {
        defaultMessage: '已加载',
        description: 'Loaded extension status in the product extension library',
        id: 'gui.productExtensionLibrary.loaded'
    },
    checkVersion: {
        defaultMessage: '检查版本',
        description: 'Button label for checking extension versions',
        id: 'gui.productExtensionLibrary.checkVersion'
    },
    checkingVersion: {
        defaultMessage: '检查中...',
        description: 'Button label while checking extension versions',
        id: 'gui.productExtensionLibrary.checkingVersion'
    },
    updatingVersion: {
        defaultMessage: '更新中...',
        description: 'Button label while updating a product extension',
        id: 'gui.productExtensionLibrary.updatingVersion'
    },
    noUpdates: {
        defaultMessage: '当前产品拓展已经是最新版本。',
        description: 'Notice shown when all product extensions are current',
        id: 'gui.productExtensionLibrary.noUpdates'
    },
    checkVersionFailure: {
        defaultMessage: '检查产品拓展版本失败：{message}',
        description: 'Failure notice for the remote product extension catalog',
        id: 'gui.productExtensionLibrary.checkVersionFailure'
    },
    updateConfirm: {
        defaultMessage: '发现 {name} {latestVersion}，当前版本为 {currentVersion}。是否下载更新？',
        description: 'Confirmation before downloading a product extension update',
        id: 'gui.productExtensionLibrary.updateConfirm'
    },
    updateSuccess: {
        defaultMessage: '{name} 已更新到 {version}，离线时将继续使用此版本。',
        description: 'Success notice after caching a product extension update',
        id: 'gui.productExtensionLibrary.updateSuccess'
    },
    updateFailure: {
        defaultMessage: '{name} 更新失败：{message}',
        description: 'Failure notice after downloading a product extension update',
        id: 'gui.productExtensionLibrary.updateFailure'
    },
    importLocal: {
        defaultMessage: '导入本地库',
        description: 'Button label for importing a local extension library',
        id: 'gui.productExtensionLibrary.importLocal'
    },
    uploadLibrary: {
        defaultMessage: '上传拓展库',
        description: 'Button label for uploading an extension library',
        id: 'gui.productExtensionLibrary.uploadLibrary'
    },
    defaultSort: {
        defaultMessage: '默认排序',
        description: 'Default sort button in extension library',
        id: 'gui.productExtensionLibrary.defaultSort'
    },
    empty: {
        defaultMessage: '没有匹配的拓展。',
        description: 'Empty extension library state',
        id: 'gui.productExtensionLibrary.empty'
    },
    userEmpty: {
        defaultMessage: '尝试导入你的拓展试试看吧',
        description: 'Empty state for user extensions',
        id: 'gui.productExtensionLibrary.userEmpty'
    },
    unavailableNotice: {
        defaultMessage: '{name} 是占位拓展。后台发布积木包后，可在这里获取最新版。',
        description: 'Notice shown when a placeholder extension is clicked',
        id: 'gui.productExtensionLibrary.unavailableNotice'
    },
    detailNotice: {
        defaultMessage: '{name} 已在新版拓展库中预留。接入后台后，这里会显示详细包信息。',
        description: 'Notice shown for reserved extension details',
        id: 'gui.productExtensionLibrary.detailNotice'
    },
    uploadNotice: {
        defaultMessage: '云端上传入口已预留，下一步会接入公司后台上传和审核。',
        description: 'Notice shown for reserved upload entry',
        id: 'gui.productExtensionLibrary.uploadNotice'
    },
    localImportNotice: {
        defaultMessage: '本地导入支持 .json、.zip、.sbext 和 Mind+ Python .mpext 拓展包。',
        description: 'Notice shown for reserved local import entry',
        id: 'gui.productExtensionLibrary.localImportNotice'
    },
    load: {
        defaultMessage: '加载',
        description: 'Load an installed user extension',
        id: 'gui.productExtensionLibrary.load'
    },
    unload: {
        defaultMessage: '卸载',
        description: 'Unload an installed user extension',
        id: 'gui.productExtensionLibrary.unload'
    },
    delete: {
        defaultMessage: '删除',
        description: 'Delete an installed user extension package',
        id: 'gui.productExtensionLibrary.delete'
    },
    urlImport: {
        defaultMessage: 'URL 导入',
        description: 'Import a user extension from a URL',
        id: 'gui.productExtensionLibrary.urlImport'
    },
    urlImportNotice: {
        defaultMessage: 'URL 导入入口已预留，后续接入 GitHub、Gitee 或公司拓展包地址。',
        description: 'Notice shown for the reserved URL import entry',
        id: 'gui.productExtensionLibrary.urlImportNotice'
    },
    availableDescription: {
        defaultMessage: '当前内置可加载的基础拓展。',
        description: 'Description for available built-in extensions',
        id: 'gui.productExtensionLibrary.availableDescription'
    },
    placeholderDescription: {
        defaultMessage: '占位展示，等待后台发布积木包。',
        description: 'Description for placeholder extensions',
        id: 'gui.productExtensionLibrary.placeholderDescription'
    },
    localDescription: {
        defaultMessage: '已导入的本地拓展库，可继续管理和使用。',
        description: 'Description for local custom extension libraries',
        id: 'gui.productExtensionLibrary.localDescription'
    },
    bundledSource: {
        defaultMessage: '内置默认',
        description: 'Bundled default product source label',
        id: 'gui.productExtensionLibrary.bundledSource'
    },
    remoteSource: {
        defaultMessage: '后台拓展库',
        description: 'Remote registry product source label',
        id: 'gui.productExtensionLibrary.remoteSource'
    },
    userSource: {
        defaultMessage: '用户导入',
        description: 'User imported package source label',
        id: 'gui.productExtensionLibrary.userSource'
    },
    importSuccess: {
        defaultMessage: '已导入本地拓展库：{name}',
        description: 'Success message after importing a custom extension library',
        id: 'gui.productExtensionLibrary.importSuccess'
    },
    importFailure: {
        defaultMessage: '导入本地拓展库失败：{message}',
        description: 'Failure message after importing a custom extension library',
        id: 'gui.productExtensionLibrary.importFailure'
    },
    export: {
        defaultMessage: '导出',
        description: 'Export local custom extension library menu item',
        id: 'gui.productExtensionLibrary.export'
    },
    switchProductTitle: {
        defaultMessage: '提示',
        description: 'Title for switching product confirmation dialog',
        id: 'gui.productExtensionLibrary.switchProductTitle'
    },
    switchProductBody: {
        defaultMessage: '上传模式加载新的机器人或控制器需要清除当前扩展，是否清除？',
        description: 'Body for switching product confirmation dialog',
        id: 'gui.productExtensionLibrary.switchProductBody'
    },
    switchProductCancel: {
        defaultMessage: '返回',
        description: 'Cancel button for switching product confirmation dialog',
        id: 'gui.productExtensionLibrary.switchProductCancel'
    },
    switchProductConfirm: {
        defaultMessage: '确定加载',
        description: 'Confirm button for switching product confirmation dialog',
        id: 'gui.productExtensionLibrary.switchProductConfirm'
    }
});

const mainCategoryIds = ['robots'];
const loadedExtensionIds = ['python-native', 'company-http'];
const categoryFilters = {
    main: [
        {id: 'robots', message: messages.boards}
    ],
    module: [
        {id: 'input', message: messages.inputModule},
        {id: 'power', message: messages.powerModule},
        {id: 'output', message: messages.outputModule},
        {id: 'communication', message: messages.communicationModule},
        {id: 'function', message: messages.functionModule}
    ],
    user: []
};

const getInitials = name => name
    .replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, '')
    .slice(0, 2)
    .toUpperCase();

// 产品目录按主控/模块铺平；内置默认包和后续后台包通过统一来源模型解析。
const getFlatCatalogItems = () => productExtensionCatalog.flatMap(section => section.children);

const getFlatItems = (activeTab, remoteCatalog = [], cachedRemotePackages = []) => (
    activeTab === 'user' ? [] : productExtensionCatalog
    .filter(section => (activeTab === 'main') === mainCategoryIds.includes(section.id))
    .flatMap(section => section.children.map(item => {
        const remotePackage = remoteCatalog.find(candidate => candidate.packageId === item.id) || null;
        const cachedRemotePackage = getLatestCachedRemotePackage(cachedRemotePackages, item.id);
        return {
            ...resolveProductLibraryItem(
                item,
                builtinProductManifests[item.id] || null,
                cachedRemotePackage,
                remotePackage
            ),
            categoryId: section.id,
            categoryLabel: section.label
        };
    }))
);

const getAvailableMainItems = (remoteCatalog, cachedRemotePackages) => getFlatItems(
    'main',
    remoteCatalog,
    cachedRemotePackages
).filter(item => item.status === 'available');

const getAvailableRemoteUpdates = (remoteCatalog, cachedRemotePackages) => {
    const localItems = new Map(getFlatCatalogItems().map(item => [item.id, item]));
    return remoteCatalog.filter(remotePackage => {
        const localItem = localItems.get(remotePackage.packageId);
        if (!localItem) return false;
        const cachedPackage = getLatestCachedRemotePackage(cachedRemotePackages, remotePackage.packageId);
        const bundledManifest = builtinProductManifests[remotePackage.packageId];
        const currentVersion = resolveProductLibraryItem(
            localItem,
            bundledManifest || null,
            cachedPackage
        ).version;
        return compareVersions(remotePackage.version, currentVersion) > 0;
    });
};

// 新版拓展库整页组件：负责产品筛选、本地库导入导出、内置产品加载和切换确认。
const ProductExtensionLibraryComponent = ({
    installedLibraries = [],
    intl,
    onInstallCustomExtensionLibrary,
    onBuiltinExtensionSelect,
    onCategorySelected = null,
    onRemoveCustomExtensionLibrary,
    onRequestClose,
    onSetCustomExtensionLibraries,
    onSetCustomExtensionLibraryEnabled,
    vm
}) => {
    const fileInputRef = useRef(null);
    const [activeTab, setActiveTab] = useState('main');
    const [chip, setChip] = useState('all');
    const [query, setQuery] = useState('');
    const [checking, setChecking] = useState(false);
    const [updatingPackageId, setUpdatingPackageId] = useState(null);
    const [remoteCatalog, setRemoteCatalog] = useState([]);
    const [cachedRemotePackages, setCachedRemotePackages] = useState(() => loadCachedRemotePackages());
    const [pendingSwitchItem, setPendingSwitchItem] = useState(null);
    const [, setExtensionStateVersion] = useState(0);

    // 目录请求只更新远程版本信息；失败时继续使用已经校验的缓存或软件内置默认包。
    const refreshRemoteCatalog = useCallback(() => {
        setChecking(true);
        return loadRemoteLibraryCatalog()
            .then(catalog => {
                setRemoteCatalog(catalog);
                return catalog;
            })
            .finally(() => setChecking(false));
    }, []);

    useEffect(() => {
        refreshRemoteCatalog().catch(() => {});
    }, [refreshRemoteCatalog]);

    // 桌面端启动时从 userData 恢复本地拓展库，再同步回 Redux/localStorage。
    useEffect(() => {
        loadDesktopInstalledCustomExtensionLibraries()
            .then(libraries => {
                if (!libraries) return;
                if (libraries.length) {
                    saveInstalledCustomExtensionLibraries(libraries);
                    onSetCustomExtensionLibraries(libraries);
                }
            })
            .catch(() => {});
    }, [onSetCustomExtensionLibraries]);

    // 用户导入包只出现在“用户拓展”，不再和产品模块混排。
    const items = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        const localItems = activeTab === 'user' ? installedLibraries.map(createUserLibraryItem) : [];
        return getFlatItems(activeTab, remoteCatalog, cachedRemotePackages).concat(localItems).filter(item => {
            if (chip !== 'all' && item.categoryId !== chip) return false;
            if (!normalizedQuery) return true;
            return [
                item.name,
                item.id,
                item.categoryLabel,
                item.sourceExtension || '',
                item.extensionId || ''
            ].join('\n').toLowerCase().includes(normalizedQuery);
        });
    }, [
        activeTab,
        cachedRemotePackages,
        chip,
        installedLibraries,
        query,
        remoteCatalog
    ]);

    const handleUploadClick = () => {
        // eslint-disable-next-line no-alert
        alert(intl.formatMessage(messages.uploadNotice));
    };

    const handleUrlImportClick = () => {
        // eslint-disable-next-line no-alert
        alert(intl.formatMessage(messages.urlImportNotice));
    };

    // 触发隐藏 file input，保持页面视觉形态接近原版拓展库。
    const handleLocalImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
            return;
        }
        // eslint-disable-next-line no-alert
        alert(intl.formatMessage(messages.localImportNotice));
    };

    // 加载完成后回到积木区，并切到对应拓展分类。
    const selectExtensionCategory = extensionId => {
        if (onCategorySelected) {
            onCategorySelected(extensionId);
        }
        onRequestClose();
    };

    // VM 注册拓展是异步的，等待 EXTENSION_ADDED 可避免回到积木区后分类还没出现。
    const waitForExtensionAdded = extensionId => new Promise(resolve => {
        const handleExtensionAdded = categoryInfo => {
            if (!categoryInfo || categoryInfo.id !== extensionId) return;
            vm.removeListener('EXTENSION_ADDED', handleExtensionAdded);
            resolve();
        };
        vm.addListener('EXTENSION_ADDED', handleExtensionAdded);
        setTimeout(() => {
            vm.removeListener('EXTENSION_ADDED', handleExtensionAdded);
            resolve();
        }, 500);
    });

    // 安装用户本地库：注册 Python 模板、注册 VM extension object、保存到本地。
    const installManifest = manifest => {
        const previousLibrary = installedLibraries.find(
            library => library.manifest.id === manifest.id
        );
        if (previousLibrary) {
            unregisterPythonCodegenManifest(previousLibrary.manifest);
        }
        registerPythonCodegenManifest(manifest);
        const extensionManager = vm.extensionManager;
        const unloadPromise = extensionManager.isExtensionLoaded(manifest.id) &&
            extensionManager.unregisterExtensionObject ?
            extensionManager.unregisterExtensionObject(manifest.id) :
            Promise.resolve();
        return unloadPromise
            .then(() => extensionManager.registerExtensionObject(
                manifest.id,
                manifestToExtensionObject(manifest)
            ))
            .then(() => {
                saveInstalledCustomExtensionLibraries(
                    upsertInstalledCustomExtensionLibrary(installedLibraries, manifest)
                );
                onInstallCustomExtensionLibrary(manifest);
                setActiveTab('user');
                setChip('all');
                setExtensionStateVersion(version => version + 1);
                // eslint-disable-next-line no-alert
                alert(intl.formatMessage(messages.importSuccess, {name: manifest.name}));
            });
    };

    // 加载已安装的用户包只恢复 VM 和 codegen，不重复写入或覆盖包内容。
    const loadUserLibrary = item => {
        const manifest = item.manifest;
        if (!manifest) return Promise.resolve();
        registerPythonCodegenManifest(manifest);
        const addedPromise = waitForExtensionAdded(manifest.id);
        return vm.extensionManager.registerExtensionObject(
            manifest.id,
            manifestToExtensionObject(manifest)
        ).then(() => addedPromise).then(() => {
            const nextLibraries = setInstalledCustomExtensionLibraryEnabled(
                installedLibraries,
                manifest.id,
                true
            );
            saveInstalledCustomExtensionLibraries(nextLibraries);
            onSetCustomExtensionLibraryEnabled(manifest.id, true);
            setExtensionStateVersion(version => version + 1);
        });
    };

    // 卸载只移除运行态分类和模板，保留用户包，后续可以再次加载。
    const unloadUserLibrary = item => {
        const manifest = item.manifest;
        if (!manifest) return Promise.resolve();
        unregisterPythonCodegenManifest(manifest);
        const unloadPromise = vm.extensionManager.unregisterExtensionObject ?
            vm.extensionManager.unregisterExtensionObject(manifest.id) :
            Promise.resolve();
        return unloadPromise.then(() => {
            const nextLibraries = setInstalledCustomExtensionLibraryEnabled(
                installedLibraries,
                manifest.id,
                false
            );
            saveInstalledCustomExtensionLibraries(nextLibraries);
            onSetCustomExtensionLibraryEnabled(manifest.id, false);
            vm.emitWorkspaceUpdate();
            setExtensionStateVersion(version => version + 1);
        });
    };

    // 安装内置产品库：不写入本地库列表，但同样注册 VM 和 Python codegen。
    const installBuiltinProductManifest = manifest => {
        registerPythonCodegenManifest(manifest);
        const extensionManager = vm.extensionManager;
        const addedPromise = waitForExtensionAdded(manifest.id);
        const unloadPromise = extensionManager.isExtensionLoaded(manifest.id) &&
            extensionManager.unregisterExtensionObject ?
            extensionManager.unregisterExtensionObject(manifest.id) :
            Promise.resolve();
        return unloadPromise
            .then(() => extensionManager.registerExtensionObject(
                manifest.id,
                manifestToExtensionObject(manifest)
            ))
            .then(() => addedPromise);
    };

    // 主控/机器人一次只允许加载一个，切换前用它判断是否需要确认清理。
    const getLoadedMainItem = nextItem => getAvailableMainItems(
        remoteCatalog,
        cachedRemotePackages
    ).find(item => (
        item.id !== nextItem.id && vm.extensionManager.isExtensionLoaded(item.id)
    ));

    // 切换主控时清掉旧主控和模块，避免不同机器人积木混用生成错误 Python。
    const clearLoadedProductExtensions = nextExtensionId => {
        const extensionManager = vm.extensionManager;
        const productExtensionIds = getFlatCatalogItems().map(item => item.id);
        productExtensionIds
            .filter(extensionId => extensionId !== nextExtensionId)
            .forEach(extensionId => {
                const cachedPackage = getLatestCachedRemotePackage(cachedRemotePackages, extensionId);
                const manifest = cachedPackage ? cachedPackage.manifest : builtinProductManifests[extensionId];
                if (manifest) unregisterPythonCodegenManifest(manifest);
            });
        installedLibraries.forEach(library => {
            unregisterPythonCodegenManifest(library.manifest);
        });

        const extensionIds = new Set([
            ...productExtensionIds.filter(extensionId => extensionId !== nextExtensionId),
            ...installedLibraries.map(library => library.manifest.id)
        ]);
        const unloadPromises = Array.from(extensionIds)
            .filter(extensionId => extensionManager.isExtensionLoaded(extensionId))
            .map(extensionId => (
                extensionManager.unregisterExtensionObject ?
                    extensionManager.unregisterExtensionObject(extensionId) :
                    Promise.resolve()
            ));

        return Promise.all(unloadPromises).then(() => {
            const nextLibraries = installedLibraries.map(library => ({...library, enabled: false}));
            saveInstalledCustomExtensionLibraries(nextLibraries);
            onSetCustomExtensionLibraries(nextLibraries);
            vm.emitWorkspaceUpdate();
            setExtensionStateVersion(version => version + 1);
        });
    };

    // 远程包通过 SHA256 和包内 id/version 双重校验后才写入离线缓存。
    const installRemoteUpdate = remotePackage => {
        setUpdatingPackageId(remotePackage.packageId);
        return downloadRemoteLibraryPackage(remotePackage)
            .then(({data, remotePackage: downloadedRemotePackage}) =>
                readCustomExtensionPackageBuffer(data, remotePackage.asset)
                    .then(manifest => ({manifest, downloadedRemotePackage})))
            .then(({manifest, downloadedRemotePackage}) => {
                if (manifest.id !== remotePackage.packageId || manifest.version !== remotePackage.version) {
                    throw new Error('拓展包内的产品 ID 或版本与 catalog 不一致');
                }
                const cachedPackage = {
                    // 下载客户端已经解析出实际成功的 Gitee/GitHub 来源，缓存该来源便于离线追溯。
                    ...(downloadedRemotePackage || remotePackage),
                    cachedAt: new Date().toISOString(),
                    manifest
                };
                const nextCachedPackages = upsertCachedRemotePackage(loadCachedRemotePackages(), cachedPackage);
                // 先持久化再切换运行态，写入失败时继续保留原版本。
                saveCachedRemotePackages(nextCachedPackages);
                setCachedRemotePackages(nextCachedPackages);
                const reloadPromise = vm.extensionManager.isExtensionLoaded(manifest.id) ?
                    installBuiltinProductManifest(manifest).then(() => vm.emitWorkspaceUpdate()) :
                    Promise.resolve();
                return reloadPromise.then(() => {
                    // eslint-disable-next-line no-alert
                    alert(intl.formatMessage(messages.updateSuccess, {
                        name: manifest.name,
                        version: manifest.version
                    }));
                    return manifest;
                });
            })
            .catch(error => {
                // eslint-disable-next-line no-alert
                alert(intl.formatMessage(messages.updateFailure, {
                    name: remotePackage.name || remotePackage.packageId,
                    message: error.message
                }));
                return null;
            })
            .finally(() => setUpdatingPackageId(null));
    };

    // 用户显式检查后逐个确认更新，不进行静默下载或自动替换。
    const handleCheckVersions = () => {
        refreshRemoteCatalog()
            .then(catalog => {
                const updates = getAvailableRemoteUpdates(catalog, cachedRemotePackages);
                if (!updates.length) {
                    // eslint-disable-next-line no-alert
                    alert(intl.formatMessage(messages.noUpdates));
                    return;
                }
                updates.reduce((promise, remotePackage) => promise.then(() => {
                    const cachedPackage = getLatestCachedRemotePackage(
                        cachedRemotePackages,
                        remotePackage.packageId
                    );
                    const bundledManifest = builtinProductManifests[remotePackage.packageId];
                    const localItem = getFlatCatalogItems().find(item => item.id === remotePackage.packageId);
                    const currentVersion = resolveProductLibraryItem(
                        localItem,
                        bundledManifest || null,
                        cachedPackage
                    ).version;
                    // eslint-disable-next-line no-alert
                    const shouldUpdate = confirm(intl.formatMessage(messages.updateConfirm, {
                        name: remotePackage.name || remotePackage.packageId,
                        currentVersion,
                        latestVersion: remotePackage.version
                    }));
                    return shouldUpdate ? installRemoteUpdate(remotePackage) : null;
                }), Promise.resolve());
            })
            .catch(error => {
                // eslint-disable-next-line no-alert
                alert(intl.formatMessage(messages.checkVersionFailure, {message: error.message}));
            });
    };

    // 读取本地 .json/.zip/.sbext/.mpext，解析失败时提示用户具体错误。
    const handleImportFile = event => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        readCustomExtensionPackage(file)
            .then(manifest => installManifest(manifest))
            .catch(error => {
                // eslint-disable-next-line no-alert
                alert(intl.formatMessage(messages.importFailure, {message: error.message}));
            })
            .finally(() => {
                event.target.value = null;
            });
    };

    // 卡片点击根据来源分流：用户包按需加载，产品包优先远程版本并保留内置兜底。
    const handleItemClick = (item, options = {}) => {
        if (item.source === LIBRARY_SOURCE_TYPES.USER_LOCAL) {
            if (vm.extensionManager.isExtensionLoaded(item.id)) {
                selectExtensionCategory(item.id);
                return;
            }
            loadUserLibrary(item).then(() => selectExtensionCategory(item.id));
            return;
        }
        if (item.status === 'downloadable' && item.remoteSource.package) {
            if (mainCategoryIds.includes(item.categoryId) && !options.skipSwitchCheck) {
                const loadedMainItem = getLoadedMainItem(item);
                const hasLoadedUserLibrary = installedLibraries.some(library => (
                    vm.extensionManager.isExtensionLoaded(library.manifest.id)
                ));
                if (loadedMainItem || hasLoadedUserLibrary) {
                    setPendingSwitchItem(item);
                    return;
                }
            }
            installRemoteUpdate(item.remoteSource.package).then(manifest => {
                if (!manifest) return;
                installBuiltinProductManifest(manifest)
                    .then(() => selectExtensionCategory(manifest.id));
            });
            return;
        }
        if (item.status === 'available' && item.manifest) {
            if (vm.extensionManager.isExtensionLoaded(item.manifest.id)) {
                selectExtensionCategory(item.manifest.id);
                return;
            }
            if (mainCategoryIds.includes(item.categoryId) && !options.skipSwitchCheck) {
                const loadedMainItem = getLoadedMainItem(item);
                const hasLoadedUserLibrary = installedLibraries.some(library => (
                    vm.extensionManager.isExtensionLoaded(library.manifest.id)
                ));
                if (loadedMainItem || hasLoadedUserLibrary) {
                    setPendingSwitchItem(item);
                    return;
                }
            }
            installBuiltinProductManifest(item.manifest)
                .then(() => selectExtensionCategory(item.manifest.id));
            return;
        }
        if (item.status === 'available' && item.extensionId) {
            onBuiltinExtensionSelect({
                extensionId: item.extensionId,
                disabled: false
            });
            selectExtensionCategory(item.extensionId);
            return;
        }
        // eslint-disable-next-line no-alert
        alert(intl.formatMessage(messages.unavailableNotice, {
            name: item.name
        }));
    };

    // 用户确认切换主控后，先卸载旧拓展，再继续执行原来的卡片点击逻辑。
    const handleConfirmSwitch = () => {
        if (!pendingSwitchItem) return;
        const nextItem = pendingSwitchItem;
        setPendingSwitchItem(null);
        clearLoadedProductExtensions(nextItem.id)
            .then(() => handleItemClick(nextItem, {skipSwitchCheck: true}));
    };

    const handleDetailsClick = item => {
        // eslint-disable-next-line no-alert
        alert(intl.formatMessage(messages.detailNotice, {
            name: item.name
        }));
    };

    // 导出时使用 serialize，保证文件内容是用户可维护的配置格式。
    const handleExportLibrary = item => {
        if (!item.manifest) return;
        const blob = new Blob([
            JSON.stringify(serializeCustomExtensionManifest(item.manifest), null, 2)
        ], {type: 'application/json'});
        downloadBlob(`${item.manifest.id}.custom-extension.json`, blob);
    };

    // 删除会同时卸载运行态和移除持久化包；与“卸载但保留”是两个独立动作。
    const handleDeleteLibrary = item => {
        if (!item.manifest) return;
        unregisterPythonCodegenManifest(item.manifest);
        const unloadPromise = vm.extensionManager.unregisterExtensionObject ?
            vm.extensionManager.unregisterExtensionObject(item.manifest.id) :
            Promise.resolve();
        unloadPromise.then(() => {
            saveInstalledCustomExtensionLibraries(
                removeInstalledCustomExtensionLibrary(installedLibraries, item.manifest.id)
            );
            onRemoveCustomExtensionLibrary(item.manifest.id);
            vm.emitWorkspaceUpdate();
            setExtensionStateVersion(version => version + 1);
        });
    };

    return (
        <div
            className={styles.page}
            role="dialog"
            aria-label={intl.formatMessage(messages.title)}
        >
            <header className={styles.topBar}>
                <div className={styles.topLeft}>
                    <button
                        className={styles.backButton}
                        type="button"
                        onClick={onRequestClose}
                    >
                        ← {intl.formatMessage(messages.back)}
                    </button>
                    <span className={styles.modeLabel}>
                        {intl.formatMessage(messages.uploadMode)}
                    </span>
                </div>
                <nav className={styles.tabs}>
                    <button
                        className={classNames(styles.tabButton, {
                            [styles.tabButtonActive]: activeTab === 'main'
                        })}
                        type="button"
                        onClick={() => {
                            setActiveTab('main');
                            setChip('all');
                        }}
                    >
                        {intl.formatMessage(messages.mainExtensions)}
                    </button>
                    <button
                        className={classNames(styles.tabButton, {
                            [styles.tabButtonActive]: activeTab === 'module'
                        })}
                        type="button"
                        onClick={() => {
                            setActiveTab('module');
                            setChip('all');
                        }}
                    >
                        {intl.formatMessage(messages.moduleExtensions)}
                    </button>
                    <button
                        className={classNames(styles.tabButton, {
                            [styles.tabButtonActive]: activeTab === 'user'
                        })}
                        type="button"
                        onClick={() => {
                            setActiveTab('user');
                            setChip('all');
                        }}
                    >
                        {intl.formatMessage(messages.userExtensions)}
                    </button>
                </nav>
                <div className={styles.topRight}>
                    <label className={styles.searchBox}>
                        <span className={styles.searchIcon}>⌕</span>
                        <input
                            className={styles.searchInput}
                            placeholder={intl.formatMessage(messages.searchPlaceholder)}
                            type="search"
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                        />
                    </label>
                </div>
            </header>
            <div className={styles.filterBar}>
                {activeTab === 'user' ? (
                    <div className={styles.userLibraryHeading}>
                        {intl.formatMessage(messages.userExtensions)}
                    </div>
                ) : (
                    <React.Fragment>
                        <div className={styles.advancedButton}>
                            {intl.formatMessage(messages.advancedFilter)}⌄
                        </div>
                        <div className={styles.chipGroup}>
                            {categoryFilters[activeTab].map(category => (
                                <button
                                    className={classNames(styles.chip, {
                                        [styles.chipActive]: chip === category.id
                                    })}
                                    key={category.id}
                                    type="button"
                                    onClick={() => setChip(chip === category.id ? 'all' : category.id)}
                                >
                                    {intl.formatMessage(category.message)}
                                </button>
                            ))}
                        </div>
                    </React.Fragment>
                )}
                <div className={styles.toolbarActions}>
                    <input
                        accept=".json,.zip,.sbext,.mpext"
                        ref={fileInputRef}
                        style={{display: 'none'}}
                        type="file"
                        onChange={handleImportFile}
                    />
                    {activeTab === 'user' ? (
                        <React.Fragment>
                            <button
                                className={classNames(styles.toolbarButton, styles.toolbarButtonSecondary)}
                                type="button"
                                onClick={handleLocalImportClick}
                            >
                                {intl.formatMessage(messages.importLocal)}
                            </button>
                            <button
                                className={classNames(styles.toolbarButton, styles.toolbarButtonSecondary)}
                                type="button"
                                onClick={handleUrlImportClick}
                            >
                                {intl.formatMessage(messages.urlImport)}
                            </button>
                        </React.Fragment>
                    ) : (
                        <React.Fragment>
                            <button
                                className={classNames(styles.toolbarButton, styles.toolbarButtonSecondary)}
                                type="button"
                                onClick={handleUploadClick}
                            >
                                {intl.formatMessage(messages.uploadLibrary)}
                            </button>
                            <button
                                className={styles.toolbarButton}
                                disabled={checking || Boolean(updatingPackageId)}
                                type="button"
                                onClick={handleCheckVersions}
                            >
                                {updatingPackageId ? intl.formatMessage(messages.updatingVersion) :
                                    (checking ? intl.formatMessage(messages.checkingVersion) :
                                        intl.formatMessage(messages.checkVersion))}
                            </button>
                        </React.Fragment>
                    )}
                    <button
                        className={styles.sortButton}
                        type="button"
                    >
                        {intl.formatMessage(messages.defaultSort)}
                    </button>
                </div>
            </div>
            <main className={styles.content}>
                {items.length ? (
                    <div className={styles.cardGrid}>
                        {items.map(item => {
                            const isAvailable = item.status === 'available';
                            const isLoaded = loadedExtensionIds.includes(item.id) ||
                                vm.extensionManager.isExtensionLoaded(item.id);
                            const isUser = item.source === LIBRARY_SOURCE_TYPES.USER_LOCAL;
                            const sourceMessage = isUser ? messages.userSource :
                                ([
                                    LIBRARY_SOURCE_TYPES.REMOTE_CACHE,
                                    LIBRARY_SOURCE_TYPES.REMOTE_REGISTRY
                                ].includes(item.source) ?
                                    messages.remoteSource : messages.bundledSource);
                            return (
                                <article
                                    className={classNames(styles.card, {
                                        [styles.cardDisabled]: !isAvailable
                                    })}
                                    key={item.id}
                                    role="button"
                                    tabIndex={0}
                                    title={isAvailable ? item.name :
                                        intl.formatMessage(messages.unavailableNotice, {
                                            name: item.name
                                        })}
                                    onClick={event => {
                                        // 版本号只用于展示，点击时不触发整张产品卡片的加载操作。
                                        if (event.target.closest('[data-version-display]')) return;
                                        handleItemClick(item);
                                    }}
                                    onKeyDown={event => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            handleItemClick(item);
                                        }
                                    }}
                                >
                                    {isUser ? (
                                        <div className={styles.userCardActions}>
                                            <button
                                                className={styles.userCardAction}
                                                type="button"
                                                onClick={event => {
                                                    event.stopPropagation();
                                                    if (isLoaded) {
                                                        unloadUserLibrary(item);
                                                    } else {
                                                        loadUserLibrary(item);
                                                    }
                                                }}
                                            >
                                                {intl.formatMessage(isLoaded ? messages.unload : messages.load)}
                                            </button>
                                            <button
                                                className={classNames(
                                                    styles.userCardAction,
                                                    styles.userCardDeleteAction
                                                )}
                                                type="button"
                                                onClick={event => {
                                                    event.stopPropagation();
                                                    handleDeleteLibrary(item);
                                                }}
                                            >
                                                {intl.formatMessage(messages.delete)}
                                            </button>
                                        </div>
                                    ) : isLoaded ? (
                                        <button
                                            className={styles.removeBadge}
                                            type="button"
                                            onClick={event => {
                                                event.stopPropagation();
                                                handleItemClick(item);
                                            }}
                                        >
                                            {intl.formatMessage(messages.loaded)}
                                        </button>
                                    ) : (
                                        <button
                                            className={styles.downloadButton}
                                            type="button"
                                            onClick={event => {
                                                event.stopPropagation();
                                                handleItemClick(item);
                                            }}
                                        >
                                            ↓
                                        </button>
                                    )}
                                    <div className={styles.cardVisual}>
                                        <div className={styles.cardIcon}>
                                            {getInitials(item.name)}
                                        </div>
                                    </div>
                                    <div className={styles.cardInfo}>
                                        <div className={styles.cardTitle}>
                                            {item.name}
                                        </div>
                                        <div className={styles.cardDescription}>
                                            {item.status === 'available' ?
                                                (isUser ?
                                                    intl.formatMessage(messages.localDescription) :
                                                    intl.formatMessage(messages.availableDescription)) :
                                                intl.formatMessage(messages.placeholderDescription)}
                                        </div>
                                    </div>
                                    <footer className={styles.cardFooter}>
                                        <span className={styles.vendor}>
                                            {intl.formatMessage(sourceMessage)}
                                        </span>
                                        <span
                                            className={styles.versionLabel}
                                            data-version-display
                                        >
                                            {checking ? '--' : (item.manifest ? item.version : item.latestVersion)}
                                        </span>
                                        <button
                                            className={styles.cardMenuButton}
                                            type="button"
                                            onClick={event => {
                                                event.stopPropagation();
                                                if (isUser) {
                                                    handleExportLibrary(item);
                                                    return;
                                                }
                                                handleDetailsClick(item);
                                            }}
                                            title={isUser ? intl.formatMessage(messages.export) : ''}
                                        >
                                            ⋮
                                        </button>
                                    </footer>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        {intl.formatMessage(activeTab === 'user' ? messages.userEmpty : messages.empty)}
                    </div>
                )}
            </main>
            {pendingSwitchItem ? (
                <div
                    className={styles.confirmOverlay}
                    role="presentation"
                >
                    <section
                        aria-label={intl.formatMessage(messages.switchProductTitle)}
                        className={styles.confirmDialog}
                        role="dialog"
                    >
                        <header className={styles.confirmTitle}>
                            <span className={styles.confirmIcon}>!</span>
                            {intl.formatMessage(messages.switchProductTitle)}
                        </header>
                        <div className={styles.confirmBody}>
                            {intl.formatMessage(messages.switchProductBody)}
                        </div>
                        <footer className={styles.confirmActions}>
                            <button
                                className={styles.confirmCancelButton}
                                type="button"
                                onClick={() => setPendingSwitchItem(null)}
                            >
                                {intl.formatMessage(messages.switchProductCancel)}
                            </button>
                            <button
                                className={styles.confirmLoadButton}
                                type="button"
                                onClick={handleConfirmSwitch}
                            >
                                {intl.formatMessage(messages.switchProductConfirm)}
                            </button>
                        </footer>
                    </section>
                </div>
            ) : null}
        </div>
    );
};

ProductExtensionLibraryComponent.propTypes = {
    installedLibraries: PropTypes.arrayOf(PropTypes.shape({
        enabled: PropTypes.bool,
        manifest: PropTypes.shape({
            id: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            version: PropTypes.string.isRequired
        }).isRequired
    })),
    intl: intlShape.isRequired,
    onInstallCustomExtensionLibrary: PropTypes.func.isRequired,
    onBuiltinExtensionSelect: PropTypes.func.isRequired,
    onCategorySelected: PropTypes.func,
    onRemoveCustomExtensionLibrary: PropTypes.func.isRequired,
    onRequestClose: PropTypes.func.isRequired,
    onSetCustomExtensionLibraries: PropTypes.func.isRequired,
    onSetCustomExtensionLibraryEnabled: PropTypes.func.isRequired,
    vm: PropTypes.instanceOf(VM).isRequired
};

const mapStateToProps = state => ({
    installedLibraries: state.scratchGui.customExtensions.installedLibraries,
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    onInstallCustomExtensionLibrary: manifest => dispatch(installCustomExtensionLibrary(manifest)),
    onRemoveCustomExtensionLibrary: extensionId => dispatch(removeCustomExtensionLibrary(extensionId)),
    onSetCustomExtensionLibraries: installedLibraries => dispatch(setCustomExtensionLibraries(installedLibraries)),
    onSetCustomExtensionLibraryEnabled: (extensionId, enabled) => dispatch(
        setCustomExtensionLibraryEnabled(extensionId, enabled)
    )
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(ProductExtensionLibraryComponent));

export {
    ProductExtensionLibraryComponent
};
