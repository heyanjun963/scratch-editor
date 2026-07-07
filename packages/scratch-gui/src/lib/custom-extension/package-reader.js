import JSZip from 'jszip';

import {normalizeCustomExtensionManifest} from './manifest-schema';

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

const uniqueStrings = values => Array.from(new Set(values.filter(Boolean).map(String)));

// blocks.json 兼容数组和 {categories, blocks} 两种写法。
const normalizeBlockCollection = rawBlocks => {
    if (Array.isArray(rawBlocks)) {
        return {
            categories: [],
            blocks: rawBlocks
        };
    }
    if (rawBlocks && typeof rawBlocks === 'object') {
        if (!Array.isArray(rawBlocks.blocks)) {
            throw new Error('blocks.json must contain a blocks array');
        }
        return {
            categories: Array.isArray(rawBlocks.categories) ? rawBlocks.categories : [],
            blocks: rawBlocks.blocks
        };
    }
    throw new Error('blocks.json must be an array, or an object with a blocks array');
};

// generator/python.json 可以写公共配置，也可以按 opcode 覆盖每个积木的生成规则。
const normalizeGeneratorCollection = rawGenerator => {
    if (!rawGenerator || typeof rawGenerator !== 'object' || Array.isArray(rawGenerator)) {
        throw new Error('generator/python.json must be an object');
    }
    return {
        imports: Array.isArray(rawGenerator.imports) ? rawGenerator.imports.map(String) : [],
        variables: Array.isArray(rawGenerator.variables) ? rawGenerator.variables.map(String) : [],
        setups: Array.isArray(rawGenerator.setups) ? rawGenerator.setups.map(String) : [],
        entryTemplate: rawGenerator.entryTemplate ? String(rawGenerator.entryTemplate) : '',
        entryFooter: rawGenerator.entryFooter ? String(rawGenerator.entryFooter) : '',
        launcher: rawGenerator.launcher ? String(rawGenerator.launcher) : '',
        blocks: rawGenerator.blocks && typeof rawGenerator.blocks === 'object' ?
            rawGenerator.blocks :
            rawGenerator
    };
};

// 合并 block 内联 codegen 和独立 generator 配置，独立 generator 优先补齐模板。
const getBlockPythonCodegen = (rawBlock, generatorInfo, commonImports) => {
    const inlinePython = rawBlock.codegen && rawBlock.codegen.python ? rawBlock.codegen.python : {};
    const generatorPython = generatorInfo || {};
    const template = typeof generatorPython.template === 'undefined' ?
        inlinePython.template :
        generatorPython.template;

    return {
        template,
        imports: uniqueStrings([
            ...commonImports,
            ...(Array.isArray(inlinePython.imports) ? inlinePython.imports : []),
            ...(Array.isArray(generatorPython.imports) ? generatorPython.imports : [])
        ]),
        variables: uniqueStrings([
            ...(Array.isArray(generatorPython.commonVariables) ? generatorPython.commonVariables : []),
            ...(Array.isArray(inlinePython.variables) ? inlinePython.variables : []),
            ...(Array.isArray(generatorPython.variables) ? generatorPython.variables : [])
        ]),
        setups: uniqueStrings([
            ...(Array.isArray(generatorPython.commonSetups) ? generatorPython.commonSetups : []),
            ...(Array.isArray(inlinePython.setups) ? inlinePython.setups : []),
            ...(Array.isArray(generatorPython.setups) ? generatorPython.setups : [])
        ]),
        entryTemplate: generatorPython.entryTemplate || inlinePython.entryTemplate || '',
        entryFooter: generatorPython.entryFooter || inlinePython.entryFooter || '',
        launcher: generatorPython.launcher || inlinePython.launcher || '',
        section: generatorPython.section || inlinePython.section || '',
        runtimeFiles: uniqueStrings([
            ...(Array.isArray(inlinePython.runtimeFiles) ? inlinePython.runtimeFiles : []),
            ...(Array.isArray(generatorPython.runtimeFiles) ? generatorPython.runtimeFiles : [])
        ])
    };
};

// 目录包合并入口：manifest/config + blocks + generator + runtime files -> v2 manifest。
const mergePackageManifest = async (zipLookup, rawManifest, rawBlocks, rawGenerator, packageFileName) => {
    const blockCollection = normalizeBlockCollection(rawBlocks);
    const generatorCollection = normalizeGeneratorCollection(rawGenerator);
    const blocks = blockCollection.blocks.map(rawBlock => {
        const safeRawBlock = rawBlock || {};
        const opcode = safeRawBlock.opcode;
        const python = getBlockPythonCodegen(
            safeRawBlock,
            opcode ? {
                ...(generatorCollection.blocks[opcode] || {}),
                commonVariables: generatorCollection.variables,
                commonSetups: generatorCollection.setups,
                entryTemplate: (generatorCollection.blocks[opcode] && generatorCollection.blocks[opcode].entryTemplate) ||
                    generatorCollection.entryTemplate,
                entryFooter: (generatorCollection.blocks[opcode] && generatorCollection.blocks[opcode].entryFooter) ||
                    generatorCollection.entryFooter,
                launcher: (generatorCollection.blocks[opcode] && generatorCollection.blocks[opcode].launcher) ||
                    generatorCollection.launcher
            } : null,
            generatorCollection.imports
        );
        return {
            ...safeRawBlock,
            codegen: {
                ...(safeRawBlock.codegen || {}),
                python
            }
        };
    });
    const runtime = rawManifest.runtime || {};
    const runtimeFilePaths = uniqueStrings([
        ...(Array.isArray(runtime.pythonLibraries) ? runtime.pythonLibraries : []),
        ...blocks.flatMap(block => block.codegen.python.runtimeFiles || [])
    ]);
    const runtimeFiles = await readOptionalRuntimeFiles(zipLookup, runtimeFilePaths);

    return normalizeCustomExtensionManifest({
        ...rawManifest,
        formatVersion: 2,
        categories: blockCollection.categories.length ? blockCollection.categories : rawManifest.categories,
        runtime: {
            ...runtime,
            pythonLibraries: runtimeFilePaths,
            files: runtimeFiles
        },
        package: {
            fileName: packageFileName,
            structure: 'company-scratch-extension-package-v2'
        },
        blocks
    });
};

// 读取 WonderCam 类目录包压缩文件，保留新协议但兼容常见文件命名。
const readZipPackage = async file => {
    const zip = await JSZip.loadAsync(await readFileAsArrayBuffer(file));
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

    return mergePackageManifest(lookup, rawManifest, rawBlocks, rawGenerator, file.name);
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
    readCustomExtensionPackage
};
