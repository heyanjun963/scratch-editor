const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');

class Scratch3PythonVariablesBlocks {
    constructor () {
        this._variables = Object.create(null);
    }

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

    setVariable (args) {
        this._variables[Cast.toString(args.NAME)] = args.VALUE;
    }

    changeVariable (args) {
        const name = Cast.toString(args.NAME);
        this._variables[name] = Cast.toNumber(this._variables[name]) + Cast.toNumber(args.VALUE);
    }

    getVariable (args) {
        return this._variables[Cast.toString(args.NAME)] || '';
    }
}

module.exports = Scratch3PythonVariablesBlocks;
