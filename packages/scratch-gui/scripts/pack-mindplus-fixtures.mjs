// 批量生成固定的 Mind+ Python fixture，实际压缩规则复用产品 MPEXT 打包器。
import path from 'path';
import {fileURLToPath} from 'url';

import {packMindPlusExtension, readMindPlusConfig} from './pack-mindplus-extension.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureRoot = path.join(packageRoot, 'test/fixtures/custom-extension/mindplus');
const fixtureNames = ['aidoggy-python-fixture', 'python-basic-fixture'];

const outputFlagIndex = process.argv.indexOf('--output');
const outputDirectory = outputFlagIndex >= 0 ?
    path.resolve(process.argv[outputFlagIndex + 1]) :
    path.join(fixtureRoot, 'dist');

Promise.all(fixtureNames.map(name => {
    const sourceDirectory = path.join(fixtureRoot, name);
    const config = readMindPlusConfig(sourceDirectory);
    const pythonAsset = config.asset.python;
    const version = config.version || pythonAsset.version;
    if (!version) throw new Error(`Mind+ fixture 缺少版本: ${name}`);
    const outputFile = path.join(outputDirectory, `${name}-${version}.mpext`);
    return packMindPlusExtension(sourceDirectory, outputFile).then(result => result.outputFile);
}))
    .then(files => files.forEach(file => console.info(file)))
    .catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
