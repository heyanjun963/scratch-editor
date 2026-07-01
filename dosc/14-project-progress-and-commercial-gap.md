# 项目进度总览与商用差距

本文用于汇总当前 `scratch-editor` 改造进度，解决几个问题：

- 哪些功能只是最小 Demo。
- 哪些能力已经能跑通。
- 哪些功能还停留在计划文档。
- 距离可交付、可商用、可给客户安装还有多少差距。
- 后续开发应该先补哪一层，不再每做一个功能就只新增孤立 plan。

## 当前结论

当前项目已经完成了“技术可行性验证”，但还不是商用品质。

可以这样理解：

```text
当前状态 = Scratch monorepo + 公司扩展示例 + Python 编码模式 MVP + Electron 桌面壳 MVP

商用目标 = 可安装桌面软件 + 本机 Python 环境执行 + 类 VSCode Terminal + 项目文件保存恢复 + 稳定打包发布 + 安全 IPC + 测试覆盖
```

当前最重要的缺口不是“再加几个按钮”，而是：

1. 桌面端生产打包链路已有初版，但还缺正式图标、签名、安装包验证和自动化 smoke test。
2. Python 代码只是生成和展示，还没有真正保存成 `.py` 文件并交给本机 Python 执行。
3. 控制台仍是文本区域模拟，不是 PTY/Terminal。
4. Electron IPC 还没有形成清晰的本机能力边界。
5. 项目保存、恢复、最近项目、未保存提醒还没产品化。
6. 多 Tab、首页、模式选择只是 MVP，还没有生命周期、性能和异常处理体系。

## 进度分级

本文用下面几个状态描述功能成熟度：

| 状态 | 含义 |
| - | - |
| 已提交 MVP | 代码已提交，能验证主流程，但不代表商用完成 |
| Demo | 能演示核心概念，边界、异常、持久化、测试不足 |
| 计划中 | 有方案文档，还没实现或只实现很小一部分 |
| 未开始 | 还没有正式方案或代码 |
| 商用待补 | 功能方向正确，但缺稳定性、安装包、安全、测试、体验细节 |

## 已完成的主要提交

| 提交 | 功能 | 当前成熟度 |
| - | - | - |
| `f41179b` | 迁移 `scratch-blocks` 到工作区 | 已提交 MVP |
| `8a1cdee` | 添加自定义扩展 block 示例 | Demo |
| `22dc55f` | 添加 Python 编码模式基础积木 | Demo |
| `7dbc060` | 添加 Electron 桌面多 Tab 运行入口 | 已提交 MVP |
| `cca9af3` | 添加桌面端首页模式入口 | 已提交 MVP |

## 文档地图

现有文档已经不少，建议以后按用途看：

| 文档 | 用途 | 当前问题 |
| - | - | - |
| `01-monorepo-architecture.md` | 了解 monorepo 包结构 | 基础学习文档，可保留 |
| `02-scratch-gui-frontend-guide.md` | 了解 GUI 前端结构 | 基础学习文档，可保留 |
| `03-company-product-change-playbook.md` | 公司产品改造切入点 | 后续要补“真实交付流程” |
| `04-local-dev-runbook.md` | 本地开发运行 | 后续要补桌面端生产运行 |
| `05-learning-roadmap.md` | 学习路线 | 可保留 |
| `06-editor-mode-tabs-implementation-plan.md` | 多编辑器模式早期方案 | 已被 `12`、`13` 部分覆盖 |
| `07-blocks-vm-gui-extension-and-color-field-plan.md` | 自定义扩展 block 方案 | 仍有价值，但没有形成商用品质 |
| `08-scratch-blocks-module-guide.md` | scratch-blocks 导读 | 学习文档 |
| `09-scratch-vm-module-guide.md` | scratch-vm 导读 | 学习文档 |
| `10-python-coding-mode-implementation-plan.md` | Python 编码模式 MVP 方案 | 已部分实现，但未接本机 Python |
| `11-electron-desktop-run-plan.md` | Electron 开发运行入口 | 已部分实现，但未打包 |
| `12-desktop-browser-tabs-plan.md` | 浏览器式多 Tab 方案 | 已部分实现，仍缺保存和资源管理 |
| `13-desktop-home-mode-entry-plan.md` | 首页模式入口方案 | 已实现 MVP |
| `14-project-progress-and-commercial-gap.md` | 当前总进度和商用差距 | 新增总控文档 |
| `16-phase-b-python-file-and-run-plan.md` | 阶段 B：Python 文件生成与本机运行 | 已实现初版，待人工验证 |
| `17-phase-c-terminal-productization-plan.md` | 阶段 C：Terminal 产品化 | C2 已完成代码接入，待人工验证 |
| `18-phase-d-project-save-restore-plan.md` | 阶段 D：项目保存和恢复 | 改为复用原版 `.sb3` 保存/加载链路 |
| `19-python-block-category-and-syntax-plan.md` | Python 积木分类和语法完善 | 新增分类体系和语法补齐方案 |

