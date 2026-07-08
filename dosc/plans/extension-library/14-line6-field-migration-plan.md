# 六路巡线传感器状态选择器迁移方案

## 目标

把 AI 机甲麦轮车里的 `linefollower6_status` 积木从临时下拉菜单改成旧版类似的六路状态选择器。

用户期望的交互是：

- 积木上仍是一个可编辑输入位。
- 点击输入位后弹出一个小面板。
- 面板显示 `1 2 3 4 5 6` 六路通道。
- 每一路可点击切换“亮 / 不亮”。
- 通过关闭按钮取消，或通过确认按钮写回积木值。

这个需求本质不是普通菜单，而是一个 Scratch Blocks 自定义字段。

## 当前实现

当前新版实现位置：

- `packages/scratch-gui/src/lib/custom-extension/builtin-product-manifests/aimecanum.js`

当前 `linefollower6_status` 使用的是下拉菜单：

```js
line6Status: menu([
    ['000000', '00'],
    ['000001', '01'],
    ['000011', '03'],
    ['000111', '07'],
    ['001111', '0f'],
    ['011111', '1f'],
    ['111111', '3f']
])
```

对应积木声明：

```js
booleanBlock('linefollower6_status', '[SENSOR] 六路巡线传感器检测到 [LINE]', {
    SENSOR: arg('string', 'LF1', {menu: 'line6Sensor', literal: true}),
    LINE: arg('string', '00', {menu: 'line6Status', literal: true})
}, 'mecanumCar.{SENSOR}.get_result_data() == 0x{LINE}', {
    imports: ['import Hiwonder_DEV'],
    variables: [mecanumCarVariable]
})
```

这个实现有三个问题：

1. 只能选择预设组合，无法自由组合六路状态。
2. 二进制文本对小白用户不友好。
3. 和旧版体验不一致，领导看到会认为功能没有迁移完整。

## 旧版调研结论

旧版 AI 机甲麦轮车扩展位置：

- `D:\qq download\scratch-vm\scratch-vm\src\extensions\aimecanum\index.js`

旧版 `linefollower6_status` 的参数不是菜单，而是专用参数类型：

```js
{
    opcode: 'linefollower6_status',
    text: '[SENSOR] Six-channel line follower sensor detects [LINE]',
    disableMonitor: true,
    blockType: BlockType.BOOLEAN,
    customID: 'aimecanum',
    arguments: {
        SENSOR: {
            type: ArgumentType.STRING,
            menu: 'line6_sensor'
        },
        LINE: {
            type: ArgumentType.LINE6
        }
    }
}
```

旧版 VM 里还有参数到 shadow block 的映射：

```js
map[ArgumentType.LINE6] = {
    shadow: {
        type: 'line6',
        fieldName: 'LINE6'
    }
};
```

可以确认旧版链路是：

```text
扩展参数 ArgumentType.LINE6
        ↓
VM 生成 line6 shadow block
        ↓
scratch-blocks 渲染 line6 自定义输入控件
        ↓
用户选择六路状态
        ↓
积木参数 LINE 写回到 VM / Python 生成器
```

目前给到的旧项目目录中只确认到了 VM 侧契约，没有找到旧版 scratch-blocks 字段源码。因此新版建议参考当前工程已有的 `field_matrix.ts` 重做 `line6` 字段。

## 新版可复用参考

当前工程已有 5x5 点阵字段：

- `packages/scratch-blocks/src/blocks/matrix.ts`
- `packages/scratch-blocks/src/fields/field_matrix.ts`
- `packages/scratch-blocks/src/index.ts`

`field_matrix.ts` 的关键机制：

- `FieldMatrix extends Blockly.Field<string>`
- `SERIALIZABLE = true`
- `static fromJson(options)`
- `showEditor_()` 使用 `Blockly.DropDownDiv`
- 点击弹层里的 SVG 节点更新字段值
- `registerFieldMatrix()` 注册到 `Blockly.fieldRegistry`

六路巡线状态选择器可以沿用这套机制，只是把 5x5 点阵改成 1x6 圆点选择器。

## 推荐实现方案

### 总体结构

新增一个基础字段 `line6`，把它作为公司硬件类积木的通用能力。

```text
scratch-vm
  ArgumentType.LINE6
  runtime ArgumentTypeMap
        ↓
scratch-blocks
  blocks/line6.ts
  fields/field_line6.ts
  index.ts 注册
        ↓
scratch-gui
  manifest 参数声明 arg('line6', '00')
  AI 机甲麦轮车移除 line6Status 下拉
        ↓
Python codegen
  继续使用 0x{LINE}
```

