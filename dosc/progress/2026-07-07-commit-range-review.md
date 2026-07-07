# 2026-07-07 提交范围 Review 记录

范围：`8a1cdee87559e823fabcfdc650d40c090cdb3e1b..8a73e89`

本轮范围共有 18 个提交、115 个变更文件，覆盖桌面端、Python 编码模式、交互式终端、串口 MVP、自定义拓展库、产品拓展页和 AI 机甲麦轮车迁移。

## Review 总结

- 桌面端主链路可读性已经补齐中文注释：窗口/Tab、WebContentsView、PythonRunner、TerminalRunner、Web Serial、拓展库持久化都有明确职责说明。
- Python 代码生成链路已经补齐中文注释：表达式生成、语句生成、入口栈、setup 顶层代码、entryTemplate/entryFooter、散落积木过滤都有说明。
- 自定义拓展库链路已经补齐中文注释：manifest schema、包读取、模板注册、VM 注册、持久化和产品拓展页安装流程都有说明。
- Python 基础积木 VM 扩展已补充“运行时预览”和“最终 Python 生成”的边界注释，避免误解 VM 方法就是最终代码执行逻辑。
- 仍需后续产品化的点：串口上传当前只是写入文本，不是硬件烧录协议；版本检查当前是占位交互；本地库管理弹窗已不是主入口；六路巡线组合状态积木还缺自定义 LINE6 输入控件。

## 注释策略

本轮没有给每一行调用都写机械注释。注释颗粒度按以下规则控制：

- 文件职责：对新增关键文件补文件级或模块级中文注释。
- 函数职责：对业务函数、IPC 边界、转换函数、注册函数、运行函数补中文注释。
- 调用链：对非直观调用顺序补注释，例如“注册 VM 后还要注册 Python 模板”“先等待 EXTENSION_ADDED 再回到分类”。
- 简单 getter、纯 UI JSX、样式文件、package-lock 不强行补注释，避免注释噪音。

## 文件清单与 Review

### 根配置

| 文件 | 作用 | Review 结论 |
| --- | --- | --- |
| `.gitignore` | 忽略桌面端构建产物和临时文件。 | 合理，注意后续不要把 `desktop-dist`、运行缓存提交。 |
| `package.json` | 根脚本增加桌面运行/打包相关命令。 | 合理，依赖安装仍按锁文件控制。 |
| `package-lock.json` | 锁定 Electron、xterm、node-pty 等依赖。 | 自动生成文件，不做手工注释。 |
| `electron-builder.yml` | Electron 打包配置。 | 当前可支持生产打包，后续需要补签名、图标、更新通道。 |
| `packages/scratch-gui/package.json` | GUI 包新增终端/压缩包相关依赖。 | 合理，后续依赖升级要同步验证 webpack。 |

### 桌面端

| 文件 | 作用 | Review 结论 |
| --- | --- | --- |
| `desktop/main.js` | Electron 主进程，管理窗口、Tab、WebContentsView、权限、串口、Python/终端 IPC、拓展库持久化。 | 核心逻辑已补中文注释；文件偏大，后续建议拆分 tabs、serial、python、custom-extension 模块。 |
| `desktop/preload.js` | 通过 `contextBridge` 暴露受限桌面 API。 | 已补中文注释；API 面清晰，继续保持最小暴露。 |
| `desktop/start.js` | 开发态一条命令启动 GUI dev server 和 Electron。 | 已补中文注释；已规避 Windows `spawn EINVAL`。 |
| `desktop/build-gui.js` | 桌面打包前构建 scratch-gui。 | 已补中文注释；生产构建入口清晰。 |
| `desktop/clean-dist.js` | 清理桌面构建目录。 | 已补安全注释；保留 workspace 路径保护。 |
| `desktop/python-runner.js` | 非交互 Python 运行器，写入 `main.py` 并捕获 stdout/stderr。 | 已补类/方法注释；适合作为 PTY 不可用时降级。 |
| `desktop/terminal-runner.js` | 基于 `node-pty` 的交互式 Python 终端。 | 已补类/方法注释；Windows 下真实 `python.exe` 探测逻辑合理。 |
| `desktop/home/home.js` | 桌面首页模式选择入口。 | 已补注释；只负责把模式交给主进程创建 tab。 |
| `desktop/home/index.html` | 首页静态结构。 | 结构简单，不需要代码注释。 |
| `desktop/home/styles.css` | 首页样式。 | 样式文件不做逐规则注释。 |
| `desktop/shell/shell.js` | 顶部浏览器式 tab 条渲染。 | 已补注释；只消费主进程 tab 状态，不直接操作编辑器视图。 |
| `desktop/shell/index.html` | 桌面壳 HTML。 | 结构简单，不需要代码注释。 |
| `desktop/shell/styles.css` | 桌面壳 tab 样式。 | 样式文件不做逐规则注释。 |
| `desktop/loading/index.html` | 编辑器加载过渡页。 | 结构简单。 |
| `desktop/loading/styles.css` | 加载页样式。 | 样式文件不做逐规则注释。 |

