# 桌面端首页入口与创建时选择模式方案

## 目标

当前桌面端已经有浏览器式多 Tab：

```text
Electron 主窗口
  顶部 Shell 标签栏
  多个编辑器 WebContentsView
```

下一步要把入口改成竞品类似的“软件首页”：

- 启动软件时不直接进入编辑器。
- 当没有任何编辑器 Tab 时，显示首页。
- 点击顶部 `+` 时，也不是直接创建默认编辑器，而是显示首页让用户选择模式。
- 首页目前只需要两个入口：
  - 默认舞台模式
  - 代码模式
- 用户创建时选择什么模式，这个 Tab 就固定是什么模式。
- 不再通过原来编辑器头部菜单切换“舞台 / 编码”模式。

这份文档只做计划和推论，不直接实现代码。

## 联网调研结论

### Electron 多视图适合首页 + 多编辑器

Electron 官方 `WebContentsView` 是一个能展示 `WebContents` 的 View，可以挂到窗口的 `contentView` 里，并通过 `setBounds` 控制位置。官方示例也是在一个窗口中添加多个 `WebContentsView` 并分别加载不同 URL。

这说明当前桌面端架构可以自然扩展成：

```text
Shell View
  顶部标签栏

Home View
  首页 / 模式选择

Editor Views
  Tab A 的编辑器
  Tab B 的编辑器
```

参考：Electron `WebContentsView` 文档。

### Shell 到主进程仍应走安全 IPC

Electron 官方建议开启 `contextIsolation`，并通过 `contextBridge` 暴露有限 API。不要把 `ipcRenderer` 原样暴露给页面，而是一个 IPC 方法对应一个明确能力。

因此首页点击“默认舞台模式”或“代码模式”时，仍然应该调用类似：

```js
window.scratchDesktopTabs.create({mode: 'stage'})
window.scratchDesktopTabs.create({mode: 'code'})
```

而不是让首页直接访问 Node、文件系统或 Electron 主进程对象。

参考：Electron Context Isolation 文档。

### 自定义标题栏仍要保留拖拽区规则

当前顶部标签栏已经使用 `app-region: drag` 和 `app-region: no-drag`。首页会出现在标题栏下方，不直接参与窗口拖拽，但首页按钮、卡片、左侧菜单仍然要避免放进标题栏拖拽区域。

参考：Electron Custom Window Interactions 文档。

## 产品流程

### 启动流程

目标流程：

```text
打开桌面端
  -> 创建 Shell
  -> tabs 为空
  -> 显示首页
  -> 用户选择模式
  -> 创建对应模式的编辑器 Tab
  -> 隐藏首页
  -> 显示编辑器
```

和当前流程的差异：

```text
当前：
  app ready -> createTab({mode: 'scratch'})

目标：
  app ready -> showHome()
```

也就是说，`app.whenReady()` 里不要再自动创建默认 Scratch Tab。

### 加号流程

当前流程：

```text
点击 +
  -> tabs:create({mode: 'scratch'})
```

目标流程：

```text
点击 +
  -> showHome()
  -> 用户选择 默认舞台模式 / 代码模式
  -> tabs:create({mode})
```

如果当前已经有编辑器 Tab，点击 `+` 后首页可以覆盖编辑区，但顶部已有 Tab 仍然保留。

用户如果不想创建，可以点击已有 Tab 回到原编辑器。

### 关闭 Tab 流程

目标流程：

```text
关闭当前 Tab
  如果还有其他 Tab
    激活剩余 Tab

  如果没有任何 Tab
    activeTabId = null
    显示首页
```

也就是说，不再像当前 MVP 一样“关到最后自动补一个 Scratch Tab”。

这是本需求最关键的行为变化。

### Home 按钮流程

顶部 Home 按钮建议变成真实入口：

```text
点击 Home
  -> activeTabId = null
  -> 隐藏所有 Editor View
  -> 显示首页
```

这样用户可以随时回首页创建新模式项目。

已有 Tab 不销毁，点击 Tab 仍然能回来。

## 首页信息架构

当前第一版只做两个模式，不需要完全复刻竞品的全部业务分类。

建议结构：

```text
顶部标题栏
  Home
  Tab A
  Tab B
  +
  窗口按钮区域

首页内容
  左侧导航
    新建项目
    打开项目

  主内容
    新建项目
      默认舞台模式
      代码模式
```

第一版可以把左侧导航做轻量一点：

- `新建项目`：当前高亮。
- `打开项目`：先显示 disabled 或暂不实现。

