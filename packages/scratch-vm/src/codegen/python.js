const PythonCodegenContext = require('./python/context');

let codegenContext = new PythonCodegenContext();

const prefixByCategory = {
    control: 'pythonControl_',
    operators: 'pythonOperators_',
    text: 'pythonText_',
    variables: 'pythonVariables_',
    list: 'pythonList_',
    function: 'pythonFunction_',
    native: 'pythonNative_'
};

// Python 代码生成器分三层：表达式生成、语句生成、入口栈拼装。
const quotePythonString = value => JSON.stringify(String(value));

// 字面量参数优先识别数字/布尔值，其余内容按 Python 字符串处理。
const literalToPython = value => {
    const stringValue = String(value);
    if (/^-?(?:\d+|\d*\.\d+)$/.test(stringValue.trim())) {
        return stringValue.trim();
    }
    if (/^(?:true|false)$/i.test(stringValue.trim())) {
        return stringValue.trim().toLowerCase() === 'true' ? 'True' : 'False';
    }
    return quotePythonString(value);
};

const indent = level => '    '.repeat(level);

// Scratch 输入允许中文和空格，落到 Python 变量/函数名时需要规整成合法标识符。
const normalizePythonName = value => {
    const cleaned = String(value || 'value')
        .trim()
        .replace(/[^A-Za-z0-9_]/g, '_')
        .replace(/^[^A-Za-z_]+/, '');
    return cleaned || 'value';
};

// 函数参数文本用逗号分隔，逐个规整成 Python 参数名。
const normalizePythonNameList = value => String(value || '')
    .split(',')
    .map(item => normalizePythonName(item))
    .filter(Boolean);

const pythonExpressionList = value => String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .join(', ');

// Blockly 输入槽可能没有接 reporter，此时返回 null 让调用方使用默认值。
const getInputBlock = (block, name) => {
    if (block && typeof block.getInputTargetBlock === 'function') {
        return block.getInputTargetBlock(name);
    }
    return null;
};

// 同一个语义在不同积木里可能叫 TEXT/NUM/VALUE，用候选字段名提高复用性。
const getFieldValue = (block, names, fallback = '') => {
    if (!block || typeof block.getFieldValue !== 'function') return fallback;
    for (const name of names) {
        const value = block.getFieldValue(name);
        if (typeof value !== 'undefined' && value !== null) return value;
    }
    return fallback;
};

// 从帽子积木或语句积木开始，沿 next 指针收集同一条竖向积木栈。
const getStackBlocks = topBlock => {
    const blocks = [];
    let block = topBlock;
    while (block) {
        blocks.push(block);
        block = typeof block.getNextBlock === 'function' ? block.getNextBlock() : null;
    }
    return blocks;
};

const isType = (block, category, opcode) => block && block.type === `${prefixByCategory[category]}${opcode}`;

const isAnyType = (block, pairs) => pairs.some(([category, opcode]) => isType(block, category, opcode));

