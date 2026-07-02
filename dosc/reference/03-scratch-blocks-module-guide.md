# scratch-blocks 模块导读

这份文档是给第一次读 `scratch-blocks` 的人看的。
它的目标不是把每个文件都讲完，而是先让你知道：

- 这个包负责什么
- 入口从哪里进
- 哪些模块决定“积木长什么样”
- 哪些模块决定“积木怎么拖、怎么连、怎么点”
- 以后你要改颜色选择器、输入框、扩展字段时该去哪里

## 先记住一句话

`scratch-blocks` 不是业务层，它是 Scratch 编辑器里的“积木渲染和交互层”。

你可以把它理解成：

- `scratch-gui` 负责把编辑器页面搭出来
- `scratch-vm` 负责项目数据和积木语义
- `scratch-blocks` 负责把这些积木真正画出来，并处理拖拽、吸附、字段编辑、工具箱显示

也就是说：

- GUI 决定“放在哪”
- VM 决定“是什么”
- scratch-blocks 决定“长什么样、怎么动”

## 从哪里进

主入口是：

- [packages/scratch-blocks/src/index.ts](../packages/scratch-blocks/src/index.ts)

这个文件很关键，因为它做了两件大事：

1. 引入所有块类型、字段、渲染器、事件、工具栏相关模块
2. 导出 `inject(container, options)`，让 GUI 把 Blockly 工作区挂到一个 DOM 容器上

你之前看到的 `ScratchBlocks.inject(this.blocks, workspaceConfig)`，最终就是走到这里。

## 目录总览

`src/` 下面可以先分成 8 类来看：

### 1. `src/blocks/`

这里是“积木类型定义”。

它们不是业务逻辑，而是 Blockly 能识别的 block 原型。
常见内容包括：

- 颜色块
- 控制块
- 运算块
- 事件块
- 变量块
- 自定义形状块

代表文件：

- [packages/scratch-blocks/src/blocks/colour.ts](../packages/scratch-blocks/src/blocks/colour.ts)
- `control.ts`
- `data.ts`
- `event.ts`
- `looks.ts`
- `motion.ts`
- `operators.ts`
- `procedures.ts`

你可以把这里理解成“块的模板注册处”。

### 2. `src/fields/`

这里是“字段控件”。

Scratch 的积木上不只是文字，还会有：

- 颜色选择器
- 数字输入框
- 下拉框
- 音符
- 变量选择器
- 可拖拽文本输入

代表文件：

- [packages/scratch-blocks/src/fields/field_colour_slider.ts](../packages/scratch-blocks/src/fields/field_colour_slider.ts)
- `scratch_field_dropdown.ts`
- `scratch_field_number.ts`
- `scratch_field_variable.ts`
- `field_textinput_removable.ts`

如果你想做“颜色选择 block”那种 UI，通常会先看这里。

### 3. `src/renderer/`

这里是“怎么画积木”。

Scratch 的块不是普通矩形，它有自己的形状、圆角、插口、阴影、帽子形状等。

代表文件：

- [packages/scratch-blocks/src/renderer/renderer.ts](../packages/scratch-blocks/src/renderer/renderer.ts)
- `drawer.ts`
- `path_object.ts`
- `render_info.ts`

这层决定：

- block 的轮廓怎么生成
- 哪些连接点画成什么样
- 不同形状的块怎么组合成 SVG

### 4. `src/scratch_continuous_toolbox.ts`

这里是 Scratch 的连续工具箱。

普通 Blockly 工具箱是分组展开的，Scratch 这里用了连续滚动的样式。

代表文件：

- [packages/scratch-blocks/src/scratch_continuous_toolbox.ts](../packages/scratch-blocks/src/scratch_continuous_toolbox.ts)
- `scratch_continuous_category.ts`
- `checkable_continuous_flyout.ts`

这层决定：

- 左边分类栏怎么滚
- flyout 里怎么显示块
- 选中分类后如何刷新内容

### 5. `src/scratch_dragger.ts`

这里是拖拽逻辑。

你看到的：

- 从 flyout 拖到画布
- 画布里拖动 block
- 拖动时的吸附、碰撞、预览

都和这层有关。

### 6. `src/scratch_connection_checker.ts`

这里是连接规则。

它决定：

- 哪种块能接哪种块
- 输入口、输出口、堆叠口是否兼容
- 拖到一起时是否高亮

如果你看到“为什么这个块能拼、那个不能拼”，先看这里。

### 7. `src/scratch_insertion_marker_previewer.ts`

这里是插入预览。

当你拖着块接近某个位置时，那个插入标记和预览效果就和它有关。

### 8. `src/xml.ts` 和 `src/blocks/*.ts`

这两类偏“结构转换和 block 定义辅助”。

- `xml.ts`：XML 读写
- `blocks/*.ts`：具体块定义

