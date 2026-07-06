# 07 自定义拓展库完整逻辑流转

> 汇报用途：说明一个 `.json` / `.zip` / `.sbext` 拓展库文件，从导入到出现在左侧积木工具箱，再到拖拽后生成 Python 代码的完整链路。

## 1. 一句话总览

自定义拓展库的本质是：把用户导入的库文件解析成统一 manifest，再把 manifest 同时注册到两条链路。

```text
manifest -> VM 扩展注册 -> 左侧工具箱出现积木
manifest -> Python 模板注册 -> 拖拽积木后生成 Python 代码
```

也就是说，**显示积木**和**生成代码**不是同一件事。显示积木靠 VM 扩展信息；生成代码靠 Python codegen 模板。

## 2. 端到端流程图

```text
用户点击 Manage Libraries
  |
  v
选择 .json / .zip / .sbext 文件
  |
  v
package-reader 读取文件
  |
  v
manifest-schema 规范化成内部 manifest
  |
  +------------------------------+
  |                              |
  v                              v
manifest-to-extension        codegen-registry
生成 VM extension object      注册 block.type -> Python 模板
  |                              |
  v                              v
vm.extensionManager          scratch-vm/codegen/python.js
registerExtensionObject      后续生成 Python 时查询模板
  |
  v
blocks.jsx 刷新 toolbox XML
  |
  v
左侧工具箱出现自定义拓展分类和积木
  |
  v
用户拖拽积木到工作区
  |
  v
workspace change
  |
  v
generatePythonCode(workspace)
  |
  v
Python 代码区更新
```

## 3. 导入入口

入口在 Python 模式头部菜单：

```text
packages/scratch-gui/src/components/menu-bar/python-menu-bar.jsx
```

按钮打开库管理器弹窗：

```text
packages/scratch-gui/src/components/library-manager/library-manager.jsx
packages/scratch-gui/src/containers/library-manager.jsx
```

用户选择文件后，容器里的 `handleImportFile` 调用：

```text
readCustomExtensionPackage(file)
```

对应文件：

```text
packages/scratch-gui/src/lib/custom-extension/package-reader.js
```

## 4. 文件如何被解析

当前支持三类导入文件：

| 文件 | 说明 |
| - | - |
| `.json` | 单文件 manifest，兼容早期 v1 格式 |
| `.zip` | 新版目录型拓展包 |
| `.sbext` | 本质仍是 zip，只是后缀更像产品包 |

新版目录型包推荐结构：

```text
config.json
blocks.json
generator/python.json
libraries/*.py
docs/README.md
```

`package-reader.js` 会做三件事：

1. 读取 `config.json` 或 `manifest.json`。
2. 读取 `blocks.json`，拿到积木外观、参数、类型。
3. 读取 `generator/python.json`，拿到每个 opcode 的 Python 模板。

然后把三份内容合并成统一 manifest。

## 5. 统一 manifest 长什么样

内部统一格式大概是：

```json
{
  "formatVersion": 2,
  "id": "aimecanum",
  "name": "AI 机甲麦轮车",
  "target": "python",
  "blocks": [
    {
      "opcode": "move_dir",
      "blockType": "command",
      "text": "麦轮车按方向 [DIRECTION] 速度 [SPEED] 运动",
      "arguments": {
        "DIRECTION": {"type": "number", "defaultValue": 0},
        "SPEED": {"type": "number", "defaultValue": 50}
      },
      "codegen": {
        "python": {
          "template": "mecanumCar.move_dir({DIRECTION}, {SPEED})",
          "imports": ["import Hiwonder_DEV"]
        }
      }
    }
  ]
}
```

规范化代码在：

```text
packages/scratch-gui/src/lib/custom-extension/manifest-schema.js
```

它负责校验：

- `id` 是否合法。
- `opcode` 是否合法。
- `blockType` 是否支持。
- 参数类型是否支持。
- 模板里的 `{ARG}` 是否都能在 `arguments` 中找到。

## 6. 如何注册成左侧工具箱积木

### 6.1 manifest 先转成 extension object

代码位置：

```text
packages/scratch-gui/src/lib/custom-extension/manifest-to-extension.js
```

它把 manifest 转成 Scratch VM 能理解的扩展对象：

