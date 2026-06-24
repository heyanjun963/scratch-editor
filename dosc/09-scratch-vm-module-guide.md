# scratch-vm 模块导读

这份文档帮你读懂 `scratch-vm`。

如果说 `scratch-gui` 是编辑器界面，`scratch-blocks` 是积木编辑器，那么 `scratch-vm` 就是 Scratch 项目的运行内核。

它负责：

- 保存项目里的角色、舞台、变量、积木、造型、声音
- 接收 Blockly / scratch-blocks 发来的积木编辑事件
- 把积木转换成 VM 自己能执行的数据结构
- 运行绿旗、点击积木、广播、克隆等脚本
- 加载和注册扩展 block
- 和 renderer、storage、audio、io 设备连接

## 先记住一句话

`scratch-vm` 管的是“项目真实状态”和“积木运行逻辑”。

你在 GUI 里看到的东西，很多只是 VM 状态的展示：

- 当前角色是谁
- 角色有哪些积木
- 角色坐标是多少
- 有哪些变量和列表
- 哪些线程正在运行
- 哪些扩展已经加载

## 入口文件

主入口是：

- [packages/scratch-vm/src/index.js](../packages/scratch-vm/src/index.js)

它很短，只做三件事：

```js
const VirtualMachine = require('./virtual-machine');

module.exports = VirtualMachine;
module.exports.ArgumentType = ArgumentType;
module.exports.BlockType = BlockType;
```

所以 GUI 里：

```js
import VM from '@scratch/scratch-vm';
```

拿到的就是：

- [packages/scratch-vm/src/virtual-machine.js](../packages/scratch-vm/src/virtual-machine.js)

## VM 的整体分层

可以先按这几层理解：

```text
VirtualMachine
  对 GUI 暴露 API，是最外层门面

Runtime
  管项目运行状态、线程、targets、IO、扩展、renderer/storage/audio

Target / RenderedTarget / Sprite
  管角色、舞台、克隆、造型、声音、变量、积木

Blocks
  管 VM 内部的 block 数据结构，接收 Blockly 事件

Sequencer + execute
  负责真正执行积木线程

ExtensionManager
  负责加载扩展，把 getInfo() 注册进 Runtime

serialization
  负责 SB3 / SB2 项目加载和保存
```

## 目录怎么读

### `src/virtual-machine.js`

这是 GUI 最常接触的 VM 门面。

它负责：

- 创建 `Runtime`
- 创建 `ExtensionManager`
- 把 runtime 事件转发给 GUI
- 提供 `greenFlag()`、`stopAll()`、`loadProject()`、`saveProjectSb3()` 等 API
- 接收 scratch-blocks 的编辑事件
- 切换当前编辑角色
- 把当前角色的 blocks 发回 GUI

最值得先看的方法：

- `constructor`
- `start`
- `greenFlag`
- `stopAll`
- `loadProject`
- `deserializeProject`
- `blockListener`
- `flyoutBlockListener`
- `setEditingTarget`
- `refreshWorkspace`
- `emitWorkspaceUpdate`

### `src/engine/runtime.js`

这是 VM 的核心。

它负责：

- 保存所有 targets
- 保存所有运行线程
- 管理帽子积木启动逻辑
- 管理扩展 primitive
- 连接 renderer、storage、audio
- 每一帧调用 sequencer 跑线程
- 触发项目状态变化事件

可以把它理解成“项目运行时总管”。

最关键的字段：

- `targets`：所有角色和舞台
- `executableTargets`：按执行顺序排列的 target
- `threads`：当前正在运行的线程
- `sequencer`：线程调度器
- `flyoutBlocks`：工具箱里的临时 blocks
- `monitorBlocks`：监视器 blocks
- `_primitives`：opcode 到执行函数的映射
- `_blockInfo`：所有分类和扩展 block 信息
- `_hats`：帽子积木元信息

最值得看的方法：

- `start`
- `_step`
- `greenFlag`
- `startHats`
- `_registerExtensionPrimitives`
- `_convertBlockForScratchBlocks`
- `attachRenderer`
- `attachStorage`
- `setEditingTarget`

### `src/engine/blocks.js`

这是 VM 里的积木容器。

它不是 scratch-blocks 的 UI block，而是 VM 自己保存的一份 block 数据结构。

它负责：

- 保存所有 block
- 保存顶层脚本
- 接收 Blockly event
- 处理 create / change / move / delete
- 维护变量、列表、监视器引用
- 给执行器提供 block 查询能力

最重要的方法：

- `blocklyListen`
- `createBlock`
- `changeBlock`
- `moveBlock`
- `deleteBlock`
- `getBlock`
- `getNextBlock`
- `getBranch`
- `getOpcode`
- `getInputs`

当你拖动、拼接、删除一个 block 时，GUI 里的 scratch-blocks 会发事件，最后就是这里更新 VM 的 block 数据。

### `src/engine/sequencer.js`

这是线程调度器。

它负责：

- 每帧遍历所有线程
- 按规则执行每个线程的一小步
- 处理 yield、等待、warp mode
- 清理执行完成的线程

