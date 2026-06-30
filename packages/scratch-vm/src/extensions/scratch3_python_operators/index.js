const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');

class Scratch3PythonOperatorsBlocks {
    getInfo () {
        return {
            id: 'pythonOperators',
            name: formatMessage({
                id: 'pythonOperators.categoryName',
                default: '运算符',
                description: 'Name of the Python operators category'
            }),
            color1: '#59C059',
            color2: '#46A946',
            color3: '#389438',
            blocks: [
                {
                    opcode: 'arithmetic',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'pythonOperators.arithmetic',
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
                        id: 'pythonOperators.compare',
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
                    opcode: 'logic',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'pythonOperators.logic',
                        default: '[A] [OP] [B]',
                        description: 'Python boolean logic block'
                    }),
                    arguments: {
                        A: {
                            type: ArgumentType.BOOLEAN,
                            defaultValue: true
                        },
                        OP: {
                            type: ArgumentType.STRING,
                            menu: 'LOGIC_OPERATOR',
                            defaultValue: 'and'
                        },
                        B: {
                            type: ArgumentType.BOOLEAN,
                            defaultValue: false
                        }
                    }
                },
                {
                    opcode: 'not',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'pythonOperators.not',
                        default: 'not [VALUE]',
                        description: 'Python not block'
                    }),
                    arguments: {
                        VALUE: {
                            type: ArgumentType.BOOLEAN,
                            defaultValue: false
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
                },
                LOGIC_OPERATOR: {
                    acceptReporters: true,
                    items: ['and', 'or']
                }
            }
        };
    }

    arithmetic (args) {
        const a = Cast.toNumber(args.A);
        const b = Cast.toNumber(args.B);
        switch (Cast.toString(args.OP)) {
        case '-':
            return a - b;
        case '*':
            return a * b;
        case '/':
            return b === 0 ? Infinity : a / b;
        case '//':
            return b === 0 ? Infinity : Math.floor(a / b);
        case '%':
            return b === 0 ? NaN : a % b;
        case '**':
            return a ** b;
        case '+':
        default:
            return a + b;
        }
    }

    compare (args) {
        const a = args.A;
        const b = args.B;
        switch (Cast.toString(args.OP)) {
        case '!=':
            return a !== b;
        case '<':
            return Cast.toNumber(a) < Cast.toNumber(b);
        case '<=':
            return Cast.toNumber(a) <= Cast.toNumber(b);
        case '>':
            return Cast.toNumber(a) > Cast.toNumber(b);
        case '>=':
            return Cast.toNumber(a) >= Cast.toNumber(b);
        case '==':
        default:
            return a === b;
        }
    }

    logic (args) {
        return Cast.toString(args.OP) === 'or' ?
            Cast.toBoolean(args.A) || Cast.toBoolean(args.B) :
            Cast.toBoolean(args.A) && Cast.toBoolean(args.B);
    }

    not (args) {
        return !Cast.toBoolean(args.VALUE);
    }
}

module.exports = Scratch3PythonOperatorsBlocks;