// 把单个 reporter/boolean 积木转换成 Python 表达式字符串。
const expressionFromSelf = (block, imports, fallback = '') => {
    switch (block.type) {
    case `${prefixByCategory.variables}getVariable`:
    case `${prefixByCategory.native}getVariable`:
        return normalizePythonName(getFieldValue(block, ['NAME'], 'x'));
    case `${prefixByCategory.operators}arithmetic`:
    case `${prefixByCategory.native}arithmetic`:
        return `(${
            numberToPython(block, 'A', '1', imports)
        } ${getFieldValue(block, ['OP'], '+')} ${
            numberToPython(block, 'B', '2', imports)
        })`;
    case `${prefixByCategory.operators}compare`:
    case `${prefixByCategory.native}compare`:
        return `(${
            valueToPython(block, 'A', '1', imports)
        } ${getFieldValue(block, ['OP'], '==')} ${
            valueToPython(block, 'B', '1', imports)
        })`;
    case `${prefixByCategory.operators}logic`:
        return `(${
            booleanToPython(block, 'A', 'True', imports)
        } ${getFieldValue(block, ['OP'], 'and')} ${
            booleanToPython(block, 'B', 'False', imports)
        })`;
    case `${prefixByCategory.operators}not`:
        return `(not ${booleanToPython(block, 'VALUE', 'False', imports)})`;
    case `${prefixByCategory.text}literal`:
        return quotePythonString(getFieldValue(block, ['TEXT'], fallback));
    case `${prefixByCategory.text}join`:
    case `${prefixByCategory.native}join`:
        return `(str(${valueToPython(block, 'A', 'hello', imports)}) + str(${
            valueToPython(block, 'B', 'python', imports)
        }))`;
    case `${prefixByCategory.native}toNumber`:
        return `float(${valueToPython(block, 'VALUE', '0', imports)})`;
    case `${prefixByCategory.text}toString`:
    case `${prefixByCategory.native}toString`:
        return `str(${valueToPython(block, 'VALUE', '', imports)})`;
    case `${prefixByCategory.list}makeList`:
    case `${prefixByCategory.native}makeList`:
        return `[${
            valueToPython(block, 'A', 'a', imports)
        }, ${
            valueToPython(block, 'B', 'b', imports)
        }, ${
            valueToPython(block, 'C', 'c', imports)
        }]`;
    case `${prefixByCategory.text}length`:
    case `${prefixByCategory.native}length`:
        return `len(${valueToPython(block, 'VALUE', 'hello', imports)})`;
    case `${prefixByCategory.list}getItem`:
        return `${normalizePythonName(getFieldValue(block, ['NAME'], 'items'))}[${
            numberToPython(block, 'INDEX', '0', imports)
        }]`;
    case `${prefixByCategory.list}length`:
        return `len(${normalizePythonName(getFieldValue(block, ['NAME'], 'items'))})`;
    case `${prefixByCategory.function}parameter`:
        return normalizePythonName(getFieldValue(block, ['NAME'], 'name'));
    case `${prefixByCategory.function}callReporter`:
        return `${normalizePythonName(getFieldValue(block, ['NAME'], 'my_function'))}(${
            pythonExpressionList(getFieldValue(block, ['ARGS'], '"Scratch"'))
        })`;
    case `${prefixByCategory.native}randomInteger`:
        imports.add('random');
        return `random.randint(${
            numberToPython(block, 'A', '1', imports)
        }, ${
            numberToPython(block, 'B', '10', imports)
        })`;
    case `${prefixByCategory.native}currentTime`:
        imports.add('time');
        return 'time.strftime("%H:%M:%S")';
    case `${prefixByCategory.native}input`:
        return `input(${valueToPython(block, 'PROMPT', 'input: ', imports)})`;
    case 'math_number':
        return getFieldValue(block, ['NUM'], fallback);
    case 'text':
        return quotePythonString(getFieldValue(block, ['TEXT'], fallback));
    case 'line6':
        // 六路巡线 shadow 字段内部保存十六进制掩码，生成 Python 时直接拼到 0x 后面。
        return getFieldValue(block, ['LINE6'], fallback);
    default: {
        const customExpression = customBlockToPythonExpression(block, imports);
        if (customExpression) return customExpression;
        return quotePythonString(getFieldValue(block, ['TEXT', 'NUM', 'VALUE'], fallback));
    }
    }
};

// 读取输入槽：有 reporter 就递归生成表达式，没有 reporter 就取字段默认值。
const valueToPython = (block, inputName, fallback = '', imports = new Set()) => {
    const inputBlock = getInputBlock(block, inputName);
    if (!inputBlock) return literalToPython(getFieldValue(block, [inputName], fallback));
    return expressionFromSelf(inputBlock, imports, fallback);
};

// 数字输入允许用户填普通字段，去掉字符串引号后交给 Python 表达式使用。
const numberToPython = (block, inputName, fallback = '0', imports = new Set()) => {
    const value = valueToPython(block, inputName, fallback, imports);
    return value.replace(/^"|"$/g, '');
};

// boolean 输入没有 reporter 时按字段值折算成 True/False。
const booleanToPython = (block, inputName, fallback = 'True', imports = new Set()) => {
    const inputBlock = getInputBlock(block, inputName);
    if (!inputBlock) {
        const value = getFieldValue(block, [inputName], fallback);
        return String(value).toLowerCase() === 'false' ? 'False' : 'True';
    }
    return expressionFromSelf(inputBlock, imports, fallback);
};