后续建议：新增功能前先更新本文的“商用差距表”和“下一阶段路线”，再写细分方案。

## 功能模块总览

### 1. Monorepo 和依赖

当前状态：已提交 MVP。

已完成：

- `scratch-gui`、`scratch-vm`、`scratch-blocks` 等关键包在同一工作区。
- `scratch-blocks` 已迁移到 workspace。
- `scratch-gui` 可以通过 workspace 依赖引用本地包。
- 已用 `fnm` 跑通 Node 24.16.0 开发环境。

商用待补：

- CI 环境还没验证完整安装、构建、测试。
- workspace 内部包构建顺序还没有自动化成稳定发布脚本。
- 依赖下载里的 Scratch 资源下载超时问题仍需要镜像或缓存策略。

风险：

- 换一台机器可能仍会卡在 prepare 脚本下载资源。
- 没有 CI，就很难保证团队多人环境一致。

### 2. 自定义扩展 block

当前状态：Demo。

已完成：

- 添加过公司 HTTP 扩展示例。
- 扩展可以在扩展库中显示并添加。
- 自定义 block 可以拖拽到工作区。
- HTTP/DeepSeek 示例能在浏览器控制台或 VM 日志中看到结果。
- Python Native 扩展提供了基础 Python 语法 block。

商用待补：

- 公司扩展命名、分类、图标、颜色、文案还没规范化。
- block 参数校验和错误提示不足。
- 异步请求失败、超时、取消、鉴权错误还没完整处理。
- API Key 不能放在前端或项目文件里，需要安全凭证策略。
- 扩展和公司内网 npm 包发布流程未建立。

风险：

- 如果直接把敏感配置写进 block 或项目文件，容易泄露。
- HTTP 请求从浏览器发起会受 CORS 和安全策略限制。
- 真正连接本机环境时，应该通过 Electron 主进程或本地服务。

### 3. Python 编码模式

当前状态：Demo。

已完成：

- 新增 Python 编码模式。
- 右侧舞台区可以替换为代码区和控制台区。
- 拖动 Python Native 积木后可以生成 Python 文本。
- Python Native 扩展包含基础语法 block，例如 print、sleep、random、变量、表达式、if、for。
- 控制台可以显示 VM 扩展事件发出的日志。
- 桌面首页可以创建代码模式 Tab。
- `desktopMode=code` 可以初始化进入代码模式。

目前仍是 Demo 的原因：

- 生成的是字符串，不是真实 `.py` 文件。
- 没有运行本机 Python。
- 控制台是文本区域，不是 Terminal。
- 没有 stdin 输入。
- 没有进程生命周期。
- 没有工作目录。
- 没有依赖管理。
- 没有错误堆栈定位到积木。

商用目标：

```text
积木工作区
  -> 生成 Python AST 或稳定代码文本
  -> 写入项目临时目录 main.py
  -> Electron 主进程启动本机 Python
  -> PTY/Terminal 显示 stdout/stderr
  -> 用户可以中断/重启进程
```

商用待补：

- Python 代码生成器要从“字符串拼接 MVP”升级为可维护的 generator。
- 需要明确 block 到 Python 的覆盖范围。
- 需要支持保存 `.py` 文件。
- 需要支持运行 `.py` 文件。
- 需要支持 stdout、stderr、exit code。
- 需要支持用户输入。
- 需要支持停止运行。
- 需要支持运行超时和异常恢复。
- 需要为不同 Tab 隔离临时目录和 Python 进程。

