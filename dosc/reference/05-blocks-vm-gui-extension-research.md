# Scratch Blocks / VM / GUI 研究与公司扩展方案

## 目标

这份文档回答第一阶段技术调研问题：

- `scratch-gui`、`scratch-vm`、`scratch-blocks` 分别负责什么。
- 积木 block 是如何定义、生成、绘制出来的。
- 积木事件响应如何进入 VM 执行。
- 如何添加公司自己的扩展 block。
- 如果要做一个“高级颜色选择 block”，支持文本输入、颜色预览、类似浏览器 DevTools 的颜色选择器，应该改哪一层。
- `scratch-blocks` 是否需要纳入公司工作区、加公司前缀、发布到公司内网仓库。

## 当前仓库现状

当前 monorepo 的 `packages/` 里有：

```text
scratch-gui
scratch-vm
scratch-render
scratch-storage
scratch-svg-renderer
scratch-paint
task-herder
scratch-media-lib-scripts
```

但没有 `scratch-blocks` 工作区包。

`scratch-blocks` 当前是 npm 依赖：

```text
packages/scratch-gui/package.json
  scratch-blocks: 2.1.19

packages/scratch-vm/package.json
  scratch-blocks: 2.1.19
```

源码现在来自：

```text
node_modules/scratch-blocks/src
```

结论：

```text
如果只新增普通业务扩展 block，主要改 scratch-vm 和 scratch-gui。
如果要改 block 字段 UI、颜色选择器、渲染器、拖拽吸附、Blockly 字段注册，需要维护 scratch-blocks。
```

## 三个关键包的职责

### scratch-gui

`scratch-gui` 是 React 前端。

它负责：

- 编辑器页面布局。
- 菜单栏、舞台、角色区、积木区容器。
- 扩展库 UI。
- Redux 状态。
- 调用 `ScratchBlocks.inject` 把积木编辑器挂到页面上。
- 监听 VM 的事件并更新 Blockly workspace。

关键文件：

```text
packages/scratch-gui/src/containers/blocks.jsx
packages/scratch-gui/src/components/blocks/blocks.jsx
packages/scratch-gui/src/lib/make-toolbox-xml.js
packages/scratch-gui/src/lib/libraries/extensions/index.jsx
packages/scratch-gui/src/containers/extension-library.jsx
```

最关键入口：

```text
packages/scratch-gui/src/containers/blocks.jsx
```

这里做了：

```text
1. 设置 ScratchBlocks 语言、主题、吸管回调。
2. 调用 ScratchBlocks.inject(...) 创建 Blockly workspace。
3. 注册变量、过程等动态分类。
4. 监听 workspace 变化。
5. 把 VM 的 workspaceUpdate 加载回 Blockly。
6. 收到扩展加载事件后，定义扩展 block 并刷新 toolbox。
```

### scratch-vm

`scratch-vm` 是运行时和扩展 block 定义层。

它负责：

- 项目加载/保存。
- Target、Sprite、Stage 状态。
- Block 执行。
- 扩展加载。
- 把扩展的 `getInfo()` 转成 scratch-blocks 能识别的 JSON/XML。
- 注册 block opcode 到执行函数。

关键文件：

```text
packages/scratch-vm/src/virtual-machine.js
packages/scratch-vm/src/engine/runtime.js
packages/scratch-vm/src/extension-support/extension-manager.js
packages/scratch-vm/src/extension-support/argument-type.js
packages/scratch-vm/src/extension-support/block-type.js
packages/scratch-vm/src/extensions
packages/scratch-vm/docs/extensions.md
```

新增普通扩展时，核心文件通常在：

```text
packages/scratch-vm/src/extensions/company_xxx/index.js
```

### scratch-blocks

`scratch-blocks` 是基于 Blockly 的积木编辑器层。

它负责：

- block 的 SVG 绘制。
- 字段控件，例如数字输入、下拉框、角度选择、颜色选择、矩阵、音符。
- toolbox / flyout 行为。
- 拖拽、吸附、插入预览。
- 连接规则。
- 右键菜单。
- Blockly workspace 事件。

