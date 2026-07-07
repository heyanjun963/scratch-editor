const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');

// Python 文本类积木：提供字符串字面量、拼接、长度和类型转换的 reporter。
class Scratch3PythonTextBlocks {
    // getInfo 声明文本相关积木，供 Python 模式工具箱展示。
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

    // 预览态返回普通字符串；Python 生成时会带引号输出。
    literal (args) {
        return Cast.toString(args.TEXT);
    }

    // 预览态执行 JS 字符串拼接。
    join (args) {
        return `${Cast.toString(args.A)}${Cast.toString(args.B)}`;
    }

    // 预览态返回字符串长度；Python 生成时会转成 len(...)。
    length (args) {
        return Cast.toString(args.VALUE).length;
    }

    // 预览态转换为字符串；Python 生成时会转成 str(...)。
    toString (args) {
        return Cast.toString(args.VALUE);
    }
}

module.exports = Scratch3PythonTextBlocks;
