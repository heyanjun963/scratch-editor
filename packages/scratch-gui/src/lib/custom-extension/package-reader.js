import JSZip from 'jszip';

import {normalizeCustomExtensionManifest} from './manifest-schema';
import {adaptMindPlusPythonPackage} from './mindplus-package-adapter';
import {createPackageManifest} from './package-manifest';

const JSON_EXTENSIONS = ['.json'];
const ZIP_EXTENSIONS = ['.zip', '.sbext', '.mpext'];

// package-reader 负责把用户选择的 .json/.zip/.sbext/.mpext 统一读成规范化 manifest。
const getFileExtension = fileName => {
    const dotIndex = String(fileName || '').lastIndexOf('.');
    return dotIndex >= 0 ? String(fileName).slice(dotIndex).toLowerCase() : '';
};

// 浏览器 File API 文本读取，用于单 JSON manifest。
const readFileAsText = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsText(file);
});

// 压缩包需要 ArrayBuffer 交给 JSZip 解析。
const readFileAsArrayBuffer = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsArrayBuffer(file);
});

// ZIP 内路径统一小写索引，兼容 Windows/Mixly 目录包常见的大小写差异。
const createZipLookup = zip => Object.keys(zip.files).reduce((lookup, path) => {
    const file = zip.files[path];
    if (!file.dir) {
        lookup.set(path.toLowerCase(), file);
    }
    return lookup;
}, new Map());

// 按候选路径查找文件，支持 config.json/manifest.json 等多种包结构别名。
const getZipFile = (lookup, candidates) => {
    for (const candidate of candidates.filter(Boolean)) {
        const file = lookup.get(String(candidate).replace(/\\/g, '/').toLowerCase());
        if (file) return file;
    }
    return null;
};

// 读取 ZIP 内 JSON，并把错误信息定位到具体配置文件。
const readZipJson = async (lookup, candidates, label) => {
    const file = getZipFile(lookup, candidates);
    if (!file) {
        throw new Error(`Extension package is missing ${label}: ${candidates.filter(Boolean).join(' or ')}`);
    }
    try {
        return JSON.parse(await file.async('string'));
    } catch (error) {
        throw new Error(`${file.name} is not valid JSON: ${error.message}`);
    }
};

const readOptionalZipJson = async (lookup, candidates) => {
    const file = getZipFile(lookup, candidates);
    if (!file) return {};
    try {
        return JSON.parse(await file.async('string'));
    } catch (error) {
        throw new Error(`${file.name} is not valid JSON: ${error.message}`);
    }
};

// 多语言文件按低优先级到高优先级合并，让中文缺失的键继续回退英文。
const readMergedOptionalZipJson = async (lookup, candidates) => {
    const localeFiles = await Promise.all(
        candidates.map(candidate => readOptionalZipJson(lookup, [candidate]))
    );
    return Object.assign({}, ...localeFiles);
};

const readZipText = async (lookup, candidates, label) => {
    const file = getZipFile(lookup, candidates);
    if (!file) {
        throw new Error(`Extension package is missing ${label}: ${candidates.filter(Boolean).join(' or ')}`);
    }
    return file.async('string');
};

// 外部包路径必须保持在 ZIP 根目录内，不能通过 ../ 跳出 asset 目录。
const normalizePackagePath = value => {
    const path = String(value || '').replace(/\\/g, '/');
    const parts = path.split('/').filter(part => part && part !== '.');
    if (path.startsWith('/') || parts.includes('..')) {
        throw new Error(`Mind+ 包包含不安全路径: ${value}`);
    }
    return parts.join('/');
};

const joinPackagePath = (directory, relativePath) => normalizePackagePath(
    `${normalizePackagePath(directory)}/${normalizePackagePath(relativePath)}`
);

// 产品图标只从 Mind+ 约定目录读取，并转成浏览器可直接显示的数据 URI。
const readOptionalPackageIcon = async (lookup, assetDirectory) => {
    const svgFile = getZipFile(lookup, [joinPackagePath(assetDirectory, '_images/icon.svg')]);
    if (svgFile) {
        return `data:image/svg+xml;utf8,${encodeURIComponent(await svgFile.async('string'))}`;
    }
    const pngFile = getZipFile(lookup, [joinPackagePath(assetDirectory, '_images/icon.png')]);
    if (pngFile) {
        return `data:image/png;base64,${await pngFile.async('base64')}`;
    }
    return null;
};

// runtime 文件不是所有包都必须携带，存在则内联到 manifest 方便桌面端保存。
const readOptionalRuntimeFiles = async (lookup, paths) => {
    const uniquePaths = Array.from(new Set(paths.filter(Boolean).map(path => String(path).replace(/\\/g, '/'))));
    const files = [];
    for (const path of uniquePaths) {
        const file = getZipFile(lookup, [path]);
        if (file) {
            files.push({
                path,
                content: await file.async('string')
            });
        }
    }
    return files;
};

// 目录包合并入口：manifest/config + blocks + generator + runtime files -> v2 manifest。
const mergePackageManifest = async (
    zipLookup,
    rawManifest,
    rawBlocks,
    rawGenerator,
    packageFileName,
    packageStructure
) => {
    // 先合并一次得到完整运行库路径，再读取包内文件并写回最终 manifest。
    const packageManifest = createPackageManifest({
        rawManifest,
        rawBlocks,
        rawGenerator,
        packageFileName,
        packageStructure
    });
    const runtimeFiles = await readOptionalRuntimeFiles(zipLookup, packageManifest.runtime.pythonLibraries);

    return createPackageManifest({
        rawManifest,
        rawBlocks,
        rawGenerator,
        runtimeFiles,
        packageFileName,
        packageStructure
    });
};

