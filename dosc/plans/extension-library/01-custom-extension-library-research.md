# 自定义积木拓展库调研与实现方案（Scratch + 本地上传/下载）

> 类型：调研 + 实施前方案（暂不写代码）。
> 目标：让学生/产品人员能**自定义积木**，把这些积木组织成**拓展库**，并像 Mixly「管理库」那样把拓展库**上传/导入**和**下载/导出**到本地。
> 目标平台：本仓库的 Scratch 体系（`scratch-gui` + `scratch-vm` + `scratch-blocks`），参考软件 Mixly 的库管理体验，参考实现样本为 `D:\qq download\WonderCam\WonderCam`（Mixly 格式视觉模块拓展库）。

---

## 0. 结论速览（先看这段）

1. **本仓库已经具备扩展系统的大半基础**：`scratch-vm` 有完整的扩展注册与 URL 动态加载通道，`scratch-gui` 有扩展库卡片列表、按模式过滤、甚至「输入扩展 URL」入口。已存在公司自定义扩展 `companyHttp` 作为范例。
2. **最大的技术缺口是「代码生成」**：调研时 Python 代码是**在 GUI 里按 opcode 硬编码**生成的（`python-codegen/index.js`）。因此，仅靠扩展元数据（`getInfo()`）新增的自定义积木，能显示和拖拽，但**不会自动生成 Python**。当前 MVP 已把生成核心迁到 `scratch-vm/src/codegen/python.js`，并通过模板注册表支持自定义积木产码。
3. **推荐路线**：定义一个自包含的**拓展库文件格式**（一个 `.zip` 包，内含 `manifest.json` + 积木定义 + 代码生成模板 + 图标 + 可选运行库），在 GUI 里做一个「管理库」面板负责导入/导出/启用，用 `scratch-vm` 的动态扩展机制在运行时注册积木，用改造后的数据驱动 codegen 生成代码。文件的**上传/下载复用仓库已有的 `download-blob.js` 和 `file-uploader.js`**。
4. **不建议**直接照搬 Mixly 的 `Blockly.Blocks` + `Blockly.Python.forBlock` 源码格式，因为 Scratch 的积木/扩展体系与原生 Blockly 不同；但**可以借鉴 Mixly「一个文件夹/压缩包就是一个库、可上传下载」的组织与管理理念**。
5. **重要修正**：现有 VM 支持「内置扩展」和「URL Worker 扩展」，但**没有现成的 manifest 动态注册 API**。本方案需要新增一层「manifest → extension object/getInfo → VM 注册 → codegen 注册」的桥接模块。

---

## 1. 参考对象一：Mixly WonderCam 拓展库是怎么组织的

样本目录 `D:\qq download\WonderCam\WonderCam`：

```text
WonderCam/
  config.json            # { "version": "1.0.1" } —— 库版本
  WonderCam.xml          # toolbox 定义：category + block 列表 + 默认 shadow 值
  block/WonderCam.js     # 积木外观定义：Blockly.Blocks.<opcode> = { init(){...} }
  generator/WonderCam.js # 代码生成：Blockly.Python.forBlock.<opcode> = function(){ return code }
  libraries/wondercam.py # 运行时库：真正被生成代码 import 的 Python 类
  css/WonderCam.css      # 分类图标样式（选中/未选中）
  media/*.png            # 图标、示意图
```

关键机制：

- **toolbox（XML）**决定积木出现在哪个分类、默认参数。例如 `<category id="WonderCam" name="小幻熊视觉模块" colour="#ef8c4d">` 下挂一串 `<block type="WonderCam_init">`。
- **block 定义（JS）**决定积木长什么样：`appendValueInput`、`appendField`、下拉框（如 I2C 地址数组）、图片字段、连接类型。运行期依赖 Mixly 注入的全局 `Blockly`、`path`、`document.currentScript` 来定位 `media/`。
- **generator（JS）**把积木转成 Python 文本：`Blockly.Python.valueToCode(...)` 取子输入，`this.getFieldValue(...)` 取字段，`Blockly.Python.definitions_['import_xxx']` 声明 import，返回 `[code, ORDER]`（表达式）或 `code`（语句）。
- **library（.py）**是生成代码 `from wondercam import WonderCam, Functions` 真正调用的实现。
- **管理理念**：Mixly 里「管理库」= 把这样一个文件夹（或其压缩包）放进/取出库目录。**上传** = 导入压缩包并解压到库目录；**下载** = 把库目录打包导出。库之间靠**目录名/库名**隔离。