### 4. Python 控制台 / Terminal

当前状态：未开始，只有文本区域模拟。

已完成：

- `PythonCodingPanel` 下方有 console 区域。
- VM 扩展事件可以 append 文本。

与竞品差距：

- 竞品类似 VSCode Terminal，通常背后是 PTY。
- 当前只是 textarea。
- 当前不能输入命令。
- 当前不能运行本机 Python。
- 当前没有 ANSI 颜色、光标、历史、清屏、复制粘贴体验。

推荐技术路线：

```text
前端
  xterm.js 作为 Terminal UI

Electron 主进程
  node-pty 启动 shell 或 python 进程

IPC
  terminal:create
  terminal:write
  terminal:resize
  terminal:kill
  terminal:data
  terminal:exit
```

第一阶段可以只做 Python 运行终端：

```text
点击运行
  -> 生成 main.py
  -> node-pty 启动 python main.py
  -> xterm.js 显示输出
```

第二阶段再做完整 shell：

```text
打开 Terminal
  -> 启动 PowerShell / cmd / bash
  -> 用户可以自由输入命令
```

商用待补：

- 安装 `xterm`。
- 安装或接入 `node-pty`。
- 处理 Windows/macOS/Linux 的 shell 差异。
- 处理打包后 `node-pty` 原生模块编译和分发。
- Terminal 生命周期要和 Tab 绑定。
- 关闭 Tab 时要杀掉对应进程。

### 5. Electron 桌面端运行

当前状态：已提交 MVP。

已完成：

- `npm run desktop` 可以启动桌面开发模式。
- Electron 42.0.1 已接入。
- 主进程能加载 `scratch-gui` dev server。
- 使用 `WebContentsView` 实现多 Tab 编辑器实例。
- 顶部自定义标题栏和 Tab 栏已实现 MVP。
- 首页 Home View 已实现 MVP。
- 每个 Tab 独立 `WebContentsView`，理论上状态隔离。

商用待补：

- 没有生产构建命令。
- 没有安装包。
- 没有 `electron-builder` 或同类打包配置。
- 没有应用图标、版本号、产品名、版权信息。
- 没有代码签名。
- 没有自动更新。
- 没有崩溃恢复。
- 没有协议注册、文件关联。
- 没有生产环境资源路径验证。

最小生产打包目标：

```text
npm run desktop:build
  -> 构建 scratch-gui 静态资源
  -> 准备 Electron main/preload/home/shell

npm run desktop:dist
  -> electron-builder 打 Windows 安装包
```

跨平台目标：

```text
Windows
  nsis 或 portable

macOS
  dmg / zip
  签名和 notarization

Linux
  AppImage / deb
```

### 6. 首页与多 Tab

当前状态：已提交 MVP。

已完成：

- 启动显示首页。
- 首页可以选择默认舞台模式和代码模式。
- 点击 `+` 回首页选择模式。
- 关闭最后一个 Tab 回首页。
- Home 按钮回首页。
- 创建时固定 `stage` 或 `code` 模式。

商用待补：

- Tab 未保存状态。
- 关闭前保存确认。
- Tab 标题重命名。
- 最近项目。
- 打开项目。
- Tab 恢复。
- Tab 过多时滚动或折叠。
- 非激活 Tab 的资源暂停。
- 内存上限和休眠策略。

风险：

- 当前每个 Tab 一个 `WebContentsView`，内存占用会比较高。
- 如果每个 Tab 大约 100-200MB，需要限制打开数量或做休眠。

### 7. 项目文件保存与恢复

当前状态：未开始。

Scratch 原项目保存能力和公司桌面项目保存能力不是一回事。

商用需要定义公司项目格式，例如：

```text
company-project/
  project.json
  scratch.sb3
  python/
    main.py
  assets/
  metadata.json
```

或者一个压缩包：

```text
*.companyproj
  project.json
  scratch.sb3
  python/main.py
  assets/*
```

必须解决：

