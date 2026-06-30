const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');

class Scratch3PythonTextBlocks {
    getInfo () {
        return {
            id: 'pythonText',
            name: formatMessage({
                id: 'pythonText.categoryName',
                default: '文本',
                description: 'Name of the Python text category'
            }),
            color1: '#9966FF',
            color2: '#855CD6',
            color3: '#774DCB',
            blocks: [
                {
                    opcode: 'literal',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'pythonText.literal',
                        default: 'text [TEXT]',
                        description: 'Python text literal block'
                    }),
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'hello'
                        }
                    }
                },
                {
                    opcode: 'join',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'pythonText.join',
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
                    opcode: 'length',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'pythonText.length',
                        default: 'length of [VALUE]',
                        description: 'Python len block for text'
                    }),
                    arguments: {
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: 'hello'
                        }
                    }
                },
                {
                    opcode: 'toString',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'pythonText.toString',
                        default: 'string [VALUE]',
                        description: 'Python string conversion block'
                    }),
                    arguments: {
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: 123
                        }
                    }
                }
            ]
        };
    }

    literal (args) {
        return Cast.toString(args.TEXT);
    }

    join (args) {
        return `${Cast.toString(args.A)}${Cast.toString(args.B)}`;
    }

    length (args) {
        return Cast.toString(args.VALUE).length;
    }

    toString (args) {
        return Cast.toString(args.VALUE);
    }
}

module.exports = Scratch3PythonTextBlocks;