> 对我们的启示：**「库 = 一个自包含压缩包，内含定义 + 生成器 + 运行库 + 资源 + 版本清单」** 这个模型非常适合搬到我们的方案里；差别只在于「积木定义」和「代码生成」要换成 Scratch 的表达方式。

---

## 2. 参考对象二：本仓库 Scratch 扩展系统现状（已具备什么）

### 2.1 scratch-vm：扩展注册与动态加载

`packages/scratch-vm/src/extension-support/extension-manager.js`

- `builtinExtensions`：内置扩展 id → require 的映射。**已包含公司自定义 `companyHttp` 和整套 `python*` 扩展**，说明「往仓库里加公司扩展」这条路已经走通。
- `loadExtensionURL(extensionURL)`：
  - 若 `extensionURL` 命中 `builtinExtensions` → 同步 `new extension(runtime)`，注册。
  - 否则 → `new Worker('./extension-worker.js')` 在**沙箱 Worker** 里加载。这就是「从 URL 动态加载第三方扩展」的既有通道。
- `_prepareExtensionInfo` / `_prepareBlockInfo`：清洗扩展元数据，补默认值。**技术限制：扩展 id 需匹配 `/^[a-z0-9]+$/i`**，即大小写字母和数字可通过；公司规范建议统一小写字母和数字，避免文件名、URL、包名和跨平台大小写问题。
- `refreshBlocks()`：重新拉取所有已加载扩展的 `getInfo()` 并刷新积木——支持动态积木（`isDynamic`）。

`packages/scratch-vm/src/extension-support/extension-worker.js`

- 沙箱 worker，用 `importScripts(extension)` 载入远程脚本，向扩展暴露 `global.Scratch.extensions.register(obj)` 以及 `ArgumentType/BlockType/TargetType`。

### 2.2 扩展元数据 `getInfo()` 的结构（以 `companyHttp` 为例）

`packages/scratch-vm/src/extensions/scratch3_company_http/index.js`

```js
getInfo () {
  return {
    id: 'companyHttp',                 // VM 允许大小写字母和数字，公司规范建议小写
    name: '...',                       // 分类显示名
    blockIconURI: iconURI,             // 积木上的图标（data:svg）
    menuIconURI: iconURI,
    color1: '#0FBD8C', color2: '#0DA57A', color3: '#0B8E69',
    blocks: [
      {
        opcode: 'fetchAndLog',
        blockType: BlockType.COMMAND,  // COMMAND / REPORTER / BOOLEAN / HAT / BUTTON ...
        text: 'GET [URL] log and say response',
        arguments: {
          URL: { type: ArgumentType.STRING, defaultValue: 'https://...' }
        }
      },
      '---',                           // 分隔符
      { opcode: 'setDeepSeekModel', blockType: BlockType.COMMAND,
        text: 'set DeepSeek model [MODEL]',
        arguments: { MODEL: { type: ArgumentType.STRING, menu: 'deepSeekModels', defaultValue: '...' } } }
    ],
    menus: { deepSeekModels: [ ... ] }
  };
}
```

每个 `opcode` 在扩展类里对应一个方法 `fetchAndLog(args, util)` 作为运行时行为（VM 执行时调用）。

### 2.3 scratch-gui：扩展库 UI 与加载流程

- **目录清单** `packages/scratch-gui/src/lib/libraries/extensions/index.jsx`：一个数组，每项即一张扩展卡片。字段：

  ```js
  {
    name, extensionId, iconURL, insetIconURL, description,
    featured: true,
    internetConnectionRequired: true,   // 可选
    modes: ['python'],                  // 可选：按 editorMode 过滤
    extensionURL: '...'                 // 可选：走 URL 动态加载
  }
  ```

- **点击加载** `packages/scratch-gui/src/containers/extension-library.jsx`：
  - `handleItemSelect(item)`：`url = item.extensionURL || item.extensionId`；
  - **无 id 时会 `prompt('Enter the URL of the extension')`** —— 原版就内置了「手输扩展 URL」的能力；
  - `vm.extensionManager.loadExtensionURL(url).then(() => onCategorySelected(id))`。
  - `render()` 里 `.filter(ext => !ext.modes || ext.modes.includes(editorMode))` —— 已能按模式（如 `python`）过滤扩展。

