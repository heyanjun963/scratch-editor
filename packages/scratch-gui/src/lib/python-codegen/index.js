const prefixByCategory = {
    control: 'pythonControl_',
    operators: 'pythonOperators_',
    text: 'pythonText_',
    variables: 'pythonVariables_',
    list: 'pythonList_',
    native: 'pythonNative_'
};

const quotePythonString = value => JSON.stringify(String(value));

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

const normalizePythonName = value => {
    const cleaned = String(value || 'value')
        .trim()
        .replace(/[^A-Za-z0-9_]/g, '_')
        .replace(/^[^A-Za-z_]+/, '');
    return cleaned || 'value';
};

const getInputBlock = (block, name) => {
    if (block && typeof block.getInputTargetBlock === 'function') {
        return block.getInputTargetBlock(name);
    }
    return null;
};

const getFieldValue = (block, names, fallback = '') => {
    if (!block || typeof block.getFieldValue !== 'function') return fallback;
    for (const name of names) {
        const value = block.getFieldValue(name);
        if (typeof value !== 'undefined' && value !== null) return value;
    }
    return fallback;
};

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
    default:
        return quotePythonString(getFieldValue(block, ['TEXT', 'NUM', 'VALUE'], fallback));
    }
};

const valueToPython = (block, inputName, fallback = '', imports = new Set()) => {
    const inputBlock = getInputBlock(block, inputName);
    if (!inputBlock) return literalToPython(getFieldValue(block, [inputName], fallback));
    return expressionFromSelf(inputBlock, imports, fallback);
};

const numberToPython = (block, inputName, fallback = '0', imports = new Set()) => {
    const value = valueToPython(block, inputName, fallback, imports);
    return value.replace(/^"|"$/g, '');
};

const booleanToPython = (block, inputName, fallback = 'True', imports = new Set()) => {
    const inputBlock = getInputBlock(block, inputName);
    if (!inputBlock) {
        const value = getFieldValue(block, [inputName], fallback);
        return String(value).toLowerCase() === 'false' ? 'False' : 'True';
    }
    return expressionFromSelf(inputBlock, imports, fallback);
};

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
    return `# Unsupported block: ${block.type}`;
};

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
    default:
        return [`${indent(level)}${generateExpressionLine(block, imports)}`];
    }
};

const generateSubstack = (block, inputName, imports, level) => {
    const substack = getInputBlock(block, inputName);
    if (!substack) return [];
    return getStackBlocks(substack).flatMap(child => generateStatementLines(child, imports, level));
};

const generateStack = (topBlock, imports) => {
    const stack = getStackBlocks(topBlock);
    if (stack.length === 0) return [];

    if (topBlock.type === 'event_whenflagclicked' || isType(topBlock, 'control', 'main')) {
        const body = stack.slice(1).flatMap(block => generateStatementLines(block, imports, 1));
        return [
            'def start_main():',
            ...(body.length ? body : ['    pass']),
            '',
            'start_main()'
        ];
    }

    return stack.flatMap(block => generateStatementLines(block, imports));
};

const generatePythonCode = workspace => {
    if (!workspace || typeof workspace.getTopBlocks !== 'function') {
        return '# Python coding mode is waiting for the blocks workspace.';
    }

    const imports = new Set();
    const topBlocks = workspace.getTopBlocks(true);
    const sections = topBlocks.map(block => generateStack(block, imports)).filter(section => section.length);

    if (sections.length === 0) {
        return '# Drag Python blocks here to generate code.';
    }

    const importLines = Array.from(imports).sort().map(name => `import ${name}`);
    return [
        ...importLines,
        ...(importLines.length ? [''] : []),
        ...sections.flatMap((section, index) => (index === 0 ? section : ['', ...section]))
    ].join('\n');
};

export default generatePythonCode;
