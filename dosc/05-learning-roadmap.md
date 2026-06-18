# 新手学习路线图

你不需要一口气看懂整个 Scratch 编辑器。先按“能改页面”的路径学习，再逐步深入 VM 和渲染。

## 第 1 阶段：能跑起来，知道页面在哪里

目标：

- 会用 `fnm` 切 Node。
- 会安装依赖。
- 会构建内部包。
- 会启动 `http://localhost:8601/`。
- 知道 `scratch-gui` 是主要前端包。

重点文件：

- `package.json`
- `packages/scratch-gui/package.json`
- `packages/scratch-gui/src/playground/index.jsx`
- `packages/scratch-gui/src/components/gui/gui.jsx`

## 第 2 阶段：看懂主页面布局

目标：

- 知道顶部菜单、代码区、舞台、角色区分别对应哪个组件。
- 能改一个按钮、一个文案、一个 CSS 样式。

重点目录：

- `packages/scratch-gui/src/components/gui/`
- `packages/scratch-gui/src/components/menu-bar/`
- `packages/scratch-gui/src/components/stage/`
- `packages/scratch-gui/src/components/target-pane/`
- `packages/scratch-gui/src/components/library/`

练习建议：

1. 改一个顶部菜单按钮文案。
2. 改一个菜单按钮样式。
3. 改 `gui.css` 中某个布局间距。
4. 启动页面确认效果。

## 第 3 阶段：理解组件和状态

目标：

- 分清 `components` 和 `containers`。
- 知道 Redux 状态在哪里。
- 会新增一个简单弹窗开关。

重点文件：

- `packages/scratch-gui/src/containers/gui.jsx`
- `packages/scratch-gui/src/reducers/gui.ts`
- `packages/scratch-gui/src/reducers/modals.js`
- `packages/scratch-gui/src/reducers/editor-tab.js`

练习建议：

1. 找到“扩展库”弹窗怎么打开。
2. 模仿它新增一个空弹窗。
3. 在菜单栏增加一个按钮打开它。

## 第 4 阶段：理解项目加载和保存

目标：

- 知道项目保存/加载不是普通 UI 功能。
- 能找到 storage/config/project-state 的边界。

重点文件：

- `packages/scratch-gui/src/gui-config.ts`
- `packages/scratch-gui/src/lib/legacy-storage.ts`
- `packages/scratch-gui/src/reducers/project-state.js`
- `packages/scratch-storage/src/index.ts`

适合公司产品接入的思路：

- 把公司 API 包装成 storage adapter。
- UI 层只显示状态和触发动作。
- 不要在菜单按钮里直接写复杂保存逻辑。

## 第 5 阶段：理解 VM 和扩展

目标：

- 知道 VM 是 Scratch 项目运行核心。
- 知道 GUI 如何监听 VM 事件。
- 能找到积木扩展入口。

重点文件：

- `packages/scratch-gui/src/lib/vm-manager-hoc.jsx`
- `packages/scratch-gui/src/lib/vm-listener-hoc.jsx`
- `packages/scratch-vm/src/virtual-machine.js`
- `packages/scratch-vm/src/extensions/`

什么时候需要改 VM：

- 新增积木。
- 新增硬件连接能力。
- 改项目运行语义。
- 改角色、变量、事件等 Scratch 核心行为。

普通页面改版通常不需要先碰 VM。

## 第 6 阶段：形成自己的项目地图

建议你每做一个需求，都在本地维护一份笔记：

```text
需求：
入口：
涉及组件：
涉及 container：
涉及 reducer：
涉及 VM/storage：
验证方式：
风险：
```

这比盲目全文搜索更稳。复杂项目不是靠记住所有文件学会的，而是靠一次次把“需求 -> 文件 -> 数据流”连起来。