// 自定义 manifest 参数有默认值，模板替换时优先使用 manifest 默认值。
const getDefaultArgumentValue = (templateInfo, inputName, fallback) => {
    const argument = templateInfo.arguments && templateInfo.arguments[inputName];
    if (!argument || typeof argument.defaultValue === 'undefined') return fallback;
    return argument.defaultValue;
};

const addCustomImports = (templateInfo, imports) => {
    (templateInfo.imports || []).forEach(importLine => {
        if (importLine) imports.add(importLine);
    });
};

// 固定菜单值兼容外层 dropdown 和扩展菜单 shadow，两种结构都返回菜单的原始 value。
const getLiteralArgumentValue = (templateInfo, block, inputName, fallback) => {
    const argument = templateInfo.arguments && templateInfo.arguments[inputName];
    const inputBlock = getInputBlock(block, inputName);
    if (!inputBlock) return getFieldValue(block, [inputName], fallback);
    return getFieldValue(
        inputBlock,
        [argument && argument.menu, inputName, 'VALUE', 'TEXT', 'NUM'].filter(Boolean),
        fallback
    );
};

// 把 manifest 模板里的 {ARG} 替换为积木当前输入对应的 Python 代码。
const applyTemplateText = (template, templateInfo, block, imports) => (
    String(template || '').replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (match, inputName) => {
        const argument = templateInfo.arguments && templateInfo.arguments[inputName];
        const fallback = getDefaultArgumentValue(templateInfo, inputName, '');
        if (argument && argument.literal) {
            return getLiteralArgumentValue(templateInfo, block, inputName, fallback);
        }
        return valueToPython(block, inputName, fallback, imports);
    })
);

// 选择器按菜单字段值挑选模板；未命中时回退到基础 template，保证旧包仍按原规则生成。
const selectCustomTemplate = (templateInfo, block) => {
    const selector = templateInfo.templateSelector;
    if (!selector || !selector.argument || !selector.cases) return templateInfo.template;
    const fallback = getDefaultArgumentValue(templateInfo, selector.argument, '');
    const value = String(getLiteralArgumentValue(templateInfo, block, selector.argument, fallback));
    return Object.prototype.hasOwnProperty.call(selector.cases, value) ?
        selector.cases[value] :
        templateInfo.template;
};

// 自定义积木可以在生成本行代码时顺带声明 import、全局变量、setup 和 launcher。
const addCustomGenerationMetadata = (templateInfo, block, imports) => {
    addCustomImports(templateInfo, imports);
    (templateInfo.variables || []).forEach(line => {
        const renderedLine = applyTemplateText(line, templateInfo, block, imports);
        if (renderedLine) codegenContext.addVariable(renderedLine);
    });
    (templateInfo.forcedVariables || []).forEach(variable => {
        const name = applyTemplateText(variable.name, templateInfo, block, imports);
        const code = applyTemplateText(variable.code, templateInfo, block, imports);
        if (name && code) codegenContext.addVariableForce(name, code);
    });
    (templateInfo.setups || []).forEach(line => {
        const renderedLine = applyTemplateText(line, templateInfo, block, imports);
        if (renderedLine) codegenContext.addSetup(renderedLine);
    });
    if (templateInfo.launcher) {
        codegenContext.setLauncher(templateInfo.launcher);
    }
};

// 普通自定义积木最终落到一段 template 文本。
const applyCustomTemplate = (templateInfo, block, imports) => {
    addCustomGenerationMetadata(templateInfo, block, imports);
    return applyTemplateText(selectCustomTemplate(templateInfo, block), templateInfo, block, imports);
};

// 自定义帽子积木可以覆盖入口函数签名，例如按键事件需要生成 on_buttonA_clicked。
const renderEntryHeader = (templateInfo, block, imports, entryName) => {
    if (!templateInfo || !templateInfo.entryTemplate) {
        return [`def ${entryName}():`];
    }
    return applyTemplateText(
        String(templateInfo.entryTemplate).replace(/\{MAIN\}/g, entryName),
        templateInfo,
        block,
        imports
    ).split('\n');
};

// entryFooter 用来生成回调注册语句，保持函数体和硬件事件绑定分离。
const renderEntryFooter = (templateInfo, block, imports, entryName) => {
    if (!templateInfo || !templateInfo.entryFooter) {
        return [];
    }
    return applyTemplateText(
        String(templateInfo.entryFooter).replace(/\{MAIN\}/g, entryName),
        templateInfo,
        block,
        imports
    ).split('\n');
};

