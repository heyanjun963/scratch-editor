import classNames from 'classnames';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {defineMessages, injectIntl} from 'react-intl';
import VM from '@scratch/scratch-vm';

import intlShape from '../../lib/intlShape.js';
import downloadBlob from '../../lib/download-blob';
import {builtinProductManifests} from '../../lib/custom-extension/builtin-product-manifests';
import {productExtensionCatalog} from '../../lib/custom-extension/product-extension-catalog.js';
import {serializeCustomExtensionManifest} from '../../lib/custom-extension/manifest-schema';
import {manifestToExtensionObject} from '../../lib/custom-extension/manifest-to-extension';
import {readCustomExtensionPackage} from '../../lib/custom-extension/package-reader';
import {
    registerPythonCodegenManifest,
    unregisterPythonCodegenManifest
} from '../../lib/custom-extension/codegen-registry';
import {
    loadDesktopInstalledCustomExtensionLibraries,
    removeInstalledCustomExtensionLibrary,
    saveInstalledCustomExtensionLibraries,
    upsertInstalledCustomExtensionLibrary
} from '../../lib/custom-extension/persistence';
import {
    installCustomExtensionLibrary,
    removeCustomExtensionLibrary,
    setCustomExtensionLibraries
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
        defaultMessage: '本地导入会复用现有 .json/.zip/.sbext 拓展包解析器。',
        description: 'Notice shown for reserved local import entry',
        id: 'gui.productExtensionLibrary.localImportNotice'
    },
    remove: {
        defaultMessage: '移除',
        description: 'Remove loaded extension button',
        id: 'gui.productExtensionLibrary.remove'
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

const mainCategoryIds = ['robots', 'controllers'];
const loadedExtensionIds = ['python-native', 'company-http'];
const categoryFilters = {
    main: [
        {id: 'robots', message: messages.boards},
        {id: 'controllers', message: messages.kits}
    ],
    module: [
        {id: 'input', message: messages.inputModule},
        {id: 'power', message: messages.powerModule},
        {id: 'output', message: messages.outputModule},
        {id: 'communication', message: messages.communicationModule},
        {id: 'function', message: messages.functionModule}
    ]
};

const getInitials = name => name
    .replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, '')
    .slice(0, 2)
    .toUpperCase();

const getFlatItems = activeTab => productExtensionCatalog
    .filter(section => (activeTab === 'main' ?
        mainCategoryIds.includes(section.id) :
        !mainCategoryIds.includes(section.id)))
    .flatMap(section => section.children.map(item => ({
        ...item,
        categoryId: section.id,
        categoryLabel: section.label,
        manifest: builtinProductManifests[item.id] || null,
        source: builtinProductManifests[item.id] ? 'builtin-product' : item.source
    })));

const getAvailableMainItems = () => getFlatItems('main').filter(item => item.status === 'available');

