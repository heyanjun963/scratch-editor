# 库管理器重新调研与改造方案

> 类型：重新调研 + 产品化改造方案
> 背景：当前 MVP 把“导入自定义库 / 导出 / 删除”作为卡片塞进 Scratch 扩展库页面，领导反馈不认可。目标需要对齐 Mixly 的“管理库”体验，并能承接公司已有机器人产品 Python 生成器。
> 参考样本：
> - `D:\qq download\WonderCam\WonderCam`
> - `D:\google download\python-generator.js`

---

## 1. 当前结论

当前 `manifest.json -> Python template` 的 MVP 只能证明“自定义积木能显示、能拖、能生成简单 Python”。它不够产品化，主要问题是：

1. **没有独立库管理器**：导入、导出、删除混在扩展库卡片里，和 Mixly 的“管理库”差距明显。
2. **库包能力太弱**：只支持单 JSON，不能携带图标、CSS、运行库 Python 文件、分组 XML、资源图片。
3. **代码生成能力太浅**：只能做字符串模板替换，不适合复杂产品模块、硬件初始化、变量区、setup 区、运行库文件。
4. **运行环境不完整**：WonderCam 这类库不仅生成主程序，还依赖 `libraries/wondercam.py`，当前 MVP 没有把运行库打包到本机运行或设备上传链路。
5. **管理状态不清晰**：没有“未安装 / 已安装 / 已启用 / 版本 / 介绍 / 分类 / 删除 / 导出”的表格化状态。

所以后续要从“自定义拓展卡片”升级为“库管理器 + 库包格式 + 生成器模块化”。

---

## 2. Mixly WonderCam 库结构调研

本地样本路径：

```text
D:\qq download\WonderCam\WonderCam
```

实际结构：

```text
WonderCam/
├── config.json
├── WonderCam.xml
├── block/
│   └── WonderCam.js
├── generator/
│   └── WonderCam.js
├── libraries/
│   └── wondercam.py
├── media/
│   ├── WonderCam.png
│   ├── WonderCam2.png
│   └── WonderCam3.png
└── css/
    └── WonderCam.css
```

统计结果：

| 项 | 数量 |
| - | - |
| 分类 category | 13 |
| 工具箱 XML block | 52 |
| block 定义 | 52 |
| Python generator | 53 |
| Python 运行库 | `libraries/wondercam.py` |

### 2.1 各文件职责

| 文件 | 作用 | 对我们项目的启发 |
| - | - | - |
| `config.json` | 版本号 | 需要库级 manifest |
| `WonderCam.xml` | 工具箱分类、积木排列、默认 shadow 值 | 需要支持分类树和默认参数 |
| `block/WonderCam.js` | Blockly 积木外观、字段、输入槽、颜色、tooltip | 不能只靠简单 JSON；至少要有更强的 block schema |
| `generator/WonderCam.js` | 每个积木生成 Python 的函数 | 需要比字符串模板更强的 codegen handler |
| `libraries/wondercam.py` | 设备运行时依赖库 | 库包必须能携带 Python 运行库 |
| `media/` | 图标和说明图片 | 库管理器需要展示图标 |
| `css/` | 分类图标样式 | 后续可选支持 |

### 2.2 WonderCam 生成器特征

WonderCam 使用 Blockly 新式生成器：

```js
Blockly.Python.forBlock.WonderCam_init = function () {
    let scl = Blockly.Python.valueToCode(this, 'port1', Blockly.Python.ORDER_ATOMIC);
    let sda = Blockly.Python.valueToCode(this, 'port2', Blockly.Python.ORDER_ATOMIC);
    let address = this.getFieldValue('address');
    Blockly.Python.definitions_['import_wondercam'] = 'from wondercam import WonderCam, Functions';
    Blockly.Python.definitions_['import_wondermachine'] = 'from machine import Pin, SoftI2C';
    let code = 'cam = WonderCam(SoftI2C(Pin(' + scl + '),Pin(' + sda + '), freq=400000),' + address + ')\n';
    return code;
};
```

它说明真实硬件库至少需要：

- `valueToCode`：读取输入槽里的表达式。
- `getFieldValue`：读取下拉框、文本字段。
- `definitions_`：生成 import / 全局定义。
- `return [code, order]`：返回表达式积木。
- `return code`：返回命令积木。
- `libraries/*.py`：生成代码之外，还要带运行库。

当前 MVP 的 `template` 能覆盖一部分简单场景，但覆盖不了完整 Mixly 库能力。

---