最重要的方法：

- `stepThreads`
- `stepThread`

Scratch 不是一次把所有积木全跑完，而是很多线程按帧推进。
`Sequencer` 就是在管这个“每帧往前走一点”的过程。

### `src/engine/execute.js`

这是单个 block 的执行器。

它负责：

- 找到当前线程栈顶 block
- 根据 opcode 找到 primitive 函数
- 准备参数
- 调用 block 的实现函数
- 处理 reporter 返回值
- 处理 Promise
- 处理监视器和可视化报告

核心入口是：

```js
execute(sequencer, thread)
```

你可以把它理解成：

```text
当前 block id
  -> 找 block 数据
  -> 找 opcode
  -> 找 primitive 函数
  -> 组装 args
  -> 调用函数
  -> 把结果交回 thread
```

### `src/engine/thread.js`

这里定义一个正在运行的脚本线程。

线程里有：

- 当前执行栈
- stack frame
- 状态
- 是否等待 Promise
- 是否 warp mode
- 当前 target
- 当前 block container

当你点绿旗后，一个帽子积木会生成一个或多个 thread。

### `src/engine/target.js`

这是可运行对象的基类。

Target 负责：

- blocks
- variables
- comments
- 自定义状态
- edge-activated hat 状态

Stage 和 Sprite 的可运行实例都基于它。

### `src/sprites/sprite.js`

`Sprite` 是“角色定义”。

它保存：

- 角色名
- 共享 blocks
- 造型列表
- 声音列表
- 克隆列表
- sound bank

注意一个点：同一个 sprite 的克隆共享同一套 blocks。

### `src/sprites/rendered-target.js`

`RenderedTarget` 是真正放到舞台上的可渲染对象。

它保存：

- x / y 坐标
- direction
- size
- visible
- effects
- currentCostume
- drawableID
- renderer 引用

一个 Sprite 可以有多个 RenderedTarget：

- 原始角色
- 克隆体

### `src/extension-support/extension-manager.js`

这是扩展加载器。

它负责：

- 加载内置扩展
- 加载外部扩展 worker
- 调用扩展的 `getInfo()`
- 把扩展注册成服务
- 通知 Runtime 注册扩展 primitive

内置扩展表在这里：

```js
const builtinExtensions = {
    pen: () => require('../extensions/scratch3_pen'),
    music: () => require('../extensions/scratch3_music'),
    ...
};
```

如果你要加公司自己的内置扩展，通常会经过这里。

### `src/blocks/`

这里是核心 Scratch 积木的执行逻辑。

例如：

- `scratch3_motion.js`
- `scratch3_looks.js`
- `scratch3_control.js`
- `scratch3_event.js`
- `scratch3_operators.js`
- `scratch3_sensing.js`
- `scratch3_sound.js`
- `scratch3_data.js`
- `scratch3_procedures.js`

注意：这里不是画积木，是执行积木。

比如 `motion_movesteps` 的 UI 形状不在这里。
这里负责“这个积木运行时到底做什么”。

### `src/extensions/`

这里是非核心扩展。

例如：

- pen
- music
- microbit
- translate
- video sensing
- text to speech
- boost
- ev3

一个扩展通常会有：

- `getInfo()`
- block 定义
- block 实现函数
- 设备连接或资源加载逻辑

### `src/io/`

这里是输入输出设备。

例如：

- keyboard
- mouse
- mouseWheel
- video
- cloud
- clock
- ble / bt

它们给积木执行提供外部输入。

### `src/serialization/`

这里负责项目文件加载和保存。

关键文件：

- `sb3.js`
- `sb2.js`
- `serialize-assets.js`
- `deserialize-assets.js`

`loadProject()`、`saveProjectSb3()` 最后都会走到这一层。

## GUI 和 VM 是怎么连接的

GUI 会创建 VM，然后把 renderer、audio、storage 等模块挂进去。

大致是：

```text
scratch-gui
  -> new VM()
  -> vm.attachRenderer(renderer)
  -> vm.attachAudioEngine(audioEngine)
  -> vm.attachStorage(storage)
  -> vm.start()
```

GUI 里编辑积木时：

```text
scratch-blocks workspace event
  -> vm.blockListener(event)
  -> editingTarget.blocks.blocklyListen(event)
  -> Blocks.create/change/move/delete
  -> VM 内部 block 数据更新
```

VM 要刷新 GUI 时：

```text
VM emitWorkspaceUpdate()
  -> emit workspaceUpdate
  -> scratch-gui/containers/blocks.jsx 接收
  -> 重新加载 Blockly workspace XML
```

## 绿旗运行链路

用户点击绿旗后，大致是：

```text
GUI 控制按钮
  -> vm.greenFlag()
  -> runtime.greenFlag()
  -> runtime.stopAll()
  -> runtime.startHats('event_whenflagclicked')
  -> 为每个匹配的帽子积木创建 Thread
  -> Runtime 每一帧 _step()
  -> Sequencer.stepThreads()
  -> execute()
  -> 调用 opcode 对应 primitive
```