const ProductExtensionLibraryComponent = ({
    installedLibraries,
    intl,
    onInstallCustomExtensionLibrary,
    onBuiltinExtensionSelect,
    onCategorySelected,
    onRemoveCustomExtensionLibrary,
    onRequestClose,
    onSetCustomExtensionLibraries,
    vm
}) => {
    const fileInputRef = useRef(null);
    const [activeTab, setActiveTab] = useState('main');
    const [chip, setChip] = useState('all');
    const [query, setQuery] = useState('');
    const [checking, setChecking] = useState(false);
    const [pendingSwitchItem, setPendingSwitchItem] = useState(null);

    useEffect(() => {
        setChecking(true);
        const timer = setTimeout(() => setChecking(false), 650);
        return () => clearTimeout(timer);
    }, []);

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

    const items = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        const localItems = activeTab === 'module' ? installedLibraries.map(library => ({
            id: library.manifest.id,
            name: library.manifest.name,
            version: library.manifest.version,
            latestVersion: library.manifest.version,
            status: 'available',
            categoryId: 'local',
            categoryLabel: '本地拓展库',
            source: 'local',
            manifest: library.manifest
        })) : [];
        return getFlatItems(activeTab).concat(localItems).filter(item => {
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
        chip,
        installedLibraries,
        query
    ]);

    const handleCheckVersions = () => {
        setChecking(true);
        setTimeout(() => setChecking(false), 650);
    };

    const handleUploadClick = () => {
        // eslint-disable-next-line no-alert
        alert(intl.formatMessage(messages.uploadNotice));
    };

    const handleLocalImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
            return;
        }
        // eslint-disable-next-line no-alert
        alert(intl.formatMessage(messages.localImportNotice));
    };

    const selectExtensionCategory = extensionId => {
        if (onCategorySelected) {
            onCategorySelected(extensionId);
        }
        onRequestClose();
    };

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
                // eslint-disable-next-line no-alert
                alert(intl.formatMessage(messages.importSuccess, {name: manifest.name}));
            });
    };

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

    const getLoadedMainItem = nextItem => getAvailableMainItems().find(item => (
        item.id !== nextItem.id && vm.extensionManager.isExtensionLoaded(item.id)
    ));

    const clearLoadedProductExtensions = nextExtensionId => {
        const extensionManager = vm.extensionManager;
        Object.keys(builtinProductManifests)
            .filter(extensionId => extensionId !== nextExtensionId)
            .forEach(extensionId => unregisterPythonCodegenManifest(
                builtinProductManifests[extensionId]
            ));
        installedLibraries.forEach(library => {
            unregisterPythonCodegenManifest(library.manifest);
        });

        const extensionIds = new Set([
            ...Object.keys(builtinProductManifests).filter(extensionId => extensionId !== nextExtensionId),
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
            if (installedLibraries.length) {
                saveInstalledCustomExtensionLibraries([]);
                onSetCustomExtensionLibraries([]);
            }
        });
    };

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

    const handleItemClick = (item, options = {}) => {
        if (item.source === 'local') {
            selectExtensionCategory(item.id);
            return;
        }
        if (item.status === 'available' && item.manifest) {
            if (vm.extensionManager.isExtensionLoaded(item.manifest.id)) {
                selectExtensionCategory(item.manifest.id);
                return;
            }
            if (mainCategoryIds.includes(item.categoryId) && !options.skipSwitchCheck) {
                const loadedMainItem = getLoadedMainItem(item);
                if (loadedMainItem || installedLibraries.length) {
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

    const handleExportLibrary = item => {
        if (!item.manifest) return;
        const blob = new Blob([
            JSON.stringify(serializeCustomExtensionManifest(item.manifest), null, 2)
        ], {type: 'application/json'});
        downloadBlob(`${item.manifest.id}.custom-extension.json`, blob);
    };

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
                <div className={styles.toolbarActions}>
                    <input
                        accept=".json,.zip,.sbext"
                        ref={fileInputRef}
                        style={{display: 'none'}}
                        type="file"
                        onChange={handleImportFile}
                    />
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
                        onClick={handleUploadClick}
                    >
                        {intl.formatMessage(messages.uploadLibrary)}
                    </button>
                    <button
                        className={styles.toolbarButton}
                        disabled={checking}
                        type="button"
                        onClick={handleCheckVersions}
                    >
                        {checking ?
                            intl.formatMessage(messages.checkingVersion) :
                            intl.formatMessage(messages.checkVersion)}
                    </button>
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
                            const isLocal = item.source === 'local';
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
                                    onClick={() => handleItemClick(item)}
                                    onKeyDown={event => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            handleItemClick(item);
                                        }
                                    }}
                                >
                                    {isLocal ? (
                                        <button
                                            className={styles.removeBadge}
                                            type="button"
                                            onClick={event => {
                                                event.stopPropagation();
                                                handleDeleteLibrary(item);
                                            }}
                                        >
                                            {intl.formatMessage(messages.remove)}
                                        </button>
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
                                                (isLocal ?
                                                    intl.formatMessage(messages.localDescription) :
                                                    intl.formatMessage(messages.availableDescription)) :
                                                intl.formatMessage(messages.placeholderDescription)}
                                        </div>
                                    </div>
                                    <footer className={styles.cardFooter}>
                                        <span className={styles.vendor}>⌂ Company</span>
                                        <select
                                            className={styles.versionSelect}
                                            value={item.latestVersion}
                                            onChange={event => event.target.blur()}
                                        >
                                            <option value={item.latestVersion}>
                                                {checking ? '--' : item.latestVersion}
                                            </option>
                                        </select>
                                        <button
                                            className={styles.cardMenuButton}
                                            type="button"
                                            onClick={event => {
                                                event.stopPropagation();
                                                if (isLocal) {
                                                    handleExportLibrary(item);
                                                    return;
                                                }
                                                handleDetailsClick(item);
                                            }}
                                            title={isLocal ? intl.formatMessage(messages.export) : ''}
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
                        {intl.formatMessage(messages.empty)}
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
    vm: PropTypes.instanceOf(VM).isRequired
};

ProductExtensionLibraryComponent.defaultProps = {
    installedLibraries: [],
    onCategorySelected: null
};

const mapStateToProps = state => ({
    installedLibraries: state.scratchGui.customExtensions.installedLibraries,
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    onInstallCustomExtensionLibrary: manifest => dispatch(installCustomExtensionLibrary(manifest)),
    onRemoveCustomExtensionLibrary: extensionId => dispatch(removeCustomExtensionLibrary(extensionId)),
    onSetCustomExtensionLibraries: installedLibraries => dispatch(setCustomExtensionLibraries(installedLibraries))
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(ProductExtensionLibraryComponent));