## `index.ts` 做了什么

入口文件里最重要的是 `inject()`。

大致流程是：

1. 注册 Scratch 自己的字段
2. 注册连续工具箱
3. 注册自定义渲染器
4. 注册一些上下文菜单、拖拽、积木粘贴逻辑
5. 调用 `Blockly.inject(container, options)`
6. 再把 Scratch 的视觉和交互补丁套上去

你可以把它理解成：

```text
Blockly 原生能力
  + Scratch 自定义块定义
  + Scratch 自定义字段
  + Scratch 自定义渲染器
  + Scratch 自定义工具箱
  = scratch-blocks
```

## 一个 block 是怎么被画出来的

先看这个链路：

```text
VM 里的 block 元信息
  -> scratch-gui 生成 toolbox XML / block JSON
  -> scratch-blocks.defineBlocksWithJsonArray(...)
  -> 用户拖出块
  -> renderer 生成 SVG
  -> field 负责输入框、下拉框、颜色面板等
```

更具体一点：

### 1. VM 先给出块描述

VM 的扩展会提供 `getInfo()`，里面有：

- `id`
- `name`
- `blocks`
- `menus`
- `color1/2/3`

### 2. GUI 把它转成 ScratchBlocks 能用的定义

GUI 在收到 VM 的 `EXTENSION_ADDED` 后，会把扩展块转换成 scratch-blocks 认识的 JSON/XML。

关键位置在：

- [packages/scratch-gui/src/containers/blocks.jsx](../packages/scratch-gui/src/containers/blocks.jsx)

### 3. scratch-blocks 注册 block 构造器

GUI 调用：

```js
ScratchBlocks.defineBlocksWithJsonArray(...)
```

这样 scratch-blocks 知道这个 block 的结构。

### 4. 用户拖出块时，Blockly 创建实例

这时才真正生成一个 block 实例，并交给 renderer 画成 SVG。

### 5. renderer + fields 负责外观和交互

- renderer 负责轮廓、连接口、帽子、缩进
- fields 负责输入控件

## 一个 block 的事件是怎么传的

大致链路是：

```text
用户拖动 / 输入 / 点击
  -> Blockly workspace 触发 change 事件
  -> GUI 把 workspace 事件转给 VM
  -> VM 更新内部状态
  -> 运行时按 opcode 找到 primitive
```

关键桥接点在：

- [packages/scratch-gui/src/containers/blocks.jsx](../packages/scratch-gui/src/containers/blocks.jsx)
- [packages/scratch-vm/src/engine/runtime.js](../packages/scratch-vm/src/engine/runtime.js)

## 以后你要改什么，先看哪里

### 只想加一个普通扩展 block

先看：

- `packages/scratch-vm/src/extensions/`
- `packages/scratch-vm/src/extension-support/extension-manager.js`
- `packages/scratch-gui/src/lib/libraries/extensions/index.jsx`

通常不需要先改 `scratch-blocks`。

### 想改“积木长相”

先看：

- `src/renderer/`
- `src/fields/`
- `src/blocks/`

### 想改拖拽、吸附、碰撞

先看：

- `src/scratch_dragger.ts`
- `src/scratch_connection_checker.ts`
- `src/scratch_insertion_marker_previewer.ts`

### 想改工具箱分类、滚动、侧边栏行为

先看：

- `src/scratch_continuous_toolbox.ts`
- `src/scratch_continuous_category.ts`

## 你现在最该看的 6 个文件

如果你是刚入门，我建议先按这个顺序读：

1. [packages/scratch-blocks/src/index.ts](../packages/scratch-blocks/src/index.ts)
2. [packages/scratch-blocks/src/blocks/colour.ts](../packages/scratch-blocks/src/blocks/colour.ts)
3. [packages/scratch-blocks/src/fields/field_colour_slider.ts](../packages/scratch-blocks/src/fields/field_colour_slider.ts)
4. [packages/scratch-blocks/src/renderer/renderer.ts](../packages/scratch-blocks/src/renderer/renderer.ts)
5. [packages/scratch-blocks/src/scratch_continuous_toolbox.ts](../packages/scratch-blocks/src/scratch_continuous_toolbox.ts)
6. [packages/scratch-gui/src/containers/blocks.jsx](../packages/scratch-gui/src/containers/blocks.jsx)

这 6 个文件能把“一个块从定义到显示再到交互”的主线串起来。

## 最后给你的直觉版结论

如果你以后要做一个新的颜色选择 block：

- 只是做“业务扩展块”，优先走 VM extension
- 需要新字段 UI，去 `fields/`
- 需要新 block 造型，去 `blocks/` 和 `renderer/`
- 需要工具箱里出现新的分类，先看 GUI 和 VM 的扩展链路

这就是 `scratch-blocks` 的大致地图。
