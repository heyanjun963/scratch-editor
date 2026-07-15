import {normalizeCustomExtensionManifest} from './manifest-schema';

// 目录包数据合并层：内置源包和用户导入的 .sbext 共用同一套 manifest 生成规则。
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

// 将 manifest/blocks/generator/runtime files 合并成注册 VM 所需的 v2 manifest。
const createPackageManifest = ({
    rawManifest,
    rawBlocks,
    rawGenerator,
    runtimeFiles = [],
    packageFileName
}) => {
    const blockCollection = normalizeBlockCollection(rawBlocks);
    const generatorCollection = normalizeGeneratorCollection(rawGenerator);
    const blocks = blockCollection.blocks.map(rawBlock => {
        const safeRawBlock = rawBlock || {};
        const opcode = safeRawBlock.opcode;
        const blockGenerator = opcode ? generatorCollection.blocks[opcode] || {} : {};
        const python = getBlockPythonCodegen(
            safeRawBlock,
            opcode ? {
                ...blockGenerator,
                commonVariables: generatorCollection.variables,
                commonSetups: generatorCollection.setups,
                entryTemplate: blockGenerator.entryTemplate || generatorCollection.entryTemplate,
                entryFooter: blockGenerator.entryFooter || generatorCollection.entryFooter,
                launcher: blockGenerator.launcher || generatorCollection.launcher
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

export {
    createPackageManifest
};
