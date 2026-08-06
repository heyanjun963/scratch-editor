const ID_PATTERN = /^[a-z0-9]+$/;
// Scratch 扩展允许使用驼峰 opcode；保留原值才能兼容旧工程中的积木标识。
const OPCODE_PATTERN = /^[a-z][A-Za-z0-9_]*$/;
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
    boolean: 'Boolean',
    color: 'color',
    // line4/line6 对应 scratch-vm 的专用参数类型，用于巡线传感器位掩码选择器。
    line4: 'line4',
    line6: 'line6'
};

// manifest-schema 是所有自定义拓展库的入口校验层，负责把外部 JSON 规整成内部稳定结构。
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

// 从积木文案 [ARG] 中提取参数名，用于校验 arguments 是否完整。
const extractTextArgs = text => {
    const args = new Set();
    String(text || '').replace(/\[([A-Za-z][A-Za-z0-9_]*)\]/g, (match, name) => {
        args.add(name);
        return match;
    });
    return args;
};

// 从 Python 模板 {ARG} 中提取参数名，避免导入后才在代码生成阶段报错。
const extractTemplateArgs = template => {
    const args = new Set();
    String(template || '').replace(/\{([A-Za-z][A-Za-z0-9_]*)(?:\.([A-Za-z][A-Za-z0-9_]*))?\}/g,
        (match, name, formatter) => {
            if (formatter && formatter !== 'rgb') {
                throw new Error(`Python 模板参数 ${name} 使用了不支持的格式化方式 ${formatter}`);
            }
            args.add(name);
            return match;
        });
    return args;
};

const validateArgumentReferences = (block, argumentNames) => {
    const textArgs = extractTextArgs(block.text);
    const templateSelector = block.codegen.python.templateSelector;
    const selectedTemplates = templateSelector ? Object.values(templateSelector.cases) : [];
    const selectedTemplateArgs = selectedTemplates
        .flatMap(template => Array.from(extractTemplateArgs(template)));
    const templateArgs = new Set([
        ...extractTemplateArgs(block.codegen.python.template),
        ...selectedTemplateArgs
    ]);

    if (templateSelector && !argumentNames.includes(templateSelector.argument)) {
        throw new Error(`积木 ${block.opcode} 的 templateSelector 引用了未定义参数 ${templateSelector.argument}`);
    }
    if (templateSelector && !block.arguments[templateSelector.argument].literal) {
        throw new Error(`积木 ${block.opcode} 的 templateSelector 参数 ${templateSelector.argument} 必须是固定字段`);
    }

    [...textArgs, ...templateArgs].forEach(name => {
        if (!argumentNames.includes(name)) {
            throw new Error(`积木 ${block.opcode} 引用了未定义参数 ${name}`);
        }
    });
    [block.codegen.python.template, ...selectedTemplates].forEach(template => {
        String(template || '').replace(/\{([A-Za-z][A-Za-z0-9_]*)\.rgb\}/g, (match, name) => {
            if (!block.arguments[name] || block.arguments[name].type !== 'color') {
                throw new Error(`积木 ${block.opcode} 的 RGB 格式化参数 ${name} 必须是 color 类型`);
            }
            return match;
        });
    });
};

// 参数标准化会保留 Scratch 渲染所需类型，也保留 Python 模板所需的 literal/menu 信息。
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
            defaultValue: typeof argument.defaultValue === 'undefined' ? '' : argument.defaultValue,
            menu: argument.menu ? String(argument.menu) : null,
            literal: Boolean(argument.literal)
        };
        return argumentsByName;
    }, {});
};

// 菜单项兼容纯字符串和 {text,value} 两种写法，方便手写和工具生成。
const normalizeMenus = rawMenus => {
    if (!rawMenus || typeof rawMenus !== 'object' || Array.isArray(rawMenus)) return {};
    return Object.keys(rawMenus).reduce((menus, name) => {
        const menu = rawMenus[name];
        if (!menu || typeof menu !== 'object' || !Array.isArray(menu.items)) return menus;
        menus[name] = {
            items: menu.items.map(item => {
                if (typeof item === 'string') return item;
                return {
                    text: String(item.text),
                    value: String(item.value)
                };
            })
        };
        return menus;
    }, {});
};