### 数据格式建议

推荐字段内部存两位十六进制字符串，例如：

| 通道状态 | 内部值 | Python 生成 |
| - | - | - |
| 全部不亮 | `00` | `0x00` |
| 第 1 路亮 | `01` | `0x01` |
| 第 1、2 路亮 | `03` | `0x03` |
| 第 1 到 6 路全亮 | `3f` | `0x3f` |

这样做的好处：

1. 当前 Python 模板 `0x{LINE}` 可以继续使用。
2. 旧版 VM 的 `line6` 契约更容易兼容。
3. 保存到项目文件里的值短、稳定。
4. 通道顺序只由字段控件负责，不会扩散到每个代码生成模板。

界面上不要直接展示 `00` / `3f`。积木输入位和弹层都显示六个圆点，让用户看到的是通道状态。

### 通道映射

按照当前新版已有 `line6Mask` 的规则：

```text
第 1 路 -> 0x01
第 2 路 -> 0x02
第 3 路 -> 0x04
第 4 路 -> 0x08
第 5 路 -> 0x10
第 6 路 -> 0x20
```

字段控件点击第 `n` 路时，切换 `1 << (n - 1)` 这一位。

## 文件级实施计划

### 1. scratch-vm：补参数类型

文件：

- `packages/scratch-vm/src/extension-support/argument-type.js`
- `packages/scratch-vm/src/engine/runtime.js`

修改点：

```js
LINE6: 'line6'
```

并在 `ArgumentTypeMap` 中增加：

```js
map[ArgumentType.LINE6] = {
    shadow: {
        type: 'line6',
        fieldName: 'LINE6'
    }
};
```

作用：

- 让扩展参数可以声明 `type: ArgumentType.LINE6`。
- 让 VM 构造工具箱 XML 时生成 `line6` shadow block。

### 2. scratch-blocks：新增 line6 shadow block

新增文件：

- `packages/scratch-blocks/src/blocks/line6.ts`

参考 `matrix.ts`，定义：

```js
Blockly.Blocks.line6 = {
    init: function () {
        this.jsonInit({
            message0: '%1',
            args0: [
                {
                    type: 'field_line6',
                    name: 'LINE6'
                }
            ],
            outputShape: Constants.OUTPUT_SHAPE_ROUND,
            output: 'String',
            extensions: ['colours_sensing']
        });
    }
};
```

说明：

- `type: 'line6'` 是 shadow block 类型。
- `field_line6` 是真正负责绘制和弹层交互的字段。
- `output` 建议用 `String`，因为 Python 模板最终需要的是十六进制字符串。

### 3. scratch-blocks：新增字段控件

新增文件：

- `packages/scratch-blocks/src/fields/field_line6.ts`

核心职责：

- 校验字段值，只允许 `00` 到 `3f`。
- 在积木上绘制 6 个小圆点缩略图。
- 点击后打开 `Blockly.DropDownDiv`。
- 弹层里显示数字 `1 2 3 4 5 6` 和对应圆点。
- 点击圆点切换状态。
- 点击确认后写回字段值。
- 点击关闭时恢复打开前的值。

建议关键函数：

```text
fromJson(options)
doClassValidation_(value)
doValueUpdate_(newValue)
initView()
showEditor_()
renderPreview_()
toggleChannel_(channelIndex)
commitValue_()
cancelValue_()
hexToMask_(value)
maskToHex_(mask)
```

注意点：

- 字段应设置 `SERIALIZABLE = true`，否则项目保存后状态可能丢失。
- 弹层打开时保存 `pendingValue` 和 `originalValue`。
- 关闭 `X` 走取消逻辑，绿色确认按钮走提交逻辑。
- 鼠标和触屏事件都要考虑，至少先覆盖 `click` / `mousedown`。

### 4. scratch-blocks：注册 block 和 field

修改文件：

- `packages/scratch-blocks/src/index.ts`

增加：

```js
import './blocks/line6'
import { registerFieldLine6 } from './fields/field_line6'
```

并在初始化注册函数中调用：

```js
registerFieldLine6()
```

### 5. scratch-gui：manifest 改回专用参数

修改文件：

- `packages/scratch-gui/src/lib/custom-extension/builtin-product-manifests/aimecanum.js`

目标：

- 删除或废弃 `line6Status` 菜单。
- 将 `linefollower6_status` 的 `LINE` 改为专用类型。

示例：