- 保存当前 Tab。
- 另存为。
- 打开项目。
- 最近项目。
- 未保存状态。
- 关闭前提示。
- 应用退出前提示。
- 多 Tab 恢复。
- 不同模式项目的兼容策略。

### 8. 本机环境连接

当前状态：未开始。

用户目标里提到“连接本机环境”，这应放在 Electron 主进程或独立本地服务里，不应放在浏览器页面里。

需要连接的本机能力可能包括：

- Python 解释器。
- 文件系统。
- Terminal。
- 串口。
- USB。
- 网络设备发现。
- 公司硬件烧录工具。

推荐边界：

```text
Renderer
  只发起明确 IPC 请求

Preload
  只暴露白名单 API

Main Process
  管理本机能力
  校验路径和参数
  管理进程生命周期
```

不能做：

- 不要给 renderer 开 `nodeIntegration`。
- 不要把 `ipcRenderer` 原样暴露给页面。
- 不要让前端传任意命令给主进程执行。

### 9. 安全和隐私

当前状态：基本未开始。

商用必须考虑：

- API Key 存储。
- 本地文件访问白名单。
- 子进程命令白名单。
- Terminal 权限边界。
- 项目文件中不能保存敏感信息。
- HTTP 请求代理和证书错误处理。
- 崩溃日志不能包含密钥。
- 公司内网服务地址不能硬编码在公开仓库中。

建议优先建立：

```text
desktop/security.md
  IPC 白名单
  文件路径规则
  进程启动规则
  敏感配置规则
```

### 10. 测试和质量

当前状态：不足。

已经做过的验证主要是：

- `node --check`
- `git diff --check`
- 局部手动运行
- Babel parser 解析 JSX

商用需要：

- 单元测试：Python codegen。
- VM 扩展测试：自定义 block 行为。
- GUI 组件测试：首页、Tab 状态。
- Electron 主进程测试：Tab 生命周期、IPC 参数。
- Playwright / Spectron 类 E2E：启动、创建 Tab、关闭、进入代码模式。
- 打包后 smoke test。

最低可接受测试集：

```text
1. npm run desktop 可以启动
2. 首页创建 stage Tab
3. 首页创建 code Tab
4. code Tab 显示 Python 面板
5. 关闭最后 Tab 回首页
6. 积木生成 Python 文本
7. 保存 Python 文件
8. 运行 Python 并输出到 Terminal
```

## 商用差距总表

| 模块 | 当前状态 | 商用目标 | 优先级 |
| - | - | - | - |
| Electron 开发运行 | 已提交 MVP | 稳定开发入口 | P0 已基本完成 |
| Electron 生产打包 | 已接入初版配置 | Windows/macOS/Linux 安装包 | P0 |
| 首页模式入口 | 已提交 MVP | 可配置产品首页 | P1 |
| 多 Tab | 已提交 MVP | 未保存提醒、恢复、内存管理 | P1 |
| Python 代码生成 | Demo | 可维护 generator，覆盖核心语法 | P0 |
| Python 积木分类 | Demo | 控制、运算符、文本、变量、列表、Python 等分类 | P0 |
| Python 文件输出 | 已实现初版 | 生成并保存 `.py`，后续接项目保存 | P0 |
| 本机 Python 执行 | 已实现初版 | Electron 主进程运行 Python，待人工验证 | P0 |
| Terminal | C2 待验证 | xterm.js 已接入，node-pty 交互终端已完成代码接入，待人工验证 input/Ctrl+C/打包版 | P0 |
| 项目保存恢复 | 待验证原版能力 | 复用 `.sb3` 保存/加载，必要时扩展 metadata | P0 |
| 函数折叠 | MVP 实现中 | 已补 Python 函数积木和函数定义块右键折叠入口，待人工验证 | P0 |
| 工具栏积木禁拖 | MVP 实现中 | 已用 Python `current time` 做禁用样例，后续需接产品配置/设备状态 | P0 |
| 串口和上传代码 | Web Serial MVP 实现中 | 已接 Electron Web Serial 选择、连接和代码写入入口，后续需补真实设备上传协议 | P1 |
| 自定义扩展库/自定义积木 | 未开始 | 用户可配置扩展积木，并导出配置文件 | P1 |
| 自定义扩展 | Demo | 公司规范扩展包 | P1 |
| 硬件连接 | 未开始 | 串口/USB/烧录能力 | P1 |
| 安全 IPC | Demo | 白名单和参数校验 | P0 |
| 自动更新 | 未开始 | 版本分发 | P2 |
| 测试体系 | 不足 | 单测 + E2E + 打包 smoke | P0 |
| UI 设计 polish | Demo | 产品级视觉和交互 | P1 |