当前源码位置：

```text
node_modules/scratch-blocks/src
```

关键文件：

```text
node_modules/scratch-blocks/src/index.ts
node_modules/scratch-blocks/src/blocks/colour.ts
node_modules/scratch-blocks/src/fields/field_colour_slider.ts
node_modules/scratch-blocks/src/scratch_dragger.ts
node_modules/scratch-blocks/src/scratch_connection_checker.ts
node_modules/scratch-blocks/src/scratch_insertion_marker_previewer.ts
node_modules/scratch-blocks/src/renderer
node_modules/scratch-blocks/src/css.ts
```

## Block 从定义到绘制的链路

普通扩展 block 的完整链路：

```text
扩展 getInfo()
  ↓
scratch-vm ExtensionManager 加载扩展
  ↓
runtime._registerExtensionPrimitives()
  ↓
runtime._convertBlockForScratchBlocks()
  ↓
生成 scratch-blocks JSON / XML
  ↓
scratch-gui blocks.jsx 收到 EXTENSION_ADDED
  ↓
ScratchBlocks.defineBlocksWithJsonArray(...)
  ↓
更新 toolboxXML
  ↓
ScratchBlocks / Blockly 根据 JSON 创建 block 工厂
  ↓
用户从 flyout 拖出 block
  ↓
Blockly 创建具体 block 实例并用 renderer 绘制 SVG
```

核心转换点：

```text
packages/scratch-vm/src/engine/runtime.js
  _registerExtensionPrimitives
  _fillExtensionCategory
  _convertBlockForScratchBlocks
  _convertPlaceholders
```

GUI 接收点：

```text
packages/scratch-gui/src/containers/blocks.jsx
  handleExtensionAdded
```

绘制层：

```text
node_modules/scratch-blocks/src/renderer
node_modules/scratch-blocks/src/fields
node_modules/scratch-blocks/src/blocks
```

## Block 事件响应链路

用户编辑积木时：

```text
用户拖动 / 修改字段 / 拼接积木
  ↓
Blockly workspace 触发 change event
  ↓
scratch-gui blocks.jsx 已把 vm.blockListener 注册到 workspace
  ↓
scratch-vm 更新内部 blocks 数据
  ↓
运行时执行时，根据 opcode 找到 primitive 函数
```

关键绑定：

```text
packages/scratch-gui/src/containers/blocks.jsx
  this.workspace.addChangeListener(this.props.vm.blockListener)
  this.flyoutWorkspace.addChangeListener(this.props.vm.flyoutBlockListener)
  this.props.vm.addListener('workspaceUpdate', this.onWorkspaceUpdate)
```

用户点击绿旗或执行 block 时：

```text
GUI 操作
  ↓
VM runtime / sequencer
  ↓
根据 block opcode 找 primitive
  ↓
调用扩展实例中的函数
```

扩展函数注册点：

```text
packages/scratch-vm/src/engine/runtime.js
  this._primitives[opcode] = convertedBlock.info.func
```

## 如何新增公司扩展 block

如果只是新增公司业务积木，优先走扩展机制，不要先改 `scratch-blocks`。

建议步骤：

```text
1. 在 scratch-vm/src/extensions 下新增公司扩展目录
2. 在 extension-manager.js 的 builtinExtensions 注册扩展 ID
3. 扩展类实现 getInfo()
4. getInfo() 中定义 blocks、menus、颜色、图标
5. 为每个 opcode 实现同名函数
6. 在 scratch-gui 的扩展库 index.jsx 增加展示项
7. 根据公司模式决定是否自动加载扩展
8. 运行 i18n 提取和测试
```

扩展定义核心结构：

```text
id
name
color1 / color2 / color3
blockIconURI
menuIconURI
blocks
menus
```

block 定义核心结构：

```text
opcode
blockType
text
arguments
```

参数类型来自：

```text
packages/scratch-vm/src/extension-support/argument-type.js
```

block 类型来自：

```text
packages/scratch-vm/src/extension-support/block-type.js
```

