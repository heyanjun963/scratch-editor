const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');

// Python 列表类积木：VM 内维护轻量列表预览，最终 list 语法由 codegen 生成。
class Scratch3PythonListBlocks {
    constructor () {
        this._lists = Object.create(null);
    }

    // getInfo 声明列表字面量、追加、取项和长度积木。
    getInfo () {
        return {
            id: 'pythonList',
            name: formatMessage({
                id: 'pythonList.categoryName',
                default: '列表',
                description: 'Name of the Python list category'
            }),
            color1: '#4C97FF',
            color2: '#3373CC',
            color3: '#2E5EAA',
            blocks: [
                {
                    opcode: 'makeList',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'pythonList.makeList',
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
                    opcode: 'append',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pythonList.append',
                        default: 'append [VALUE] to list [NAME]',
                        description: 'Python list append block'
                    }),
                    arguments: {
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: 'apple'
                        },
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: 'items'
                        }
                    }
                },
                {
                    opcode: 'getItem',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'pythonList.getItem',
                        default: 'item [INDEX] of list [NAME]',
                        description: 'Python list item block'
                    }),
                    arguments: {
                        INDEX: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: 'items'
                        }
                    }
                },
                {
                    opcode: 'length',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'pythonList.length',
                        default: 'length of list [NAME]',
                        description: 'Python list length block'
                    }),
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: 'items'
                        }
                    }
                }
            ]
        };
    }

    // 预览态直接返回 JS 数组，便于 reporter 嵌套。
    makeList (args) {
        return [args.A, args.B, args.C];
    }

    // 编辑器预览态按列表名保存数组。
    append (args) {
        const name = Cast.toString(args.NAME);
        if (!Array.isArray(this._lists[name])) {
            this._lists[name] = [];
        }
        this._lists[name].push(args.VALUE);
    }

    // 预览态读取指定列表项；Python 生成时会使用下标表达式。
    getItem (args) {
        const list = this._lists[Cast.toString(args.NAME)] || [];
        return list[Math.floor(Cast.toNumber(args.INDEX))] || '';
    }

    // 预览态返回 JS 数组长度；Python 生成时会转成 len(...)。
    length (args) {
        const list = this._lists[Cast.toString(args.NAME)] || [];
        return list.length;
    }
}

module.exports = Scratch3PythonListBlocks;
