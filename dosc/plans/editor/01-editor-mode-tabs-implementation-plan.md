# 编辑器模式首页与顶部标签页实现方案

## 目标

实现一个类似竞品的桌面/网页编辑器入口：

- 首次进入不直接打开 Scratch 编辑器，而是显示“模式选择首页”。
- 用户可以选择不同编辑器模式，例如实时模式、上传模式、Python 积木模式、MicroPython 积木模式、Python 代码模式。
- 顶部菜单上方或菜单区域内增加标签页功能。
- 每个标签页代表一个独立项目或一个独立编辑器会话。
- 切换标签页时数据不丢失。
- 不同模式拥有不同扩展、工具栏能力、菜单项、运行/上传策略。

本方案不写具体代码，重点说明实现路线、数据结构、状态管理和改造边界。

## 核心判断

不要把“模式切换”做成简单的 UI 显示隐藏。

更稳妥的设计是：

```text
应用外壳 App Shell
  管首页、顶部标签栏、项目列表、当前激活标签

编辑器会话 Editor Session
  每个标签对应一个独立会话

Scratch GUI
  作为某些模式下的编辑器视图

模式配置 Mode Config
  决定当前会话可用扩展、菜单、运行方式、保存方式
```

这样可以避免一个全局 Scratch VM 被多个模式抢用，也方便后续扩展 Python、MicroPython、模型训练、界面设计等新编辑器。

## 改造位置澄清

这个功能主要不是在 Electron 主进程里实现，也不建议直接把所有逻辑塞进 `scratch-gui` 现有页面里。

推荐分层：

```text
Electron 主进程
  只管桌面壳能力：窗口、文件打开保存、系统菜单、USB/串口权限、关闭前确认

App Shell
  管首页、顶部标签页、当前激活标签、每个标签是什么编辑器模式

Scratch GUI
  作为某个标签页里的具体编辑器视图
```

也就是说：

```text
首页 / 顶部标签页 / 多编辑器模式调度
  放在 scratch-desktop 的 renderer 层，或公司自己的外层前端壳

积木区、舞台、角色、造型、声音、扩展库
  仍然由 scratch-gui 负责

打开文件、保存文件、窗口标题、关闭窗口
  由 Electron 主进程提供能力，通过 IPC 调用
```

Electron 不负责隔离 Redux，也不负责保存每个标签的 Scratch 内部状态。Electron 只是外壳和系统能力入口。

## 每个标签页的状态隔离

为了实现“切换标签数据不丢”，每个编辑器标签页需要自己的编辑器状态实例。

这里不要理解成“全局单例”。更准确的说法是：

```text
每个标签一个独立实例
```

对于 Scratch 类型的标签，理想结构是：

```text
Tab A
  Redux Store A
  VM A
  Blockly Workspace A
  Project State A

Tab B
  Redux Store B
  VM B
  Blockly Workspace B
  Project State B
```

如果所有标签共用一个 `scratchGui` Redux store，会出现明显问题：

```text
切到 Tab B
  scratchGui.projectState 被替换成 B
  scratchGui.vm 被替换成 B
  toolbox / target / blocks 状态都变成 B

再切回 Tab A
  A 必须重新加载
  容易丢选中角色、积木区滚动位置、撤销栈、未保存状态
```

所以推荐架构是两层状态：

```text
外层 AppShell Store
  管 tabs、activeTabId、用户设置、最近项目、全局硬件连接状态

每个 EditorTab 内部的编辑器 Store
  管这个标签自己的 Scratch 项目状态、VM、Blockly workspace、代码文本
```

概念结构：

```jsx
<AppShellStoreProvider>
    <HomePage />
    <TabBar tabs={tabs} activeTabId={activeTabId} />

    {tabs.map(tab => (
        <EditorTab
            key={tab.id}
            hidden={tab.id !== activeTabId}
            session={tab}
        />
    ))}
</AppShellStoreProvider>
```