常见参数类型：

```text
ArgumentType.STRING
ArgumentType.NUMBER
ArgumentType.BOOLEAN
ArgumentType.COLOR
ArgumentType.ANGLE
ArgumentType.MATRIX
ArgumentType.NOTE
ArgumentType.IMAGE
```

如果使用 `ArgumentType.COLOR`，VM 会生成 `colour_picker` shadow。

对应映射在：

```text
packages/scratch-vm/src/engine/runtime.js

ArgumentType.COLOR -> shadow type: colour_picker, fieldName: COLOUR
```

## 现有颜色 block 的实现

当前颜色参数链路：

```text
扩展里声明 ArgumentType.COLOR
  ↓
scratch-vm 转成 shadow type="colour_picker"
  ↓
scratch-blocks/src/blocks/colour.ts 定义 colour_picker
  ↓
colour_picker 使用 field_colour_slider
  ↓
scratch-blocks/src/fields/field_colour_slider.ts 弹出 HSV 滑条
```

关键代码位置：

```text
packages/scratch-vm/src/engine/runtime.js
  ArgumentType.COLOR 映射

node_modules/scratch-blocks/src/blocks/colour.ts
  Blockly.Blocks.colour_picker

node_modules/scratch-blocks/src/fields/field_colour_slider.ts
  FieldColourSlider

packages/scratch-gui/src/reducers/color-picker.js
  GUI 侧吸管回调状态

packages/scratch-gui/src/containers/blocks.jsx
  FieldColourSlider.activateEyedropper_ = this.props.onActivateColorPicker
```

现有颜色选择器能力：

- 显示颜色 swatch。
- 打开后显示 Hue / Saturation / Brightness 三个滑条。
- 可以接 GUI 的吸管工具。
- 值一般是 `#RRGGBB`。

## 高级颜色选择 block 的需求拆解

目标效果：

- 支持文本输入颜色值。
- 支持实时显示颜色预览。
- 支持类似浏览器 DevTools 的颜色选择面板。
- 可输入 `#d4e2de`、`rgb(228 226 222)`、`hsl(40deg 10% 88.24%)` 等格式。
- 内部仍然输出 VM 能理解的颜色值。

这个需求有两层：

```text
1. block 语义
   例如“设置灯光颜色为 [COLOR]”

2. COLOR 字段 UI
   文本输入、颜色面板、格式转换、预览、校验
```

如果只是新增“设置灯光颜色为 [COLOR]”这种业务积木：

```text
改 scratch-vm 扩展即可
使用 ArgumentType.COLOR
```

如果要把 `[COLOR]` 的编辑体验做成 DevTools 风格：

```text
需要改 scratch-blocks 的 field_colour_slider
或新增一个公司自定义 field
```

## 三种实现方案

### 方案 A：沿用现有 ArgumentType.COLOR

做法：

```text
公司扩展 block 使用 ArgumentType.COLOR
不改 scratch-blocks
```

优点：

- 成本最低。
- 与现有项目兼容。
- 不需要维护公司版 scratch-blocks。

缺点：

- 只能使用现有 HSV 滑条 UI。
- 不支持 DevTools 式文本输入和多格式展示。

适合：

```text
第一阶段快速做公司扩展 block
```

### 方案 B：改造现有 FieldColourSlider

做法：

```text
在 scratch-blocks 中增强 field_colour_slider
保留原 type: field_colour_slider
给现有 colour_picker 加文本输入、预览、格式转换、二维色板
```

优点：

- 所有现有 ArgumentType.COLOR 自动获得新体验。
- 对扩展作者最简单。
- 不需要新增新的参数类型。

缺点：

- 影响所有颜色字段。
- 需要维护公司版 scratch-blocks。
- 要小心项目兼容、移动端、键盘操作、国际化。

适合：

```text
公司想统一升级所有颜色选择器体验
```

### 方案 C：新增公司自定义颜色 Field

做法：

```text
新增 field_company_color_picker
新增 company_colour_picker shadow block
公司扩展使用 customFieldTypes 或新增公司 ArgumentType
```