## 3. 公司现有 `python-generator.js` 调研结论

本地文件：

```text
D:\google download\python-generator.js
```

规模：

| 项 | 数量 |
| - | - |
| 文件行数 | 19034 行 |
| 文件大小 | 约 704 KB |
| `Blockly.Python.xxx = function` | 1828 个 |

主要产品/模块前缀：

| 前缀 | 数量 | 含义 |
| - | -: | - |
| `sensor` | 377 | 传感器类 |
| `actuator` | 88 | 执行器类 |
| `display` | 86 | 显示类 |
| `xarm` | 79 | 机械臂 / Hiwonder 相关 |
| `aiquadrupedpro` | 91 | 四足机器人 Pro |
| `aihexa` | 89 | 六足机器人 |
| `aimecanum` | 64 | 麦克纳姆车 |
| `ainova` / `ainovab` / `ainovae` | 约 57-60 | 不同车体 |
| `mechdog` | 44 | 机器狗 |
| `aiblocks` | 42 | AI Blocks 板卡 |
| `aidoggy` | 20 | Doggy 产品 |

### 3.1 不能直接整文件接入

这个文件的问题不是不能用，而是**不能按一个整体用**：

1. 所有产品堆在一个全局 `Blockly.Python` 上，边界不清。
2. 重名函数存在，例如 `xarm_print_str` 这类函数在文件里重复出现。
3. 生成器依赖全局状态：`imports`、`variables`、`setups`、`functions`、`threads`。
4. 不同产品混用 `Hiwonder`、`Hiwonder_BLE`、`BusServo`、`LSC`、`Motor` 等运行时。
5. 代码缩进、事件线程、启动入口都和当前项目的轻量 codegen 不一致。

正确方式是把它拆成“产品库包”，例如：

```text
company-xarm.sbext
company-mechdog.sbext
company-aiblocks.sbext
company-aiquadrupedpro.sbext
```

每个库包只带自己的 blocks、generator、runtime libraries 和 manifest。

---

## 4. 新目标：独立库管理器

入口建议放在 Python 模式头部菜单：

```text
文件  设置  管理库
```

点击 **管理库** 后打开独立弹窗，不再跳到 Scratch 原始扩展库页面。

### 4.1 页面结构

参考 Mixly：

```text
库管理器
├── 左侧导航
│   ├── 导入库
│   └── 管理库
├── 顶部 Tab
│   ├── Mixly / 兼容库
│   └── Python
├── 工具按钮
│   ├── 导入
│   └── 导出
└── 表格
    ├── 选择框
    ├── 状态
    ├── 名称
    ├── 版本
    ├── 介绍
    └── 操作
```

### 4.2 状态字段

| 状态 | 含义 |
| - | - |
| `not-installed` | 未安装，只在内置仓库或导入预览中 |
| `installed` | 已导入到用户目录 |
| `enabled` | 当前 Python 模式已启用，工具箱显示分类 |
| `disabled` | 已安装但当前不显示 |
| `invalid` | manifest 或文件结构错误 |

### 4.3 与 Scratch 扩展库的关系

Scratch 扩展库继续负责原始 Scratch 扩展，例如音乐、画笔、micro:bit。

公司自定义 Python / 机器人库走新的 **库管理器**。

不要再把这些管理动作作为卡片塞进 `extension-library.jsx`。

---

## 5. 库包格式建议：`.sbext`

后续不要只用单 JSON。建议定义公司库包格式：

```text
xxx.sbext               # 本质 zip
└── manifest.json
└── toolbox.xml
└── blocks/
    └── index.json      # 推荐声明式
└── generators/
    └── python.json     # 推荐声明式增强版
└── libraries/
    └── *.py
└── media/
    └── icon.png
└── docs/
    └── README.md
```

兼容 WonderCam / Mixly 包时，也可以允许：

```text
block/*.js
generator/*.js
css/*.css
```

但这类 JS 包必须作为“公司可信库”处理，不能给普通用户随便执行。

### 5.1 `manifest.json` 草案

```json
{
  "formatVersion": 2,
  "id": "wondercam",
  "name": "WonderCam 视觉模块",
  "version": "1.0.1",
  "description": "视觉识别扩展库",
  "target": "python",
  "vendor": "Company",
  "entry": {
    "toolbox": "toolbox.xml",
    "blocks": "blocks/index.json",
    "pythonGenerator": "generators/python.json"
  },
  "runtime": {
    "pythonLibraries": ["libraries/wondercam.py"]
  },
  "assets": {
    "icon": "media/WonderCam.png"
  },
  "compatibility": {
    "source": "mixly",
    "trustedJs": false
  }
}
```