```js
{
  getInfo: () => ({
    id,
    name,
    color1,
    color2,
    color3,
    blocks: [...]
  }),
  move_dir: () => {},
  stop: () => {}
}
```

这里的 `getInfo().blocks` 决定左侧工具箱里显示哪些积木。

每个 opcode 也会生成一个空函数。原因是 Scratch VM 要求扩展对象里存在对应方法。当前 Python 模式主要关注代码生成，所以运行函数先做 no-op。

### 6.2 注册到 VM extensionManager

代码位置：

```text
packages/scratch-gui/src/containers/library-manager.jsx
packages/scratch-vm/src/extension-support/extension-manager.js
```

核心调用：

```js
vm.extensionManager.registerExtensionObject(
  manifest.id,
  manifestToExtensionObject(manifest)
)
```

`registerExtensionObject` 会走 VM 内部扩展注册：

```text
extension object
  -> _registerInternalExtension
  -> runtime extension primitives
```

这样 VM 就知道多了一个扩展分类。

### 6.3 Python 模式进入时会重新确保扩展已加载

代码位置：

```text
packages/scratch-gui/src/containers/blocks.jsx
```

关键方法：

```text
ensurePythonExtensions()
```

它会遍历 Redux 里的 `customExtensionLibraries`：

```text
state.scratchGui.customExtensions.installedLibraries
```

然后再次确保：

- Python 原生扩展已加载。
- 自定义拓展库已注册到 VM。
- 自定义 Python 模板已注册到 codegen registry。
- 最后刷新 toolbox XML。

刷新工具箱的关键调用：

```text
refreshToolboxXML()
  -> getToolboxXML()
  -> updateToolboxState(toolboxXML)
```

这一步完成后，左侧工具箱才会出现新的自定义拓展分类和积木。

## 7. 为什么导入后能持久化

自定义库保存位置由这几个文件负责：

```text
packages/scratch-gui/src/reducers/custom-extensions.js
packages/scratch-gui/src/lib/custom-extension/persistence.js
```

浏览器里会保存到：

```text
localStorage
```

桌面端会通过 preload 暴露的 API 保存到 Electron userData：

```text
window.scratchDesktopCustomExtensions.save(...)
window.scratchDesktopCustomExtensions.load()
```

所以重启后，库管理器还能恢复已安装库。

## 8. 拖拽积木后如何生成 Python

用户把积木拖到工作区后，Blockly workspace 会触发变化。

代码位置：

```text
packages/scratch-gui/src/containers/blocks.jsx
```

关键方法：

```js
onPythonWorkspaceChange () {
    if (this.props.editorMode !== PYTHON_EDITOR_MODE) return;
    const code = generatePythonCode(this.workspace);
    this.props.updatePythonCodeState(code);
}
```

这里会调用：

```text
packages/scratch-gui/src/lib/python-codegen/index.js
```

GUI 侧只是桥接：

```js
ScratchVM.generatePythonCode(workspace, {
    getPythonCodegenTemplate
});
```

真正生成逻辑在 VM：

```text
packages/scratch-vm/src/codegen/python.js
```

## 9. 自定义积木如何从模板变成代码

导入库时，会把每个 block 的 Python 模板注册进去：

```text
packages/scratch-gui/src/lib/custom-extension/codegen-registry.js
```

注册 key 是：

```text
extensionId_opcode
```

例如：

```text
aimecanum_move_dir
```

当 VM codegen 遇到未知内置积木时，会查自定义模板：

```text
getPythonCodegenTemplate(block.type)
```

如果命中模板，就把 Blockly 积木输入替换到模板里。

例如模板：

```text
mecanumCar.move_dir({DIRECTION}, {SPEED})
```

积木参数：

```text
DIRECTION = 0
SPEED = 50
```

生成：

```python
mecanumCar.move_dir(0, 50)
```

如果模板声明了 imports：

```json
{
  "imports": ["import Hiwonder_DEV"]
}
```

最终代码顶部会自动汇总：

```python
import Hiwonder_DEV
```

## 9.1 硬件库的分区生成

旧版机器人 Python 生成器不是简单拼接代码，而是分成几个区：

```text
imports
initialize variables
setup statements
def start_main()
launcher
```

新版模板已经补充这些字段：