每个 Scratch 标签内部再拥有自己的 Scratch GUI 状态：

```jsx
<Provider store={tab.scratchStore}>
    <ScratchGUI vm={tab.vm} mode={tab.modeId} />
</Provider>
```

不过 `scratch-gui` 当前本身已经通过 `AppStateHOC` 管理 Redux。实际落地有两种路线：

```text
方案 A：每个标签挂一个完整 WrappedGui
  优点：最容易实现，状态天然隔离
  缺点：内存占用高

方案 B：改造 scratch-gui，让外部传入 store / vm / session
  优点：架构更清晰，长期更可控
  缺点：改造更深，风险更高
```

初期建议采用方案 A：

```text
每个标签页保活一个完整 Scratch GUI 实例
非激活标签用 CSS 隐藏
限制最多同时打开 3-5 个标签
```

这样最容易先实现“标签来回切换不丢状态”。后续再考虑标签休眠、序列化恢复、共享 VM 资源等优化。

## 推荐信息架构

```text
AppRoot
├── HomePage
│   ├── New Project
│   ├── Program Design
│   ├── Model Training
│   └── UI Design
│
├── TopShell
│   ├── Brand
│   ├── MainMenu
│   ├── ModeToolbar
│   └── TabBar
│
└── EditorHost
    ├── ScratchRealtimeEditor
    ├── ScratchUploadEditor
    ├── ScratchPythonBlocksEditor
    ├── MicroPythonBlocksEditor
    ├── PythonCodeEditor
    ├── ModelTrainingEditor
    └── UIDesignerEditor
```

首页负责选择“我要创建哪种项目”。真正进入编辑器后，顶部标签栏负责多个项目之间切换。

## 模式定义

建议先做一个模式配置表，而不是把逻辑散落在组件里。

示例结构：

```js
const editorModes = {
    realtimeScratch: {
        title: '实时模式',
        description: '使用积木编程控制舞台',
        editorType: 'scratch',
        projectType: 'scratch-realtime',
        extensions: ['motion', 'looks', 'sound', 'events', 'control', 'sensing', 'operators', 'variables'],
        hardware: [],
        toolbar: ['run', 'stop', 'save'],
        saveFormat: 'sb3'
    },
    uploadScratch: {
        title: '上传模式',
        editorType: 'scratch',
        projectType: 'scratch-upload',
        extensions: ['control', 'operators', 'variables', 'companyBoard'],
        hardware: ['companyBoard'],
        toolbar: ['connect', 'upload', 'save'],
        saveFormat: 'sb3'
    },
    micropythonBlocks: {
        title: 'MicroPython积木模式',
        editorType: 'scratch',
        projectType: 'micropython-blocks',
        extensions: ['micropythonBoard', 'gpio', 'sensor'],
        hardware: ['micropythonBoard'],
        toolbar: ['connect', 'upload', 'serial', 'save'],
        saveFormat: 'company-project'
    },
    pythonCode: {
        title: 'Python代码模式',
        editorType: 'code',
        projectType: 'python-code',
        extensions: [],
        toolbar: ['run', 'stop', 'terminal', 'save'],
        saveFormat: 'py'
    }
};
```

这个配置表的意义是：

- 首页卡片来自这里。
- 标签页标题来自这里。
- 顶部工具栏来自这里。
- Scratch toolbox / extension library 来自这里。
- 保存、上传、连接硬件的策略来自这里。

## 标签页模型

每个标签页建议对应一个 `EditorSession`。

```js
{
    id: 'session-uuid',
    title: '未命名项目',
    modeId: 'uploadScratch',
    editorType: 'scratch',
    projectId: null,
    dirty: false,
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
    snapshot: {
        scratchProjectData: null,
        vmState: null,
        codeText: '',
        uiDesignerState: null
    },
    runtime: {
        vm: null,
        storage: null,
        hardwareConnection: null
    }
}
```

建议区分两类数据：