```js
booleanBlock('linefollower6_status', '[SENSOR] 六路巡线传感器检测到 [LINE]', {
    SENSOR: arg('string', 'LF1', {menu: 'line6Sensor', literal: true}),
    LINE: arg('line6', '00')
}, 'mecanumCar.{SENSOR}.get_result_data() == 0x{LINE}', {
    imports: ['import Hiwonder_DEV'],
    variables: [mecanumCarVariable]
})
```

这里是否能直接使用 `arg('line6', '00')`，取决于当前自定义 manifest 到 VM blockInfo 的转换是否允许透传未知参数类型。

如果当前转换层限制了参数类型，需要补一处映射：

```text
manifest line6
    ↓
VM ArgumentType.LINE6
```

### 6. Python 生成器：保持模板不变

当前模板：

```js
'mecanumCar.{SENSOR}.get_result_data() == 0x{LINE}'
```

如果字段内部存 `00` / `01` / `3f`，这里可以不改。

如果后续决定字段内部存 `000000` / `000001` 这种二进制文本，则必须在代码生成器里新增转换：

```text
binary line6 value -> hex mask -> Python template
```

当前不推荐二进制存储，因为它会把 UI 表达泄漏到代码生成层。

## 可选方案对比

| 方案 | 优点 | 缺点 | 结论 |
| - | - | - | - |
| 继续下拉菜单 | 实现最少 | 无法自由组合，体验不达标 | 不推荐 |
| 字段内部存二进制文本 | 人看项目文件更直观 | bit 顺序容易误解，模板需要转换 | 可选 |
| 字段内部存十六进制掩码 | 兼容当前模板，和旧版更接近 | 项目文件不如二进制直观 | 推荐 |
| 每个产品包自带 custom field | 产品包自包含 | 重复实现，字段样式和保存逻辑难统一 | 不推荐作为第一版 |

## 当前实施记录

已按“新增 block / field 类型，不复用或改造旧字段”的方式落地第一版：

- `scratch-vm` 新增 `ArgumentType.LINE6`，并映射到 `line6` shadow block 与 `LINE6` 字段。
- `scratch-blocks` 新增 `line6` shadow block 和 `field_line6` 字段。
- `scratch-gui` 允许 manifest 使用 `line6` 参数类型。
- AI 机甲麦轮车的 `linefollower6_status` 积木已从下拉菜单切到 `arg('line6', '00')`。
- Python 生成器已识别 `line6` shadow，验证 `LINE6=23` 可生成 `0x23` 形式代码。

## 人工验证清单

完成代码后建议按下面顺序验证：

1. 进入 Python 编码模式。
2. 加载 AI 机甲麦轮车产品库。
3. 打开 **六路巡线传感器** 分类。
4. 确认 `六路巡线传感器检测到` 积木不再是下拉菜单。
5. 点击 `LINE` 输入位，确认弹出六路状态选择面板。
6. 点击第 1 路，确认积木上的缩略图同步显示第 1 路亮。
7. 点击第 1、2、6 路并确认。
8. 把积木接到 `主函数` 或 `当启动时` 链路里。
9. 确认 Python 代码生成类似：

```python
mecanumCar.LF1.get_result_data() == 0x23
```

10. 保存项目后重新打开，确认六路状态没有丢失。
11. 取消弹层时，确认积木值保持打开前状态。
12. 从积木区拖出、复制、删除、撤销，确认没有控制台报错。

## 风险和待确认点

1. 旧版 `line6` 字段源码暂未在给定旧目录中找到，新版需要参考 `field_matrix.ts` 重做。
2. 六路状态“亮 / 不亮”的颜色需要和竞品截图确认。当前第一版使用蓝色表示亮，灰色表示不亮。
3. 弹层确认 / 取消的交互需要和旧版一致。旧版截图里有 `X` 和绿色确认按钮，因此当前第一版不点击确认就不会写回字段值。
4. 如果后续其它产品也有类似 4 路、8 路传感器，建议把字段抽象成可配置 `bitmask` 字段，而不是只写死 `line6`。

## 建议落地顺序

第一步先做专用 `line6` 字段，保证 AI 机甲麦轮车当前需求闭环。

第二步再考虑抽象成通用 `bitmask` 字段，例如：

```text
field_bitmask
channels: 6
labels: ['1', '2', '3', '4', '5', '6']
valueFormat: 'hex'
```

当前不建议第一版直接做通用字段。这个需求已经跨 `scratch-vm`、`scratch-blocks`、`scratch-gui`、Python codegen 四层，先把一条产品链路做稳更重要。
