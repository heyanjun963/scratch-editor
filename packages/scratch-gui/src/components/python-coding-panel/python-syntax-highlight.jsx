import React from 'react';

import styles from './python-coding-panel.css';

// Python 代码区只做展示层词法高亮，不解析 AST，也不改变原始代码文本。
const PYTHON_KEYWORDS = new Set([
    'and', 'as', 'assert', 'async', 'await', 'break', 'case', 'class', 'continue',
    'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global',
    'if', 'import', 'in', 'is', 'lambda', 'match', 'nonlocal', 'not', 'or',
    'pass', 'raise', 'return', 'try', 'while', 'with', 'yield'
]);

const PYTHON_BUILTINS = new Set([
    'abs', 'all', 'any', 'bool', 'dict', 'enumerate', 'filter', 'float', 'int',
    'len', 'list', 'map', 'max', 'min', 'open', 'print', 'range', 'round',
    'set', 'sorted', 'str', 'sum', 'super', 'tuple', 'type', 'zip'
]);

const MULTI_CHAR_OPERATORS = [
    '**=', '//=', '>>=', '<<=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=',
    '==', '!=', '<=', '>=', '->', '**', '//', ':=', '<<', '>>'
];

const SINGLE_CHAR_OPERATORS = new Set(['+', '-', '*', '/', '%', '=', '<', '>', '&', '|', '^', '~']);
const PUNCTUATION = new Set(['(', ')', '[', ']', '{', '}', ',', ':', ';', '.']);
const STRING_PREFIX_CHARACTERS = new Set(['r', 'R', 'u', 'U', 'b', 'B', 'f', 'F']);

const isIdentifierStart = character => Boolean(character) && /[A-Za-z_]/.test(character);
const isIdentifierPart = character => Boolean(character) && /[A-Za-z0-9_]/.test(character);
const isDigit = character => Boolean(character) && /[0-9]/.test(character);

const readStringEnd = (code, start) => {
    let quoteStart = start;
    while (quoteStart < code.length && STRING_PREFIX_CHARACTERS.has(code[quoteStart])) {
        quoteStart++;
    }
    if (code[quoteStart] !== '\'' && code[quoteStart] !== '"') return null;

    const quote = code[quoteStart];
    const triple = code.slice(quoteStart, quoteStart + 3) === quote.repeat(3);
    const delimiterLength = triple ? 3 : 1;
    let cursor = quoteStart + delimiterLength;
    while (cursor < code.length) {
        if (code[cursor] === '\\') {
            cursor += 2;
            continue;
        }
        if (code.slice(cursor, cursor + delimiterLength) === quote.repeat(delimiterLength)) {
            return cursor + delimiterLength;
        }
        // 单行字符串遇到换行即停止，后续内容交给普通 token 处理。
        if (!triple && (code[cursor] === '\n' || code[cursor] === '\r')) return null;
        cursor++;
    }
    return null;
};

const readNumberEnd = (code, start) => {
    const match = code.slice(start).match(/^(?:(?:0[xX][0-9A-Fa-f_]+)|(?:0[bB][01_]+)|(?:0[oO][0-7_]+)|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?[jJ]?)/);
    return match ? start + match[0].length : null;
};

const readOperator = (code, start) => {
    const operator = MULTI_CHAR_OPERATORS.find(candidate => code.startsWith(candidate, start));
    if (operator) return operator;
    return SINGLE_CHAR_OPERATORS.has(code[start]) ? code[start] : null;
};

const getIdentifierType = (value, code, end) => {
    if (value === 'True' || value === 'False') return 'boolean';
    if (value === 'None') return 'none';
    if (PYTHON_KEYWORDS.has(value)) return 'keyword';
    if (PYTHON_BUILTINS.has(value)) return 'builtin';

    let lookahead = end;
    while (/\s/.test(code[lookahead] || '')) lookahead++;
    return code[lookahead] === '(' ? 'function' : 'plain';
};

const pushToken = (tokens, type, value) => {
    if (value) tokens.push({type, value});
};

const tokenizePython = code => {
    const source = String(code || '');
    const tokens = [];
    let index = 0;

    while (index < source.length) {
        const character = source[index];

        if (/\s/.test(character)) {
            const start = index;
            while (/\s/.test(source[index] || '')) index++;
            pushToken(tokens, 'plain', source.slice(start, index));
            continue;
        }

        if (character === '#') {
            const start = index;
            while (index < source.length && source[index] !== '\n' && source[index] !== '\r') index++;
            pushToken(tokens, 'comment', source.slice(start, index));
            continue;
        }

        const stringEnd = readStringEnd(source, index);
        if (stringEnd !== null) {
            pushToken(tokens, 'string', source.slice(index, stringEnd));
            index = stringEnd;
            continue;
        }

        if (isIdentifierStart(character)) {
            const start = index;
            index++;
            while (isIdentifierPart(source[index])) index++;
            const value = source.slice(start, index);
            pushToken(tokens, getIdentifierType(value, source, index), value);
            continue;
        }

        if (isDigit(character) || (character === '.' && isDigit(source[index + 1]))) {
            const end = readNumberEnd(source, index);
            if (end !== null) {
                pushToken(tokens, 'number', source.slice(index, end));
                index = end;
                continue;
            }
        }

        const operator = readOperator(source, index);
        if (operator) {
            pushToken(tokens, 'operator', operator);
            index += operator.length;
            continue;
        }

        if (PUNCTUATION.has(character)) {
            pushToken(tokens, 'punctuation', character);
            index++;
            continue;
        }

        pushToken(tokens, 'plain', character);
        index++;
    }

    return tokens;
};

const tokenClassNames = {
    boolean: styles.tokenBoolean,
    builtin: styles.tokenBuiltin,
    comment: styles.tokenComment,
    function: styles.tokenFunction,
    keyword: styles.tokenKeyword,
    none: styles.tokenNone,
    number: styles.tokenNumber,
    operator: styles.tokenOperator,
    punctuation: styles.tokenPunctuation,
    string: styles.tokenString
};

const PythonSyntaxHighlight = ({code = ''}) => (
    <pre
        aria-labelledby="python-code-header"
        aria-readonly="true"
        className={styles.codeArea}
        data-testid="python-code"
        role="textbox"
        tabIndex="0"
    >
        <code>
            {tokenizePython(code).map((token, index) => (
                <span
                    className={tokenClassNames[token.type]}
                    data-token-type={token.type}
                    key={`${token.type}-${index}`}
                >
                    {token.value}
                </span>
            ))}
        </code>
    </pre>
);

export {
    tokenizePython
};

export default PythonSyntaxHighlight;