const getPythonCodegenTemplate = blockType => codegenContext.getTemplate(blockType);

// reporter/boolean 自定义积木作为表达式参与上层模板替换。
const customBlockToPythonExpression = (block, imports) => {
    const templateInfo = getPythonCodegenTemplate(block.type);
    if (!templateInfo || templateInfo.blockType === 'command') return null;
    return applyCustomTemplate(templateInfo, block, imports);
};

// command 自定义积木作为语句输出，按当前缩进级别补空格。
const customBlockToPythonStatementLines = (block, imports, level) => {
    const templateInfo = getPythonCodegenTemplate(block.type);
    if (!templateInfo) return null;
    const code = applyCustomTemplate(templateInfo, block, imports);
    if (!code) return [];
    return code.split('\n').map(line => `${indent(level)}${line}`);
};

// 表达式积木如果独立作为语句出现，仍生成一行可读 Python 或 unsupported 注释。
const generateExpressionLine = (block, imports) => {
    if (isAnyType(block, [
        ['variables', 'getVariable'],
        ['operators', 'arithmetic'],
        ['operators', 'compare'],
        ['operators', 'logic'],
        ['operators', 'not'],
        ['text', 'literal'],
        ['text', 'join'],
        ['text', 'length'],
        ['text', 'toString'],
        ['list', 'makeList'],
        ['list', 'getItem'],
        ['list', 'length'],
        ['function', 'parameter'],
        ['function', 'callReporter'],
        ['native', 'getVariable'],
        ['native', 'arithmetic'],
        ['native', 'compare'],
        ['native', 'join'],
        ['native', 'toNumber'],
        ['native', 'toString'],
        ['native', 'makeList'],
        ['native', 'length'],
        ['native', 'randomInteger'],
        ['native', 'currentTime'],
        ['native', 'input']
    ])) {
        return expressionFromSelf(block, imports);
    }
    const customExpression = customBlockToPythonExpression(block, imports);
    if (customExpression) return customExpression;
    return `# Unsupported block: ${block.type}`;
};

