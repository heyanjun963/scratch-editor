# 自定义积木拓展库具体实施方案

> 类型：开发实施方案。
> 前置文档：[01 自定义积木拓展库调研与实现方案](./01-custom-extension-library-research.md)。
> 目标：把“用户/公司可以导入自定义积木拓展库，并让积木生成 Python 代码”拆成可开发、可验证、可延期的工程任务。

---

## 0. 先给结论

第一版不要一上来做“任意 JS 扩展 + 完整 Scratch 舞台运行 + 可视化积木编辑器 + sb3 随项目迁移”。这会同时改 `scratch-gui`、`scratch-vm`、`scratch-blocks`、项目序列化和桌面端文件系统，风险太大。

推荐先做一个收敛版本：

```text
导入 manifest.json
  -> 校验
  -> 转成 Scratch extension getInfo()
  -> 注册到 VM
  -> 刷新左侧工具栏分类
  -> 拖出自定义积木
  -> Python codegen 按模板生成代码
```

第一版只服务 **Python 编码模式**。舞台模式实时执行、硬件上传协议、复杂自定义字段、随 `.sb3` 完整迁移都放到后续阶段。

---

## 1. MVP 范围

### 1.1 要做

- 支持从本地导入一个 `.json` 自定义拓展库配置。
- 配置文件声明拓展库名称、颜色、积木、参数、Python 代码生成模板。
- 导入后在扩展库列表出现一个自定义库卡片。
- 点击卡片后，左侧积木分类出现该拓展库。
- 自定义积木可拖到画布。
- Python 编码模式下，自定义积木可生成 Python 代码。
- 支持导出当前拓展库配置为本地 `.json` 文件。

### 1.2 第一版不做

- 不执行用户上传的 JS。
- 不支持自定义 Blockly 渲染器。
- 不支持复杂字段控件，例如颜色选择器、矩阵编辑器、文件选择器。
- 不保证舞台模式下点击绿旗能运行自定义积木。
- 不把自定义库完整写入 `.sb3`。
- 不做云端库市场。

### 1.3 这版为什么够用

领导当前关注的是三件事：

- block 是怎么生成的。
- block 事件和拖拽能不能接入。
- 如何添加自己的扩展 block，并把它转成 Python。

MVP 正好覆盖这条链路，而且不会被“项目文件格式”和“安全沙箱”拖慢。

---

## 2. 功能分布

### 2.1 总体分层

| 层 | 负责什么 | 第一版是否改 |
| - | - | - |
| `scratch-gui` | 导入文件、扩展库 UI、Redux 状态、Python codegen、下载导出 | 主要改 |
| `scratch-vm` | 扩展注册、`getInfo()` 清洗、积木分类刷新 | 少量改或通过现有 API 接入 |
| `scratch-blocks` | 根据 VM 提供的 blocks 信息绘制积木、处理拖拽和拼接 | 第一版尽量不改 |
| Electron 桌面层 | 后续持久化库目录、运行库落盘、打包分发 | 第一版可不改 |

### 2.2 关键原则

自定义库的导入、管理和模板注册仍先放在 `scratch-gui`，但 Python 代码生成核心应放到 `scratch-vm`：

- 扩展库页面：`packages/scratch-gui/src/containers/extension-library.jsx`
- Python 生成核心：`packages/scratch-vm/src/codegen/python.js`
- GUI 代码生成桥接：`packages/scratch-gui/src/lib/python-codegen/index.js`

`scratch-blocks` 暂时不需要迁移新逻辑。Scratch 的扩展积木外观主要由 VM 的 `getInfo().blocks` 转成 block JSON/XML 后绘制。只有当我们要做自定义颜色选择器、图像字段、复杂下拉联动时，才需要深入 `scratch-blocks` 的 custom field。

---

## 3. 端到端流程

### 3.1 导入流程

```text
用户点击“导入自定义库”
  -> 选择 manifest.json
  -> file-uploader 读取文本
  -> JSON.parse
  -> manifest-schema 校验
  -> manifest-to-extension 转换为 getInfo()
  -> 注册到 VM
  -> codegen-registry 注册 Python 模板
  -> Redux 保存 installedLibraries
  -> 扩展库 UI 合并静态库 + 自定义库
  -> 用户点击库卡片
  -> vm.extensionManager 加载或激活该库
  -> blocks.jsx 刷新 toolbox
```