优点：

- 不影响 Scratch 原生颜色字段。
- 公司硬件/产品模式可以使用高级颜色字段。
- 逐步替换风险较低。

缺点：

- 需要打通 customFieldTypes 或扩展 ArgumentType 映射。
- 仍然大概率需要维护 scratch-blocks。
- 保存/加载项目时要保证字段类型存在。

适合：

```text
公司模式需要高级颜色选择器，但不想影响原生 Scratch 行为
```

推荐：

```text
第一阶段：方案 A
第二阶段：方案 C
如果产品确定所有颜色字段统一升级，再考虑方案 B
```

## customFieldTypes 机制

`scratch-vm` 已经有自定义字段类型机制。

相关位置：

```text
packages/scratch-vm/src/engine/runtime.js
  _buildCustomFieldInfo
  _buildCustomFieldTypeForScratchBlocks
  _convertPlaceholders

packages/scratch-gui/src/containers/blocks.jsx
  handleExtensionAdded
```

作用：

```text
扩展 getInfo() 可以声明 customFieldTypes
VM 将自定义字段转成 scratch-blocks shadow block
GUI 定义这些 custom field block
```

限制：

```text
字段 implementation 最终仍要被 Blockly fieldRegistry 识别
复杂字段 UI 通常还是要有 scratch-blocks 层的 Field 类
```

所以 customFieldTypes 可以帮助“某个扩展注册自己的字段”，但它不能完全替代 `scratch-blocks` 对字段 UI 的实现。

## 是否需要把 scratch-blocks 移到工作区

如果只做普通扩展：

```text
不需要
```

如果要做以下事情：

- 改颜色选择器 UI。
- 新增 Blockly Field 类。
- 改 block SVG 绘制。
- 改拖拽吸附。
- 改连接规则。
- 改 toolbox / flyout 交互。
- 改右键菜单底层行为。

则需要维护公司版 `scratch-blocks`。

推荐公司维护方式：

```text
1. fork scratch-blocks 或从当前 npm 版本对应源码建仓
2. 仓库名建议 company-scratch-blocks 或 @company/scratch-blocks
3. 保留上游版本标签，例如 upstream/2.1.19
4. 公司改动走独立分支，例如 company/main
5. 包名使用公司 scope，例如 @company/scratch-blocks
6. 发布到公司内网 npm 仓库
7. scratch-gui 和 scratch-vm 的依赖从 scratch-blocks 改成 @company/scratch-blocks
```

依赖替换方式：

```text
packages/scratch-gui/package.json
  scratch-blocks -> @company/scratch-blocks

packages/scratch-vm/package.json
  scratch-blocks -> @company/scratch-blocks
```

如果包名不改，只在内网仓库发布同名 `scratch-blocks`：

```text
优点：代码 import 不用改
缺点：容易和官方 npm 同名包混淆，供应链风险更高
```

更推荐：

```text
使用 @company/scratch-blocks，并在构建配置里确认 alias / dependency 解析正确
```

## 公司前缀建议

需要区分三类 ID：

### npm 包名

建议：

```text
@company/scratch-blocks
@company/scratch-gui
@company/scratch-vm
```

### 扩展 ID

建议使用短小稳定 ID：

```text
companyLight
companyBoard
companySensor
```

不要频繁修改扩展 ID。扩展 ID 会进入项目文件，改 ID 会影响历史项目加载。

### block opcode

建议：

```text
setLightColor
setMotorSpeed
readSensorValue
```

最终 VM 会拼成：

```text
companyLight_setLightColor
```

## 高级颜色选择器推荐落地路线

### 第 1 步：先用现有颜色参数做业务验证

目标：

```text
公司扩展能出现
公司颜色 block 能执行
项目能保存/加载
```

使用：

```text
ArgumentType.COLOR
```

暂不改 `scratch-blocks`。

### 第 2 步：设计公司颜色字段值规范

内部建议统一保存为：

```text
#RRGGBB
```

UI 可以展示：

```text
hex
rgb
hsl
```

