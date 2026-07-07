const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');

// Python 运算类积木：运行时给 reporter 一个预览值，真实表达式文本由 codegen 生成。
class Scratch3PythonOperatorsBlocks {
    // getInfo 定义算术、比较、逻辑、not 四类表达式积木及其菜单。
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

    // 编辑器预览态执行 JS 算术；Python 生成时保留用户选择的运算符。
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

    // 比较积木在预览态尽量贴近 Python 的数值比较。
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

    // 逻辑积木按菜单选择 and/or。
    logic (args) {
        return Cast.toString(args.OP) === 'or' ?
            Cast.toBoolean(args.A) || Cast.toBoolean(args.B) :
            Cast.toBoolean(args.A) && Cast.toBoolean(args.B);
    }

    // not reporter 返回布尔取反结果。
    not (args) {
        return !Cast.toBoolean(args.VALUE);
    }
}

module.exports = Scratch3PythonOperatorsBlocks;