---

## 6. Python codegen 要升级成上下文模型

当前 `packages/scratch-vm/src/codegen/python.js` 只有：

```text
imports
body
```

真实产品库至少需要：

```text
imports
definitions
variables
setups
functions
threads
body
runtimeFiles
```

建议新增 `PythonCodegenContext`：

```js
{
    imports: Set,
    definitions: Map,
    variables: Map,
    setups: Map,
    functions: Map,
    runtimeFiles: Map,
    addImport(key, code),
    addDefinition(key, code),
    addVariable(key, code),
    addSetup(key, code),
    addFunction(key, code),
    addRuntimeFile(path, content)
}
```

这样 WonderCam 的：

```js
Blockly.Python.definitions_['import_wondercam'] = 'from wondercam import WonderCam, Functions';
```

可以迁移为：

```js
context.addDefinition('import_wondercam', 'from wondercam import WonderCam, Functions');
```

---

## 7. 生成器兼容路线

### 路线 A：声明式增强生成器

适合用户自定义库和课程库。

优点：

- 安全。
- 易导出。
- 易审查。
- 不执行用户 JS。

缺点：

- 对复杂产品库表达能力有限。

### 路线 B：公司可信 JS 生成器

适合迁移现有机器人产品。

做法：

- 把旧 `python-generator.js` 按产品前缀拆成多个模块。
- 每个模块只暴露自己的 block generator。
- 只允许内置或签名库启用 JS generator。
- 普通用户导入的 `.sbext` 默认不执行 JS。

优点：

- 可以承接 `xarm`、`mechdog`、`aiquadrupedpro` 等复杂产品。
- 迁移成本低于全部重写成模板。

缺点：

- 有安全边界和维护成本。
- 必须处理沙箱、签名或白名单。

### 路线 C：Mixly 包导入器

适合把 WonderCam 这种目录导入为本项目库包。

做法：

1. 读取 `config.json`。
2. 读取 `WonderCam.xml` 生成分类和默认 blocks。
3. 解析 `block/WonderCam.js`，人工或半自动转换为 block schema。
4. 解析 `generator/WonderCam.js`，转换为 codegen handler。
5. 拷贝 `libraries/*.py` 到库包运行库。
6. 拷贝 `media/*` 作为图标和说明资源。

第一版不建议做完全自动转换。更稳妥的是做“导入结构识别 + 半自动生成草稿 + 人工校正”。

---

## 8. 推荐工程模块分布

### GUI 层

```text
packages/scratch-gui/src/components/library-manager/
  library-manager.jsx
  library-manager.css
  library-table.jsx
  library-import-panel.jsx
  library-detail-panel.jsx

packages/scratch-gui/src/containers/library-manager.jsx

packages/scratch-gui/src/reducers/library-manager.js
```

职责：

- 管理库弹窗 UI。
- 表格、Tab、导入、导出、启用、禁用、删除。
- 展示库状态、版本、介绍。

### 自定义库解析层

```text
packages/scratch-gui/src/lib/library-manager/
  package-reader.js       # 读取 .sbext/.zip/.json
  manifest-v2.js          # manifest 校验
  mixly-importer.js       # WonderCam 类 Mixly 包识别
  library-persistence.js  # 本地持久化
  library-exporter.js     # 打包导出
```

职责：

- 读取库包。
- 校验格式。
- 导出库包。
- 管理用户目录文件。

### VM 层

```text
packages/scratch-vm/src/codegen/python/
  index.js
  context.js
  builtin-generators.js
  custom-template-generators.js
  trusted-js-generators.js

packages/scratch-vm/src/extensions/company_library_runtime/
```

职责：

- Python codegen 上下文。
- 自定义库 block 注册。
- 运行库文件收集。
- 可信 JS generator 执行。

### Electron 层

```text
desktop/main.js
desktop/preload.js
```

新增 IPC：

```text
libraryManager:list
libraryManager:importPackage
libraryManager:exportPackage
libraryManager:deletePackage
libraryManager:setEnabled
libraryManager:getRuntimeFiles
```

用户目录建议：

```text
<userData>/custom-extension-libraries/
├── registry.json
├── packages/
│   └── wondercam@1.0.1/
│       ├── manifest.json
│       ├── toolbox.xml
│       ├── libraries/
│       └── media/
└── exports/
```

---

## 9. 分阶段落地计划

### 阶段 1：独立库管理器 UI