- **toolbox 注入** `packages/scratch-gui/src/containers/blocks.jsx:747` 调 `loadExtensionURL(extensionId)`，扩展积木随后进入 flyout/toolbox。

### 2.4 关键差距：代码生成是硬编码的

调研时入口是 `packages/scratch-gui/src/lib/python-codegen/index.js`。当前实现已迁移为：

```text
packages/scratch-vm/src/codegen/python.js        # VM 侧核心生成器
packages/scratch-gui/src/lib/python-codegen/index.js # GUI 侧薄桥接
```

- `generatePythonCode(workspace)` 遍历 workspace 顶层块，按类别前缀分发：

  ```js
  const prefixByCategory = {
    control: 'pythonControl_', operators: 'pythonOperators_',
    text: 'pythonText_', variables: 'pythonVariables_',
    list: 'pythonList_', function: 'pythonFunction_', native: 'pythonNative_'
  };
  const isType = (block, category, opcode) => block.type === `${prefixByCategory[category]}${opcode}`;
  ```

- 之后是一大段针对具体 opcode 的 `switch`/`if` 硬编码，逐块拼 Python 文本。

> **这意味着**：即使自定义扩展让积木显示出来、能拖拽、VM 能执行，只要 `python-codegen` 不认识它的 opcode，就**生成不出 Python 代码**。这是「用户自定义积木」要落地的**头号改造点**。

### 2.5 可复用的本地文件工具

- `packages/scratch-gui/src/lib/download-blob.js`：`default(filename, blob)` 触发浏览器下载。→ **导出拓展库**直接用。
- `packages/scratch-gui/src/lib/file-uploader.js`：`handleFileUpload(fileInput, onload, onerror)` 读文件为 ArrayBuffer。→ **导入拓展库**可复用其模式。
- `packages/scratch-gui/src/containers/sb3-downloader.jsx`：项目 `.sb3` 打包下载范例（zip 打包思路可借鉴）。

---

## 3. 需求拆解

把「让学生自定义积木 + 拓展库上传下载」拆成四个能力：

| 能力 | 说明 | 依赖 |
| - | - | - |
| A. 定义自定义积木 | 配置积木名称、参数、类型、颜色、分类、代码模板 | 扩展元数据 + 数据驱动 codegen |
| B. 组织成拓展库 | 多个积木 + 图标 + 运行库 + 版本清单打成一个库 | 库文件格式（manifest） |
| C. 导入/上传到本地 | 从本地选择库文件 → 解析 → 注册积木 → 出现在扩展库/工具栏 | file-uploader + vm 动态注册 |
| D. 导出/下载到本地 | 把当前库打包成文件保存到本地 | download-blob + zip 打包 |

对照 [进度总览](../../progress/project-progress-and-commercial-gap.md) 的**阶段 H：自定义扩展库和配置导出**（当前「未开始」，优先级第四），本方案即该阶段的落地设计。

### 3.1 当前已有能力 vs 需要新增能力

| 能力 | 当前仓库状态 | 是否可复用 | 还缺什么 |
| - | - | - | - |
| 内置扩展注册 | `scratch-vm` 已支持 `builtinExtensions` | 可复用 | 自定义库不能每次都改源码注册 |
| URL 动态扩展 | `loadExtensionURL()` + Worker 已支持远程 JS | 谨慎复用 | 不适合作为学生自定义 MVP，安全面太大 |
| 扩展库 UI | `extension-library.jsx` 已能展示静态卡片 | 可复用 | 需要动态合并已导入库 |
| 积木绘制 | VM 生成 block JSON/XML，GUI 调 `defineBlocksWithJsonArray` | 可复用 | manifest 需转换为 `getInfo()` |
| Python 代码生成 | `python-codegen/index.js` 按 opcode 硬编码 | 只能部分复用 | 需要自定义模板注册表和兜底分发 |
| 本地导入 | `file-uploader.js` 可读文件 | 可复用 | 需要 manifest/zip 解析与校验 |
| 本地导出 | `download-blob.js` 可下载 Blob | 可复用 | 需要序列化 manifest/打包 `.sbext` |
| 应用级持久化 | 桌面端已有 Electron IPC 基础 | 可复用思路 | 需要用户目录读写白名单 |
| 随 `.sb3` 保存 | 原版只保存 extension IDs | 需新增 | 需要保存 manifest/资源并在加载 blocks 前恢复 |

---

## 4. 拓展库文件格式设计（核心）

