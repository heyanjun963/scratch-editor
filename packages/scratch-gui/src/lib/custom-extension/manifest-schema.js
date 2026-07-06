const ID_PATTERN = /^[a-z0-9]+$/;
const OPCODE_PATTERN = /^[a-z][a-z0-9_]*$/;
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const blockTypeMap = {
    command: 'command',
    hat: 'hat',
    reporter: 'reporter',
    boolean: 'Boolean'
};

const argumentTypeMap = {
    string: 'string',
    number: 'number',
    boolean: 'Boolean'
};

const normalizeColor = (value, fallback) => {
    if (!value) return fallback;
    if (!COLOR_PATTERN.test(value)) {
        throw new Error(`颜色值 ${value} 必须是 #RRGGBB 格式`);
    }
    return value;
};

const assertObject = (value, message) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(message);
    }
};

const extractTextArgs = text => {
    const args = new Set();
    String(text || '').replace(/\[([A-Za-z][A-Za-z0-9_]*)\]/g, (match, name) => {
        args.add(name);
        return match;
    });
    return args;
};

const extractTemplateArgs = template => {
    const args = new Set();
    String(template || '').replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (match, name) => {
        args.add(name);
        return match;
    });
    return args;
};

const validateArgumentReferences = (block, argumentNames) => {
    const textArgs = extractTextArgs(block.text);
    const templateArgs = extractTemplateArgs(block.codegen.python.template);

    [...textArgs, ...templateArgs].forEach(name => {
        if (!argumentNames.includes(name)) {
            throw new Error(`积木 ${block.opcode} 引用了未定义参数 ${name}`);
        }
    });
};

const normalizeArguments = (block, rawArguments) => {
    assertObject(rawArguments || {}, `积木 ${block.opcode} 的 arguments 必须是对象`);

    return Object.keys(rawArguments || {}).reduce((argumentsByName, name) => {
        const argument = rawArguments[name];
        assertObject(argument, `积木 ${block.opcode} 的参数 ${name} 必须是对象`);
        const type = String(argument.type || 'string').toLowerCase();
        if (!argumentTypeMap[type]) {
            throw new Error(`积木 ${block.opcode} 的参数 ${name} 类型 ${type} 暂不支持`);
        }
        argumentsByName[name] = {
            type,
            scratchType: argumentTypeMap[type],
            defaultValue: typeof argument.defaultValue === 'undefined' ? '' : argument.defaultValue
        };
        return argumentsByName;
    }, {});
};

const normalizePythonCodegen = (opcode, rawPythonCodegen) => {
    assertObject(rawPythonCodegen, `积木 ${opcode} 缺少 codegen.python 配置`);
    if (typeof rawPythonCodegen.template === 'undefined') {
        throw new Error(`积木 ${opcode} 缺少 codegen.python.template`);
    }
    return {
        template: String(rawPythonCodegen.template),
        imports: Array.isArray(rawPythonCodegen.imports) ?
            rawPythonCodegen.imports.map(String) :
            [],
        runtimeFiles: Array.isArray(rawPythonCodegen.runtimeFiles) ?
            rawPythonCodegen.runtimeFiles.map(String) :
            [],
        variables: Array.isArray(rawPythonCodegen.variables) ?
            rawPythonCodegen.variables.map(String) :
            [],
        setups: Array.isArray(rawPythonCodegen.setups) ?
            rawPythonCodegen.setups.map(String) :
            [],
        launcher: rawPythonCodegen.launcher ? String(rawPythonCodegen.launcher) : '',
        section: rawPythonCodegen.section ? String(rawPythonCodegen.section) : ''
    };
};

const normalizeBlock = (rawBlock, seenOpcodes) => {
    assertObject(rawBlock, 'blocks 中的每一项都必须是对象');

    const opcode = String(rawBlock.opcode || '').trim();
    if (!OPCODE_PATTERN.test(opcode)) {
        throw new Error(`opcode ${opcode || '(空)'} 必须以小写字母开头，只能包含小写字母、数字和下划线`);
    }
    if (seenOpcodes.has(opcode)) {
        throw new Error(`opcode ${opcode} 重复`);
    }
    seenOpcodes.add(opcode);

    const blockType = String(rawBlock.blockType || 'command').toLowerCase();
    if (!blockTypeMap[blockType]) {
        throw new Error(`积木 ${opcode} 的 blockType ${blockType} 暂不支持`);
    }

    const rawPythonCodegen = rawBlock.codegen && rawBlock.codegen.python;
    const block = {
        opcode,
        blockType,
        scratchBlockType: blockTypeMap[blockType],
        text: String(rawBlock.text || opcode),
        arguments: normalizeArguments({opcode}, rawBlock.arguments),
        category: rawBlock.category ? String(rawBlock.category) : null,
        codegen: {
            python: normalizePythonCodegen(opcode, rawPythonCodegen)
        }
    };
    validateArgumentReferences(block, Object.keys(block.arguments));
    return block;
};