```text
可保存数据 snapshot
  项目内容、代码文本、界面布局、模式配置

运行时数据 runtime
  VM 实例、硬件连接、串口状态、临时缓存
```

保存到文件时只保存 snapshot，不保存 runtime。

## 状态不丢失的三种方案

### 方案 A：多实例保活

每个标签页都有自己的编辑器实例。切换标签时只是隐藏非当前标签。

```text
Tab A: Scratch GUI mounted, display none
Tab B: Scratch GUI mounted, visible
Tab C: Code Editor mounted, display none
```

优点：

- 切换最快。
- VM、积木 workspace、代码编辑器光标天然保留。
- 实现直观。

缺点：

- 内存占用高。
- Scratch GUI / VM 多实例可能带来性能压力。
- 多个硬件连接同时存在时要额外管理。

适合：

- 先做 MVP。
- 标签数量限制在 3-5 个。

### 方案 B：单实例 + 切换前序列化

只保留一个编辑器实例。切换标签前，把当前项目序列化保存到 session；切换后加载目标 session。

优点：

- 内存更低。
- 更接近传统 IDE 的项目切换。

缺点：

- Scratch VM 和 Blockly workspace 的完整恢复要处理细节。
- 切换可能变慢。
- 如果序列化不完整，容易丢光标、展开状态、选中角色等 UI 状态。

适合：

- 后续优化版本。
- 标签数量较多的场景。

### 方案 C：混合方案

当前标签和最近使用标签保活，其余标签序列化休眠。

优点：

- 用户体验和内存之间平衡。

缺点：

- 状态管理复杂。

适合：

- 产品成熟后再做。

初期建议采用：

```text
方案 A：多实例保活 + 限制最大标签数
```

先把功能跑通，再优化内存。

## Scratch 模式如何隔离扩展

不同编辑器模式的扩展不同，不能只靠“隐藏扩展按钮”解决。

需要控制三层：

```text
1. 左侧 toolbox 显示哪些分类
2. 扩展库里允许加载哪些扩展
3. VM 运行时注册哪些扩展服务
```

在 `scratch-gui` 中重点关注：

```text
packages/scratch-gui/src/lib/make-toolbox-xml.js
packages/scratch-gui/src/containers/blocks.jsx
packages/scratch-gui/src/components/extension-library
packages/scratch-gui/src/reducers/toolbox.js
packages/scratch-vm/src/extension-support
packages/scratch-vm/src/extensions
```

推荐新增一个模式上下文：

```text
editorModeId
allowedExtensions
hardwareProfile
toolboxProfile
```

然后让 toolbox 生成逻辑根据 `editorModeId` 过滤分类和扩展块。

## 首页设计

首页不要直接嵌进 Scratch GUI 内部。建议放在更外层的 App Shell。

流程：

```text
启动应用
  如果没有恢复上次会话
    显示 HomePage
  如果有可恢复会话
    显示 Tab Workspace
```

首页点击模式卡片：

```text
选择模式
  创建 EditorSession
  初始化对应 editorType
  打开新标签
  激活该标签
```

首页左侧分类：

```text
新建项目
程序设计
模型训练
界面设计
打开项目
发现
```

这些可以作为产品导航，不要和 Scratch 内部“代码 / 造型 / 声音”标签混在一起。

## 顶部标签栏设计

标签栏建议放在 Scratch 菜单栏上方或与公司顶部栏合并。

标签行为：

- 点击标签：激活对应 session。
- 新建按钮：回到首页或打开新建项目弹窗。
- 关闭按钮：如果 `dirty=true`，提示保存。
- 双击标签标题：重命名。
- 标签右键：关闭、关闭其他、复制路径、另存为。

需要的状态：

```js
{
    sessions: [],
    activeSessionId: null,
    recentSessionIds: [],
    maxAliveSessions: 5
}
```

## 保存与恢复

建议自定义一个公司项目文件格式，外层包一层元数据。