### 3.2 拖拽和生成代码流程

```text
VM 已有自定义扩展 getInfo()
  -> blocks.jsx 读取 VM categoryInfo
  -> scratch-blocks 绘制分类和积木
  -> 用户拖拽积木到 workspace
  -> workspace change 事件触发
  -> blocks.jsx 调 generatePythonCode
  -> vm.generatePythonCode 遍历 workspace blocks
  -> 内置 opcode 走原硬编码逻辑
  -> 未命中内置逻辑的 opcode 查 codegen-registry
  -> 用模板替换参数
  -> 输出 Python 文本
```

### 3.3 导出流程

```text
用户点击“导出库”
  -> 从 Redux 取当前库 manifest
  -> 清理运行时字段
  -> JSON.stringify
  -> download-blob 下载 custom-extension.json
```

后续支持 `.sbext` 时，导出流程改成：

```text
manifest + icon + libraries/*.py
  -> JSZip 打包
  -> download-blob 下载 .sbext
```

---

## 4. 建议新增和修改的文件

### 4.1 新增：自定义库核心模块

建议目录：

```text
packages/scratch-gui/src/lib/custom-extension/
  manifest-schema.js
  manifest-to-extension.js
  codegen-registry.js
  library-store.js
  sample-manifests.js
```

| 文件 | 职责 |
| - | - |
| `manifest-schema.js` | 校验 manifest 字段、id/opcode 规则、参数类型、模板占位符 |
| `manifest-to-extension.js` | 把 manifest 转成 VM 能识别的 `getInfo()` 结构 |
| `codegen-registry.js` | 保存 `blockType -> Python codegen template` 的运行时注册表 |
| `library-store.js` | 对外提供导入、导出、启用、禁用的纯函数 |
| `sample-manifests.js` | 放一个最小示例，方便开发和测试 |

### 4.2 新增：Redux 状态

建议文件：

```text
packages/scratch-gui/src/reducers/custom-extensions.js
```

建议状态：

```js
{
  installedLibraries: [
    {
      id: 'companydemo',
      name: '公司演示库',
      version: '1.0.0',
      enabled: true,
      manifest: {}
    }
  ],
  importError: null
}
```

需要接入：

```text
packages/scratch-gui/src/reducers/gui.ts
```

### 4.3 修改：扩展库 UI

涉及文件：

```text
packages/scratch-gui/src/containers/extension-library.jsx
packages/scratch-gui/src/lib/libraries/extensions/index.jsx
```

改造目标：

- 保留原始内置扩展库。
- 从 Redux 读取 `installedLibraries`。
- 把自定义库转换成扩展库卡片。
- 卡片点击后加载对应自定义扩展。
- 顶部增加“导入库”按钮。
- 自定义库卡片提供“导出”“删除”入口。

注意点：

- 不要直接修改静态 `extensionLibraryContent`。
- 推荐在 container 层合并：

```text
visibleExtensions = builtinExtensions + customExtensionCards
```

这样原版扩展库数据不会被运行时污染。

### 4.4 修改：VM 注册桥接

优先方案：在 GUI 侧构造一个扩展对象，然后调用 VM 的现有能力注册。

涉及文件：

```text
packages/scratch-vm/src/extension-support/extension-manager.js
```

建议新增一个明确方法：

```js
registerExtensionObject (extensionId, extensionObject)
```

职责：

- 校验 id 是否重复。
- 调用现有 `_registerInternalExtension` 或等价注册流程。
- 调用 `refreshBlocks()`。

如果不想第一版改 VM，可以先走 `loadExtensionURL` 之外的最小桥接，但长期建议给 VM 一个正式 API。否则 GUI 会依赖 VM 内部私有方法，后续维护容易碎。

### 4.5 修改：Python codegen

涉及文件：

```text
packages/scratch-vm/src/codegen/python.js
packages/scratch-vm/src/virtual-machine.js
packages/scratch-vm/src/index.js
packages/scratch-gui/src/lib/python-codegen/index.js
```

改造目标：

- VM 侧保留现有内置 Python 积木生成逻辑。
- VM 侧增加自定义 opcode 兜底：

```text
if builtin generator exists:
  use builtin generator
else if codegenRegistry has block.type:
  use template generator
else:
  emit warning comment
```

自定义模板生成器要支持：

- command block：输出语句。
- reporter block：输出表达式。
- boolean block：输出表达式。
- imports：合并到文件顶部，去重。
- 参数替换：`{TEXT}`、`{A}`、`{B}`。

