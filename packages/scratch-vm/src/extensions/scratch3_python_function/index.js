const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');

// Python 函数类积木：负责定义/调用/返回值积木的工具箱形态，代码文本由 codegen 统一生成。
class Scratch3PythonFunctionBlocks {
    // getInfo 声明函数积木的参数输入方式，当前用文本参数承载函数名和参数列表。
    getInfo () {
        return {
            id: 'pythonFunction',
            name: formatMessage({
                id: 'pythonFunction.categoryName',
                default: '函数',
                description: 'Name of the Python function category'
            }),
            color1: '#FF6680',
            color2: '#FF4D6D',
            color3: '#D93A59',
            blocks: [
                {
                    opcode: 'define',
                    blockType: BlockType.CONDITIONAL,
                    text: formatMessage({
                        id: 'pythonFunction.define',
                        default: 'define function [NAME] params [PARAMS]',
                        description: 'Python function definition block'
                    }),
                    branchCount: 1,
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: 'my_function'
                        },
                        PARAMS: {
                            type: ArgumentType.STRING,
                            defaultValue: 'name'
                        }
                    }
                },
                {
                    opcode: 'call',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pythonFunction.call',
                        default: 'call function [NAME] args [ARGS]',
                        description: 'Python function call command block'
                    }),
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: 'my_function'
                        },
                        ARGS: {
                            type: ArgumentType.STRING,
                            defaultValue: '"Scratch"'
                        }
                    }
                },
                {
                    opcode: 'callReporter',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'pythonFunction.callReporter',
                        default: 'function [NAME] args [ARGS]',
                        description: 'Python function call reporter block'
                    }),
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: 'my_function'
                        },
                        ARGS: {
                            type: ArgumentType.STRING,
                            defaultValue: '"Scratch"'
                        }
                    }
                },
                {
                    opcode: 'return',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pythonFunction.return',
                        default: 'return [VALUE]',
                        description: 'Python function return block'
                    }),
                    arguments: {
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: 'result'
                        }
                    }
                },
                {
                    opcode: 'parameter',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'pythonFunction.parameter',
                        default: 'parameter [NAME]',
                        description: 'Python function parameter reporter block'
                    }),
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: 'name'
                        }
                    }
                }
            ]
        };
    }

    // define/call/return 在 VM 内不直接执行，避免编辑器预览和 Python 文件语义混在一起。
    define () {}

    call () {}

    // reporter 调用返回可读表达式，方便嵌入其他积木时有兜底值。
    callReporter (args) {
        return `${Cast.toString(args.NAME)}(${Cast.toString(args.ARGS)})`;
    }

    // return 是方法名，对应 opcode=return；最终会由 codegen 生成 Python return 语句。
    return (args) {
        return args.VALUE;
    }

    // parameter reporter 返回参数名，生成 Python 时会被规整为合法标识符。
    parameter (args) {
        return Cast.toString(args.NAME);
    }
}

module.exports = Scratch3PythonFunctionBlocks;