## 下一阶段推荐路线

### 阶段 A：桌面可打包

目标：让当前桌面 MVP 能打出 Windows 安装包。

任务：

1. 新增 `desktop:build:gui`。
2. 让 `scratch-gui` 生产构建输出可被 Electron 加载。
3. 新增 `desktop:dist`。
4. 接入 `electron-builder`。
5. 配置应用名、图标、版本、输出目录。
6. 验证安装包能启动首页。

验收：

```text
npm run desktop:dist
  -> 生成 Windows 安装包
  -> 安装后打开
  -> 显示首页
  -> 能创建 stage/code Tab
```

当前进展：

- 已新增 `electron-builder.yml`。
- 已新增 `desktop:build`、`desktop:build:gui`、`desktop:pack`、`desktop:dist`。
- 已新增 `desktop:clean`，用于清理旧打包产物。
- 第一版输出目录为 `desktop-dist/`。
- 第一版 Windows 目标为 `nsis` 和 `dir`。
- 已验证 `desktop:build` 可以生成 `packages/scratch-gui/build/index.html`。
- 已验证 `electron-builder --dir` 可以生成 `desktop-dist/win-unpacked/Scratch Editor.exe`。
- 已修复打包产物中新建编辑器白屏问题，关键点是用 `app.isPackaged` 判断生产环境，并用 `app.getAppPath()` 定位 asar 内资源。
- 暂未配置公司正式图标、签名、自动更新。

当前命令：

```powershell
npm run desktop:pack
npm run desktop:dist
```

人工测试重点：

- `npm run desktop:pack` 是否生成 `desktop-dist/win-unpacked`。
- 打开 `desktop-dist/win-unpacked/Scratch Editor.exe` 是否显示首页。
- 首页能否创建默认舞台模式。
- 首页能否创建代码模式。
- 代码模式是否显示 Python 代码区。
- 关闭最后一个 Tab 是否回到首页。

### 阶段 B：Python 文件和运行

当前状态：已实现初版，待桌面端人工验证。

目标：把“生成文本”升级为“生成 `.py` 文件并运行”。

任务：

1. 每个 Tab 创建工作目录。
2. codegen 输出 `main.py`。
3. Electron 主进程提供 `python:run`。
4. 自动发现 Python 或让用户配置 Python 路径。
5. 捕获 stdout/stderr/exit code。
6. 前端控制台显示真实运行结果。

验收：

```text
拖 print block
  -> 生成 main.py
  -> 点击运行
  -> 真实 Python 执行
  -> Terminal 输出 hello
```

### 阶段 C：Terminal 产品化

当前状态：C1 已验证通过，C2 node-pty 交互终端已完成代码接入，待人工验证。

目标：替换 textarea 控制台。

任务：

1. C1 接入 `xterm.js`，替换 textarea 控制台。
2. C1 继续复用阶段 B 的 `spawn` 输出链路。
3. C2 接入 `node-pty`。
4. C2 建立 terminal IPC。
5. C2 支持输入、输出、resize、kill。
6. C2 每个 Tab 一个 Terminal session。

验收：

```text
代码模式下方是类 VSCode Terminal
支持 stdout/stderr 彩色输出
支持 Ctrl+C 停止
关闭 Tab 杀掉进程
```

### 阶段 D：项目保存和恢复

当前状态：原版已有 `.sb3` 保存和加载能力，不再新增自定义 JSON 项目格式。

目标：从 Demo 进入真正可用。

任务：

