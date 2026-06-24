const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');

const PYTHON_NATIVE_CONSOLE = 'PYTHON_NATIVE_CONSOLE';

const iconURI = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">' +
    '<rect width="40" height="40" rx="8" fill="#3776AB"/>' +
    '<path d="M13 12h9a5 5 0 0 1 5 5v2H16a4 4 0 0 0-4 4v5H9a5 5 0 0 1-5-5v-6a5 5 0 0 1 5-5h4z" fill="#fff"/>' +
    '<circle cx="13" cy="16" r="1.5" fill="#3776AB"/>' +
    '<path d="M27 28h-9a5 5 0 0 1-5-5v-2h11a4 4 0 0 0 4-4v-5h3a5 5 0 0 1 5 5v6a5 5 0 0 1-5 5h-4z" fill="#FFD43B"/>' +
    '<circle cx="27" cy="24" r="1.5" fill="#3776AB"/>' +
    '</svg>'
);

class Scratch3PythonNativeBlocks {
    constructor (runtime) {
        this.runtime = runtime;
        this._variables = Object.create(null);
    }

    emitConsole (message) {
        if (this.runtime) {
            this.runtime.emit(PYTHON_NATIVE_CONSOLE, {
                message: message
            });
        }
    }

    getInfo () {
        return {
            id: 'pythonNative',
            name: formatMessage({
                id: 'pythonNative.categoryName',
                default: 'Python',
                description: 'Name of the Python native extension'
            }),
            blockIconURI: iconURI,
            menuIconURI: iconURI,
            color1: '#3776AB',
            color2: '#2E638F',
            color3: '#244F73',
            blocks: [
                {
                    opcode: 'print',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pythonNative.print',
                        default: 'print [TEXT]',
                        description: 'Python print block'
                    }),
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'hello python'
                        }
                    }
                },
                {
                    opcode: 'sleep',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pythonNative.sleep',
                        default: 'sleep [SECS] seconds',
                        description: 'Python sleep block'
                    }),
                    arguments: {
                        SECS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    }
                },
                {
                    opcode: 'randomInteger',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'pythonNative.randomInteger',
                        default: 'random integer from [A] to [B]',
                        description: 'Python random integer block'
                    }),
                    arguments: {
                        A: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        },
                        B: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 10
                        }
                    }
                },
                {
                    opcode: 'currentTime',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'pythonNative.currentTime',
                        default: 'current time',
                        description: 'Python current time block'
                    })
                },
                {
                    opcode: 'setVariable',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pythonNative.setVariable',
                        default: 'set [NAME] to [VALUE]',
                        description: 'Python variable assignment block'
                    }),
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: 'x'
                        },
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'getVariable',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'pythonNative.getVariable',
                        default: 'variable [NAME]',
                        description: 'Python variable value block'
                    }),
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: 'x'
                        }
                    }
                },
                {
                    opcode: 'arithmetic',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'pythonNative.arithmetic',
                        default: '[A] [OP] [B]',
                        description: 'Python arithmetic expression block'
                    }),
                    arguments: {
                        A: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        },
                        OP: {
                            type: ArgumentType.STRING,
                            menu: 'ARITHMETIC_OPERATOR',
                            defaultValue: '+'
                        },
                        B: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 2
                        }
                    }
                },
                {
                    opcode: 'compare',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'pythonNative.compare',
                        default: '[A] [OP] [B]',
                        description: 'Python comparison expression block'
                    }),
                    arguments: {
                        A: {
                            type: ArgumentType.STRING,
                            defaultValue: '1'
                        },
                        OP: {
                            type: ArgumentType.STRING,
                            menu: 'COMPARE_OPERATOR',
                            defaultValue: '=='
                        },
                        B: {
                            type: ArgumentType.STRING,
                            defaultValue: '1'
                        }
                    }
                },
                {
                    opcode: 'join',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'pythonNative.join',
                        default: 'join [A] and [B]',
                        description: 'Python string join block'
                    }),
                    arguments: {
                        A: {
                            type: ArgumentType.STRING,
                            defaultValue: 'hello'
                        },
                        B: {
                            type: ArgumentType.STRING,
                            defaultValue: 'python'
                        }
                    }
                },
                {
                    opcode: 'toNumber',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'pythonNative.toNumber',
                        default: 'number [VALUE]',
                        description: 'Python number conversion block'
                    }),
                    arguments: {
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: '123'
                        }
                    }
                },
                {
                    opcode: 'toString',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'pythonNative.toString',
                        default: 'string [VALUE]',
                        description: 'Python string conversion block'
                    }),
                    arguments: {
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: 123
                        }
                    }
                },
                {
                    opcode: 'makeList',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'pythonNative.makeList',
                        default: 'list [A] [B] [C]',
                        description: 'Python list literal block'
                    }),
                    arguments: {
                        A: {
                            type: ArgumentType.STRING,
                            defaultValue: 'a'
                        },
                        B: {
                            type: ArgumentType.STRING,
                            defaultValue: 'b'
                        },
                        C: {
                            type: ArgumentType.STRING,
                            defaultValue: 'c'
                        }
                    }
                },
                {
                    opcode: 'length',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'pythonNative.length',
                        default: 'length of [VALUE]',
                        description: 'Python len block'
                    }),
                    arguments: {
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: 'hello'
                        }
                    }
                },
                {
                    opcode: 'ifThen',
                    blockType: BlockType.CONDITIONAL,
                    text: formatMessage({
                        id: 'pythonNative.ifThen',
                        default: 'if [CONDITION]',
                        description: 'Python if block'
                    }),
                    branchCount: 1,
                    arguments: {
                        CONDITION: {
                            type: ArgumentType.BOOLEAN,
                            defaultValue: true
                        }
                    }
                },
                {
                    opcode: 'forRange',
                    blockType: BlockType.LOOP,
                    text: formatMessage({
                        id: 'pythonNative.forRange',
                        default: 'for [VAR] in range [START] to [STOP]',
                        description: 'Python for range block'
                    }),
                    branchCount: 1,
                    arguments: {
                        VAR: {
                            type: ArgumentType.STRING,
                            defaultValue: 'i'
                        },
                        START: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        STOP: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 5
                        }
                    }
                }
            ],
            menus: {
                ARITHMETIC_OPERATOR: {
                    acceptReporters: true,
                    items: ['+', '-', '*', '/', '//', '%', '**']
                },
                COMPARE_OPERATOR: {
                    acceptReporters: true,
                    items: ['==', '!=', '<', '<=', '>', '>=']
                }
            }
        };
    }

    print (args) {
        const text = Cast.toString(args.TEXT);
        this.emitConsole(`[print] ${text}`);
        // eslint-disable-next-line no-console
        console.log('[Python Native]', text);
    }

    sleep (args) {
        const seconds = Math.max(0, Cast.toNumber(args.SECS));
        this.emitConsole(`[sleep] ${seconds} seconds`);
        return new Promise(resolve => {
            setTimeout(resolve, seconds * 1000);
        });
    }

    randomInteger (args) {
        const a = Math.floor(Cast.toNumber(args.A));
        const b = Math.floor(Cast.toNumber(args.B));
        const min = Math.min(a, b);
        const max = Math.max(a, b);
        const value = Math.floor(Math.random() * (max - min + 1)) + min;
        this.emitConsole(`[random] ${value}`);
        return value;
    }

    currentTime () {
        const value = new Date().toLocaleTimeString();
        this.emitConsole(`[time] ${value}`);
        return value;
    }

    setVariable (args) {
        const name = Cast.toString(args.NAME);
        const value = args.VALUE;
        this._variables[name] = value;
        this.emitConsole(`[set] ${name} = ${value}`);
    }

    getVariable (args) {
        const name = Cast.toString(args.NAME);
        const value = this._variables[name] || '';
        this.emitConsole(`[variable] ${name} -> ${value}`);
        return value;
    }

    arithmetic (args) {
        const a = Cast.toNumber(args.A);
        const b = Cast.toNumber(args.B);
        let value;
        switch (Cast.toString(args.OP)) {
        case '-':
            value = a - b;
            break;
        case '*':
            value = a * b;
            break;
        case '/':
            value = b === 0 ? Infinity : a / b;
            break;
        case '//':
            value = b === 0 ? Infinity : Math.floor(a / b);
            break;
        case '%':
            value = b === 0 ? NaN : a % b;
            break;
        case '**':
            value = a ** b;
            break;
        case '+':
        default:
            value = a + b;
        }
        this.emitConsole(`[math] ${a} ${Cast.toString(args.OP)} ${b} -> ${value}`);
        return value;
    }

    compare (args) {
        const a = args.A;
        const b = args.B;
        let value;
        switch (Cast.toString(args.OP)) {
        case '!=':
            value = a !== b;
            break;
        case '<':
            value = Cast.toNumber(a) < Cast.toNumber(b);
            break;
        case '<=':
            value = Cast.toNumber(a) <= Cast.toNumber(b);
            break;
        case '>':
            value = Cast.toNumber(a) > Cast.toNumber(b);
            break;
        case '>=':
            value = Cast.toNumber(a) >= Cast.toNumber(b);
            break;
        case '==':
        default:
            value = a === b;
        }
        this.emitConsole(`[compare] ${a} ${Cast.toString(args.OP)} ${b} -> ${value}`);
        return value;
    }

    join (args) {
        const value = `${Cast.toString(args.A)}${Cast.toString(args.B)}`;
        this.emitConsole(`[join] ${value}`);
        return value;
    }

    toNumber (args) {
        const value = Cast.toNumber(args.VALUE);
        this.emitConsole(`[number] ${args.VALUE} -> ${value}`);
        return value;
    }

    toString (args) {
        const value = Cast.toString(args.VALUE);
        this.emitConsole(`[string] ${value}`);
        return value;
    }

    makeList (args) {
        const value = [
            args.A,
            args.B,
            args.C
        ];
        this.emitConsole(`[list] ${JSON.stringify(value)}`);
        return value;
    }

    length (args) {
        const value = args.VALUE;
        const result = Array.isArray(value) ? value.length : Cast.toString(value).length;
        this.emitConsole(`[length] ${result}`);
        return result;
    }

    ifThen (args, util) {
        const condition = Cast.toBoolean(args.CONDITION);
        this.emitConsole(`[if] condition -> ${condition}`);
        if (condition) {
            util.startBranch(1, false);
        }
    }

    forRange (args, util) {
        const start = Math.floor(Cast.toNumber(args.START));
        const stop = Math.floor(Cast.toNumber(args.STOP));
        if (typeof util.stackFrame.index === 'undefined') {
            util.stackFrame.index = start;
        }
        if (util.stackFrame.index < stop) {
            const name = Cast.toString(args.VAR);
            this._variables[name] = util.stackFrame.index;
            this.emitConsole(`[for] ${name} = ${util.stackFrame.index}`);
            util.stackFrame.index++;
            util.startBranch(1, true);
        }
    }
}

module.exports = Scratch3PythonNativeBlocks;
