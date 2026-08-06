// 将 Mind+ Python main.ts 安全转换为声明式积木和 Python 代码生成配置。
import {parse} from '@babel/parser';

const SUPPORTED_GENERATOR_METHODS = new Set([
    'addImport',
    'addObject',
    'addVariableForce',
    'addSetup',
    'addCode'
]);

const SHADOW_TYPES = {
    normal: 'string',
    string: 'string',
    number: 'number',
    boolean: 'boolean',
    color: 'color',
    dropdown: 'string',
    dropdownRound: 'string'
};

const uniqueStrings = values => Array.from(new Set(values.filter(Boolean).map(String)));

// pip 依赖只保留声明，当前导入流程不会联网安装第三方包。
const normalizePythonDependencies = rawDependencies => {
    if (!rawDependencies || typeof rawDependencies !== 'object' || Array.isArray(rawDependencies)) return {};
    return Object.keys(rawDependencies).reduce((dependencies, name) => {
        dependencies[String(name)] = String(rawDependencies[name]);
        return dependencies;
    }, {});
};

// Mind+ 多语言字段优先使用中文，再回退英文和调用方默认值。
const getLocalizedValue = (value, fallback) => {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
    return String(value['zh-cn'] || value.zh || value.en || fallback);
};

const decodeQuotedValue = value => String(value || '')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');