不要一开始做“发现、模型训练、界面设计”等入口，因为目前没有对应功能。

## 两个模式定义

建议把模式定义从 UI 里抽出来，放到一个集中配置。

示例：

```js
const editorModes = {
    stage: {
        id: 'stage',
        title: '默认舞台模式',
        subtitle: '使用积木编程控制舞台',
        tabTitle: '新建项目 - 舞台',
        editorType: 'scratch-gui',
        desktopMode: 'stage'
    },
    code: {
        id: 'code',
        title: '代码模式',
        subtitle: '拖动积木生成 Python 代码',
        tabTitle: '新建项目 - Python',
        editorType: 'scratch-gui',
        desktopMode: 'code'
    }
};
```

这份配置后续可以扩展：

- 上传模式
- Python 积木模式
- MicroPython 代码模式
- 硬件模式
- 模型训练模式

但第一版只开放两个。

## 技术方案

### 主进程状态

当前主进程有：

```js
let activeTabId = null;
const tabs = new Map();
const editorViews = new Map();
```

建议新增：

```js
let homeVisible = true;
let homeView = null;
```

或者更明确：

```js
const activeSurface = {
    type: 'home' | 'editor',
    tabId: null
};
```

第一版推荐用简单状态：

```js
let activeTabId = null;
```

约定：

- `activeTabId === null` 表示显示首页。
- `activeTabId !== null` 表示显示对应编辑器。

这样改动最小。

### View 层级

目标层级：

```text
mainWindow.contentView
  shellView
  homeView
  editorView(tab-1)
  editorView(tab-2)
```

布局规则：

```text
shellView
  x: 0
  y: 0
  width: windowWidth
  height: titleBarHeight

homeView / editorView
  x: 0
  y: titleBarHeight
  width: windowWidth
  height: windowHeight - titleBarHeight
```

显示规则：

```text
activeTabId === null
  homeView 放到内容区
  所有 editorView 移到隐藏区

activeTabId !== null
  homeView 移到隐藏区
  active editorView 放到内容区
  其他 editorView 移到隐藏区
```

### 首页放在哪里

推荐第一版把首页也放进 `desktop/shell`，但和顶部标签栏分成两个 HTML 页面。

目录建议：

```text
desktop/
  shell/
    titlebar.html
    titlebar.js
    titlebar.css
    home.html
    home.js
    home.css
```

当前已经有：

```text
desktop/shell/index.html
desktop/shell/shell.js
desktop/shell/styles.css
```

为了少改，第一版可以先这样命名：

```text
desktop/shell/index.html       顶部标题栏
desktop/shell/shell.js
desktop/shell/styles.css

desktop/home/index.html        首页
desktop/home/home.js
desktop/home/styles.css
```

我更推荐 `desktop/home/`，原因是：

- 标题栏和首页不是同一个视图。
- 标题栏高度固定 40px。
- 首页占据下面完整内容区。
- 分开后不会让一个 HTML 既管顶部又管主体，后续更清楚。

### IPC 设计

当前已有：

```text
tabs:list
tabs:create
tabs:activate
tabs:close
```

建议扩展：

```text
home:show
```

或者复用：

```text
tabs:activate(null)
```

第一版推荐显式新增 `home:show`。

原因：

- `tabs:activate` 语义是激活 Tab。
- 首页不是 Tab。
- 显式 IPC 更利于后续维护。

最终 IPC：

```text
tabs:list
tabs:create({mode})
tabs:activate(tabId)
tabs:close(tabId)
home:show()
```

`tabs:create` 成功后主进程自动：

```text
activeTabId = newTabId
homeVisible = false
layoutViews()
broadcastTabsChanged()
```

### Shell 需要知道首页状态吗

建议知道。

当前 `tabs:changed` payload 是：

```js
{
    tabs,
    activeTabId
}
```

可以继续用 `activeTabId: null` 表示首页。

Shell 的表现：

- `activeTabId === null` 时，Home 按钮高亮。
- 所有 Tab 不高亮。
- 点击已有 Tab 时，切回对应编辑器。

这样顶部交互很自然。

## 编辑器模式如何固定

创建 Tab 时写入：

```js
{
    id,
    mode: 'stage' | 'code',
    title,
    editorType: 'scratch-gui'
}
```

创建后不提供切换 mode 的入口。

编辑器 URL 继续带参数：

