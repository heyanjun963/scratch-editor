import JSZip from 'jszip';

import {normalizeCustomExtensionManifest} from './manifest-schema';

const JSON_EXTENSIONS = ['.json'];
const ZIP_EXTENSIONS = ['.zip', '.sbext'];

const getFileExtension = fileName => {
    const dotIndex = String(fileName || '').lastIndexOf('.');
    return dotIndex >= 0 ? String(fileName).slice(dotIndex).toLowerCase() : '';
};

const readFileAsText = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsText(file);
});

const readFileAsArrayBuffer = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsArrayBuffer(file);
});

const createZipLookup = zip => Object.keys(zip.files).reduce((lookup, path) => {
    const file = zip.files[path];
    if (!file.dir) {
        lookup.set(path.toLowerCase(), file);
    }
    return lookup;
}, new Map());

const getZipFile = (lookup, candidates) => {
    for (const candidate of candidates.filter(Boolean)) {
        const file = lookup.get(String(candidate).replace(/\\/g, '/').toLowerCase());
        if (file) return file;
    }
    return null;
};

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

const readJsonManifest = async file => {
    try {
        return normalizeCustomExtensionManifest(JSON.parse(await readFileAsText(file)));
    } catch (error) {
        throw new Error(`${file.name} import failed: ${error.message}`);
    }
};

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
