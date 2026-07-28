# Mind+ 用户库格式兼容方案

## 目标

让扩展作者尽量只维护一份 Mind+ 风格源码目录，同时供 Mind+ 和本编辑器使用。

本文先确定格式、兼容边界和 Python 测试基线，当前已按文末执行计划实现 `.mpext` Python 兼容子集。

## 调研依据

| 来源 | 用途 |
| - | - |
| `D:\google download\ext-DFRobotHCHOSensor-master\ext-DFRobotHCHOSensor-master` | 核对真实 Arduino C 用户库、分主板菜单、C++ 库和 `.mpext` 内容 |
| [Mind+ 用户库开发详细教程](https://mindplus.dfrobot.com.cn/ext-api) | 核对目录、注释指令、Generator API、资源文件和导出流程 |
| [Mind+ Python 模式示例](https://mindplus.dfrobot.com.cn/ext-python) | 核对 `asset.python`、依赖和 Python 库目录 |
| [Mind+ microPython 模式示例](https://mindplus.dfrobot.com.cn/ext-mpython) | 核对 microPython 模式的生成区域和资源组织 |

本地 HCHO 的 `.mpext` 文件头为 `PK`，内容可按 ZIP 读取。它包含 `config.json`、`arduinoC/main.ts`、菜单、多语言、图片和压缩后的库文件。

## 格式对比

| Mind+ 字段或文件 | 当前扩展格式 | 兼容判断 |
| - | - | - |
| 根目录 `config.json` | `manifest.json` | 可映射，当前读取器已有文件名别名 |
| 多语言 `name`、`description` | 单字符串 | 需要扩展标准化规则 |
| `author`、`email`、`license`、`platform` | 当前未保留 | 可作为包元数据保留 |
| `asset.python` | `target: python` 和 `entry` | 可映射 |
| `asset.arduinoC` | 当前没有 Arduino C 后端 | 只能识别，暂不能运行 |
| `main.ts` 注释定义积木 | `blocks.json` | 需要静态解析器 |
| `Generator.addCode` | `codegen.python.template` | 简单模板可映射 |
| `Generator.addImport` | `imports` | 单纯 import 可映射，任意顶层代码需新增 preamble |
| `Generator.addObject` | `variables` | 可映射 |
| `Generator.addVariableForce` | `forcedVariables` | 按变量名覆盖普通初始化 |
| `Generator.addSetup` | `setups` | 可映射 |
| `Generator.addEvent` | `entryTemplate`、`entryFooter` | 需要专门转换规则 |
| `_menus/*.json` | `menus` | 可映射，需处理分主板文件和默认值键 |
| `_locales/*.json` | 当前固定文案 | 需要加载语言并回退到 `main.ts` 默认文本 |
| `libraries/*.py` | `runtime.pythonLibraries` | 可映射 |
| `asset.python.dependencies` | 当前未完整支持 | 需要依赖声明与安装策略 |
| `.mpext` | `.zip`、`.sbext` | 都是 ZIP，只需增加后缀和结构分流 |

当前 `package-reader.js` 虽会把 `config.json` 当作 manifest 别名，但随后仍要求 `blocks.json` 和 `generator/python.json`。因此这只是文件名兼容，不是 Mind+ 包兼容。

## 推荐的共享源码目录

第一阶段以 Mind+ 官方结构作为作者面对的源格式：

```text
my-extension/
├── config.json
└── python/
    ├── main.ts
    ├── _menus/
    │   └── index.json
    ├── _locales/
    │   ├── zh-cn.json
    │   └── en.json
    ├── _images/
    │   └── icon.svg
    └── libraries/
        └── helper.py
```

作者只维护这套目录。Mind+ 按原格式读取，本编辑器在导入时把它转换成现有内部 manifest。

暂不要求作者同时维护 `blocks.json` 和 `generator/python.json`。这两个文件应由兼容转换器生成，或者只存在于运行时内存中。

## 转换流程

```text
.mpext / ZIP / config.json 目录
  -> 读取并校验 config.json
  -> 根据 asset 选择 python 或 arduinoC
  -> 读取 main.ts、_menus、_locales、libraries
  -> 静态解析 //% 指令和受支持的 Generator 调用
  -> 生成当前 normalizeCustomExtensionManifest 所需数据
  -> 复用现有注册、持久化和 Python 代码生成链路
```

解析器不能使用 `eval`、`Function`、Node `require` 或 Electron 主进程执行陌生 `main.ts`。

## 第一阶段兼容子集

### 支持

- `namespace`、颜色和图标尺寸声明。
- `command`、`reporter`、`boolean`、`hat`。
- `normal`、`string`、`number`、`boolean`、`dropdown`、`dropdownRound`。
- `block`、`shadow`、`options` 和 `defl`。
- `_menus` 中的显示值、生成值和 `default_<function>_<argument>`。
- `_locales` 中的 `namespace.function|block` 和 `namespace.menu.value|menu`。
- `Generator.addImport`、`addObject`、`addVariableForce`、`addSetup`、`addCode` 的静态字符串和模板字符串。
- Python `dependencies` 和 `libraries/*.py` 的元数据读取。

### 暂不支持

- 执行任意 TypeScript 或访问文件、网络、进程和 Node API。
- 循环、递归、动态属性、动态函数调用和无法静态确定的表达式。
- `externalFunc`、输入联动、运行时校验函数和自定义控件逻辑。
- `matrix`、`colorPalette`、`colorSlider`、`note` 等复杂控件。
- 完整 `Generator.addEvent` 和动态回调生成。
- `board` 指令、`Generator.board` 分支和分主板菜单。
- Arduino C 编译、预编译 `.o` 链接和板卡工具链。
- 自动安装未经确认的 pip 依赖。

解析器遇到不支持语法时必须返回文件、函数和指令位置，不能静默忽略或执行降级代码。

## 安全边界

1. ZIP 解包继续使用路径白名单、大小限制和总文件数限制。
2. `main.ts` 只进入 AST 解析器，不进入 JavaScript 运行时。
3. 只转换白名单中的注释指令和 `Generator` 调用。
4. 本地 Python 库作为数据保存，上传前仍需显示来源和包版本。
5. `dependencies` 第一阶段只记录在 `runtime.pythonDependencies`，不自动联网安装。
6. 云端包继续使用版本、SHA256 和离线缓存记录。

## 测试包

测试源目录位于：

```text
packages/scratch-gui/test/fixtures/custom-extension/mindplus/
```

| 测试包 | 覆盖内容 |
| - | - |
| `aidoggy-python-fixture` | AiDoggy 17 个现有积木、8 个菜单、翻译和 Python 生成规则 |
| `python-basic-fixture` | `asset.python`、菜单、翻译、pip 依赖、本地 Python 库和基础 Generator 调用 |

两个测试包均使用 Python 模式。AiDoggy fixture 从刚完成的声明式产品包提取测试基线，但不包含真实硬件运行库。

当前没有可用于人工验收的 Arduino C 设备，因此不创建 Arduino C 测试包，也不把 Arduino C 兼容列入近期验收范围。HCHO 样包只保留为目录格式调研依据。

重新生成 `.mpext`：

```powershell
node packages/scratch-gui/scripts/pack-mindplus-fixtures.mjs
```

生成结果位于同目录的 `dist/`。打包器固定 ZIP 条目时间，保证相同源码得到相同二进制和 SHA256。

## 实施顺序

1. 增加 `.mpext` 后缀识别和 Mind+ Python 结构判定，但暂不注册积木。
2. 实现 `config.json`、Python 菜单和多语言标准化。
3. 使用 AST 解析 `python/main.ts` 的积木注释，先生成积木外观。
4. 转换 Python 模式的基础 Generator 调用并接入现有 codegen。
5. 用 AiDoggy 和基础 Python fixture 做包结构、错误定位和生成结果测试。
6. 人工使用 Mind+ 导入同一 Python fixture，确认共享源码仍可被 Mind+ 接受。
7. 兼容层稳定后，按产品逐个迁移到 Mind+ Python 作者源格式，并继续使用同一解析器生成内部 manifest。

## Python 兼容解析器执行计划

本轮实现一个可通过 AiDoggy fixture 验证的 Python MVP，不处理 Arduino C。

### 代码范围

| 文件 | 本轮职责 |
| - | - |
| `src/lib/custom-extension/mindplus-package-adapter.js` | 静态解析 Mind+ 配置、积木注释和 Python Generator 调用 |
| `src/lib/custom-extension/package-reader.js` | 识别 `.mpext`，读取 Python asset、菜单、多语言和本地库 |
| `test/unit/lib/custom-extension/mindplus-package-reader.test.js` | 锁定 AiDoggy 转换、基础 Python 库和拒绝语义 |
| `test/fixtures/custom-extension/mindplus/aidoggy-python-fixture/config.json` | 保存可选的分类和入口兼容元数据，不重复定义积木 |

### AST 白名单

解析器使用现有 `@babel/parser` 读取 TypeScript 语法树。它只接受以下结构：

1. 一个与 `config.id` 相同的 `namespace`。
2. `export function` 及其前方的 `//%` 指令。
3. `const name = parameter.ARG.code` 形式的参数读取。
4. `Generator.addImport`、`addObject`、`addVariableForce`、`addSetup` 和 `addCode`。
5. Generator 参数只能是字符串或仅引用已登记参数变量的模板字符串。

函数内出现条件分支、循环、普通函数调用、成员赋值、动态模板表达式或其他语句时，解析器直接拒绝，并报告 opcode 和行号。

### 转换规则

| Mind+ 内容 | 内部结果 |
| - | - |
| `config.name/description` | 优先 `zh-cn`，然后 `en`，最后使用 ID |
| namespace 颜色 | `color1/color2/color3` |
| `block`、`blockType` | block 的 `text` 和 `blockType` |
| `ARG.shadow` | argument 类型 |
| `ARG.options` | menu 名称，并标记为固定字面量 |
| `ARG.defl` | 默认值 |
| `_menus/index.json` | `{text, value}` 菜单及函数参数默认值 |
| `_locales/zh-cn.json` | 覆盖积木和菜单显示文案 |
| `addImport` 中的 import/from | `imports` |
| `addImport` 中的赋值 | `variables` |
| `addImport` 中的其他顶层代码 | `setups` |
| `addObject` | `variables` |
| `addVariableForce` | `forcedVariables`，生成时按 `name` 覆盖普通变量初始化 |
| `addSetup` | `setups` |
| `addCode` | Python `template` |
| `python/libraries/*.py` | `runtime.pythonLibraries` 和包内文件内容 |

### 可选兼容元数据

Mind+ 没有当前产品包使用的子分类、`section` 和 `launcher`。fixture 可在 `config.json` 增加 `scratchEditor`：

```json
{
  "scratchEditor": {
    "categories": [],
    "blocks": {
      "start_thread": {
        "section": "main",
        "launcher": "Hiwonder.startMain({MAIN})"
      },
      "start_run_thread": {
        "section": "setup"
      }
    }
  }
}
```

该字段只补充 Mind+ 未表达的运行信息，不重复积木文案、参数、菜单或生成代码。

### 测试顺序

1. 先证明现有读取器拒绝 `.mpext`。
2. 锁定 AiDoggy 转换后 17 个 opcode、8 个菜单、中文文案和入口元数据。
3. 锁定基础 Python fixture 的模板、import 和本地库内容。
4. 锁定 Arduino C asset 的明确拒绝信息。
5. 锁定函数内普通调用或条件分支的 opcode、行号错误。
6. 实现解析器并让上述测试通过。
7. 回归 `.json`、`.zip`、`.sbext` 以及现有三个内置产品包。

## 验收标准

- 同一份 Python fixture 源目录不需要重复编写积木定义。
- Mind+ 能按官方方式导入测试源或 `.mpext`。
- 本编辑器能静态转换并生成与 fixture 预期一致的 Python。
- 不支持语法会明确拒绝，并指出具体位置。
- 导入过程不执行 `main.ts`。
- AiDoggy fixture 转换后必须得到与当前标准包一致的 17 个 opcode 和菜单 value。

## 当前结论

外层目录、元数据、菜单、多语言和库文件可以高度兼容 Mind+。核心差异集中在 `main.ts`：Mind+ 允许执行生成器代码，本编辑器当前使用声明式 JSON。当前实施和人工验收先聚焦 Python，Arduino C 延后处理。

后续统一把 Mind+ Python 目录作为所有产品的作者源格式，并通过受限静态转换器生成内部 manifest。产品维护者只编辑 `config.json`、`python/main.ts`、菜单、多语言和 Python 库，不再手工同步维护 `blocks.json` 与 `generator/python.json`；内部 manifest 继续作为编辑器运行时数据结构，不作为产品源文件。

## Python 解析器执行结果

> 验收状态：自动化测试和本轮人工校对均已通过；后续每迁移一个正式产品，仍需单独执行积木、代码生成和真机回归。

本轮已完成 Python 兼容 MVP：

| 文件 | 完成内容 |
| - | - |
| `mindplus-package-adapter.js` | 使用 Babel AST 解析 namespace、积木指令、参数绑定和 Generator 白名单调用 |
| `package-reader.js` | 支持 `.mpext`，分流 Mind+ Python 包并读取菜单、多语言和本地 Python 库 |
| `package-manifest.js` | 允许记录 `mindplus-python-package-v1` 来源结构 |
| `product-extension-library.jsx` | 本地导入文件选择器允许 `.mpext` |
| `library-manager.jsx` | 库管理器文件选择器允许 `.mpext` |
| `mindplus-package-reader.test.js` | 覆盖 AiDoggy 转换、VM 生成、运行库、Arduino 拒绝、AST 拒绝和路径越界 |

当前 AiDoggy `.mpext` 可转换出 17 个 opcode、8 个菜单、5 个分类、中文文案和入口元数据。转换结果可以直接参与现有 VM Python 代码生成。

兼容层会在根配置未声明版本时读取 `asset.python.version`，并按 `en -> zh -> zh-cn` 顺序合并语言文件。`asset.python.dependencies` 会随 manifest 持久化，但当前不会自动安装 pip 包。

解析器不会执行 `main.ts`。函数中出现普通调用、分支、循环或动态模板表达式会被拒绝，并报告 opcode 和行号。帽子积木必须通过 `scratchEditor.blocks` 明确声明 `section`。

自动化验证已覆盖 Mind+ 解析、fixture 确定性打包、内置快照、三个产品包及代码生成、持久化、远程缓存/客户端、同步脚本、拓展页面和默认工具箱，共 15 个 Jest suite、64 项测试，全部通过。三个产品均已生成确定性 `.mpext` 并通过旧行为深比较；AiDoggy 远程 `0.1.2` 已完成下载和 SHA256 校验。编辑器内置加载已切换为 MPEXT 生成快照，旧拆分 JSON 已删除。`node --check` 与 `git diff --check` 通过。ESLint 因当前 `node_modules` 缺少 `unrs-resolver` 可选原生绑定未能启动，本轮未通过重装依赖改变环境。

## 后续产品统一迁移计划

1. 固化公司对 `scratchEditor.categories`、帽子积木 `section` 和 `launcher` 的扩展约定，并补充面向产品维护者的模板说明。
2. AiDoggy 正式产品源已迁移为 Mind+ Python 目录，产品包与编辑器 fixture 二进制一致。
3. miniHexa 和 AI 机甲麦轮车均已迁移为 Mind+ Python 目录并完成统一打包与等价性验证。
4. 产品同步脚本和远程 catalog 已支持 `.mpext`，版本、SHA256、离线缓存和检查更新流程保持不变。
5. 每个产品迁移后分别执行积木外观、菜单参数、完整 Python 对照和真机测试，未通过人工校对前不进入公开 catalog。