const normalizeBlocks = rawBlocks => {
    if (!Array.isArray(rawBlocks) || rawBlocks.length === 0) {
        throw new Error('拓展库至少需要包含一个积木');
    }
    const seenOpcodes = new Set();
    return rawBlocks.map(block => normalizeBlock(block, seenOpcodes));
};

const normalizeCategories = rawCategories => {
    if (!Array.isArray(rawCategories)) return [];
    return rawCategories.map(category => {
        assertObject(category, 'categories 中的每一项都必须是对象');
        return {
            id: String(category.id || category.name || ''),
            name: String(category.name || category.id || ''),
            blocks: Array.isArray(category.blocks) ? category.blocks.map(String) : []
        };
    }).filter(category => category.id || category.name);
};

const normalizeCommonManifestFields = rawManifest => {
    const id = String(rawManifest.id || '').trim();
    if (!ID_PATTERN.test(id)) {
        throw new Error('拓展库 id 必须只包含小写字母和数字');
    }

    return {
        id,
        name: String(rawManifest.name || id),
        version: String(rawManifest.version || '1.0.0'),
        description: rawManifest.description ? String(rawManifest.description) : '',
        icon: rawManifest.icon ? String(rawManifest.icon) : null,
        color1: normalizeColor(rawManifest.color1, '#4C97FF'),
        color2: normalizeColor(rawManifest.color2, '#3373CC'),
        color3: normalizeColor(rawManifest.color3, '#285CA3'),
        target: String(rawManifest.target || rawManifest.source || 'python'),
        source: String(rawManifest.source || rawManifest.target || 'python')
    };
};

const normalizeCustomExtensionManifestV1 = rawManifest => ({
    formatVersion: 1,
    ...normalizeCommonManifestFields(rawManifest),
    categories: [],
    runtime: {
        pythonLibraries: [],
        files: []
    },
    package: null,
    blocks: normalizeBlocks(rawManifest.blocks)
});

const normalizeCustomExtensionManifestV2 = rawManifest => ({
    formatVersion: 2,
    ...normalizeCommonManifestFields(rawManifest),
    categories: normalizeCategories(rawManifest.categories),
    runtime: {
        pythonLibraries: rawManifest.runtime && Array.isArray(rawManifest.runtime.pythonLibraries) ?
            rawManifest.runtime.pythonLibraries.map(String) :
            [],
        files: rawManifest.runtime && Array.isArray(rawManifest.runtime.files) ?
            rawManifest.runtime.files.map(file => ({
                path: String(file.path || ''),
                content: String(file.content || '')
            })).filter(file => file.path) :
            []
    },
    package: rawManifest.package || null,
    blocks: normalizeBlocks(rawManifest.blocks)
});

const normalizeCustomExtensionManifest = rawManifest => {
    assertObject(rawManifest, '拓展库配置必须是 JSON 对象');

    const formatVersion = Number(rawManifest.formatVersion || 1);
    if (formatVersion === 1) {
        return normalizeCustomExtensionManifestV1(rawManifest);
    }
    if (formatVersion === 2) {
        return normalizeCustomExtensionManifestV2(rawManifest);
    }
    throw new Error(`当前不支持 formatVersion = ${rawManifest.formatVersion} 的自定义拓展库`);
};

const serializeCustomExtensionManifest = manifest => {
    const serialized = {
        formatVersion: manifest.formatVersion,
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description || '',
        color1: manifest.color1,
        color2: manifest.color2,
        color3: manifest.color3,
        target: manifest.target || 'python',
        source: manifest.source || manifest.target || 'python',
        categories: manifest.categories || [],
        runtime: manifest.runtime || {pythonLibraries: [], files: []},
        blocks: manifest.blocks.map(block => ({
            opcode: block.opcode,
            blockType: block.blockType,
            text: block.text,
            category: block.category || undefined,
            arguments: Object.keys(block.arguments).reduce((argumentsByName, name) => {
                const argument = block.arguments[name];
                argumentsByName[name] = {
                    type: argument.type,
                    defaultValue: argument.defaultValue
                };
                return argumentsByName;
            }, {}),
            codegen: {
                python: {
                    template: block.codegen.python.template,
                    imports: block.codegen.python.imports || [],
                    runtimeFiles: block.codegen.python.runtimeFiles || [],
                    variables: block.codegen.python.variables || [],
                    setups: block.codegen.python.setups || [],
                    launcher: block.codegen.python.launcher || '',
                    section: block.codegen.python.section || ''
                }
            }
        }))
    };

    if (manifest.icon) serialized.icon = manifest.icon;
    if (manifest.package) serialized.package = manifest.package;
    return serialized;
};

export {
    normalizeCustomExtensionManifest,
    serializeCustomExtensionManifest
};