// //% 指令使用 key=value 语法，允许点号表达参数属性。
const parseDirectiveAttributes = commentValue => {
    const text = String(commentValue || '').trim().replace(/^%\s*/, '');
    const attributes = {};
    const pattern = /([A-Za-z_][A-Za-z0-9_.]*)\s*=\s*(?:"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)'|([^\s]+))/g;
    for (const match of text.matchAll(pattern)) {
        attributes[match[1]] = decodeQuotedValue(match[2] ?? match[3] ?? match[4]);
    }
    return attributes;
};

const getDirectiveAttributes = node => (node.leadingComments || [])
    .map(comment => String(comment.value || '').trim())
    .filter(value => value.startsWith('%'))
    .map(parseDirectiveAttributes);

const getMemberPropertyName = node => {
    if (!node || node.type !== 'MemberExpression' || node.computed) return null;
    return node.property && node.property.type === 'Identifier' ? node.property.name : null;
};

// 只接受 parameter.ARG.code，避免静态转换器求值任意 TypeScript 表达式。
const getParameterArgumentName = node => {
    if (!node || node.type !== 'MemberExpression' || getMemberPropertyName(node) !== 'code') return null;
    const argumentAccess = node.object;
    if (!argumentAccess || argumentAccess.type !== 'MemberExpression' || argumentAccess.computed) return null;
    if (!argumentAccess.object || argumentAccess.object.type !== 'Identifier' ||
        argumentAccess.object.name !== 'parameter') {
        return null;
    }
    return getMemberPropertyName(argumentAccess);
};

const createUnsupportedSyntaxError = (opcode, node, detail = '语句') => {
    const line = node && node.loc && node.loc.start ? node.loc.start.line : '?';
    return new Error(`Mind+ 积木 ${opcode} 第 ${line} 行包含不支持的${detail}`);
};

// 字符串和模板字符串只允许插入已经映射到积木参数的局部变量。
const renderStaticString = (node, parameterBindings, opcode) => {
    if (!node) throw createUnsupportedSyntaxError(opcode, node, ' Generator 参数');
    if (node.type === 'StringLiteral') return node.value;
    if (node.type !== 'TemplateLiteral') {
        throw createUnsupportedSyntaxError(opcode, node, ' Generator 参数');
    }

    let result = '';
    node.quasis.forEach((quasi, index) => {
        result += quasi.value.cooked ?? quasi.value.raw;
        if (index >= node.expressions.length) return;
        const expression = node.expressions[index];
        if (expression.type !== 'Identifier' || !parameterBindings.has(expression.name)) {
            throw createUnsupportedSyntaxError(opcode, expression, '模板表达式');
        }
        result += `{${parameterBindings.get(expression.name)}}`;
    });
    return result;
};

const getGeneratorMethod = expression => {
    if (!expression || expression.type !== 'CallExpression') return null;
    const callee = expression.callee;
    if (!callee || callee.type !== 'MemberExpression' || callee.computed) return null;
    if (!callee.object || callee.object.type !== 'Identifier' || callee.object.name !== 'Generator') return null;
    return getMemberPropertyName(callee);
};

const addPreambleLines = (code, generation) => {
    String(code || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean).forEach(line => {
        if (/^(?:from|import)\s/.test(line)) {
            generation.imports.push(line);
        } else if (/^[A-Za-z_][A-Za-z0-9_]*\s*=/.test(line)) {
            generation.variables.push(line);
        } else {
            generation.setups.push(line);
        }
    });
};

// 单个函数只读取参数绑定和 Generator 白名单调用，其他语句一律拒绝。
const parseFunctionGeneration = (functionNode, opcode, override = {}) => {
    const parameterBindings = new Map();
    const generation = {
        template: '',
        imports: [],
        variables: [],
        forcedVariables: [],
        setups: [],
        entryTemplate: override.entryTemplate ? String(override.entryTemplate) : '',
        entryFooter: override.entryFooter ? String(override.entryFooter) : '',
        launcher: override.launcher ? String(override.launcher) : '',
        section: override.section ? String(override.section) : '',
        templateSelector: override.templateSelector || null
    };
    const codeParts = [];

    functionNode.body.body.forEach(statement => {
        if (statement.type === 'VariableDeclaration') {
            statement.declarations.forEach(declaration => {
                if (!declaration.id || declaration.id.type !== 'Identifier') {
                    throw createUnsupportedSyntaxError(opcode, declaration, '参数绑定');
                }
                const argumentName = getParameterArgumentName(declaration.init);
                if (!argumentName) {
                    throw createUnsupportedSyntaxError(opcode, declaration, '参数绑定');
                }
                parameterBindings.set(declaration.id.name, argumentName);
            });
            return;
        }

        if (statement.type !== 'ExpressionStatement') {
            throw createUnsupportedSyntaxError(opcode, statement);
        }
        const method = getGeneratorMethod(statement.expression);
        if (!method || !SUPPORTED_GENERATOR_METHODS.has(method)) {
            throw createUnsupportedSyntaxError(opcode, statement);
        }
        const args = statement.expression.arguments;
        if (args.some(argument => argument.type === 'SpreadElement')) {
            throw createUnsupportedSyntaxError(opcode, statement, ' Generator 参数');
        }

        if (method === 'addImport') {
            addPreambleLines(renderStaticString(args[args.length - 1], parameterBindings, opcode), generation);
        } else if (method === 'addObject') {
            generation.variables.push(renderStaticString(args[2], parameterBindings, opcode));
        } else if (method === 'addVariableForce') {
            generation.forcedVariables.push({
                name: renderStaticString(args[0], parameterBindings, opcode),
                code: renderStaticString(args[1], parameterBindings, opcode)
            });
        } else if (method === 'addSetup') {
            generation.setups.push(renderStaticString(args[1], parameterBindings, opcode));
        } else if (method === 'addCode') {
            codeParts.push(renderStaticString(args[0], parameterBindings, opcode));
        }
    });

    return {
        ...generation,
        template: codeParts.join('\n'),
        imports: uniqueStrings(generation.imports),
        variables: uniqueStrings(generation.variables),
        forcedVariables: generation.forcedVariables,
        setups: uniqueStrings(generation.setups)
    };
};

const normalizeMenuItems = (namespace, rawMenus, rawLocales) => Object.keys(rawMenus || {}).reduce(
    (menus, name) => {
        const rawMenu = rawMenus[name];
        if (!rawMenu || !Array.isArray(rawMenu.menu)) return menus;
        menus[name] = {
            items: rawMenu.menu.map(item => {
                const pair = Array.isArray(item) ? item : [item, item];
                const value = String(pair[1]);
                return {
                    text: String(rawLocales[`${namespace}.${name}.${value}|menu`] || pair[0]),
                    value
                };
            })
        };
        return menus;
    },
    {}
);

const getMenuDefault = (rawMenus, menuName, opcode, argumentName) => {
    const menu = rawMenus[menuName];
    if (!menu) return '';
    const exactKey = `default_${opcode}_${argumentName}`;
    const functionKey = `default_${opcode}`;
    if (typeof menu[exactKey] !== 'undefined') return menu[exactKey];
    if (typeof menu[functionKey] !== 'undefined') return menu[functionKey];
    return Array.isArray(menu.menu) && menu.menu.length ? menu.menu[0][1] : '';
};

const normalizeArgumentDefault = (type, value) => {
    if (type === 'number') {
        const number = Number(value);
        return Number.isFinite(number) ? number : 0;
    }
    if (type === 'boolean') return String(value).toLowerCase() === 'true';
    return typeof value === 'undefined' ? '' : String(value);
};

const parseBlockArguments = (opcode, blockText, directives, rawMenus, rawOverrides = {}) => {
    const propertiesByArgument = directives.reduce((properties, attributes) => {
        Object.entries(attributes).forEach(([key, value]) => {
            const match = key.match(/^([A-Za-z][A-Za-z0-9_]*)\.(shadow|options|defl)$/);
            if (!match) return;
            properties[match[1]] = properties[match[1]] || {};
            properties[match[1]][match[2]] = value;
        });
        return properties;
    }, {});
    const argumentNames = Array.from(String(blockText).matchAll(/\[([A-Za-z][A-Za-z0-9_]*)\]/g), match => match[1]);

    return argumentNames.reduce((argumentsByName, name) => {
        const properties = propertiesByArgument[name] || {};
        const shadow = properties.shadow || 'string';
        const type = SHADOW_TYPES[shadow];
        if (!type) {
            throw new Error(`Mind+ 积木 ${opcode} 的参数 ${name} 使用了不支持的 shadow: ${shadow}`);
        }
        const menu = properties.options || '';
        const defaultValue = typeof properties.defl !== 'undefined' ?
            properties.defl :
            getMenuDefault(rawMenus, menu, opcode, name);
        const override = rawOverrides[name] && typeof rawOverrides[name] === 'object' ? rawOverrides[name] : {};
        const overriddenType = override.type ? String(override.type).toLowerCase() : type;
        argumentsByName[name] = {
            type: overriddenType,
            defaultValue: typeof override.defaultValue === 'undefined' ?
                normalizeArgumentDefault(type, defaultValue) :
                override.defaultValue,
            ...(menu ? {menu} : {}),
            ...(shadow === 'normal' || shadow === 'dropdown' ? {literal: true} : {})
        };
        return argumentsByName;
    }, {});
};

// 已发布的早期产品包在 Python 中运行时切片颜色字符串；导入时规范化为 editor 的颜色参数格式。
const normalizeLegacyRgbGeneration = (generation, argumentsByName) => {
    const argumentPattern = '([A-Za-z][A-Za-z0-9_]*)';
    const legacyRgbPattern = new RegExp(
        `int\\(\\{${argumentPattern}\\}\\[1:3\\],\\s*16\\),\\s*` +
        `int\\(\\{${argumentPattern}\\}\\[3:5\\],\\s*16\\),\\s*` +
        `int\\(\\{${argumentPattern}\\}\\[5:7\\],\\s*16\\)`,
        'g'
    );
    const colorArguments = new Set();
    const template = String(generation.template || '').replace(
        legacyRgbPattern,
        (match, redArgument, greenArgument, blueArgument) => {
            if (redArgument !== greenArgument || redArgument !== blueArgument) return match;
            const argument = argumentsByName[redArgument];
            if (!argument || argument.type !== 'string' ||
                !/^#[0-9a-f]{6}$/i.test(String(argument.defaultValue))) {
                return match;
            }
            colorArguments.add(redArgument);
            return `{${redArgument}.rgb}`;
        }
    );
    colorArguments.forEach(name => {
        argumentsByName[name] = {
            ...argumentsByName[name],
            type: 'color',
            literal: false
        };
    });
    return {
        ...generation,
        template
    };
};

const parseMainAst = source => {
    try {
        return parse(source, {
            sourceType: 'module',
            plugins: ['typescript'],
            attachComment: true
        });
    } catch (error) {
        const line = error.loc && error.loc.line ? error.loc.line : '?';
        throw new Error(`Mind+ main.ts 第 ${line} 行解析失败: ${error.message}`);
    }
};

// 将 Mind+ Python 源文件转换为 createPackageManifest 可消费的三段原始配置。
const adaptMindPlusPythonPackage = ({
    rawConfig,
    mainSource,
    rawMenus = {},
    rawLocales = {},
    runtimePythonLibraries = [],
    icon = null
}) => {
    const ast = parseMainAst(mainSource);
    const namespaces = ast.program.body.filter(node => node.type === 'TSModuleDeclaration');
    const unsupportedTopLevel = ast.program.body.find(node => node.type !== 'TSModuleDeclaration');
    if (unsupportedTopLevel) {
        const line = unsupportedTopLevel.loc && unsupportedTopLevel.loc.start ?
            unsupportedTopLevel.loc.start.line :
            '?';
        throw new Error(`Mind+ main.ts 第 ${line} 行包含 namespace 外的不支持语句`);
    }
    if (namespaces.length !== 1 || !namespaces[0].id || namespaces[0].id.type !== 'Identifier') {
        throw new Error('Mind+ main.ts 必须包含一个 namespace');
    }
    const namespaceNode = namespaces[0];
    const namespace = namespaceNode.id.name;
    if (namespace !== rawConfig.id) {
        throw new Error(`Mind+ namespace ${namespace} 必须与 config.id ${rawConfig.id} 一致`);
    }
    if (!namespaceNode.body || namespaceNode.body.type !== 'TSModuleBlock') {
        throw new Error(`Mind+ namespace ${namespace} 缺少函数体`);
    }

    const namespaceDirectives = getDirectiveAttributes(namespaceNode);
    const namespaceAttributes = Object.assign({}, ...namespaceDirectives);
    const menus = normalizeMenuItems(namespace, rawMenus, rawLocales);
    const overrides = rawConfig.scratchEditor && rawConfig.scratchEditor.blocks || {};
    const blocks = [];
    const generatorBlocks = {};

    namespaceNode.body.body.forEach(node => {
        if (node.type !== 'ExportNamedDeclaration' || !node.declaration ||
            node.declaration.type !== 'FunctionDeclaration') {
            const line = node.loc && node.loc.start ? node.loc.start.line : '?';
            throw new Error(`Mind+ namespace ${namespace} 第 ${line} 行包含不支持的声明`);
        }
        const functionNode = node.declaration;
        const opcode = functionNode.id && functionNode.id.name;
        const directives = getDirectiveAttributes(node);
        const blockAttributes = directives.find(attributes => typeof attributes.block !== 'undefined');
        if (!opcode || !blockAttributes) {
            const line = node.loc && node.loc.start ? node.loc.start.line : '?';
            throw new Error(`Mind+ namespace ${namespace} 第 ${line} 行的导出函数缺少 block 指令`);
        }
        const blockType = String(blockAttributes.blockType || 'command').toLowerCase();
        const defaultText = String(blockAttributes.block || opcode);
        const text = String(rawLocales[`${namespace}.${opcode}|block`] || defaultText);
        const blockOverride = overrides[opcode] || {};
        // Mind+ 没有 line4/line6 等 Scratch 专用参数类型，只允许配置层覆盖声明并由 schema 校验。
        const argumentsByName = parseBlockArguments(
            opcode,
            defaultText,
            directives,
            rawMenus,
            blockOverride.arguments || {}
        );
        if (blockType === 'hat' && !blockOverride.section) {
            throw new Error(`Mind+ 帽子积木 ${opcode} 必须通过 scratchEditor.blocks 声明 section`);
        }

        const generation = normalizeLegacyRgbGeneration(
            parseFunctionGeneration(functionNode, opcode, blockOverride),
            argumentsByName
        );
        blocks.push({
            opcode,
            blockType,
            disableMonitor: blockType === 'reporter' || blockType === 'boolean',
            text,
            arguments: argumentsByName
        });
        generatorBlocks[opcode] = generation;
    });

    if (!blocks.length) {
        throw new Error(`Mind+ namespace ${namespace} 未定义可导入积木`);
    }

    const scratchEditor = rawConfig.scratchEditor || {};
    const color = namespaceAttributes.color || '#4C97FF';
    const pythonAsset = rawConfig.asset && rawConfig.asset.python || {};
    return {
        rawManifest: {
            formatVersion: 2,
            id: String(rawConfig.id),
            name: getLocalizedValue(rawConfig.name, rawConfig.id),
            version: String(rawConfig.version || pythonAsset.version || '1.0.0'),
            description: getLocalizedValue(rawConfig.description, ''),
            icon,
            blockIcon: scratchEditor.blockIcon || null,
            color1: scratchEditor.color1 || color,
            color2: scratchEditor.color2 || color,
            color3: scratchEditor.color3 || color,
            target: 'python',
            source: 'mindplus',
            menus,
            categories: Array.isArray(scratchEditor.categories) ? scratchEditor.categories : [],
            runtime: {
                pythonLibraries: runtimePythonLibraries,
                pythonDependencies: normalizePythonDependencies(pythonAsset.dependencies)
            }
        },
        rawBlocks: {
            categories: Array.isArray(scratchEditor.categories) ? scratchEditor.categories : [],
            blocks
        },
        rawGenerator: {
            blocks: generatorBlocks
        }
    };
};

export {
    adaptMindPlusPythonPackage
};
