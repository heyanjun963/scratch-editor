const pythonNativePrefix = 'pythonNative_';

const quotePythonString = value => JSON.stringify(String(value));

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

const valueToPython = (block, inputName, fallback = '', imports = new Set()) => {
    const inputBlock = getInputBlock(block, inputName);
    if (!inputBlock) return quotePythonString(getFieldValue(block, [inputName], fallback));

    switch (inputBlock.type) {
    case `${pythonNativePrefix}getVariable`:
        return normalizePythonName(getFieldValue(inputBlock, ['NAME'], 'x'));
    case `${pythonNativePrefix}arithmetic`:
        return `(${
            numberToPython(inputBlock, 'A', '1', imports)
        } ${getFieldValue(inputBlock, ['OP'], '+')} ${
            numberToPython(inputBlock, 'B', '2', imports)
        })`;
    case `${pythonNativePrefix}compare`:
        return `(${
            valueToPython(inputBlock, 'A', '1', imports)
        } ${getFieldValue(inputBlock, ['OP'], '==')} ${
            valueToPython(inputBlock, 'B', '1', imports)
        })`;
    case `${pythonNativePrefix}join`:
        return `(str(${valueToPython(inputBlock, 'A', 'hello', imports)}) + str(${
            valueToPython(inputBlock, 'B', 'python', imports)
        }))`;
    case `${pythonNativePrefix}toNumber`:
        return `float(${valueToPython(inputBlock, 'VALUE', '0', imports)})`;
    case `${pythonNativePrefix}toString`:
        return `str(${valueToPython(inputBlock, 'VALUE', '', imports)})`;
    case `${pythonNativePrefix}makeList`:
        return `[${
            valueToPython(inputBlock, 'A', 'a', imports)
        }, ${
            valueToPython(inputBlock, 'B', 'b', imports)
        }, ${
            valueToPython(inputBlock, 'C', 'c', imports)
        }]`;
    case `${pythonNativePrefix}length`:
        return `len(${valueToPython(inputBlock, 'VALUE', 'hello', imports)})`;
    case `${pythonNativePrefix}randomInteger`:
        imports.add('random');
        return `random.randint(${
            numberToPython(inputBlock, 'A', '1', imports)
        }, ${
            numberToPython(inputBlock, 'B', '10', imports)
        })`;
    case `${pythonNativePrefix}currentTime`:
        imports.add('time');
        return 'time.strftime("%H:%M:%S")';
    case 'math_number':
        return getFieldValue(inputBlock, ['NUM'], fallback);
    case 'text':
        return quotePythonString(getFieldValue(inputBlock, ['TEXT'], fallback));
    default:
        return quotePythonString(getFieldValue(inputBlock, ['TEXT', 'NUM', 'VALUE'], fallback));
    }
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
    return valueToPython(block, inputName, fallback, imports);
};

const generateExpressionLine = (block, imports) => {
    switch (block.type) {
    case `${pythonNativePrefix}getVariable`:
        return normalizePythonName(getFieldValue(block, ['NAME'], 'x'));
    case `${pythonNativePrefix}arithmetic`:
        return valueToPython({getInputTargetBlock: name => (name === 'VALUE' ? block : null)}, 'VALUE', '0', imports);
    case `${pythonNativePrefix}compare`:
        return valueToPython({getInputTargetBlock: name => (name === 'VALUE' ? block : null)}, 'VALUE', 'True', imports);
    case `${pythonNativePrefix}join`:
        return valueToPython({getInputTargetBlock: name => (name === 'VALUE' ? block : null)}, 'VALUE', '', imports);
    case `${pythonNativePrefix}toNumber`:
        return valueToPython({getInputTargetBlock: name => (name === 'VALUE' ? block : null)}, 'VALUE', '0', imports);
    case `${pythonNativePrefix}toString`:
        return valueToPython({getInputTargetBlock: name => (name === 'VALUE' ? block : null)}, 'VALUE', '', imports);
    case `${pythonNativePrefix}makeList`:
        return valueToPython({getInputTargetBlock: name => (name === 'VALUE' ? block : null)}, 'VALUE', '', imports);
    case `${pythonNativePrefix}length`:
        return valueToPython({getInputTargetBlock: name => (name === 'VALUE' ? block : null)}, 'VALUE', '', imports);
    case `${pythonNativePrefix}randomInteger`:
        imports.add('random');
        return `random.randint(${numberToPython(block, 'A', '1', imports)}, ${numberToPython(block, 'B', '10', imports)})`;
    case `${pythonNativePrefix}currentTime`:
        imports.add('time');
        return 'time.strftime("%H:%M:%S")';
    default:
        return `# Unsupported block: ${block.type}`;
    }
};

const generateStatementLines = (block, imports, level = 0) => {
    switch (block.type) {
    case `${pythonNativePrefix}print`:
        return [`${indent(level)}print(${valueToPython(block, 'TEXT', 'hello python', imports)})`];
    case `${pythonNativePrefix}sleep`:
        imports.add('time');
        return [`${indent(level)}time.sleep(${numberToPython(block, 'SECS', '1', imports)})`];
    case `${pythonNativePrefix}setVariable`:
        return [`${indent(level)}${normalizePythonName(getFieldValue(block, ['NAME'], 'x'))} = ${
            valueToPython(block, 'VALUE', '0', imports)
        }`];
    case `${pythonNativePrefix}ifThen`: {
        const body = generateSubstack(block, 'SUBSTACK', imports, level + 1);
        return [
            `${indent(level)}if ${booleanToPython(block, 'CONDITION', 'True', imports)}:`,
            ...(body.length ? body : [`${indent(level + 1)}pass`])
        ];
    }
    case `${pythonNativePrefix}forRange`: {
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

    if (topBlock.type === 'event_whenflagclicked') {
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