借鉴 Mixly「一个自包含压缩包 = 一个库」，但内容换成 Scratch 友好、且**数据驱动、可离线**的形式。

### 4.1 包结构（`.sbext` / 本质是 zip）

```text
my-library.sbext            # zip 压缩包，扩展名自定（如 .sbext / .s3ext）
  manifest.json             # 库清单：id、名称、版本、积木列表、代码模板
  icon.svg                  # 分类/卡片图标（也可 data-uri 内联进 manifest）
  blocks/                   # 可选：复杂积木的自定义定义（进阶）
  libraries/
    mylib.py                # 可选：生成代码运行时依赖的 Python 运行库
  README.md                 # 可选：库说明
```

> MVP 阶段可以先只用**单个 `manifest.json` 文件**（不打 zip、不带运行库），把「导入导出一个 JSON 配置」跑通，再演进到 zip 包。

### 4.2 `manifest.json` 示例

```json
{
  "formatVersion": 1,
  "extensionId": "companyCustom",
  "name": "公司自定义扩展",
  "version": "1.0.0",
  "color": "#ef8c4d",
  "icon": "data:image/svg+xml;utf8,<svg.../>",
  "modes": ["python"],
  "runtimeLibrary": "libraries/mylib.py",
  "blocks": [
    {
      "opcode": "printValue",
      "blockType": "command",
      "text": "打印 [VALUE]",
      "arguments": {
        "VALUE": { "type": "string", "defaultValue": "hello" }
      },
      "codegen": {
        "python": {
          "imports": [],
          "template": "print({VALUE})"
        }
      }
    },
    {
      "opcode": "addNumbers",
      "blockType": "reporter",
      "text": "[A] 加 [B]",
      "arguments": {
        "A": { "type": "number", "defaultValue": 1 },
        "B": { "type": "number", "defaultValue": 2 }
      },
      "codegen": {
        "python": { "template": "({A} + {B})", "order": "additive" }
      }
    }
  ]
}
```

字段说明：

- `extensionId`：必须 `^[a-z0-9]+$`（VM 限制）。
- `blockType`：`command / reporter / boolean / hat / button`，映射到 `BlockType.*`。
- `arguments[].type`：`string / number / boolean / angle / color / ...`，映射到 `ArgumentType.*`。
- `codegen.python.template`：**代码生成模板**，用 `{ARG}` 占位符引用参数；`imports` 声明需要的 `import`；`order` 用于表达式优先级（决定是否加括号）。这一段是让「自定义积木自动产码」的关键。
- `runtimeLibrary`：可选，指向包内 `.py`，生成 `.py` 项目时一并写出并被 import（对齐 Mixly 的 `libraries/`）。

### 4.3 与 Mixly 格式的映射对照

| Mixly | 本方案 | 说明 |
| - | - | - |
| `config.json` version | `manifest.json` version/formatVersion | 版本管理 |
| `*.xml` toolbox category | manifest `name/color/blocks` | 分类与积木清单 |
| `block/*.js`（Blockly.Blocks） | manifest `blocks[].opcode/text/arguments` | 积木外观（声明式，不写 JS） |
| `generator/*.js`（forBlock） | manifest `blocks[].codegen.python.template` | 代码生成（模板化，不写 JS） |
| `libraries/*.py` | 包内 `libraries/*.py` + manifest `runtimeLibrary` | 运行库 |
| `media/*` `css/*` | manifest `icon` / 包内 `icon.svg` | 图标 |
| 「管理库」上传/下载文件夹 | 导入/导出 `.sbext` 包 | 库管理 |

> **设计取舍**：Mixly 让库直接携带任意 JS（`Blockly.Blocks`/`forBlock`），灵活但**有安全与沙箱风险**，且与 Scratch 的积木体系不兼容。本方案默认走**声明式 manifest（无可执行 JS）**，安全可控、跨端一致；把「需要写 JS 的高级积木」作为进阶选项（见 §5 方案三）。

---

## 5. 三种实现路线与取舍

### 方案一（推荐 MVP）：声明式 manifest + 数据驱动动态扩展

**做法**：导入 manifest → 在运行时构造一个符合 `getInfo()` 结构的对象 → 通过 vm 注册 → 改造 `python-codegen` 支持「模板驱动」的自定义 opcode。