### GUI 主界面与菜单

| 文件 | 作用 | Review 结论 |
| --- | --- | --- |
| `packages/scratch-gui/src/components/gui/gui.jsx` | GUI 主布局，接入 PythonCodingPanel，按桌面 URL 同步编辑器模式。 | 已补中文注释；Python 模式隐藏造型、声音、书包和水印符合当前需求。 |
| `packages/scratch-gui/src/components/gui/gui.css` | GUI 布局样式，支持 Python 模式右侧代码区。 | 样式文件不做逐规则注释。 |
| `packages/scratch-gui/src/components/blocks/blocks.css` | blocks 区样式，包含禁用积木视觉样式。 | 样式文件不做逐规则注释；禁用样式已由 JS 添加 class。 |
| `packages/scratch-gui/src/containers/gui.jsx` | GUI 容器，连接 mode/redux 状态。 | 逻辑较少，当前无风险。 |
| `packages/scratch-gui/src/components/menu-bar/menu-bar.jsx` | 原菜单栏，Python 模式下切换到专用菜单栏。 | 逻辑可行；后续可删除旧的头部模式切换残留。 |
| `packages/scratch-gui/src/components/menu-bar/menu-bar.css` | 菜单栏与串口工具样式。 | 样式文件不做逐规则注释。 |
| `packages/scratch-gui/src/components/menu-bar/python-menu-bar.jsx` | Python 模式专用菜单栏，保留文件/设置并接入串口 MVP。 | 已补中文注释；当前上传只是串口写文本，不是烧录协议。 |
| `packages/scratch-gui/src/components/library/library.jsx` | 原版库组件，适配拓展页展示。 | 原版组件小改，未发现阻塞风险。 |
| `packages/scratch-gui/src/containers/extension-library.jsx` | Python 模式下进入产品拓展库，其他模式走原版拓展库。 | 已补注释；入口分流清晰。 |

### Python 编码面板与终端

| 文件 | 作用 | Review 结论 |
| --- | --- | --- |
| `packages/scratch-gui/src/components/python-coding-panel/python-coding-panel.jsx` | 展示 Python 代码区、运行按钮、终端区域。 | 展示组件职责清晰。 |
| `packages/scratch-gui/src/components/python-coding-panel/python-coding-panel.css` | Python 代码面板样式。 | 样式文件不做逐规则注释。 |
| `packages/scratch-gui/src/containers/python-coding-panel.jsx` | 连接 Redux、xterm 和 Electron Python/PTY IPC。 | 已补中文注释；优先 PTY、降级普通 PythonRunner 的策略明确。 |
| `packages/scratch-gui/src/components/python-terminal/python-terminal.jsx` | xterm 终端展示组件。 | 已补中文注释；通过 imperative ref 控制 write/clear/fit 合理。 |
| `packages/scratch-gui/src/components/python-terminal/python-terminal.css` | xterm 容器样式。 | 样式文件不做逐规则注释。 |
| `packages/scratch-gui/src/lib/python-codegen/index.js` | GUI 到 scratch-vm Python codegen 的桥接。 | 已补注释；模板查询从 GUI 注册表注入。 |
| `packages/scratch-gui/src/reducers/python-coding.js` | Python 模式代码、运行、终端、串口状态。 | 已补中文注释；控制台 Redux 历史有 200 行截断。 |

### Blocks 工作区与 Python 工具箱

| 文件 | 作用 | Review 结论 |
| --- | --- | --- |
| `packages/scratch-gui/src/containers/blocks.jsx` | 初始化 scratch-blocks，Python 模式下加载 Python 拓展、生成代码、禁用特定积木。 | 已补中文注释；散落积木不产码逻辑在 VM codegen 侧实现。 |
| `packages/scratch-gui/src/lib/blocks.js` | blocks 初始化辅助逻辑。 | 小改动，未发现阻塞风险。 |
| `packages/scratch-gui/src/lib/libraries/extensions/index.jsx` | 拓展库列表数据，补 Python 模式可见项。 | 数据文件，不做函数注释。 |