1. 复用原版“保存到电脑 / 从电脑加载”。
2. 验证 Python 扩展积木是否能随 `.sb3` 保存和恢复。
3. 打开 `.sb3` 后重新触发 Python codegen。
4. 如需额外保存编辑器模式或 Tab 信息，优先研究 `.sb3` metadata 扩展点。
5. 后续再补最近项目列表、dirty 状态和关闭提醒。

验收：

```text
创建 code 项目
拖积木
生成 Python
保存项目
关闭软件
重新打开项目
Tab 和代码恢复
```

### 阶段 E：函数积木和函数折叠

当前状态：MVP 实现中。

目标：先补齐 Python 模式的函数类积木，再让复杂 Python 函数脚本可以折叠，降低代码区和积木区的视觉复杂度。

需求优先级：最高。

本轮调研结论：

1. Blockly 官方把积木定义和代码生成分成两层：积木定义负责外观、字段、连接和基础行为，代码生成器负责把工作区积木转成可执行文本。
2. Blockly 的 procedures 是“定义函数 + 调用函数”的模型。Scratch 3 自制积木也有 `procedures_definition`、`procedures_call` 和 mutation 体系。
3. 当前 Python 模式已经走 `scratch3_python_*` VM 扩展分类，所以本阶段先新增 `pythonFunction` 分类，不直接改原版 Scratch 自制积木弹窗。
4. 函数参数编辑先采用逗号分隔文本输入，后续再评估接入 Scratch procedures 的 mutation/弹窗编辑体验。

核心需求：

1. Python 编码模式里提供函数定义、函数调用、函数返回、参数读取积木。
2. 支持对 Python 函数定义块折叠和展开。
3. 折叠后保留函数名、参数和简要摘要。
4. 折叠状态不影响代码生成。
5. 折叠状态应跟随项目保存恢复，优先研究是否能写入 `.sb3` metadata。

需要研究：

- `scratch-blocks` 是否已有 block collapse 能力可复用。
- Blockly/Scratch Blocks 对 procedure、comment、collapsed state 的保存方式。
- 折叠 UI 放在积木本体、右键菜单还是函数块头部。
- 后续是否需要复用 Scratch 自制积木弹窗，让用户可视化增删函数参数。

验收：

```text
创建代码模式 Tab
左侧显示“函数”分类
拖出 define function my_function params name
函数体内放 print parameter name
拖出 call function my_function args "Scratch"
右键函数定义块，点击折叠函数
积木区只显示摘要
再次右键点击展开函数
内部积木仍在
生成 Python 代码包含 def my_function(name): 和 my_function("Scratch")
保存/重新打开后折叠状态可恢复或有明确降级策略
```

当前限制：

- 当前函数参数是文本输入，不是 Scratch 自制积木那种参数编辑弹窗。
- 当前折叠入口先放在右键菜单，只对 `pythonFunction_define` 显示。
- 后续如果要折叠任意积木组，需要额外设计分组块或复用 Blockly 更完整的 collapse 机制。

### 阶段 F：工具栏积木禁拖

当前状态：MVP 实现中。

目标：工具栏内的积木可以根据条件变为不可拖动，避免用户在不支持的环境中使用错误积木。

需求优先级：第二。

可能条件：

1. 当前编辑器模式，例如 Python 模式、舞台模式。
2. 当前设备类型，例如未连接硬件时禁用硬件积木。
3. 权限状态，例如无串口权限时禁用串口上传积木。
4. 公司产品配置，例如不同产品线只开放部分分类。
5. 用户角色或实验开关。

交互要求：

1. 禁用积木在工具栏中仍可见，但不可拖入画布。
2. 禁用状态需要有视觉区分。
3. 鼠标悬停或点击时给出原因提示。
4. 禁用逻辑不能影响已存在项目的正常打开。

本轮样例：

- 在 Python 编码模式中禁用 `pythonNative_currentTime`。
- 禁用只作用于左侧工具栏 flyout 内的积木样例。
- 已存在于画布中的 `current time` 积木暂不强制禁用，避免破坏旧项目。
- 禁用样式使用红色描边和禁止光标，禁用原因通过原生 `title` 暴露。
- 点击或尝试拖拽禁用积木时，会弹出禁用原因提示。
- 当前规则先写在 GUI 层，后续应迁移到产品配置、设备状态或权限状态统一管理。

