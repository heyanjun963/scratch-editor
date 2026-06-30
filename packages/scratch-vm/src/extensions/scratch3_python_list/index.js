const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');

class Scratch3PythonListBlocks {
    constructor () {
        this._lists = Object.create(null);
    }

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

    makeList (args) {
        return [args.A, args.B, args.C];
    }

    append (args) {
        const name = Cast.toString(args.NAME);
        if (!Array.isArray(this._lists[name])) {
            this._lists[name] = [];
        }
        this._lists[name].push(args.VALUE);
    }

    getItem (args) {
        const list = this._lists[Cast.toString(args.NAME)] || [];
        return list[Math.floor(Cast.toNumber(args.INDEX))] || '';
    }

    length (args) {
        const list = this._lists[Cast.toString(args.NAME)] || [];
        return list.length;
    }
}

module.exports = Scratch3PythonListBlocks;
