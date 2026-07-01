const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');

class Scratch3PythonFunctionBlocks {
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

    define () {}

    call () {}

    callReporter (args) {
        return `${Cast.toString(args.NAME)}(${Cast.toString(args.ARGS)})`;
    }

    return (args) {
        return args.VALUE;
    }

    parameter (args) {
        return Cast.toString(args.NAME);
    }
}

module.exports = Scratch3PythonFunctionBlocks;