已知体验修复：

- Python 模式入口需要在 Redux 初始状态阶段读取 `desktopMode=code`。
- 如果等 `GUIComponent` 首次渲染后的 `useEffect` 再切模式，会先渲染一帧舞台模式，表现为进入代码模式时闪屏。

需要研究：

- `scratch-blocks` toolbox/flyout 是否支持 disabled block。
- 如果不支持，需要在 flyout 拖拽开始事件中拦截。
- 禁用状态是否应由 VM extension metadata、GUI 配置或产品配置统一控制。

验收：

```text
进入代码模式
打开 Python 分类
找到 current time 积木
current time 积木置灰
current time 积木出现红色禁止样式
用户无法拖到画布
悬停时能看到禁用原因
点击或尝试拖拽时弹出禁用原因
```

### 阶段 G：串口和上传代码

当前状态：Web Serial MVP 实现中。

目标：桌面端可以获取本机串口列表，选择串口连接，并将生成代码上传到设备。

需求优先级：第三。

核心流程：

```text
获取串口列表
  -> 用户选择串口
  -> 连接串口
  -> 生成 Python/设备代码
  -> 上传到设备
  -> 显示上传进度和结果
```

桌面端职责：

1. Electron 主进程负责串口访问。
2. Renderer 只发起白名单 IPC 请求。
3. 串口参数需要明确：baudRate、dataBits、stopBits、parity。
4. 上传过程需要支持取消、超时、失败提示。

需要研究：

- Electron 官方 Web Serial 方案需要处理 `select-serial-port`、权限检查和设备授权，适合浏览器权限模型。
- `serialport` 是 Node 侧传统方案，可直接枚举、打开、读写串口；但它涉及 native module、Electron ABI 和打包重建。
- 本轮不再使用 PowerShell 脚本，改用 Electron/Chromium 内置 Web Serial API。
- 当前“上传”含义是把生成的 Python 代码文本写入串口，不等于真实硬件烧录协议。
- 后续需要根据公司硬件确认上传协议：普通串口 REPL、文件系统复制、厂商烧录工具，还是自定义 bootloader 协议。

本轮实现范围：

1. Electron 主进程处理 `select-serial-port`，同步优先选择 CH340/COM7 候选端口，并把候选项发给渲染进程展示。
2. preload 只暴露串口可用性和候选项监听的白名单 IPC，不暴露脚本执行或系统命令能力。
3. Python 模式头部菜单栏新增串口工具条：选择串口、选择波特率、连接/断开、上传。
4. 渲染进程使用 `navigator.serial.requestPort()`、`port.open()` 和 `port.writable` 完成连接和写入。
5. 串口操作结果写入现有 Python Terminal，方便人工观察。

当前限制：

- 需要 Electron/Chromium 支持 Web Serial。
- Web Serial 权限模型下，未授权前无法像系统脚本一样直接列出全量串口；首次进入时下拉框只提示点击 Refresh 检测，点击 Refresh 或 Connect 后才会触发 Electron 的 `select-serial-port` 候选列表。
- 当前连接会保持在渲染进程内存中，刷新页面或关闭标签页后需要重新连接。
- 暂无上传进度、取消、超时配置 UI。
- 暂无设备握手、板卡识别、协议适配和上传后运行控制。

验收：

```text
点击 Connect
触发 Web Serial 串口选择
显示候选串口并选择一个串口
连接成功后状态变为已连接
点击上传代码
显示上传中、成功或失败
断开串口后状态正确恢复
```

人工测试用例：

```text
用例 1：无串口设备
进入 Python 编码模式
查看串口下拉框显示 Click Refresh to detect
点击 Refresh 不报前端白屏
点击 Connect 给出无可用串口或取消提示

用例 2：有串口设备
插入 USB 串口设备
点击 Connect
下拉框显示过滤后的硬件串口候选项，不应出现蓝牙耳机、SPP 等蓝牙设备
选择波特率 115200
终端输出 selected，且优先匹配 COM7/CH340/USB-SERIAL，显示名称优先使用 COM 端口名
终端输出 connected

用例 3：上传当前代码
拖出 print 或基础 Python 积木生成代码
连接串口
点击 Upload
终端输出 uploaded bytes

用例 4：串口被占用
用其他串口工具占用同一个 COM 口
点击 Connect 或 Upload
终端输出失败原因
页面不白屏，按钮状态能恢复

用例 5：标签页清理
连接串口后关闭当前标签页
重新新建 Python 标签页
串口状态不应继承上一个标签页的连接状态
```