// 把 command/control/function 积木转换成一组带缩进的 Python 语句。
const generateStatementLines = (block, imports, level = 0) => {
    switch (block.type) {
    case `${prefixByCategory.native}print`:
        return [`${indent(level)}print(${valueToPython(block, 'TEXT', 'hello python', imports)})`];
    case `${prefixByCategory.native}sleep`:
        imports.add('time');
        return [`${indent(level)}time.sleep(${numberToPython(block, 'SECS', '1', imports)})`];
    case `${prefixByCategory.variables}setVariable`:
    case `${prefixByCategory.native}setVariable`:
        return [`${indent(level)}${normalizePythonName(getFieldValue(block, ['NAME'], 'x'))} = ${
            valueToPython(block, 'VALUE', '0', imports)
        }`];
    case `${prefixByCategory.variables}changeVariable`: {
        const name = normalizePythonName(getFieldValue(block, ['NAME'], 'x'));
        return [`${indent(level)}${name} = ${name} + ${
            numberToPython(block, 'VALUE', '1', imports)
        }`];
    }
    case `${prefixByCategory.list}append`:
        return [`${indent(level)}${normalizePythonName(getFieldValue(block, ['NAME'], 'items'))}.append(${
            valueToPython(block, 'VALUE', 'apple', imports)
        })`];
    case `${prefixByCategory.function}define`: {
        const params = normalizePythonNameList(getFieldValue(block, ['PARAMS'], 'name')).join(', ');
        const body = generateSubstack(block, 'SUBSTACK', imports, level + 1);
        return [
            `${indent(level)}def ${normalizePythonName(getFieldValue(block, ['NAME'], 'my_function'))}(${params}):`,
            ...(body.length ? body : [`${indent(level + 1)}pass`])
        ];
    }
    case `${prefixByCategory.function}call`:
        return [`${indent(level)}${normalizePythonName(getFieldValue(block, ['NAME'], 'my_function'))}(${
            pythonExpressionList(getFieldValue(block, ['ARGS'], '"Scratch"'))
        })`];
    case `${prefixByCategory.function}return`:
        return [`${indent(level)}return ${valueToPython(block, 'VALUE', 'result', imports)}`];
    case `${prefixByCategory.control}ifThen`:
    case `${prefixByCategory.native}ifThen`: {
        const body = generateSubstack(block, 'SUBSTACK', imports, level + 1);
        return [
            `${indent(level)}if ${booleanToPython(block, 'CONDITION', 'True', imports)}:`,
            ...(body.length ? body : [`${indent(level + 1)}pass`])
        ];
    }
    case `${prefixByCategory.control}ifElse`: {
        const ifBody = generateSubstack(block, 'SUBSTACK', imports, level + 1);
        const elseBody = generateSubstack(block, 'SUBSTACK2', imports, level + 1);
        return [
            `${indent(level)}if ${booleanToPython(block, 'CONDITION', 'True', imports)}:`,
            ...(ifBody.length ? ifBody : [`${indent(level + 1)}pass`]),
            `${indent(level)}else:`,
            ...(elseBody.length ? elseBody : [`${indent(level + 1)}pass`])
        ];
    }
    case `${prefixByCategory.control}repeat`: {
        const body = generateSubstack(block, 'SUBSTACK', imports, level + 1);
        return [
            `${indent(level)}for i in range(${numberToPython(block, 'TIMES', '5', imports)}):`,
            ...(body.length ? body : [`${indent(level + 1)}pass`])
        ];
    }
    case `${prefixByCategory.native}forRange`: {
        const body = generateSubstack(block, 'SUBSTACK', imports, level + 1);
        return [
            `${indent(level)}for ${normalizePythonName(getFieldValue(block, ['VAR'], 'i'))} in range(${
                numberToPython(block, 'START', '0', imports)
            }, ${
                numberToPython(block, 'STOP', '5', imports)
            }):`,
            ...(body.length ? body : [`${indent(level + 1)}pass`])
        ];
    }
    case `${prefixByCategory.control}forever`: {
        const body = generateSubstack(block, 'SUBSTACK', imports, level + 1);
        return [
            `${indent(level)}while True:`,
            ...(body.length ? body : [`${indent(level + 1)}pass`])
        ];
    }
    case `${prefixByCategory.control}while`: {
        const body = generateSubstack(block, 'SUBSTACK', imports, level + 1);
        return [
            `${indent(level)}while ${booleanToPython(block, 'CONDITION', 'True', imports)}:`,
            ...(body.length ? body : [`${indent(level + 1)}pass`])
        ];
    }
    case `${prefixByCategory.control}break`:
        return [`${indent(level)}break`];
    case `${prefixByCategory.control}continue`:
        return [`${indent(level)}continue`];
    default: {
        const customStatementLines = customBlockToPythonStatementLines(block, imports, level);
        if (customStatementLines) return customStatementLines;
        return [`${indent(level)}${generateExpressionLine(block, imports)}`];
    }
    }
};

// control/function 的内部 C 口积木通过 SUBSTACK 输入继续递归生成。
const generateSubstack = (block, inputName, imports, level) => {
    const substack = getInputBlock(block, inputName);
    if (!substack) return [];
    return getStackBlocks(substack).flatMap(child => generateStatementLines(child, imports, level));
};

// 顶层积木栈按入口类型处理：setup 生成顶层代码，main/事件生成函数或回调。
const generateStack = (topBlock, imports, options = {}) => {
    const stack = getStackBlocks(topBlock);
    if (stack.length === 0) return [];

    if (isCustomSetupHatBlock(topBlock)) {
        const templateInfo = getPythonCodegenTemplate(topBlock.type);
        addCustomGenerationMetadata(templateInfo, topBlock, imports);
        return stack.slice(1).flatMap(block => generateStatementLines(block, imports, 0));
    }

    if (topBlock.type === 'event_whenflagclicked' || isType(topBlock, 'control', 'main') || isCustomMainHatBlock(topBlock)) {
        const templateInfo = getPythonCodegenTemplate(topBlock.type);
        if (templateInfo) {
            addCustomGenerationMetadata(templateInfo, topBlock, imports);
        }
        const body = stack.slice(1).flatMap(block => generateStatementLines(block, imports, 1));
        const usesEntryTemplate = Boolean(templateInfo && templateInfo.entryTemplate);
        const bodyCode = body.join('\n');
        // 对齐旧生成器：只为函数体实际引用的硬件对象声明 global。
        const globalNames = codegenContext.getGlobalNames()
            .filter(name => new RegExp(`\\b${name}\\b`).test(bodyCode));
        const globalLines = globalNames.map(name => `${indent(1)}global ${name}`);
        const entryName = options.entryName || 'start_main';
        const headerLines = renderEntryHeader(templateInfo, topBlock, imports, entryName);
        const footerLines = renderEntryFooter(templateInfo, topBlock, imports, entryName);
        const launcherLines = usesEntryTemplate ? [] : ['', codegenContext.renderLauncher(entryName)];
        return [
            ...headerLines,
            ...globalLines,
            ...(body.length ? body : ['    pass']),
            ...(footerLines.length ? ['', ...footerLines] : []),
            ...launcherLines
        ];
    }

    return stack.flatMap(block => generateStatementLines(block, imports));
};

