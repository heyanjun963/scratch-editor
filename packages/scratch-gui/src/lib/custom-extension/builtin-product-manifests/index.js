import aimecanumBlocks from '../builtin-product-packages/aimecanum/blocks.json';
import aimecanumGenerator from '../builtin-product-packages/aimecanum/generator/python.json';
import aimecanumManifest from '../builtin-product-packages/aimecanum/manifest.json';
import {createPackageManifest} from '../package-manifest';

// 内置产品直接读取标准源包；打包产物和编辑器内置 manifest 始终来自同一份配置。
const aimecanum = createPackageManifest({
    rawManifest: aimecanumManifest,
    rawBlocks: aimecanumBlocks,
    rawGenerator: aimecanumGenerator,
    packageFileName: 'aimecanum.sbext'
});

const builtinProductManifests = {
    aimecanum
};

export {
    builtinProductManifests
};