### 阶段 H：自定义扩展库和配置导出

当前状态：未开始。

目标：支持用户或公司产品人员创建自定义扩展库/自定义积木，并将配置下载成配置文件。

需求优先级：第四。

核心需求：

1. 用户可以创建自定义扩展分类。
2. 用户可以配置积木名称、参数、颜色、类型和代码生成模板。
3. 自定义积木可以出现在扩展库或 Python 工具栏中。
4. 配置可以导出为文件。
5. 配置可以再次导入并恢复扩展。

配置文件建议方向：

```json
{
  "extensionId": "companyCustom",
  "name": "公司自定义扩展",
  "blocks": [
    {
      "opcode": "printValue",
      "text": "打印 [VALUE]",
      "blockType": "command",
      "arguments": {
        "VALUE": {
          "type": "string",
          "defaultValue": "hello"
        }
      },
      "python": "print({VALUE})"
    }
  ]
}
```

需要研究：

- 配置文件应走 JSON、YAML 还是公司内部格式。
- 自定义积木是运行时动态注册，还是生成 VM extension 源码。
- 代码生成模板如何防止注入风险。
- 配置文件是否需要签名或来源校验。

验收：

```text
新建一个自定义积木
保存配置文件
重新导入配置
工具栏出现自定义分类和积木
拖入画布后可以生成 Python 代码
```

## 建议的开发顺序

不要优先做太多 UI polish。现在最该补的是“真实能力链路”。

推荐顺序：

```text
1. 函数折叠
2. 工具栏积木禁拖
3. 串口列表、连接和上传代码
4. 自定义扩展库/自定义积木配置导出
5. Electron 生产打包
6. 本机 Python 路径检测
7. 积木生成 main.py
8. 运行本机 Python
9. xterm.js/node-pty Terminal
10. 项目保存恢复
11. Tab dirty/关闭提醒
12. 首页和视觉 polish
13. 自动更新和签名
```

原因：

- 打包决定这个项目能不能作为桌面软件交付。
- 本机 Python 和 Terminal 决定代码模式是不是“真功能”。
- 保存恢复决定用户能不能长期使用。
- UI polish 可以并行，但不能替代核心能力。

## 判断是否接近商用的标准

当下面清单大部分完成时，才可以说接近商用：

- 能打安装包。
- 安装包能在干净机器启动。
- 首页能创建项目。
- 多 Tab 能保存和恢复。
- Python 代码能保存成文件。
- Python 能真实运行。
- Terminal 能输入输出。
- 关闭 Tab 会清理进程。
- 未保存项目会提示。
- 不会泄露 API Key。
- 不会允许前端执行任意系统命令。
- 至少有一组自动化 smoke test。
- 有基本错误提示和日志。

当前距离这个标准还有较大差距，但方向已经清楚。

## 当前最短可交付路径

如果目标是尽快给领导演示一个“看起来像产品”的版本：

```text
1. 保持当前首页和 Tab
2. 做 Windows 安装包
3. 做一个简单 Python 运行按钮
4. 用 xterm.js 显示输出
5. 保存 main.py 到临时目录
```

这个版本仍不是商用，但比当前 Demo 更接近真实竞品能力。

如果目标是给客户试用：

```text
必须先补项目保存、异常处理、安全 IPC、安装包稳定性。
```

## 后续文档规则

以后新增功能建议按这个顺序：

1. 先更新本文的“商用差距总表”。
2. 如果是大功能，再新增独立 plan。
3. 实现后回到本文更新状态。
4. 每次提交在文档里标明“已完成 / 仍缺口”。

这样可以避免文档越来越多，但没人知道整体项目还差什么。