- 积木显示：把 manifest 的 `blocks[]` 转成 `getInfo().blocks`，走现有 `extension-manager` 注册链路。
- 运行时行为：对纯代码生成型积木，VM 侧行为可为空实现（因为最终产物是 Python 文本，不需要在 VM 里"执行"）；若要在舞台模式实时执行，另配 `func`。
- 代码生成：见 §6 改造。
- 需要新增桥接层：当前 `loadExtensionURL()` 不能直接接收 manifest，需要新增 `custom-extension-registry` 一类模块，负责校验 manifest、生成 extension object、调用 VM 注册能力，并同步登记 codegen 模板。

**优点**：安全（无第三方 JS 执行）、跨浏览器/桌面一致、导入导出就是一个 JSON/zip、最贴合"学生自定义"。
**缺点**：表达能力受模板限制（复杂控制流/自定义绘制积木做不了）。

### 方案二：复用 VM 的 URL 沙箱 Worker 加载

**做法**：把库打成一个符合 `global.Scratch.extensions.register()` 约定的 JS，用现有 `loadExtensionURL(url)` 沙箱加载。

**优点**：复用既有动态加载通道，能写任意运行时逻辑。
**缺点**：库变成"可执行 JS"，**安全面大**（需要审查/签名）；仍然**不解决 Python 代码生成**（codegen 在 GUI 硬编码）；对"学生自定义"门槛高（要写 JS）。适合"公司官方扩展分发"，不适合"学生自定义积木"。

### 方案三：混合（声明式为主 + 可选高级 JS）

manifest 默认声明式；对高级用户允许在包内附带受控的生成器脚本（在受限沙箱执行）。**建议作为后期演进**，MVP 不做。

### 选型建议

| 目标人群/场景 | 推荐方案 |
| - | - |
| 学生自定义积木（主诉求） | **方案一** |
| 公司官方硬件/AI 扩展分发 | 方案二（沿用 companyHttp 那样内置或签名 URL） |
| 高级二次开发 | 方案三（后期） |

---

## 6. 代码生成改造（头号技术点）

把 `packages/scratch-gui/src/lib/python-codegen/index.js` 从「硬编码 opcode」改造为「内置块硬编码 + 自定义块模板驱动」并存：

1. **建立自定义块注册表**：导入库时，把每个自定义 opcode 的 `codegen.python`（template/imports/order）登记到一个运行时 map，key 用 `extensionId_opcode`（与 VM 生成的 block.type 对齐）。
2. **codegen 分发兜底**：`generateStack`/表达式生成里，若某 block.type 不命中任何内置分支，则查自定义注册表：
   - 解析 `template` 中的 `{ARG}`，对每个参数递归取值（子输入块 → 表达式；字段 → 字面量/`literalToPython`）。
   - 把 `imports` 合并进全局 `imports` set。
   - 按 `blockType`：command → 语句行；reporter/boolean → 表达式（依 `order` 决定括号）。
3. **运行库落盘**：生成 `.py` 项目（对接[阶段 B](../python/02-phase-b-python-file-and-run-plan.md)）时，把库的 `runtimeLibrary` 一并写入工作目录并确保 import 可用。
4. **占位符安全**：`{ARG}` 只允许映射到已声明参数；模板不做 `eval`，只做字符串替换 + 递归取值，避免注入。

> 这样内置 Python 积木照旧，自定义积木通过模板产码，二者共用一套遍历与缩进逻辑。

建议新增模块边界：

```text
packages/scratch-gui/src/lib/custom-extension/
  manifest-schema.js       # manifest 字段校验、默认值、错误信息
  manifest-to-extension.js # manifest -> getInfo() 结构
  codegen-registry.js      # block.type -> python template 注册表
  library-store.js         # 已导入库的内存/持久化状态
```

当前 MVP 已把 Python codegen 核心迁入 `scratch-vm`。`scratch-gui` 仍负责 manifest 导入、管理和模板注册；后续若要让 VM 独立理解 manifest，再考虑把 schema 和转换逻辑继续下沉到 `scratch-vm`。

---

## 7. GUI「管理库」面板设计（对齐 Mixly）

新增一个「扩展/库管理」入口（可放在扩展库弹窗顶部或菜单栏），提供：