### 自定义拓展库与产品拓展页

| 文件 | 作用 | Review 结论 |
| --- | --- | --- |
| `packages/scratch-gui/src/components/product-extension-library/product-extension-library.jsx` | 新版产品拓展库整页，支持筛选、内置产品、本地导入导出、主控切换确认。 | 已补中文注释；`alert` 和版本检查仍是占位，后续需产品化。 |
| `packages/scratch-gui/src/components/product-extension-library/product-extension-library.css` | 产品拓展页样式。 | 样式文件不做逐规则注释。 |
| `packages/scratch-gui/src/components/library-manager/library-manager.jsx` | 旧版弹窗式本地库管理器。 | 已补注释；主入口已迁到产品拓展页，保留兼容。 |
| `packages/scratch-gui/src/components/library-manager/library-manager.css` | 旧版库管理弹窗样式。 | 样式文件不做逐规则注释。 |
| `packages/scratch-gui/src/containers/library-manager.jsx` | 旧版库管理弹窗容器。 | 已补注释；安装流程与新页面一致。 |
| `packages/scratch-gui/src/lib/custom-extension/manifest-schema.js` | 自定义拓展 manifest 校验、标准化、序列化。 | 已补中文注释；是声明式拓展库协议核心。 |
| `packages/scratch-gui/src/lib/custom-extension/package-reader.js` | 读取 `.json/.zip/.sbext` 并合并目录包 manifest/blocks/generator/runtime。 | 已补中文注释；兼容 WonderCam 类目录结构但不强制兼容旧语法。 |
| `packages/scratch-gui/src/lib/custom-extension/manifest-to-extension.js` | 把 manifest 转成 VM 可注册的 extension object。 | 已补中文注释；noop 函数用于 VM 点击执行兜底。 |
| `packages/scratch-gui/src/lib/custom-extension/codegen-registry.js` | 保存已加载拓展的 Python 模板。 | 已补中文注释；卸载时必须同步清理。 |
| `packages/scratch-gui/src/lib/custom-extension/persistence.js` | 本地拓展库持久化，兼容 localStorage 和 Electron userData。 | 已补中文注释；坏数据会跳过。 |
| `packages/scratch-gui/src/lib/custom-extension/library-store.js` | 本地库图标和默认图标资源。 | 已补注释；纯展示资源。 |
| `packages/scratch-gui/src/lib/custom-extension/product-extension-catalog.js` | 产品/模块目录数据。 | 数据文件，review 重点是分类和占位状态，当前可作为远程 registry 前置结构。 |
| `packages/scratch-gui/src/lib/custom-extension/builtin-product-manifests/index.js` | 内置产品 manifest 导出入口。 | 结构简单。 |
| `packages/scratch-gui/src/lib/custom-extension/builtin-product-manifests/aimecanum.js` | AI机甲麦轮车内置产品积木 manifest 和 Python 模板。 | 已补中文注释；六路巡线组合状态积木仍需自定义 LINE6 控件。 |
| `packages/scratch-gui/src/reducers/custom-extensions.js` | 已导入拓展库 Redux 状态。 | 已补中文注释；副作用放在页面和持久化模块。 |

### Python codegen 与 VM 接入

| 文件 | 作用 | Review 结论 |
| --- | --- | --- |
| `packages/scratch-vm/src/codegen/python.js` | Blockly workspace 到 Python 文件文本的核心生成器。 | 已补中文注释；单测覆盖主入口、setup、事件 footer、散落积木过滤。 |
| `packages/scratch-vm/src/codegen/python/context.js` | 收集 imports、variables、functions、setup、launcher 并拼装文件。 | 已补中文注释；输出顺序对齐旧版生成习惯。 |
| `packages/scratch-vm/test/unit/python_codegen.js` | Python codegen 单测。 | 覆盖关键迁移行为；后续迁移更多机器人时继续补样例。 |
| `packages/scratch-vm/src/index.js` | 导出 VM，同时导出 `generatePythonCode`。 | 小改动，符合 GUI 桥接需要。 |
| `packages/scratch-vm/src/virtual-machine.js` | VM 实例方法增加 `generatePythonCode`。 | 已有 JSDoc；对 GUI 使用友好。 |
| `packages/scratch-vm/src/engine/runtime.js` | 支持卸载拓展 primitives、支持 subCategory label。 | 已补中文注释；用于声明式产品库分类和卸载。 |
| `packages/scratch-vm/src/extension-support/extension-manager.js` | 注册 Python 基础拓展和内存 extension object。 | 已补中文注释；声明式拓展注册/卸载链路可行。 |