GUI 侧 `python-codegen/index.js` 只负责把 `codegen-registry` 的模板查询函数传给 VM：

```text
ScratchVM.generatePythonCode(workspace, { getPythonCodegenTemplate })
```

### 4.6 暂不修改：scratch-blocks

第一版不直接改：

```text
packages/scratch-blocks/
```

原因：

- 普通扩展积木由 `getInfo()` 声明即可绘制。
- 拖拽、拼接、点击、workspace change 已经由 scratch-blocks 提供。
- 我们只需要让 VM 提供正确的 block metadata。

后续需要自定义颜色选择器、串口选择器、图像预览字段时，再进入 `scratch-blocks` 的 custom field 体系。

---

## 5. manifest v1 设计

### 5.1 最小示例

```json
{
  "formatVersion": 1,
  "id": "companydemo",
  "name": "公司演示库",
  "version": "1.0.0",
  "color1": "#4C97FF",
  "color2": "#3373CC",
  "color3": "#285CA3",
  "blocks": [
    {
      "opcode": "printText",
      "blockType": "command",
      "text": "打印 [TEXT]",
      "arguments": {
        "TEXT": {
          "type": "string",
          "defaultValue": "hello"
        }
      },
      "codegen": {
        "python": {
          "template": "print({TEXT})",
          "imports": []
        }
      }
    },
    {
      "opcode": "addNumbers",
      "blockType": "reporter",
      "text": "[A] 加 [B]",
      "arguments": {
        "A": {
          "type": "number",
          "defaultValue": 1
        },
        "B": {
          "type": "number",
          "defaultValue": 2
        }
      },
      "codegen": {
        "python": {
          "template": "({A} + {B})",
          "imports": []
        }
      }
    }
  ]
}
```

### 5.2 字段规则

| 字段 | 规则 |
| - | - |
| `formatVersion` | 第一版固定为 `1` |
| `id` | 小写字母和数字，建议不超过 32 字符 |
| `name` | 展示名称，建议不超过 20 个中文字符 |
| `version` | 语义化版本，例如 `1.0.0` |
| `color1/2/3` | 十六进制颜色 |
| `blocks[].opcode` | 小写字母、数字、下划线，库内唯一 |
| `blocks[].blockType` | `command`、`reporter`、`boolean` 第一版优先 |
| `blocks[].text` | Scratch 积木文案，参数用 `[ARG]` |
| `arguments` | 参数名必须和 `[ARG]`、`{ARG}` 对齐 |
| `codegen.python.template` | Python 代码模板，只允许占位符替换，不执行 JS |

### 5.3 block.type 映射

导入后，Python codegen 看到的 block type 建议统一为：

```text
<extensionId>_<opcode>
```

例如：

```text
companydemo_printText
companydemo_addNumbers
```

这样可以避免不同库之间 opcode 重名。

---

## 6. 分阶段开发计划

### H0：技术预备

目标：先把边界打清楚，不碰 UI。

任务：

- 梳理 `python-codegen/index.js` 的内置 opcode 分发点。
- 确认 `extension-manager` 是否需要新增公开注册方法。
- 写一个最小 manifest 示例。

验收：

- 文档中能明确说明自定义库从 manifest 到 block.type 的转换规则。
- 不写业务代码也能知道下一步改哪些文件。

### H1：导入 manifest 并显示自定义扩展卡片

目标：用户能导入一个 JSON，扩展库页面能看到自定义库。

任务：

- 新增 `manifest-schema.js`。
- 新增 `library-store.js`。
- 新增 `custom-extensions` reducer。
- `extension-library.jsx` 增加导入按钮。
- 静态扩展卡片和自定义扩展卡片合并展示。

验收：

- 导入合法 JSON 后，扩展库出现“公司演示库”卡片。
- 导入非法 JSON 时，页面展示明确错误。
- 重复导入同 id 时，有覆盖或拒绝策略，不能悄悄生成两个同名库。

### H2：manifest 转 VM extension 并刷新工具栏

目标：点击自定义库卡片后，左侧工具栏出现新分类和新积木。

任务：

- 新增 `manifest-to-extension.js`。
- 给 VM 增加或封装 `registerExtensionObject`。
- 把 manifest block 映射为 `getInfo().blocks`。
- 点击自定义库卡片后注册扩展并刷新 toolbox。