// 只有 Scratch 绿旗、Python main、自定义 main 帽子才算可执行入口。
const isEntryBlock = block => block && (
    block.type === 'event_whenflagclicked' ||
    isType(block, 'control', 'main') ||
    isCustomMainHatBlock(block)
);

// section=setup 的自定义帽子用于初始化顶层代码，例如“当启动时”。
const isCustomSetupHatBlock = block => {
    if (!block) return false;
    const templateInfo = getPythonCodegenTemplate(block.type);
    return Boolean(templateInfo && templateInfo.blockType === 'hat' && templateInfo.section === 'setup');
};

// section=main 或默认主入口帽子会包进函数体。
const isCustomMainHatBlock = block => {
    if (!block) return false;
    const templateInfo = getPythonCodegenTemplate(block.type);
    return Boolean(templateInfo && templateInfo.blockType === 'hat' && templateInfo.section === 'main');
};

const isFunctionDefinitionBlock = block => isType(block, 'function', 'define');

// 自带 entryTemplate 的事件回调已有固定函数名，不参与 start_main/start_main1 自动编号。
const usesGeneratedEntryName = block => {
    if (!block) return false;
    const templateInfo = getPythonCodegenTemplate(block.type);
    return !templateInfo || !templateInfo.entryTemplate;
};

// 对外入口：读取 Blockly workspace 顶层积木，生成完整 Python 文件文本。
const generatePythonCode = (workspace, options = {}) => {
    codegenContext = new PythonCodegenContext({
        getPythonCodegenTemplate: options.getPythonCodegenTemplate
    });
    if (!workspace || typeof workspace.getTopBlocks !== 'function') {
        return '# Python coding mode is waiting for the blocks workspace.';
    }

    const imports = codegenContext.imports;
    const topBlocks = workspace.getTopBlocks(true);
    const functionBlocks = topBlocks.filter(isFunctionDefinitionBlock);
    const setupHatBlocks = topBlocks.filter(isCustomSetupHatBlock);
    const entryBlocks = topBlocks.filter(isEntryBlock);
    // Python 模式只转换有明确入口的积木栈；画布上散落的普通积木不生成代码。
    const orderedBlocks = [
        ...functionBlocks,
        ...setupHatBlocks,
        ...entryBlocks
    ];
    const generatedEntryBlocks = entryBlocks.filter(usesGeneratedEntryName);
    const entryIndexByBlock = new Map(generatedEntryBlocks.map((block, index) => [block, index]));
    // 先按工作区顺序生成并收集依赖，再按 functions/setup/entry 顺序组织最终代码。
    const generatedSections = new Map(topBlocks
        .filter(block => orderedBlocks.includes(block))
        .map(block => {
            const entryIndex = entryIndexByBlock.get(block);
            const entryName = typeof entryIndex === 'number' ?
                codegenContext.getEntryName(entryIndex) :
                undefined;
            return [block, generateStack(block, imports, {entryName})];
        }));
    const sections = orderedBlocks.map(block => {
        return generatedSections.get(block) || [];
    }).filter(section => section.length);

    if (sections.length === 0 && !codegenContext.hasPreamble()) {
        return '# Drag Python blocks here to generate code.';
    }

    return codegenContext.finish(sections);
};

module.exports = generatePythonCode;