### Python 基础积木 VM 扩展

| 文件 | 作用 | Review 结论 |
| --- | --- | --- |
| `packages/scratch-vm/src/extensions/scratch3_python_control/index.js` | Python 控制分类：main、repeat、forever、while、if、break、continue。 | 已补中文注释；VM 预览和 Python 生成边界清晰。 |
| `packages/scratch-vm/src/extensions/scratch3_python_function/index.js` | Python 函数分类：define、call、callReporter、return、parameter。 | 已补中文注释；函数参数当前仍是文本输入 MVP。 |
| `packages/scratch-vm/src/extensions/scratch3_python_list/index.js` | Python 列表分类。 | 已补中文注释；预览态用 JS 数组。 |
| `packages/scratch-vm/src/extensions/scratch3_python_native/index.js` | Python 原生分类和隐藏复用积木。 | 已补中文注释；input 真实交互依赖桌面 PTY。 |
| `packages/scratch-vm/src/extensions/scratch3_python_operators/index.js` | Python 运算符分类。 | 已补中文注释；运行时预览和 codegen 表达式分离。 |
| `packages/scratch-vm/src/extensions/scratch3_python_text/index.js` | Python 文本分类。 | 已补中文注释。 |
| `packages/scratch-vm/src/extensions/scratch3_python_variables/index.js` | Python 变量分类。 | 已补中文注释；运行时只做轻量预览状态。 |

### Redux 与模式状态

| 文件 | 作用 | Review 结论 |
| --- | --- | --- |
| `packages/scratch-gui/src/reducers/gui.ts` | 汇总 GUI reducer，接入新增状态。 | 小改动，未发现阻塞风险。 |
| `packages/scratch-gui/src/reducers/mode.js` | 增加 `editorMode`，区分 Scratch 舞台和 Python 模式。 | 已补中文注释；桌面 tab 创建时锁定模式。 |
| `packages/scratch-gui/src/reducers/modals.js` | 增加库管理弹窗 modal 常量。 | 当前新版入口已迁到整页拓展库，弹窗入口是兼容遗留。 |

### 文档结构与计划文档