// 菜单选择器让纯 JSON 配置按固定字段值选择模板，用于迁移旧生成器中的 switch 分支。
const normalizeTemplateSelector = (opcode, rawSelector) => {
    if (!rawSelector) return null;
    assertObject(rawSelector, `积木 ${opcode} 的 templateSelector 必须是对象`);
    const argument = String(rawSelector.argument || '').trim();
    assertObject(rawSelector.cases, `积木 ${opcode} 的 templateSelector.cases 必须是对象`);
    const cases = Object.keys(rawSelector.cases).reduce((result, value) => {
        result[String(value)] = String(rawSelector.cases[value]);
        return result;
    }, {});
    if (!argument || Object.keys(cases).length === 0) {
        throw new Error(`积木 ${opcode} 的 templateSelector 必须声明 argument 和 cases`);
    }
    return {argument, cases};
};

const normalizeForcedVariables = (opcode, rawVariables) => {
    if (!Array.isArray(rawVariables)) return [];
    return rawVariables.map((rawVariable, index) => {
        assertObject(rawVariable, `积木 ${opcode} 的 forcedVariables[${index}] 必须是对象`);
        const name = String(rawVariable.name || '').trim();
        const code = String(rawVariable.code || '');
        if (!name || !code) {
            throw new Error(`积木 ${opcode} 的 forcedVariables[${index}] 必须声明 name 和 code`);
        }
        return {name, code};
    });
};

// Python 生成配置允许声明 import、变量初始化、入口模板和回调 footer。
const normalizePythonCodegen = (opcode, rawPythonCodegen) => {
    assertObject(rawPythonCodegen, `积木 ${opcode} 缺少 codegen.python 配置`);
    if (typeof rawPythonCodegen.template === 'undefined') {
        throw new Error(`积木 ${opcode} 缺少 codegen.python.template`);
    }
    return {
        template: String(rawPythonCodegen.template),
        templateSelector: normalizeTemplateSelector(opcode, rawPythonCodegen.templateSelector),
        imports: Array.isArray(rawPythonCodegen.imports) ?
            rawPythonCodegen.imports.map(String) :
            [],
        runtimeFiles: Array.isArray(rawPythonCodegen.runtimeFiles) ?
            rawPythonCodegen.runtimeFiles.map(String) :
            [],
        variables: Array.isArray(rawPythonCodegen.variables) ?
            rawPythonCodegen.variables.map(String) :
            [],
        forcedVariables: normalizeForcedVariables(opcode, rawPythonCodegen.forcedVariables),
        setups: Array.isArray(rawPythonCodegen.setups) ?
            rawPythonCodegen.setups.map(String) :
            [],
        entryTemplate: rawPythonCodegen.entryTemplate ? String(rawPythonCodegen.entryTemplate) : '',
        entryFooter: rawPythonCodegen.entryFooter ? String(rawPythonCodegen.entryFooter) : '',
        launcher: rawPythonCodegen.launcher ? String(rawPythonCodegen.launcher) : '',
        section: rawPythonCodegen.section ? String(rawPythonCodegen.section) : ''
    };
};

// 单个 block 标准化后同时服务 Scratch 工具箱渲染和 Python 代码生成。
const normalizeBlock = (rawBlock, seenOpcodes) => {
    assertObject(rawBlock, 'blocks 中的每一项都必须是对象');

    const opcode = String(rawBlock.opcode || '').trim();
    if (!OPCODE_PATTERN.test(opcode)) {
        throw new Error(`opcode ${opcode || '(空)'} 必须以小写字母开头，只能包含字母、数字和下划线`);
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
        disableMonitor: Boolean(rawBlock.disableMonitor),
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

// categories 用来在同一个产品拓展下做子分类，最终会转成 Scratch Blocks 的 subCategory。
const normalizeCategories = rawCategories => {
    if (!Array.isArray(rawCategories)) return [];
    return rawCategories.map(category => {
        assertObject(category, 'categories 中的每一项都必须是对象');
        return {
            id: String(category.id || category.name || ''),
            name: String(category.name || category.id || ''),
            hideLabel: Boolean(category.hideLabel),
            blocks: Array.isArray(category.blocks) ? category.blocks.map(String) : []
        };
    }).filter(category => category.id || category.name);
};

// Python 依赖仅作为包元数据保存，实际安装必须由后续受控流程处理。
const normalizePythonDependencies = rawDependencies => {
    if (!rawDependencies || typeof rawDependencies !== 'object' || Array.isArray(rawDependencies)) return {};
    return Object.keys(rawDependencies).reduce((dependencies, name) => {
        dependencies[String(name)] = String(rawDependencies[name]);
        return dependencies;
    }, {});
};

// v1/v2 共用字段统一在这里处理，避免目录包和单 JSON 包出现字段差异。
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
        blockIcon: rawManifest.blockIcon ? String(rawManifest.blockIcon) : null,
        color1: normalizeColor(rawManifest.color1, '#4C97FF'),
        color2: normalizeColor(rawManifest.color2, '#3373CC'),
        color3: normalizeColor(rawManifest.color3, '#285CA3'),
        target: String(rawManifest.target || rawManifest.source || 'python'),
        source: String(rawManifest.source || rawManifest.target || 'python')
    };
};

