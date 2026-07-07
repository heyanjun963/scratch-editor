const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');

// Python 控制类积木：提供工具箱定义和编辑器内基础预览，真正代码输出由 codegen/python.js 完成。
class Scratch3PythonControlBlocks {
    // getInfo 声明积木形状、颜色、参数和分支数量，供 scratch-blocks 渲染工具箱。
    getInfo () {
        return {
            id: 'pythonControl',
            name: formatMessage({
                id: 'pythonControl.categoryName',
                default: '控制',
                description: 'Name of the Python control category'
            }),
            color1: '#FFAB19',
            color2: '#EC9C13',
            color3: '#CF8B17',
            blocks: [
                {
                    opcode: 'main',
                    blockType: BlockType.HAT,
                    text: formatMessage({
                        id: 'pythonControl.main',
                        default: 'Python main',
                        description: 'Python main entry block'
                    })
                },
                {
                    opcode: 'repeat',
                    blockType: BlockType.LOOP,
                    text: formatMessage({
                        id: 'pythonControl.repeat',
                        default: 'repeat [TIMES]',
                        description: 'Python repeat block'
                    }),
                    branchCount: 1,
                    arguments: {
                        TIMES: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 5
                        }
                    }
                },
                {
                    opcode: 'forever',
                    blockType: BlockType.LOOP,
                    text: formatMessage({
                        id: 'pythonControl.forever',
                        default: 'forever',
                        description: 'Python forever block'
                    }),
                    branchCount: 1
                },
                {
                    opcode: 'while',
                    blockType: BlockType.LOOP,
                    text: formatMessage({
                        id: 'pythonControl.while',
                        default: 'while [CONDITION]',
                        description: 'Python while block'
                    }),
                    branchCount: 1,
                    arguments: {
                        CONDITION: {
                            type: ArgumentType.BOOLEAN,
                            defaultValue: true
                        }
                    }
                },
                {
                    opcode: 'ifThen',
                    blockType: BlockType.CONDITIONAL,
                    text: formatMessage({
                        id: 'pythonControl.ifThen',
                        default: 'if [CONDITION]',
                        description: 'Python if block'
                    }),
                    branchCount: 1,
                    arguments: {
                        CONDITION: {
                            type: ArgumentType.BOOLEAN,
                            defaultValue: true
                        }
                    }
                },
                {
                    opcode: 'ifElse',
                    blockType: BlockType.CONDITIONAL,
                    text: formatMessage({
                        id: 'pythonControl.ifElse',
                        default: 'if [CONDITION] else',
                        description: 'Python if else block'
                    }),
                    branchCount: 2,
                    arguments: {
                        CONDITION: {
                            type: ArgumentType.BOOLEAN,
                            defaultValue: true
                        }
                    }
                },
                {
                    opcode: 'break',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pythonControl.break',
                        default: 'break',
                        description: 'Python break block'
                    })
                },
                {
                    opcode: 'continue',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pythonControl.continue',
                        default: 'continue',
                        description: 'Python continue block'
                    })
                }
            ]
        };
    }

    // main 是 Python 模式入口帽子，运行时返回 true 让帽子块可触发。
    main () {
        return true;
    }

    // repeat 在 VM 内按 Scratch 循环协议启动第 1 个分支。
    repeat (args, util) {
        const times = Math.max(0, Math.floor(Cast.toNumber(args.TIMES)));
        if (typeof util.stackFrame.index === 'undefined') {
            util.stackFrame.index = 0;
        }
        if (util.stackFrame.index < times) {
            util.stackFrame.index++;
            util.startBranch(1, true);
        }
    }

    // forever 只负责预览态循环，生成 Python 时会转成 while True。
    forever (args, util) {
        util.startBranch(1, true);
    }

    // while 根据布尔条件决定是否执行分支。
    while (args, util) {
        if (Cast.toBoolean(args.CONDITION)) {
            util.startBranch(1, true);
        }
    }

    // ifThen 在编辑器内按条件启动 C 口分支。
    ifThen (args, util) {
        if (Cast.toBoolean(args.CONDITION)) {
            util.startBranch(1, false);
        }
    }

    // ifElse 根据条件选择第 1 或第 2 个分支。
    ifElse (args, util) {
        util.startBranch(Cast.toBoolean(args.CONDITION) ? 1 : 2, false);
    }

    // break/continue 的真实语义在 Python codegen 中体现，VM 内保持空实现。
    break () {}

    continue () {}
}

module.exports = Scratch3PythonControlBlocks;
