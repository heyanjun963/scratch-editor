import aidoggySnapshot from '../builtin-product-snapshots/manifests/aidoggy.json';
import aihexaSnapshot from '../builtin-product-snapshots/manifests/aihexa.json';
import aimecanumSnapshot from '../builtin-product-snapshots/manifests/aimecanum.json';
import aimechSnapshot from '../builtin-product-snapshots/manifests/aimech.json';
import aiquadrupedSnapshot from '../builtin-product-snapshots/manifests/aiquadruped.json';
import aiquadrupedproSnapshot from '../builtin-product-snapshots/manifests/aiquadrupedpro.json';
import actuatorSnapshot from '../builtin-product-snapshots/manifests/actuator.json';
import communicationSnapshot from '../builtin-product-snapshots/manifests/communication.json';
import displaySnapshot from '../builtin-product-snapshots/manifests/display.json';
import minihexaSnapshot from '../builtin-product-snapshots/manifests/minihexa.json';
import sensorSnapshot from '../builtin-product-snapshots/manifests/sensor.json';
import xarmSnapshot from '../builtin-product-snapshots/manifests/xarm.json';
import {normalizeCustomExtensionManifest} from '../manifest-schema';

// 内置产品读取由已验证 MPEXT 生成的同步 manifest，离线启动不需要异步解压或访问远程仓库。
const builtinProductManifests = {
    aidoggy: normalizeCustomExtensionManifest(aidoggySnapshot),
    aihexa: normalizeCustomExtensionManifest(aihexaSnapshot),
    aimecanum: normalizeCustomExtensionManifest(aimecanumSnapshot),
    aimech: normalizeCustomExtensionManifest(aimechSnapshot),
    aiquadruped: normalizeCustomExtensionManifest(aiquadrupedSnapshot),
    aiquadrupedpro: normalizeCustomExtensionManifest(aiquadrupedproSnapshot),
    actuator: normalizeCustomExtensionManifest(actuatorSnapshot),
    communication: normalizeCustomExtensionManifest(communicationSnapshot),
    display: normalizeCustomExtensionManifest(displaySnapshot),
    minihexa: normalizeCustomExtensionManifest(minihexaSnapshot),
    sensor: normalizeCustomExtensionManifest(sensorSnapshot),
    xarm: normalizeCustomExtensionManifest(xarmSnapshot)
};

export {
    builtinProductManifests
};