目标：先把“管理库”从扩展库页面拆出来。

任务：

1. Python 顶部菜单 **管理库** 打开独立弹窗。
2. 弹窗左侧有 **导入库 / 管理库**。
3. 中间有 **Mixly / Python** Tab。
4. 表格展示已安装库：状态、名称、版本、介绍。
5. 现有 JSON MVP 迁移到新管理器里，不再显示在 Scratch 扩展库卡片中。

验收：

- 扩展库页面不再出现 Import/Export/Delete 卡片。
- 管理库弹窗可以导入、删除、导出现有 JSON 库。
- Python 模式左侧分类仍能显示导入库。

### 阶段 2：库包持久化目录

目标：从单个 `libraries.json` 升级成库目录。

任务：

1. 新增 `registry.json`。
2. 每个库独立目录保存。
3. 导出时能打包成 `.sbext`。
4. 保留旧 JSON 导入兼容。

验收：

- 重启桌面端后库列表和启用状态恢复。
- 导出的 `.sbext` 可以重新导入。

### 阶段 3：Python codegen 上下文升级

目标：支持真实硬件库生成代码。

任务：

1. 新增 `PythonCodegenContext`。
2. 支持 `definitions`、`variables`、`setups`、`functions`。
3. 支持 `runtimeFiles`。
4. 当前模板生成器迁移到新上下文。

验收：

- 旧 JSON 模板库仍能生成代码。
- WonderCam init 类积木能生成 import 和初始化代码。
- 生成结果能同时产出 `main.py` 和 `libraries/wondercam.py`。

### 阶段 4：WonderCam 兼容试点

目标：用 WonderCam 做第一个真实库包。

任务：

1. 手动整理 WonderCam manifest v2。
2. 迁移 10 个核心积木。
3. 携带 `wondercam.py`。
4. 生成 Python bundle。

验收：

- 管理库中显示 WonderCam。
- 安装后 Python 工具箱出现 WonderCam 分类。
- 拖动初始化、切换功能、更新结果、检测人脸等积木能生成完整 Python。

### 阶段 5：公司机器人产品迁移

目标：拆 `python-generator.js`。

任务：

1. 选一个产品前缀，例如 `xarm`。
2. 提取该产品 block schema。
3. 提取该产品 generator。
4. 打成 `company-xarm.sbext`。
5. 接入上传链路。

验收：

- 不再把 19000 行大文件整体接入。
- 每个产品作为独立库安装、启用、导出。
- 生成代码包含对应产品运行时 import/setup。

---

## 10. 当前代码需要调整的地方

上一轮已实现：

- manifest v1 导入。
- 自定义库持久化。
- VM 动态注册。
- 模板驱动 Python 生成。

但下一轮需要重构：

| 当前实现 | 问题 | 调整 |
| - | - | - |
| `extension-library.jsx` 里塞导入/导出/删除卡片 | 产品形态不对 | 移到独立 `LibraryManager` |
| 单 JSON manifest | 不能携带资源和运行库 | 升级 `.sbext` |
| codegen 只有 imports/body | 不能承接真实硬件库 | 增加 codegen context |
| Electron 只保存 `libraries.json` | 不能保存包目录 | 改为 registry + packages 目录 |
| 自定义库直接进扩展库页面 | 和 Scratch 原扩展混杂 | Python 顶部菜单管理库统一管理 |

---

## 11. 风险和边界

1. **不要执行用户上传 JS**：普通用户库必须走声明式格式。
2. **公司可信库可以支持 JS generator**：但要白名单或签名。
3. **本机 Python 不等于设备 Python**：WonderCam 依赖 `machine`、`SoftI2C`，只能在 MicroPython/设备侧运行。
4. **上传协议另算**：库管理器只负责库和代码生成，不等于真实烧录完成。
5. **Mixly 自动转换不能一口吃完**：先做 WonderCam 试点，再抽象工具。

---

## 12. 下一步建议

下一步优先做 **阶段 1：独立库管理器 UI**。

原因：

- 它直接回应领导反馈。
- 不会立刻碰最复杂的 codegen 兼容。
- 可以复用现有 manifest v1 能力。
- 后续 `.sbext`、WonderCam、机器人产品都可以逐步挂进来。

阶段 1 做完后，当前体验会从：

```text
扩展库页面里混着 Import/Export/Delete 卡片
```

变成：

```text
Python 顶部菜单 -> 管理库 -> 独立弹窗 -> 导入库 / 管理库 / 表格状态
```

这才接近 Mixly 的产品形态。