这个链路非常重要。

你以后排查“为什么积木没执行”，通常就按这条线看。

## 一个扩展 block 是怎么注册和执行的

### 注册阶段

```text
ExtensionManager.loadExtensionURL('music')
  -> 找到内置扩展 scratch3_music
  -> new extension(runtime)
  -> extension.getInfo()
  -> runtime._registerExtensionPrimitives(info)
  -> 生成 categoryInfo
  -> 生成 scratch-blocks JSON/XML
  -> 注册 opcode 到 primitive 函数
  -> emit EXTENSION_ADDED
```

GUI 收到 `EXTENSION_ADDED` 后：

```text
blocks.jsx handleExtensionAdded(categoryInfo)
  -> ScratchBlocks.defineBlocksWithJsonArray(...)
  -> 更新 toolbox
  -> 左侧出现新分类
```

### 执行阶段

```text
用户运行扩展 block
  -> execute.js 找 opcode
  -> runtime._primitives[opcode]
  -> 调用扩展实例里的同名函数
```

例如扩展里有：

```js
blocks: [
    {
        opcode: 'playDrum',
        blockType: BlockType.COMMAND,
        text: 'play drum [DRUM] for [BEATS] beats'
    }
]
```

那么扩展类里通常会有：

```js
playDrum (args, util) {
    // 真正执行逻辑
}
```

## 项目加载链路

加载 SB3 大致是：

```text
vm.loadProject(input)
  -> 校验项目格式
  -> deserializeProject(projectJSON, zip)
  -> serialization/sb3.js
  -> 创建 Sprite / RenderedTarget / Blocks / Variable
  -> 加载 costume / sound
  -> runtime.addTarget(...)
  -> emitTargetsUpdate()
  -> emitWorkspaceUpdate()
```

所以项目打开后，GUI 看到的角色列表和积木区，都是 VM 反向发出来的。

## 项目保存链路

保存 SB3 大致是：

```text
vm.saveProjectSb3()
  -> serializeSounds(runtime)
  -> serializeCostumes(runtime)
  -> vm.toJSON()
  -> project.json
  -> JSZip 打包素材
```

如果以后公司要改保存逻辑，先判断是：

- 只是 GUI 调保存接口
- 改项目 JSON 内容
- 改素材存储
- 改公司云端 storage

这几种落点不一样。

## 你最该先读的 10 个文件

建议顺序：

1. [packages/scratch-vm/src/index.js](../packages/scratch-vm/src/index.js)
2. [packages/scratch-vm/src/virtual-machine.js](../packages/scratch-vm/src/virtual-machine.js)
3. [packages/scratch-vm/src/engine/runtime.js](../packages/scratch-vm/src/engine/runtime.js)
4. [packages/scratch-vm/src/engine/blocks.js](../packages/scratch-vm/src/engine/blocks.js)
5. [packages/scratch-vm/src/engine/sequencer.js](../packages/scratch-vm/src/engine/sequencer.js)
6. [packages/scratch-vm/src/engine/execute.js](../packages/scratch-vm/src/engine/execute.js)
7. [packages/scratch-vm/src/engine/target.js](../packages/scratch-vm/src/engine/target.js)
8. [packages/scratch-vm/src/sprites/sprite.js](../packages/scratch-vm/src/sprites/sprite.js)
9. [packages/scratch-vm/src/sprites/rendered-target.js](../packages/scratch-vm/src/sprites/rendered-target.js)
10. [packages/scratch-vm/src/extension-support/extension-manager.js](../packages/scratch-vm/src/extension-support/extension-manager.js)

## 修改任务怎么判断落点

### 想加一个公司扩展

优先看：

- `src/extensions/`
- `src/extension-support/extension-manager.js`
- `src/extension-support/block-type.js`
- `src/extension-support/argument-type.js`

### 想改一个已有积木运行逻辑

优先看：

- `src/blocks/scratch3_*.js`

例如运动类积木看：

- `src/blocks/scratch3_motion.js`

### 想改项目加载保存

优先看：

- `src/virtual-machine.js`
- `src/serialization/sb3.js`
- `src/serialization/serialize-assets.js`
- `src/serialization/deserialize-assets.js`

### 想改角色、克隆、造型、舞台状态

优先看：

- `src/sprites/sprite.js`
- `src/sprites/rendered-target.js`
- `src/engine/target.js`

### 想改运行时调度

优先看：

- `src/engine/runtime.js`
- `src/engine/sequencer.js`
- `src/engine/execute.js`
- `src/engine/thread.js`

这块风险比较高，不建议一开始就动。

## 最后给你的直觉版结论

读 VM 时不要一上来陷进所有文件。

先记住这条主线：

```text
GUI 发事件
  -> VirtualMachine 接住
  -> Runtime 改状态
  -> Blocks 存积木
  -> Sequencer 跑线程
  -> execute 调 primitive
  -> Target / Renderer / IO 改实际效果
  -> VM emit 事件通知 GUI 刷新
```

能把这条线串起来，后面看扩展、保存、运行、角色状态都会轻松很多。