// Mind+ Python 包先静态转换为现有三段配置，再复用统一的 manifest 合并和运行库读取流程。
const readMindPlusPackageData = async (lookup, rawConfig, packageFileName) => {
    const assets = rawConfig.asset || {};
    const pythonAsset = assets.python;
    if (!pythonAsset || typeof pythonAsset !== 'object') {
        throw new Error('Mind+ 包当前只支持 asset.python');
    }
    const assetDirectory = normalizePackagePath(pythonAsset.dir || 'python');
    const mainPath = joinPackagePath(assetDirectory, pythonAsset.main || 'main.ts');
    const mainSource = await readZipText(lookup, [mainPath], 'asset.python.main');
    const rawMenus = await readOptionalZipJson(lookup, [
        joinPackagePath(assetDirectory, '_menus/index.json')
    ]);
    const rawLocales = await readMergedOptionalZipJson(lookup, [
        joinPackagePath(assetDirectory, '_locales/en.json'),
        joinPackagePath(assetDirectory, '_locales/zh.json'),
        joinPackagePath(assetDirectory, '_locales/zh-cn.json')
    ]);
    const icon = await readOptionalPackageIcon(lookup, assetDirectory);
    const declaredRuntimePaths = Array.isArray(pythonAsset.files) ? pythonAsset.files
        .filter(path => String(path).toLowerCase().endsWith('.py'))
        .map(path => joinPackagePath(assetDirectory, path)) : [];
    const libraryPrefix = `${assetDirectory.toLowerCase()}/libraries/`;
    const discoveredRuntimePaths = Array.from(lookup.values())
        .map(file => normalizePackagePath(file.name))
        .filter(path => path.toLowerCase().startsWith(libraryPrefix) && path.toLowerCase().endsWith('.py'));
    const runtimePythonLibraries = Array.from(new Set([
        ...declaredRuntimePaths,
        ...discoveredRuntimePaths
    ]));
    const adapted = adaptMindPlusPythonPackage({
        rawConfig,
        mainSource,
        rawMenus,
        rawLocales,
        runtimePythonLibraries,
        icon
    });

    return mergePackageManifest(
        lookup,
        adapted.rawManifest,
        adapted.rawBlocks,
        adapted.rawGenerator,
        packageFileName,
        'mindplus-python-package-v1'
    );
};

// 读取内存中的目录包数据，供浏览器文件、内置产物和后续远程下载共同复用。
const readZipPackageData = async (data, packageFileName) => {
    const zip = await JSZip.loadAsync(data);
    const lookup = createZipLookup(zip);
    const rawManifest = await readZipJson(lookup, ['manifest.json', 'config.json'], 'config.json/manifest.json');
    if (rawManifest.asset) {
        return readMindPlusPackageData(lookup, rawManifest, packageFileName);
    }
    const entry = rawManifest.entry || {};
    const blocksPath = entry.blocks || 'blocks.json';
    const generatorPath = entry.python || entry.generator || 'generator/python.json';
    const rawBlocks = await readZipJson(
        lookup,
        [blocksPath, `blocks/${rawManifest.id}.json`, `block/${rawManifest.id}.json`],
        'blocks.json'
    );
    const rawGenerator = await readZipJson(
        lookup,
        [generatorPath, 'generators/python.json', `generator/${rawManifest.id}.json`],
        'generator/python.json'
    );

    return mergePackageManifest(lookup, rawManifest, rawBlocks, rawGenerator, packageFileName);
};

// 读取 WonderCam 类目录包压缩文件，保留新协议但兼容常见文件命名。
const readZipPackage = async file => readZipPackageData(await readFileAsArrayBuffer(file), file.name);

// 二进制包入口不依赖 FileReader，方便测试、Electron 和远程 Release 下载后直接解析。
const readCustomExtensionPackageBuffer = (data, packageFileName) => {
    const extension = getFileExtension(packageFileName);
    if (!ZIP_EXTENSIONS.includes(extension)) {
        return Promise.reject(new Error('Only .zip, .sbext or .mpext binary extension library files are supported'));
    }
    return readZipPackageData(data, packageFileName);
};

// 单 JSON 文件走最小格式，适合用户快速分享自定义积木。
const readJsonManifest = async file => {
    try {
        return normalizeCustomExtensionManifest(JSON.parse(await readFileAsText(file)));
    } catch (error) {
        throw new Error(`${file.name} import failed: ${error.message}`);
    }
};

// 文件后缀决定读取策略，调用方只关心最终得到的 manifest。
const readCustomExtensionPackage = file => {
    const extension = getFileExtension(file.name);
    if (JSON_EXTENSIONS.includes(extension)) {
        return readJsonManifest(file);
    }
    if (ZIP_EXTENSIONS.includes(extension)) {
        return readZipPackage(file);
    }
    return Promise.reject(new Error('Only .json, .zip, .sbext or .mpext extension library files are supported'));
};

export {
    readCustomExtensionPackage,
    readCustomExtensionPackageBuffer
};