- **已安装库列表**：名称、版本、积木数、启用/停用、删除。
- **导入库（上传到本地/工程）**：`<input type="file" accept=".sbext,.json,.zip">` → 复用 `file-uploader.js` 读取 → 解析 manifest（zip 则先解压；当前 JSZip 是 `scratch-vm` 的依赖，若 GUI 直接解包，应给 `scratch-gui` 显式加依赖或把解包放到桌面/VM 工具层）→ 校验（id 合法、formatVersion、模板占位符）→ 注册进 vm + codegen 注册表 → 刷新扩展库清单。
- **导出库（下载到本地）**：把某个库（或"当前自定义积木集合"）序列化为 manifest（+ 运行库 + 图标）→ 打成 zip → `download-blob(filename, blob)` 下载。
- **可选：可视化积木编辑器**：表单化地新建积木（opcode、文本模板 `打印 [VALUE]`、参数类型、代码模板），直接生成 manifest 条目。这是"学生自定义积木"体验最好的形态，可作为方案一之上的 UI 增强，建议 MVP 之后做。

导入后如何进入扩展库清单：现有 `libraries/extensions/index.jsx` 是**静态数组**，需改为「静态内置 + 动态已导入库」合并（把已导入库的卡片 push 进 `extensionLibraryContent` 的运行时副本，或让 `extension-library.jsx` 额外读取一个"已安装自定义库"来源）。

推荐不要直接修改静态数组本身，而是在 `extension-library.jsx` 渲染时合并：

```text
extensionLibraryContent
  + state.scratchGui.customExtensions.installedLibraries
  -> LibraryComponent.data
```

这样能保持内置扩展清单稳定，也方便后续做启用/停用、删除、搜索和按模式过滤。

---

## 8. 库的持久化与随项目保存

三个层次，按需选择：

1. **仅本次会话**：导入的库存在内存，刷新即失效（最简单，先做）。
2. **随应用持久**：桌面端把库写入用户数据目录（如 `app.getPath('userData')/extensions/<id>/`），启动时扫描加载——最接近 Mixly「库目录」模型。Web 端可用 IndexedDB。
3. **随项目保存**：若项目用到了自定义积木，最好把库清单**嵌入 `.sb3`**（参考[阶段 D](../python/../editor/02-phase-d-project-save-restore-plan.md) 复用 `.sb3` 的思路，把 manifest 存进项目 metadata/附加文件），否则换台机器打开项目会缺积木。

> 建议：MVP 用「本次会话 + 手动导入」，随后补「桌面端库目录持久化」，最后研究「随 `.sb3` 保存」。

当前仓库的 `.sb3` 序列化只会保存项目用到的 `extensions` ID，反序列化时再按 ID 调 `extensionManager.loadExtensionURL()`。它不会自动保存完整自定义库 manifest。

所以“随项目保存”需要单独设计，不能只依赖原版 `extensions` 字段：

```text
方案 A：project.json meta.companyExtensions
  优点：实现简单，读写 project.json 即可
  缺点：大型库/运行库/图标不适合塞进 meta

方案 B：.sb3 zip 附加文件 extensions/<extensionId>/manifest.json
  优点：结构清晰，可连同 icon/libraries 一起保存
  缺点：需要改保存和加载流程，加载项目 blocks 前先恢复自定义库

方案 C：项目只记录 extensionId，库由应用级目录提供
  优点：项目文件小
  缺点：换电脑打开会缺库，不适合教学资料分发
```

推荐路径：H1-H5 先不改 `.sb3`；H6 做应用级目录；H7 再做 `.sb3` 附加文件。这样不会让第一版被项目格式拖慢。

---

## 8.1 MVP 边界建议

第一版建议明确只做 **Python 编码模式的自定义积木**：

- 自定义积木能在扩展库/工具栏出现。
- 自定义积木能拖到画布。
- 自定义积木能按模板生成 Python 代码。
- 不承诺在 Scratch 舞台模式里实时运行。
- 不执行用户提供的 JS。
- 不处理复杂自定义字段、复杂渲染器和硬件上传协议。

这样可以把核心问题收敛到“积木定义 + Python codegen + 导入导出”。如果一开始同时支持舞台运行，就必须为每个自定义 opcode 提供 VM 运行函数，复杂度会明显上升。

---

## 9. 安全与校验（务必）

