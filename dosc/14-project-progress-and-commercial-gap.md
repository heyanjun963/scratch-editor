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
| Python 文件输出 | 已实现初版 | 生成并保存 `.py`，后续接项目保存 | P0 |
| 本机 Python 执行 | 已实现初版 | Electron 主进程运行 Python，待人工验证 | P0 |
| Terminal | C2 待验证 | xterm.js 已接入，node-pty 交互终端已完成代码接入，待人工验证 input/Ctrl+C/打包版 | P0 |
| 项目保存恢复 | 未开始 | 公司项目格式和最近项目 | P0 |
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

目标：从 Demo 进入真正可用。

任务：

1. 定义公司项目格式。
2. 保存 `sb3`、`main.py`、metadata。
3. 打开项目恢复 Tab。
4. 最近项目列表。
5. dirty 状态和关闭提醒。

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

## 建议的开发顺序

不要优先做太多 UI polish。现在最该补的是“真实能力链路”。

推荐顺序：

```text
1. Electron 生产打包
2. 本机 Python 路径检测
3. 积木生成 main.py
4. 运行本机 Python
5. xterm.js/node-pty Terminal
6. 项目保存恢复
7. Tab dirty/关闭提醒
8. 首页和视觉 polish
9. 硬件连接
10. 自动更新和签名
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
