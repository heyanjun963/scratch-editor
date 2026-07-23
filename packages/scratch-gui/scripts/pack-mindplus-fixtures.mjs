// 将固定的 Mind+ Python fixture 源目录打包为可重复生成的 MPEXT 测试包。
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

import JSZip from 'jszip';

const PACKAGE_FILE_DATE = new Date(Date.UTC(1980, 0, 1));
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureRoot = path.join(packageRoot, 'test/fixtures/custom-extension/mindplus');
const fixtureNames = ['aidoggy-python-fixture', 'python-basic-fixture'];

// 递归收集 fixture 源文件，并固定排序以保证生成的 MPEXT 二进制稳定。
const collectFiles = directory => fs.readdirSync(directory, {withFileTypes: true})
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap(entry => {
        const absolutePath = path.join(directory, entry.name);
        return entry.isDirectory() ? collectFiles(absolutePath) : [absolutePath];
    });

// Mind+ 测试包保持官方目录结构，只验证 config 与 asset 入口，不转换成本项目 manifest。
const packFixture = async (fixtureName, outputDirectory) => {
    const sourceDirectory = path.join(fixtureRoot, fixtureName);
    const configPath = path.join(sourceDirectory, 'config.json');
    if (!fs.existsSync(configPath)) {
        throw new Error(`Mind+ fixture 缺少 config.json: ${fixtureName}`);
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const assets = Object.values(config.asset || {});
    if (assets.length !== 1 || !assets[0].dir || !assets[0].main) {
        throw new Error(`Mind+ fixture 必须声明一个带 dir/main 的 asset: ${fixtureName}`);
    }
    const mainPath = path.join(sourceDirectory, assets[0].dir, assets[0].main);
    if (!fs.existsSync(mainPath)) {
        throw new Error(`Mind+ fixture 缺少 asset.main: ${fixtureName}`);
    }

    const zip = new JSZip();
    collectFiles(sourceDirectory).forEach(absolutePath => {
        const relativePath = path.relative(sourceDirectory, absolutePath).split(path.sep).join('/');
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
    fs.mkdirSync(outputDirectory, {recursive: true});
    const outputFile = path.join(outputDirectory, `${fixtureName}-${config.version}.mpext`);
    fs.writeFileSync(outputFile, content);
    return outputFile;
};

const outputFlagIndex = process.argv.indexOf('--output');
const outputDirectory = outputFlagIndex >= 0 ?
    path.resolve(process.argv[outputFlagIndex + 1]) :
    path.join(fixtureRoot, 'dist');

Promise.all(fixtureNames.map(name => packFixture(name, outputDirectory)))
    .then(files => files.forEach(file => console.log(file)))
    .catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