但写入 VM 的值保持稳定，减少执行层复杂度。

### 第 3 步：新增公司颜色 Field 原型

如果决定走方案 C：

```text
field_company_color_picker
company_colour_picker
```

能力：

- swatch 预览。
- 文本输入。
- 格式解析。
- DevTools 式色板。
- Hue slider。
- Alpha 是否支持要单独决策。

注意：

```text
Scratch 原生颜色值通常不含 alpha。
如果支持透明度，需要明确 VM 执行层如何处理。
```

### 第 4 步：把 scratch-blocks 纳入公司包链路

做法：

```text
fork / 建公司仓库
改包名或配置内网同名源
构建发布 @company/scratch-blocks
scratch-gui / scratch-vm 切依赖
CI 验证
```

### 第 5 步：接入公司扩展

公司扩展使用新的字段类型。

如果只在公司扩展里使用，优先不影响原生 `ArgumentType.COLOR`。

## 包发布与内网仓库建议

建议使用内网 npm registry 管理公司改造包：

```text
@company/scratch-blocks
@company/scratch-vm
@company/scratch-gui
@company/scratch-desktop
```

版本策略：

```text
官方基线版本 + 公司版本后缀
```

示例：

```text
2.1.19-company.1
2.1.19-company.2
```

好处：

- 能看出基于哪个官方版本。
- 能和官方升级做 diff。
- 公司桌面端可以锁定确定版本。

## 需要重点测试的内容

普通扩展测试：

- 扩展能从扩展库加载。
- toolbox 分类出现。
- block 能拖到 workspace。
- block 修改字段后 VM 状态正确。
- 项目保存后重新打开 block 仍存在。
- opcode 执行函数被调用。

颜色字段测试：

- 默认值显示正确。
- 输入 `#d4e2de` 能解析。
- 输入 `rgb(228 226 222)` 能转换。
- 输入 `hsl(40deg 10% 88.24%)` 能转换。
- 非法输入有提示，不写入错误值。
- 拖动色板实时更新 swatch。
- 撤销/重做正常。
- 保存/加载后值不丢。
- 复制/粘贴 block 后值不丢。
- 移动端或小屏幕弹层不溢出。

## 风险点

### 修改 scratch-blocks 的维护成本

`scratch-blocks` 是底层包，改动后要长期维护。

风险：

- 上游升级时冲突。
- Blockly API 变化。
- 字段 UI 影响保存/加载。
- 多语言和无障碍问题。

规避：

- 公司改动集中在新增 Field 类，少改核心渲染器。
- 保留上游 tag。
- 每次升级先做 rebase / merge 测试。

### 自定义颜色格式风险

如果 VM 接收多种颜色格式，执行层会复杂。

建议：

```text
UI 层支持多格式输入
存储和执行层统一 #RRGGBB
```

### 扩展 ID 兼容风险

扩展 ID 和 opcode 会进入项目文件。

建议：

```text
一旦发布，不轻易改 extensionId 和 opcode
需要废弃时保留兼容别名或迁移逻辑
```

## 结论

如果领导要求“先知道 block 怎么绘制、事件怎么响应、怎么加扩展 block”，第一阶段重点应该放在：

```text
scratch-gui/src/containers/blocks.jsx
scratch-vm/src/engine/runtime.js
scratch-vm/src/extension-support/extension-manager.js
scratch-vm/docs/extensions.md
node_modules/scratch-blocks/src/index.ts
node_modules/scratch-blocks/src/fields/field_colour_slider.ts
node_modules/scratch-blocks/src/blocks/colour.ts
```

如果只是新增公司业务积木：

```text
先改 scratch-vm 扩展 + scratch-gui 扩展库
```

如果要做高级颜色选择器：

```text
需要维护公司版 scratch-blocks
推荐新增公司自定义颜色 Field，而不是第一步就替换全部原生颜色字段
```

如果要公司长期产品化：

```text
把 scratch-blocks 纳入公司源码仓库
发布 @company/scratch-blocks 到内网 npm
scratch-gui / scratch-vm 依赖公司版包
```