| 字段 | 作用 |
| - | - |
| `imports` | 汇总到文件顶部 |
| `variables` | 汇总到 `# initialize variables` 下方 |
| `setups` | 汇总到主函数之前 |
| `section: "setup"` | 把帽子积木下方的语句生成到主函数之前 |
| `section: "main"` | 把帽子积木下方的语句生成到 `def start_main()` 里 |
| `launcher` | 控制主函数如何启动，例如 `Hiwonder.startMain({MAIN})` |

例如 AI 机甲麦轮车里，蜂鸣器积木声明：

```json
{
  "variables": ["beep = Hiwonder.Buzzer()"],
  "template": "beep.playTone({TONE}, {RHYTHM}, {MODE})",
  "launcher": "Hiwonder.startMain({MAIN})"
}
```

如果工作区里有：

```text
当启动时
  关闭低电压报警

主程序
  蜂鸣器播放声音
```

会生成类似：

```python
import Hiwonder
import time

# initialize variables
beep = Hiwonder.Buzzer()

Hiwonder.disableLowPowerAlarm()

def start_main():
    global beep
    beep.playTone(65, 500, False)

Hiwonder.startMain(start_main)
```

如果工作区里有多个 `section: "main"` 帽子，生成器会按顺序命名：

```python
def start_main():
    ...

Hiwonder.startMain(start_main)

def start_main1():
    ...

Hiwonder.startMain(start_main1)
```

## 10. AI 机甲麦轮车示例流转

示例包位置：

```text
dosc/plans/extension-library/examples/ai-mecanum-package-v2/
```

旧引擎里：

```js
Blockly.Python.aimecanum_move_oriention = function (a) {
    let name = "mecanumCar"
    Blockly.Python.addVariable(name, name + " = Hiwonder_DEV.DEV_MecanumCar( )")
    let speed = Blockly.Python.valueToCode(a, "SPEED", Blockly.Python.ORDER_NONE);
    let oriention = a.getFieldValue("ORIENTION")
    let code = "  " + name + ".move_dir(" + oriention + "," + speed + ")\n"
    return code;
}
```

新版包里拆成：

```text
blocks.json
  -> 定义积木：麦轮车按方向 [DIRECTION] 速度 [SPEED] 运动

generator/python.json
  -> 定义模板：mecanumCar.move_dir({DIRECTION}, {SPEED})
```

导入后：

```text
aimecanum_move_dir
  -> 左侧出现积木
  -> 拖到工作区
  -> codegen 查到模板
  -> 生成 mecanumCar.move_dir(...)
```

## 11. 当前限制和后续要补的能力

### 11.1 setup/global variable 区

旧引擎有：

```text
Blockly.Python.addVariable(...)
Blockly.Python.addSetup(...)
Blockly.Python.addImport(...)
```

当前新版模板主要支持：

```text
imports
variables
setups
template
launcher
runtimeFiles
```

AI 机甲麦轮车包已经用 `variables` 声明：

```text
mecanumCar = Hiwonder_DEV.DEV_MecanumCar()
beep = Hiwonder.Buzzer()
```

生成器会统一输出到 `# initialize variables` 区。后续仍需要继续增强的是 `setup` 的菜单化配置、变量作用域精细控制和运行库文件写入。

### 11.2 菜单字段

旧 Blockly 有下拉字段，例如方向、端口、模式。

当前自定义 manifest 先只支持：

```text
string
number
boolean
```

后续要补：

```text
menu
color
angle
image label
```

这样积木体验才会接近竞品和旧版产品库。

### 11.3 运行库文件

`.sbext` 包已经能携带：

```text
libraries/*.py
```

当前只是读取并保存到 manifest，后续还要在运行 Python 前写入临时工作目录。

## 12. 汇报用结论

当前方案已经打通了最小闭环：

```text
导入拓展包
  -> 解析为统一 manifest
  -> 注册 VM 扩展
  -> 左侧出现积木
  -> 拖拽积木
  -> 根据模板生成 Python
```

它和旧 `python-generator.js` 的关系是：

- 旧版把“积木定义、变量声明、导入、Python 生成函数”都写在 JS 里。
- 新版把它们拆成“配置文件 + 模板 + 后续 codegen context”。
- 第一阶段先实现安全、可导入、可持久化、可生成代码。
- 下一阶段补 setup/global/menu 等能力，逐步承接真实机器人产品库。