```json
{
    "format": "company-editor-project",
    "version": 1,
    "modeId": "micropythonBlocks",
    "title": "测试项目",
    "scratchProject": {},
    "code": "",
    "uiDesigner": null,
    "metadata": {
        "createdAt": 1710000000000,
        "updatedAt": 1710000000000
    }
}
```

如果兼容 Scratch 原生 `.sb3`：

- 普通 Scratch 模式可以继续导入/导出 `.sb3`。
- 公司硬件模式建议使用公司格式，避免扩展配置丢失。

## 与 Electron 桌面端的关系

如果在桌面端实现：

```text
React 负责顶部标签栏、首页、编辑器切换
Electron 主进程负责文件打开、保存、窗口标题、系统菜单、硬件权限
```

典型 IPC：

```text
renderer -> main: open-project-file
main -> renderer: project-file-loaded

renderer -> main: save-project-file
main -> renderer: project-file-saved

renderer -> main: update-window-title
```

不建议把标签页状态放在 Electron 主进程。主进程只做系统能力，业务状态留在 React/Redux。

## 推荐落地阶段

### 阶段 1：首页 + 单标签

目标：

- 启动后显示模式选择首页。
- 选择一个模式后进入编辑器。
- 根据模式显示不同顶部工具栏文案。

不做：

- 多标签保活。
- 复杂扩展隔离。
- 自定义文件格式。

### 阶段 2：多标签 UI + 保活

目标：

- 增加顶部标签栏。
- 每个标签维护独立 session。
- 切换标签不丢 Scratch 项目状态。
- 关闭标签时提示保存。

建议限制：

```text
最多同时打开 5 个标签
```

### 阶段 3：模式化扩展

目标：

- 不同模式显示不同 toolbox。
- 扩展库按模式过滤。
- 上传模式、硬件模式拥有不同连接/上传按钮。

### 阶段 4：项目格式和恢复

目标：

- 保存公司项目格式。
- 打开项目时根据 `modeId` 恢复对应编辑器。
- 启动后恢复上次未关闭的标签。

### 阶段 5：性能优化

目标：

- 标签休眠。
- 大项目懒加载。
- source map / 素材包体积优化。
- Electron 或 Tauri 壳优化。

## 风险点

### Scratch GUI 多实例风险

Scratch GUI、VM、Blockly 都比较重。多个实例同时挂载可能占用较多内存。

规避：

- 初期限制标签数。
- 切换时暂停非当前 VM。
- 后续实现休眠/恢复。

### 扩展隔离风险

如果只隐藏 toolbox，用户仍可能通过项目文件加载不允许的扩展块。

规避：

- 加载项目时校验 modeId 和扩展列表。
- VM 层也要限制不允许的扩展。

### 硬件连接风险

多个标签同时连接硬件会冲突。

规避：

- 硬件连接做全局连接管理器。
- 同一时间只允许一个 active session 使用串口/蓝牙/USB。

### 保存格式风险

直接保存 `.sb3` 可能丢公司模式信息。

规避：

- 公司模式使用公司项目格式。
- 内部可嵌入 `.sb3` 数据，但外层保留模式、硬件、代码生成配置。

## 推荐改造边界

优先新增外层 App Shell，不要大改 Scratch GUI 根组件。

建议边界：

```text
新增:
  AppShell
  HomePage
  TopTabBar
  EditorSessionManager
  EditorModeRegistry

少量改造:
  scratch-gui 菜单栏
  toolbox 生成
  extension library 过滤
  desktop 文件保存/打开 IPC

尽量不动:
  scratch-vm 执行核心
  scratch-render 渲染核心
  Blockly 拖拽拼接核心
```

## 一句话方案

把当前 Scratch 编辑器从“应用根页面”降级成“某个标签页里的编辑器视图”，在它外面新增一个公司 App Shell。App Shell 负责首页、模式、标签和会话；Scratch GUI 负责具体的积木编辑体验；Electron 只负责文件、窗口和系统能力。
