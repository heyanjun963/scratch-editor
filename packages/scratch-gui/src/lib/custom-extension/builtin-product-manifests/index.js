import aimecanumBlocks from '../builtin-product-packages/aimecanum/blocks.json';
import aimecanumGenerator from '../builtin-product-packages/aimecanum/generator/python.json';
import aimecanumManifest from '../builtin-product-packages/aimecanum/manifest.json';
import aidoggyBlocks from '../builtin-product-packages/aidoggy/blocks.json';
import aidoggyGenerator from '../builtin-product-packages/aidoggy/generator/python.json';
import aidoggyManifest from '../builtin-product-packages/aidoggy/manifest.json';
import minihexaBlocks from '../builtin-product-packages/minihexa/blocks.json';
import minihexaGenerator from '../builtin-product-packages/minihexa/generator/python.json';
import minihexaManifest from '../builtin-product-packages/minihexa/manifest.json';
import {createPackageManifest} from '../package-manifest';

// 内置产品直接读取标准源包；打包产物和编辑器内置 manifest 始终来自同一份配置。
const aimecanum = createPackageManifest({
    rawManifest: aimecanumManifest,
    rawBlocks: aimecanumBlocks,
    rawGenerator: aimecanumGenerator,
    packageFileName: 'aimecanum.sbext'
});

// miniHexa 内置默认包与远程发布包共用同一份积木和 Python 生成配置。
const minihexa = createPackageManifest({
    rawManifest: minihexaManifest,
    rawBlocks: minihexaBlocks,
    rawGenerator: minihexaGenerator,
    packageFileName: 'minihexa.sbext'
});

// AiDoggy 默认包从旧 VM 与旧 Python 生成器提取，供离线内置和后续远程更新共同使用。
const aidoggy = createPackageManifest({
    rawManifest: aidoggyManifest,
    rawBlocks: aidoggyBlocks,
    rawGenerator: aidoggyGenerator,
    packageFileName: 'aidoggy.sbext'
});

const builtinProductManifests = {
    aimecanum,
    minihexa,
    aidoggy
};

export {
    builtinProductManifests
};