```text
http://127.0.0.1:8601/?desktopTabId=xxx&desktopMode=stage
http://127.0.0.1:8601/?desktopTabId=xxx&desktopMode=code
```

`scratch-gui` 根据 `desktopMode` 初始化布局：

```text
stage
  默认 Scratch 舞台模式
  显示舞台区

code
  Python 编码模式
  显示代码区和控制台
```

重要约束：

```text
不要在已创建的 Tab 内切换 mode。
```

如果用户想换模式，应该回首页新建另一个 Tab。

这样状态模型更清楚：

```text
Tab A = stage
Tab B = code
```

而不是：

```text
Tab A 一会儿 stage，一会儿 code
```

后者会带来 VM、Blockly Workspace、代码生成器、舞台区状态混杂的问题。

## 与当前 Python 编码模式的关系

当前已经有“头部按钮切换舞台区为代码区”的能力。

这个需求要求：

```text
切换模式不再放在原来的头部菜单。
创建时选定模式。
```

因此后续实现时要调整：

- 保留代码模式能力。
- 移除或隐藏编辑器内的模式切换按钮。
- 根据 `desktopMode=code` 自动进入代码模式。
- 根据 `desktopMode=stage` 自动进入默认舞台模式。

如果浏览器开发模式仍需要调试按钮，可以只在开发环境保留，或放到隐藏调试入口，但正式桌面端不显示。

## 推论：为什么首页应该是独立 View

有两种做法：

### 方案 A：首页在 Shell 内部

结构：

```text
shellView
  顶部标签栏
  首页内容

editorViews
```

问题：

- `shellView` 当前只有 40px 高。
- 如果首页也放进去，就要动态改变 shellView 高度。
- 标题栏和内容区的拖拽规则会混在一起。
- 首页变复杂后，Shell 会越来越臃肿。

### 方案 B：首页是独立 Home View

结构：

```text
shellView 只负责顶部标签栏
homeView 负责首页内容
editorViews 负责编辑器
```

优点：

- 和当前多 `WebContentsView` 架构一致。
- 首页和编辑器一样占据内容区。
- Home 可以像一个普通页面一样开发。
- 后续首页引入图片、最近项目、课程入口、发现页时不会污染标题栏逻辑。

推荐方案 B。

## 推论：为什么不要把首页塞进 scratch-gui

首页是“应用入口”，不是 Scratch 编辑器的一部分。

如果塞进 `scratch-gui`：

- 启动时仍然要加载完整 Scratch GUI。
- 首页选择模式会和 Scratch 内部状态耦合。
- 多 Tab 的创建、关闭、切换仍然绕不开 Electron 主进程。
- 后续打开项目、最近项目、本地文件系统能力也需要 IPC，放在桌面 Shell 更自然。

因此首页应该属于桌面 Shell。

`scratch-gui` 只接收已经确定的 `desktopMode`，然后渲染对应编辑器。

## 推论：默认启动不创建 Tab 更合理

当前 MVP 启动就创建 Scratch Tab，是为了快速验证多 Tab。

有首页后，应改为：

```text
启动不创建任何 editorView
```

好处：

- 启动更轻。
- 用户先看到清晰的产品入口。
- 不会默认占用一个 Scratch GUI 的内存。
- 加号和空状态逻辑统一。

代价：

- 首次点击模式后才加载 Scratch GUI，会有首次加载等待。

第一版可以接受这个代价。后续如果追求速度，可以在首页空闲时预热默认舞台模式。

## 第一版实施计划

### 步骤 1：新增首页 View

新增：

```text
desktop/home/index.html
desktop/home/home.js
desktop/home/styles.css
```

主进程新增：

```js
const getHomeUrl = () => pathToFileURL(path.join(__dirname, 'home', 'index.html')).toString();
const createHomeView = () => { ... };
```

### 步骤 2：调整启动默认状态

删除当前启动时的默认创建：

```js
createTab({mode: 'scratch'});
```

改为：

```js
showHome();
```

### 步骤 3：调整布局逻辑

`layoutViews()` 改成同时布局：

- `shellView`
- `homeView`
- `editorViews`

约定：

```js
activeTabId === null
```

表示首页占据内容区。

### 步骤 4：调整关闭最后一个 Tab 的逻辑

当前：

```js
if (!activeTabId) {
    createTab({mode: 'scratch'});
}
```

改为：

```js
if (!activeTabId) {
    showHome();
}
```

### 步骤 5：调整加号逻辑

当前 `desktop/shell/shell.js`：

