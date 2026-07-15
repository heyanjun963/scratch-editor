import JSZip from 'jszip';

import {normalizeCustomExtensionManifest} from './manifest-schema';
import {createPackageManifest} from './package-manifest';

const JSON_EXTENSIONS = ['.json'];
const ZIP_EXTENSIONS = ['.zip', '.sbext'];

// package-reader 负责把用户选择的 .json/.zip/.sbext 统一读成规范化 manifest。
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
const mergePackageManifest = async (zipLookup, rawManifest, rawBlocks, rawGenerator, packageFileName) => {
    // 先合并一次得到完整运行库路径，再读取包内文件并写回最终 manifest。
    const packageManifest = createPackageManifest({
        rawManifest,
        rawBlocks,
        rawGenerator,
        packageFileName
    });
    const runtimeFiles = await readOptionalRuntimeFiles(zipLookup, packageManifest.runtime.pythonLibraries);

    return createPackageManifest({
        rawManifest,
        rawBlocks,
        rawGenerator,
        runtimeFiles,
        packageFileName
    });
};

// 读取内存中的目录包数据，供浏览器文件、内置产物和后续远程下载共同复用。
const readZipPackageData = async (data, packageFileName) => {
    const zip = await JSZip.loadAsync(data);
    const lookup = createZipLookup(zip);
    const rawManifest = await readZipJson(lookup, ['manifest.json', 'config.json'], 'config.json/manifest.json');
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
        return Promise.reject(new Error('Only .zip or .sbext binary extension library files are supported'));
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
    return Promise.reject(new Error('Only .json, .zip or .sbext extension library files are supported'));
};

export {
    readCustomExtensionPackage,
    readCustomExtensionPackageBuffer
};