验收：

- 点击自定义库卡片后，左侧出现自定义分类。
- 分类颜色、名称、积木文案与 manifest 一致。
- 自定义积木能拖到中间画布。

### H3：自定义积木生成 Python

目标：拖出自定义积木后，右侧 Python 代码区能生成代码。

任务：

- 新增 `codegen-registry.js`。
- 导入库时注册 `block.type -> codegen.python`。
- 改造 `python-codegen/index.js`，增加自定义模板兜底。
- 实现参数值读取、字符串转义、数字处理、布尔表达式处理。
- 实现 imports 去重。

验收：

- `打印 [hello]` 生成 `print("hello")` 或约定格式。
- `[A] 加 [B]` 作为 reporter 嵌入其他表达式时能生成正确 Python。
- 未支持的自定义积木生成注释，而不是让整个 codegen 崩掉。

### H4：导出库配置

目标：导入后的库可以下载成本地文件，再次导入可恢复。

任务：

- 自定义库卡片增加“导出”入口。
- 复用 `download-blob.js`。
- 导出时去掉运行时字段，只保留标准 manifest。

验收：

- 导出的 JSON 能再次导入。
- 再次导入后积木显示和代码生成结果一致。

### H5：支持 `.sbext` 压缩包

目标：从单 JSON 演进成类似 Mixly 的库包。

任务：

- 定义 `.sbext` 包结构。
- 引入或复用 JSZip。
- 支持读取 `manifest.json`、`icon.svg`、`libraries/*.py`。
- Python 运行时把 `libraries/*.py` 落到项目运行目录。

验收：

- `.sbext` 导入后显示图标。
- 生成的 Python 可以 import 包内 runtime library。
- 桌面端本机 Python 能运行依赖库文件。

### H6：应用级持久化

目标：重启软件后，自定义库还在。

任务：

- Electron 桌面端定义本地库目录。
- 启动时读取已安装库。
- 删除库时同步删除本地文件。
- Web 端如果要支持，可使用 IndexedDB；第一版可只支持桌面端。

验收：

- 导入库后关闭软件，重新打开仍能看到库。
- 删除库后重启不会恢复。

### H7：随 `.sb3` 迁移

目标：项目发给别人时，自定义库也能跟着走。

任务：

- 研究 `.sb3` zip 内附加文件策略。
- 保存项目时写入 `extensions/<id>/manifest.json`。
- 加载项目时先恢复自定义库，再加载 blocks。
- 处理版本冲突：项目内库版本 vs 本机已安装库版本。

验收：

- 带自定义积木的 `.sb3` 换电脑打开不丢块。
- 缺库时给出明确提示。
- 版本冲突时用户能选择使用项目内版本或本地版本。

---

## 7. 代码生成细节

### 7.1 参数替换

模板：

```text
print({TEXT})
```

积木参数：

```json
{
  "TEXT": "hello"
}
```

生成：

```python
print("hello")
```

规则：

- `string` 参数需要 Python 字符串转义。
- `number` 参数为空时使用默认值。
- `boolean` 参数输出 `True` / `False`，或嵌套表达式。
- reporter 参数如果连接了其他积木，优先使用子积木表达式。

### 7.2 imports 合并

manifest：

```json
{
  "imports": ["import time"]
}
```

生成结果：

```python
import time

print(time.time())
```

规则：

- imports 在文件顶部输出。
- 相同 import 只输出一次。
- import 顺序按首次出现顺序即可，第一版不必复杂排序。

### 7.3 不支持积木的处理

不要直接报错白屏。建议生成注释：

```python
# Unsupported custom block: companydemo_unknown
```

同时在开发控制台 `console.warn`，方便定位 manifest 或 codegen 漏配。

---

## 8. 校验和安全

### 8.1 必须校验

| 校验项 | 原因 |
| - | - |
| 文件大小 | 避免超大文件卡死页面 |
| JSON 格式 | 避免导入失败导致白屏 |
| `formatVersion` | 方便后续升级 |
| `id` 合法性 | 对齐 VM 扩展 id 限制 |
| `opcode` 唯一 | 避免生成重复 block.type |
| 参数名一致 | `[ARG]`、`arguments.ARG`、`{ARG}` 必须对应 |
| 模板占位符 | 不能引用不存在参数 |
| blockType 白名单 | 第一版只开放可控类型 |

### 8.2 禁止项

