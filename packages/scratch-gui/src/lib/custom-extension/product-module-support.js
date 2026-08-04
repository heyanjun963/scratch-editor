import {productExtensionCatalog} from './product-extension-catalog';

const moduleStateByVm = new WeakMap();

const getMainProductItems = () => {
    const mainCategory = productExtensionCatalog.find(category => category.id === 'robots');
    return mainCategory ? mainCategory.children : [];
};

// 模块可用性由当前已加载主产品的支持列表决定，避免不同硬件积木混入同一工程。
const getLoadedMainProductId = vm => {
    if (!vm || !vm.extensionManager) return null;
    const loadedProduct = getMainProductItems().find(item => (
        vm.extensionManager.isExtensionLoaded(item.id)
    ));
    return loadedProduct ? loadedProduct.id : null;
};

const isProductModuleSupported = (productId, extensionId, moduleId) => {
    if (!productId) return false;
    const product = getMainProductItems().find(item => item.id === productId);
    const supportedModules = product && product.modules && product.modules[extensionId];
    return Array.isArray(supportedModules) && supportedModules.includes(moduleId);
};

// 共享模块包只保留已启用分类及其积木、菜单，并按照用户添加顺序显示子分类标签。
const composeProductModuleManifest = (baseManifest, enabledModuleIds) => {
    const categoriesById = new Map(baseManifest.categories.map(category => [category.id, category]));
    const categories = enabledModuleIds
        .map(moduleId => categoriesById.get(moduleId))
        .filter(Boolean);
    const blocksByOpcode = new Map(baseManifest.blocks.map(block => [block.opcode, block]));
    const blocks = categories.flatMap(category => (
        category.blocks.map(opcode => blocksByOpcode.get(opcode)).filter(Boolean)
    ));
    const usedMenus = new Set(blocks.flatMap(block => (
        Object.values(block.arguments).map(argument => argument.menu).filter(Boolean)
    )));
    const menus = Object.keys(baseManifest.menus).reduce((result, menuId) => {
        if (usedMenus.has(menuId)) result[menuId] = baseManifest.menus[menuId];
        return result;
    }, {});

    return {
        ...baseManifest,
        categories,
        menus,
        blocks
    };
};

const getVmModuleState = vm => {
    let state = moduleStateByVm.get(vm);
    if (!state) {
        state = new Map();
        moduleStateByVm.set(vm, state);
    }
    return state;
};

const getProductModuleState = (vm, extensionId) => (
    getVmModuleState(vm).get(extensionId) || {enabledModuleIds: [], manifest: null}
);

const getEnabledProductModuleIds = (vm, extensionId) => (
    getProductModuleState(vm, extensionId).enabledModuleIds.slice()
);

// 只有安装成功后才写入状态，重新打开拓展库时可准确恢复“已加载”标记。
const setProductModuleState = (vm, extensionId, enabledModuleIds, manifest) => {
    getVmModuleState(vm).set(extensionId, {
        enabledModuleIds: enabledModuleIds.slice(),
        manifest
    });
};

const clearProductModuleState = (vm, extensionId) => {
    const state = getVmModuleState(vm).get(extensionId);
    getVmModuleState(vm).delete(extensionId);
    return state ? state.manifest : null;
};

export {
    clearProductModuleState,
    composeProductModuleManifest,
    getEnabledProductModuleIds,
    getLoadedMainProductId,
    getProductModuleState,
    isProductModuleSupported,
    setProductModuleState
};
