# scratch-editor 学习 Wiki

这组文档是给刚开始接触 `scratch-editor` 的前端同学看的。目标不是把每个源码文件都讲完，而是帮你先建立项目地图，知道以后改版页面、接入公司产品、排查问题时从哪里下手。

> 目录名按你的要求使用 `dosc`。如果后续想改成常见的 `docs`，可以再整体移动。

## 推荐阅读顺序

1. [Monorepo 架构总览](./01-monorepo-architecture.md)
2. [scratch-gui 前端导读](./02-scratch-gui-frontend-guide.md)
3. [公司产品改版作战手册](./03-company-product-change-playbook.md)
4. [本地开发运行手册](./04-local-dev-runbook.md)
5. [新手学习路线图](./05-learning-roadmap.md)
6. [scratch-blocks 模块导读](./08-scratch-blocks-module-guide.md)
7. [scratch-vm 模块导读](./09-scratch-vm-module-guide.md)

## 先抓住一句话

`scratch-editor` 是一个 npm workspaces monorepo。你现在最关心的前端页面主要在 `packages/scratch-gui`，但它运行时会把这些包串起来：

- `scratch-gui`：React 编辑器界面，菜单、舞台、角色区、积木区、素材库都在这里。
- `scratch-vm`：Scratch 项目的运行核心，负责积木、角色、变量、事件和扩展。
- `scratch-render`：舞台渲染器，负责画角色、背景、克隆体。
- `scratch-storage`：项目、图片、声音等资源的加载和保存。
- `scratch-svg-renderer`：处理 SVG 造型。
- `scratch-paint`：造型/背景编辑器。
- `task-herder`：任务队列工具，当前主要被 storage 使用。

## 你当前任务应该优先看哪里

如果你的任务是“改版前端页面以支持公司更多产品”，优先看这些位置：

| 目标 | 优先目录 |
| - | - |
| 改整体编辑器布局 | `packages/scratch-gui/src/components/gui/` |
| 改顶部菜单、品牌、分享、文件按钮 | `packages/scratch-gui/src/components/menu-bar/` |
| 改舞台和角色区域 | `packages/scratch-gui/src/components/stage*`、`packages/scratch-gui/src/containers/stage*`、`packages/scratch-gui/src/components/target-pane/` |
| 改角色/背景/声音素材库 | `packages/scratch-gui/src/lib/libraries/`、`packages/scratch-gui/src/containers/*-library.jsx` |
| 接入公司项目保存/加载/素材服务 | `packages/scratch-gui/src/gui-config.ts`、`packages/scratch-gui/src/lib/legacy-storage.ts` |
| 添加新弹窗/新面板 | `packages/scratch-gui/src/reducers/modals.js`、`packages/scratch-gui/src/components/`、`packages/scratch-gui/src/containers/` |
| 添加硬件/积木扩展 | `packages/scratch-vm/src/extensions/`，同时看 `scratch-gui` 的 extension library |
| 改主题、颜色、视觉风格 | `packages/scratch-gui/src/css/`、`packages/scratch-gui/src/lib/settings/` |

## 本地已验证过的运行状态

本机使用 `fnm` 安装并切换到 Node `24.16.0` 后，已经可以启动：

```powershell
npm start
```

默认地址：

```text
http://localhost:8601/
```

首次跑这个 monorepo 时，需要先安装依赖、生成 `scratch-gui` 的 microbit 资源，并构建几个内部包。详细步骤见 [本地开发运行手册](./04-local-dev-runbook.md)。