- 禁止 manifest 内写 JS 并执行。
- 禁止 `eval` / `new Function`。
- 禁止模板访问全局对象。
- 禁止导入任意路径文件。
- 禁止覆盖内置扩展 id。

---

## 9. 人工测试用例

### 9.1 导入类

| 用例 | 操作 | 预期 |
| - | - | - |
| 导入合法库 | 选择 `companydemo.json` | 扩展库出现卡片 |
| 导入非法 JSON | 选择格式错误文件 | 显示解析失败 |
| id 非法 | id 为 `company-demo` | 显示 id 不合法 |
| opcode 重复 | 两个 block 同 opcode | 显示重复 opcode |
| 参数缺失 | text 有 `[TEXT]` 但 arguments 没有 | 显示参数不匹配 |
| 模板缺失 | command block 无 codegen | 显示 codegen 缺失 |

### 9.2 积木类

| 用例 | 操作 | 预期 |
| - | - | - |
| 加载库 | 点击自定义库卡片 | 左侧出现分类 |
| 拖拽 command | 拖出“打印 [TEXT]” | 能放到画布 |
| 拖拽 reporter | 拖出“[A] 加 [B]” | 能嵌入表达式输入 |
| 删除库 | 删除已安装库 | 分类消失或提示重启后消失 |

### 9.3 代码生成类

| 用例 | 操作 | 预期 |
| - | - | - |
| 字符串参数 | 输入 `hello` | 生成 `print("hello")` |
| 字符串转义 | 输入包含引号 | 生成合法 Python 字符串 |
| 数字参数 | 输入 `1` 和 `2` | 生成 `(1 + 2)` |
| imports | 使用带 import 的块 | 顶部生成 import 且去重 |
| 未知 block | 删除 codegen 配置后生成 | 输出 unsupported 注释，不白屏 |

### 9.4 导出类

| 用例 | 操作 | 预期 |
| - | - | - |
| 导出库 | 点击导出 | 下载 JSON |
| 二次导入 | 导入刚导出的 JSON | 积木和代码生成保持一致 |

---

## 10. 风险点

| 风险 | 影响 | 应对 |
| - | - | - |
| VM 没有公开 manifest 注册 API | GUI 可能依赖私有方法 | H2 给 VM 补正式 `registerExtensionObject` |
| codegen 当前硬编码较多 | 改动容易影响现有 Python 积木 | 内置逻辑不动，只加兜底分支 |
| 自定义 reporter 嵌套复杂 | 表达式优先级可能出错 | 第一版模板要求用户自己加括号 |
| `.sb3` 迁移复杂 | 项目跨电脑可能丢库 | H7 单独做，不塞进 MVP |
| 用户上传恶意文件 | 安全风险 | MVP 只允许声明式 JSON，不执行 JS |
| 复杂字段无法表达 | 体验不如竞品 | 作为高级字段阶段处理 |

---

## 11. 推荐开发顺序

实际开发建议这样走：

1. 做 H1：先让导入和扩展库卡片跑通。
2. 做 H2：让自定义积木出现在左侧分类，并能拖拽。
3. 做 H3：让积木生成 Python，这是最关键的验收点。
4. 做 H4：补导出，满足“上传/下载配置文件”的显式诉求。
5. 做 H5-H7：再进入运行库、持久化和 `.sb3` 迁移。

每个阶段都要保留一个最小 manifest 样例，作为人工测试和后续自动化测试的固定输入。

---

## 12. 对领导解释时可以这样说

这块不是单纯“加几个积木”。完整链路分成三件事：

1. **积木定义**：告诉 Scratch 左侧要显示什么积木。
2. **积木绘制和拖拽**：复用 Scratch Blocks 已有能力，把定义渲染成可拖拽积木。
3. **代码生成**：把拖到画布里的积木转成 Python。

当前项目原先的短板主要在第三步：Python 生成逻辑写在 GUI 侧，并且按 opcode 硬编码。现在需要补成两层：

1. **VM 侧生成核心**：`scratch-vm` 负责遍历 workspace、处理内置 Python 积木、套用自定义模板。
2. **GUI 侧模板管理**：`scratch-gui` 负责导入 manifest、校验、注册模板，并把模板查询函数传给 VM。

所以实施上先做“声明式配置文件 + VM 模板生成 Python”。这条路安全、可控，也方便后续扩展成公司内部库、学生自定义库和硬件库。