- **id/命名**：技术上 `extensionId` 匹配 `/^[a-z0-9]+$/i` 即可；公司规范建议统一小写字母和数字。库内 opcode 唯一，避免与内置扩展冲突。
- **无可执行代码（方案一）**：manifest 不含 JS；codegen 只做模板字符串替换，禁止 `eval`。
- **模板占位符白名单**：`{ARG}` 只能引用该积木声明过的参数名。
- **运行库落盘边界**：`runtimeLibrary` 只允许写入受控工作目录，路径需规范化，禁止 `..` 穿越。
- **导入体积/数量限制**：防止超大 zip、超多积木拖垮编辑器。
- **来源提示**：导入第三方库时提示风险；若未来支持方案二（可执行 JS 扩展），必须加签名或来源白名单，并保持沙箱 Worker（不给 `nodeIntegration`）。
- 对齐[进度总览](../../progress/project-progress-and-commercial-gap.md)的「安全 IPC」原则：所有本机文件读写走 Electron 主进程白名单，不在渲染层直接操作任意路径。

---

## 10. 分阶段落地计划（不写代码，仅排期建议）

| 阶段 | 目标 | 关键改动点 | 验收 |
| - | - | - | - |
| H1 | 定义格式 + 导入单个 manifest（内存） | 定 `manifest.json` schema；新增 manifest 校验和转换模块；`extension-library` 增加「导入」入口；把 manifest 转成 extension object 并注册到 VM | 导入一个含 1~2 个积木的 JSON，扩展库出现新分类，能拖入画布 |
| H2 | 自定义积木产码 | 改造 `python-codegen`：自定义 opcode 走模板驱动；建注册表 | 拖入自定义积木 → 右侧生成正确 Python |
| H3 | 导出库到本地 | 复用 `download-blob`；序列化 manifest（+图标）为文件/zip | 导出后能再次导入并恢复积木 |
| H4 | zip 包 + 运行库 | 支持 `.sbext` zip（含 `libraries/*.py`）；生成 `.py` 时落盘运行库 | 生成的 Python 能 `import` 库并本机运行（接阶段 B） |
| H5 | 可视化积木编辑器 | 表单化新建/编辑积木，生成 manifest 条目 | 不写 JSON 也能造积木 |
| H6 | 应用级持久化 | 桌面端库目录持久化；Web 端可选 IndexedDB | 重启后库仍在 |
| H7 | 随项目保存 | 研究 `.sb3` 附加 manifest/资源文件；加载项目时先恢复库再恢复 blocks | 带自定义积木的项目可迁移 |

优先级：H1→H2 是「能不能用」的核心；H3 满足「上传/下载到本地」的显式诉求；H4 之后接硬件/真实运行；H6/H7 负责产品化保存和迁移。

---

## 11. 待确认问题（需产品/技术决策）

1. 自定义积木**主要服务谁**：学生（→声明式、可视化，方案一）还是公司二开（→可执行 JS，方案二）？本方案默认前者。
2. 目标产物是**只生成 Python 代码**，还是也要在**舞台模式实时执行**？前者只需 codegen 模板；后者还需为每个 opcode 提供 VM `func` 实现。
3. 库文件后缀与是否加密/签名（`.sbext` vs `.json` vs `.zip`）。
4. 持久化范围：仅会话 / 应用级目录 / 随项目 `.sb3`——决定 H6 复杂度。
5. 是否需要与现有 Mixly 库（如 WonderCam）**互转**？如需，需再写一个「Mixly → 本格式」的转换器（解析其 xml + generator，映射到 manifest 模板）。

---

## 附：本调研引用的关键源码位置

- `packages/scratch-vm/src/extension-support/extension-manager.js` — 扩展注册/URL 加载
- `packages/scratch-vm/src/extension-support/extension-worker.js` — 沙箱 Worker 加载
- `packages/scratch-vm/src/extensions/scratch3_company_http/index.js` — 公司自定义扩展范例（getInfo 结构）
- `packages/scratch-gui/src/lib/libraries/extensions/index.jsx` — 扩展库卡片清单
- `packages/scratch-gui/src/containers/extension-library.jsx` — 点击加载 + 「输入扩展 URL」入口
- `packages/scratch-gui/src/containers/blocks.jsx` — toolbox 注入 / `loadExtensionURL`
- `packages/scratch-gui/src/lib/python-codegen/index.js` — **Python 代码生成（需改造为数据驱动）**
- `packages/scratch-gui/src/lib/download-blob.js` — 导出下载
- `packages/scratch-gui/src/lib/file-uploader.js` — 导入读取
- `packages/scratch-gui/src/containers/sb3-downloader.jsx` — zip 打包下载范例
- 参考样本：`D:\qq download\WonderCam\WonderCam`（Mixly 格式拓展库）