// v1 是最小 JSON 格式，适合用户快速手写单文件拓展。
const normalizeCustomExtensionManifestV1 = rawManifest => ({
    formatVersion: 1,
    ...normalizeCommonManifestFields(rawManifest),
    categories: [],
    runtime: {
        pythonLibraries: [],
        files: []
    },
    package: null,
    menus: normalizeMenus(rawManifest.menus),
    blocks: normalizeBlocks(rawManifest.blocks)
});

// v2 面向目录/压缩包拓展，支持分类和运行时文件，结构参考 WonderCam 类包形态。
const normalizeCustomExtensionManifestV2 = rawManifest => ({
    formatVersion: 2,
    ...normalizeCommonManifestFields(rawManifest),
    categories: normalizeCategories(rawManifest.categories),
    runtime: {
        pythonLibraries: rawManifest.runtime && Array.isArray(rawManifest.runtime.pythonLibraries) ?
            rawManifest.runtime.pythonLibraries.map(String) :
            [],
        pythonDependencies: normalizePythonDependencies(
            rawManifest.runtime && rawManifest.runtime.pythonDependencies
        ),
        files: rawManifest.runtime && Array.isArray(rawManifest.runtime.files) ?
            rawManifest.runtime.files.map(file => ({
                path: String(file.path || ''),
                content: String(file.content || '')
            })).filter(file => file.path) :
            []
    },
    package: rawManifest.package || null,
    menus: normalizeMenus(rawManifest.menus),
    blocks: normalizeBlocks(rawManifest.blocks)
});

// 根据 formatVersion 分发到对应格式，后续新增新版协议时从这里扩展。
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

// 导出时只保留可发布字段，去掉运行时生成的 scratchBlockType 等内部派生字段。
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
        menus: manifest.menus || {},
        runtime: manifest.runtime || {pythonLibraries: [], files: []},
        blocks: manifest.blocks.map(block => ({
            opcode: block.opcode,
            blockType: block.blockType,
            disableMonitor: block.disableMonitor || undefined,
            text: block.text,
            category: block.category || undefined,
            arguments: Object.keys(block.arguments).reduce((argumentsByName, name) => {
                const argument = block.arguments[name];
                argumentsByName[name] = {
                    type: argument.type,
                    defaultValue: argument.defaultValue,
                    menu: argument.menu || undefined,
                    literal: argument.literal || undefined
                };
                return argumentsByName;
            }, {}),
            codegen: {
                python: {
                    template: block.codegen.python.template,
                    templateSelector: block.codegen.python.templateSelector || undefined,
                    imports: block.codegen.python.imports || [],
                    runtimeFiles: block.codegen.python.runtimeFiles || [],
                    variables: block.codegen.python.variables || [],
                    forcedVariables: block.codegen.python.forcedVariables || [],
                    setups: block.codegen.python.setups || [],
                    entryTemplate: block.codegen.python.entryTemplate || '',
                    entryFooter: block.codegen.python.entryFooter || '',
                    launcher: block.codegen.python.launcher || '',
                    section: block.codegen.python.section || ''
                }
            }
        }))
    };

    if (manifest.icon) serialized.icon = manifest.icon;
    if (manifest.blockIcon) serialized.blockIcon = manifest.blockIcon;
    if (manifest.package) serialized.package = manifest.package;
    return serialized;
};

export {
    normalizeCustomExtensionManifest,
    serializeCustomExtensionManifest
};
