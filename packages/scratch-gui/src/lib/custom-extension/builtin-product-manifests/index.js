import aidoggySnapshot from '../builtin-product-snapshots/manifests/aidoggy.json';
import aimecanumSnapshot from '../builtin-product-snapshots/manifests/aimecanum.json';
import aiquadrupedSnapshot from '../builtin-product-snapshots/manifests/aiquadruped.json';
import aiquadrupedproSnapshot from '../builtin-product-snapshots/manifests/aiquadrupedpro.json';
import minihexaSnapshot from '../builtin-product-snapshots/manifests/minihexa.json';
import {normalizeCustomExtensionManifest} from '../manifest-schema';

// 内置产品读取由已验证 MPEXT 生成的同步 manifest，离线启动不需要异步解压或访问远程仓库。
const builtinProductManifests = {
    aidoggy: normalizeCustomExtensionManifest(aidoggySnapshot),
    aimecanum: normalizeCustomExtensionManifest(aimecanumSnapshot),
    aiquadruped: normalizeCustomExtensionManifest(aiquadrupedSnapshot),
    aiquadrupedpro: normalizeCustomExtensionManifest(aiquadrupedproSnapshot),
    minihexa: normalizeCustomExtensionManifest(minihexaSnapshot)
};

export {
    builtinProductManifests
};