| 文件 | 作用 | Review 结论 |
| --- | --- | --- |
| `dosc/README.md` | 文档根入口。 | Wiki 结构更清晰。 |
| `dosc/guides/README.md` | guides 分类入口。 | 合理。 |
| `dosc/guides/01-local-dev-runbook.md` | 本地开发运行手册。 | 从旧文档迁移。 |
| `dosc/guides/02-learning-roadmap.md` | 学习路线。 | 从旧文档迁移。 |
| `dosc/guides/03-company-product-change-playbook.md` | 公司产品改版 playbook。 | 从旧文档迁移。 |
| `dosc/reference/README.md` | reference 分类入口。 | 合理。 |
| `dosc/reference/01-monorepo-architecture.md` | monorepo 架构导读。 | 从旧文档迁移并略有调整。 |
| `dosc/reference/02-scratch-gui-frontend-guide.md` | scratch-gui 前端导读。 | 从旧文档迁移。 |
| `dosc/reference/03-scratch-blocks-module-guide.md` | scratch-blocks 导读。 | 从旧文档迁移。 |
| `dosc/reference/04-scratch-vm-module-guide.md` | scratch-vm 导读。 | 从旧文档迁移。 |
| `dosc/reference/05-blocks-vm-gui-extension-research.md` | blocks/vm/gui 拓展研究。 | 从旧文档迁移。 |
| `dosc/plans/README.md` | plans 分类入口。 | 合理。 |
| `dosc/plans/desktop/README.md` | desktop 计划分类入口。 | 合理。 |
| `dosc/plans/desktop/01-electron-desktop-run-plan.md` | Electron 运行计划。 | 可作为阶段 A 背景。 |
| `dosc/plans/desktop/02-electron-packaging-implementation.md` | 打包实现记录。 | 已覆盖桌面打包主链路。 |
| `dosc/plans/desktop/03-desktop-browser-tabs-plan.md` | 多 tab 计划。 | 与当前 WebContentsView 方案一致。 |
| `dosc/plans/desktop/04-desktop-home-mode-entry-plan.md` | 首页模式入口计划。 | 与当前首页入口一致。 |
| `dosc/plans/editor/README.md` | editor 计划分类入口。 | 合理。 |
| `dosc/plans/editor/01-editor-mode-tabs-implementation-plan.md` | 编辑器模式 tab 计划。 | 从旧文档迁移。 |
| `dosc/plans/editor/02-phase-d-project-save-restore-plan.md` | 项目保存恢复计划。 | 后续已决定优先复用原版 sb3。 |
| `dosc/plans/python/README.md` | Python 计划分类入口。 | 合理。 |
| `dosc/plans/python/01-python-coding-mode-implementation-plan.md` | Python 编码模式计划。 | 与当前功能主线一致。 |
| `dosc/plans/python/02-phase-b-python-file-and-run-plan.md` | 本机 Python 文件/运行计划。 | 已实现核心链路。 |
| `dosc/plans/python/03-phase-c-terminal-productization-plan.md` | 终端产品化计划。 | 已实现 PTY MVP。 |
| `dosc/plans/python/04-python-block-category-and-syntax-plan.md` | Python 积木分类完善计划。 | 后续仍需继续丰富语法块。 |
| `dosc/plans/extension-library/README.md` | extension-library 计划分类入口。 | 合理。 |
| `dosc/plans/extension-library/01-custom-extension-library-research.md` | 自定义拓展库调研。 | 可作为方案背景。 |
| `dosc/plans/extension-library/02-custom-extension-library-implementation-plan.md` | 自定义拓展库实现计划。 | 已部分落地。 |
| `dosc/plans/extension-library/03-custom-extension-library-mvp-implementation-notes.md` | MVP 实现记录。 | 合理。 |
| `dosc/plans/extension-library/04-custom-extension-template-user-guide.md` | 用户模板教学文档。 | 后续需随着 v2 包结构继续更新。 |
| `dosc/plans/extension-library/05-library-manager-redesign-research.md` | 库管理器重构调研。 | 方向已转为整页拓展库。 |
| `dosc/plans/extension-library/06-wondercam-like-package-v2-implementation.md` | WonderCam 类目录包 v2 方案。 | 与当前 package-reader 方案一致。 |
| `dosc/plans/extension-library/07-extension-library-runtime-flow.md` | 拓展库运行流转说明。 | 可用于汇报导入到产码链路。 |
| `dosc/plans/extension-library/08-product-module-extension-panel-plan.md` | 产品/模块拓展面板计划。 | 与当前产品拓展页一致。 |
| `dosc/plans/extension-library/09-makecode-like-cloud-extension-registry-plan.md` | 类 MakeCode 远程 registry 计划。 | 后续远程包管理平台待实施。 |
| `dosc/plans/extension-library/10-old-product-migration-plan.md` | 旧产品迁移计划。 | 需要继续补迁移节奏。 |
| `dosc/plans/extension-library/13-aimecanum-second-migration-record.md` | AI机甲麦轮车二次迁移记录。 | 已记录六路巡线 LINE6 TODO。 |
| `dosc/plans/extension-library/examples/ai-mecanum-package-v2/config.json` | 示例目录包配置。 | 示例文件。 |
| `dosc/plans/extension-library/examples/ai-mecanum-package-v2/blocks.json` | 示例目录包积木声明。 | 示例文件。 |
| `dosc/plans/extension-library/examples/ai-mecanum-package-v2/generator/python.json` | 示例目录包 Python 模板。 | 示例文件。 |
| `dosc/plans/extension-library/examples/ai-mecanum-package-v2/libraries/aimecanum_notes.py` | 示例 runtime 文件。 | 示例文件。 |
| `dosc/plans/extension-library/examples/ai-mecanum-package-v2/docs/README.md` | 示例包说明。 | 示例文件。 |
| `dosc/progress/README.md` | progress 分类入口。 | 合理。 |
| `dosc/progress/project-progress-and-commercial-gap.md` | 项目进度和商用差距。 | 继续用于阶段性汇报。 |

## 后续 TODO

- 继续迁移 AI机甲麦轮车剩余积木，并逐项和旧版 `aimecanum/index.js`、旧 Python generator 校对。
- 为六路巡线组合状态积木补自定义 `LINE6` 输入控件，不再用临时下拉值承载。
- 把串口上传从“写入 Python 文本”升级为公司硬件真实上传/烧录协议。
- 把产品拓展页的版本检查接入远程 registry 或公司后台。
- 将 `desktop/main.js` 拆成 tabs、serial、python、custom-extension 等模块，降低主进程文件复杂度。
