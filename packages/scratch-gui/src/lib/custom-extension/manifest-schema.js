const ID_PATTERN = /^[a-z0-9]+$/;
const OPCODE_PATTERN = /^[a-z][a-z0-9_]*$/;
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const blockTypeMap = {
    command: 'command',
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
    if (!rawBlock.codegen || !rawBlock.codegen.python || !rawBlock.codegen.python.template) {
        throw new Error(`积木 ${opcode} 缺少 codegen.python.template`);
    }

    const block = {
        opcode,
        blockType,
        scratchBlockType: blockTypeMap[blockType],
        text: String(rawBlock.text || opcode),
        arguments: normalizeArguments({opcode}, rawBlock.arguments),
        codegen: {
            python: {
                template: String(rawBlock.codegen.python.template),
                imports: Array.isArray(rawBlock.codegen.python.imports) ?
                    rawBlock.codegen.python.imports.map(String) :
                    []
            }
        }
    };
    validateArgumentReferences(block, Object.keys(block.arguments));
    return block;
};

const normalizeCustomExtensionManifest = rawManifest => {
    assertObject(rawManifest, '拓展库配置必须是 JSON 对象');

    if (Number(rawManifest.formatVersion) !== 1) {
        throw new Error('当前只支持 formatVersion = 1 的自定义拓展库');
    }

    const id = String(rawManifest.id || '').trim();
    if (!ID_PATTERN.test(id)) {
        throw new Error('拓展库 id 必须只包含小写字母和数字');
    }

    if (!Array.isArray(rawManifest.blocks) || rawManifest.blocks.length === 0) {
        throw new Error('拓展库至少需要包含一个积木');
    }

    const seenOpcodes = new Set();
    return {
        formatVersion: 1,
        id,
        name: String(rawManifest.name || id),
        version: String(rawManifest.version || '1.0.0'),
        icon: rawManifest.icon ? String(rawManifest.icon) : null,
        color1: normalizeColor(rawManifest.color1, '#4C97FF'),
        color2: normalizeColor(rawManifest.color2, '#3373CC'),
        color3: normalizeColor(rawManifest.color3, '#285CA3'),
        blocks: rawManifest.blocks.map(block => normalizeBlock(block, seenOpcodes))
    };
};

const serializeCustomExtensionManifest = manifest => {
    const serialized = {
        formatVersion: manifest.formatVersion,
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        color1: manifest.color1,
        color2: manifest.color2,
        color3: manifest.color3,
        blocks: manifest.blocks.map(block => ({
            opcode: block.opcode,
            blockType: block.blockType,
            text: block.text,
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
                    imports: block.codegen.python.imports || []
                }
            }
        }))
    };

    if (manifest.icon) serialized.icon = manifest.icon;
    return serialized;
};

export {
    normalizeCustomExtensionManifest,
    serializeCustomExtensionManifest
};
