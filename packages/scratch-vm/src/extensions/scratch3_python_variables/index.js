const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');

// Python 变量类积木：VM 内用简单对象保存预览值，最终变量赋值仍由 Python codegen 输出。
class Scratch3PythonVariablesBlocks {
    constructor () {
        this._variables = Object.create(null);
    }

    // getInfo 定义变量赋值、增量和取值 reporter。
    getInfo () {
        return {
            id: 'pythonVariables',
            name: formatMessage({
                id: 'pythonVariables.categoryName',
                default: '变量',
                description: 'Name of the Python variables category'
            }),
            color1: '#FF8C1A',
            color2: '#E67600',
            color3: '#CC6600',
            blocks: [
                {
                    opcode: 'setVariable',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pythonVariables.setVariable',
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
                    opcode: 'changeVariable',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pythonVariables.changeVariable',
                        default: 'change [NAME] by [VALUE]',
                        description: 'Python variable increment block'
                    }),
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: 'x'
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    }
                },
                {
                    opcode: 'getVariable',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'pythonVariables.getVariable',
                        default: 'variable [NAME]',
                        description: 'Python variable value block'
                    }),
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: 'x'
                        }
                    }
                }
            ]
        };
    }

    // 编辑器预览态保存变量值。
    setVariable (args) {
        this._variables[Cast.toString(args.NAME)] = args.VALUE;
    }

    // 编辑器预览态按数字累加变量。
    changeVariable (args) {
        const name = Cast.toString(args.NAME);
        this._variables[name] = Cast.toNumber(this._variables[name]) + Cast.toNumber(args.VALUE);
    }

    // reporter 返回当前预览值；生成 Python 时会输出变量名。
    getVariable (args) {
        return this._variables[Cast.toString(args.NAME)] || '';
    }
}

module.exports = Scratch3PythonVariablesBlocks;
