// 将单个 Mind+ Python 源目录打包为确定性 MPEXT，供测试和产品发布共用。
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

import JSZip from 'jszip';

const PACKAGE_FILE_DATE = new Date(Date.UTC(1980, 0, 1));

const collectFiles = directory => fs.readdirSync(directory, {withFileTypes: true})
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap(entry => {
        const absolutePath = path.join(directory, entry.name);
        return entry.isDirectory() ? collectFiles(absolutePath) : [absolutePath];
    });

const readMindPlusConfig = sourceDirectory => {
    const configPath = path.join(sourceDirectory, 'config.json');
    if (!fs.existsSync(configPath)) {
        throw new Error(`Mind+ 产品源缺少 config.json: ${sourceDirectory}`);
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const pythonAsset = config.asset && config.asset.python;
    if (!config.id || !pythonAsset || !pythonAsset.dir || !pythonAsset.main) {
        throw new Error(`Mind+ 产品源必须声明 id 和 asset.python.dir/main: ${sourceDirectory}`);
    }
    const mainPath = path.join(sourceDirectory, pythonAsset.dir, pythonAsset.main);
    if (!fs.existsSync(mainPath)) {
        throw new Error(`Mind+ 产品源缺少 asset.python.main: ${mainPath}`);
    }
    return config;
};

const packMindPlusExtension = async (sourceDirectory, outputFile) => {
    const absoluteSource = path.resolve(sourceDirectory);
    const absoluteOutput = path.resolve(outputFile);
    const config = readMindPlusConfig(absoluteSource);
    const zip = new JSZip();
    collectFiles(absoluteSource).forEach(absolutePath => {
        const relativePath = path.relative(absoluteSource, absolutePath).split(path.sep).join('/');
        zip.file(relativePath, fs.readFileSync(absolutePath), {
            createFolders: false,
            date: PACKAGE_FILE_DATE
        });
    });
    const content = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: {level: 9}
    });
    fs.mkdirSync(path.dirname(absoluteOutput), {recursive: true});
    fs.writeFileSync(absoluteOutput, content);
    return {config, outputFile: absoluteOutput};
};

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
    const sourceDirectory = process.argv[2];
    const outputFile = process.argv[3];
    if (!sourceDirectory || !outputFile) {
        console.error('用法: node scripts/pack-mindplus-extension.mjs <Mind+ 源目录> <输出.mpext>');
        process.exitCode = 1;
    } else {
        packMindPlusExtension(sourceDirectory, outputFile)
            .then(result => console.info(result.outputFile))
            .catch(error => {
                console.error(error);
                process.exitCode = 1;
            });
    }
}

export {
    packMindPlusExtension,
    readMindPlusConfig
};