```js
newTabButton.addEventListener('click', () => {
    tabsApi.create({mode: 'scratch'});
});
```

改为：

```js
newTabButton.addEventListener('click', () => {
    tabsApi.showHome();
});
```

或者：

```js
desktopHome.show();
```

具体命名以后实现时再统一。

### 步骤 6：首页选择模式创建 Tab

首页按钮：

```js
createStageButton.addEventListener('click', () => {
    tabsApi.create({mode: 'stage'});
});

createCodeButton.addEventListener('click', () => {
    tabsApi.create({mode: 'code'});
});
```

主进程根据 mode 设置标题：

```text
stage -> 新建项目 - 舞台
code  -> 新建项目 - Python
```

### 步骤 7：调整 scratch-gui 模式入口

后续代码实现时检查：

- 当前代码模式是否读 `desktopMode`。
- 是否仍依赖头部 Hello Scratch 旁边的切换按钮。
- 是否需要隐藏这个按钮。

目标：

```text
desktopMode=stage -> 默认舞台模式
desktopMode=code  -> 代码模式
```

## 首页视觉建议

结合竞品截图，第一版不要做得太满。

建议布局：

```text
橙色品牌横条
  公司 / 产品 Logo

左侧导航
  新建项目
  打开项目

主区域
  程序设计
    默认舞台模式
    代码模式
```

卡片建议：

- 每张卡片宽度约 320-380px。
- 标题清楚，副标题一句话。
- 右上角有箭头。
- 左下角有模式编号，例如 C1、C2。
- 当前只有两个可用模式，不要展示未开发卡片，避免误导。

两个入口文案建议：

```text
默认舞台模式
使用积木编程控制舞台
C1

代码模式
拖动积木生成 Python 代码
C2
```

## 验收标准

### 启动

- `npm run desktop` 启动后显示首页。
- 不自动创建编辑器 Tab。
- 顶部只有 Home、`+` 和窗口按钮。

### 创建

- 点击“默认舞台模式”创建一个舞台模式 Tab。
- 点击“代码模式”创建一个代码模式 Tab。
- 创建后首页隐藏，编辑器显示。
- Tab 标题正确。

### 加号

- 已有 Tab 时点击 `+`，显示首页。
- 已有 Tab 不销毁。
- 点击已有 Tab 可以从首页回到原编辑器。

### 关闭

- 关闭最后一个 Tab 后显示首页。
- 不自动补默认 Scratch Tab。

### 模式固定

- 舞台模式 Tab 不显示代码模式布局。
- 代码模式 Tab 直接显示代码区。
- 编辑器内部不再提供明显的“切换模式”按钮。

## 风险与处理

### 风险 1：首次创建编辑器变慢

因为启动时不再预创建 Scratch GUI，用户第一次点击模式后才加载编辑器。

处理：

- 第一版接受。
- 后续可在首页加载完成后预热默认舞台模式，但不显示。

### 风险 2：首页和 Tab 激活状态不一致

如果 Shell 没收到 `activeTabId = null`，可能 Home 按钮不高亮。

处理：

- 所有 `showHome()`、`createTab()`、`activateTab()` 后统一 `broadcastTabsChanged()`。
- payload 里明确包含 `activeTabId`。

### 风险 3：代码模式仍依赖旧切换按钮

如果 `scratch-gui` 还没有从 URL 参数初始化代码模式，创建 `code` Tab 后可能仍显示舞台模式。

处理：

- 实现时先定位当前代码模式 Redux 状态。
- 在桌面入口读取 `desktopMode` 初始化。
- 隐藏旧切换按钮。

### 风险 4：首页设计过早膨胀

竞品首页入口很多，但当前只需要两个。

处理：

- 第一版只做可用入口。
- 未实现功能不展示，或者只在文档中规划。

## 推荐结论

推荐实现路线：

```text
保留顶部 Shell 标签栏
新增独立 Home WebContentsView
启动时 activeTabId = null
点击 + 时 showHome()
首页选择 mode 后 createTab({mode})
Tab 创建后模式固定
关闭最后一个 Tab 后回到首页
scratch-gui 根据 desktopMode 初始化舞台 / 代码布局
```

这个方案改动边界清楚：

- Electron 主进程负责首页显示、Tab 生命周期和模式创建。
- Shell 负责顶部标签栏。
- Home 负责模式选择。
- `scratch-gui` 只负责按指定模式渲染编辑器。

它比“在编辑器内部切换模式”更适合多 Tab 桌面软件，也更接近竞品的产品心智。

