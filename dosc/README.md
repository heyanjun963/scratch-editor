# scratch-editor 文档 Wiki

> 本目录是 `scratch-editor` 项目的知识库，按“便于人和 AI 检索”的 wiki 结构组织。
> 目录名沿用 `dosc`（历史命名，不是笔误）。

## 这个项目是什么

`scratch-editor` 是一个基于 Scratch 3.0 的 **npm workspaces monorepo**，正在被改造成公司自有的图形化编程编辑器，目标包括 Electron 桌面端、Python 编码模式、自定义扩展库等。核心包都在 `packages/` 下（`scratch-gui` React 界面、`scratch-vm` 运行内核、`scratch-blocks` 积木编辑器、`scratch-render`、`scratch-storage`、`scratch-paint` 等）。

## 文档如何组织（重要）

文档分成两大类，分别放在不同目录，**不要再把它们混在一起**：

| 类别 | 目录 | 内容性质 | 更新频率 |
| - | - | - | - |
| **参考 / 实现** | [`reference/`](./reference/) | 架构、模块导读、机制研究——描述“系统是怎样的”，相对稳定 | 低（随代码结构变化才更新） |
| **上手指南** | [`guides/`](./guides/) | 运行、学习路线、改版切入点——描述“你该怎么做” | 中 |
| **进度总览** | [`progress/`](./progress/) | 当前完成度、商用差距、总控路线图 | 高（每次提交后更新） |
| **实现计划** | [`plans/`](./plans/) | 单个功能的实施前/实施中方案，按主题分子目录 | 高（功能推进时更新） |

> **约定**：描述“系统长什么样、机制怎么跑”的 → `reference/`；描述“做了/要做什么、进度到哪” → `progress/` 或 `plans/`。新增大功能时，先更新 [进度总览](./progress/project-progress-and-commercial-gap.md)，再在 `plans/` 下写细分方案。

## 目录导航

### 📘 reference/ — 架构与实现参考

先读这里建立项目地图。

- [01 Monorepo 架构总览](./reference/01-monorepo-architecture.md) — 包关系、依赖方向、构建顺序
- [02 scratch-gui 前端导读](./reference/02-scratch-gui-frontend-guide.md) — React 界面入口、组件/容器/状态分层
- [03 scratch-blocks 模块导读](./reference/03-scratch-blocks-module-guide.md) — 积木外观、拖拽连接、字段扩展点
- [04 scratch-vm 模块导读](./reference/04-scratch-vm-module-guide.md) — 运行内核、积木事件、扩展体系
- [05 Blocks/VM/GUI 扩展研究](./reference/05-blocks-vm-gui-extension-research.md) — 自定义扩展 block、颜色字段等专题调研

### 🧭 guides/ — 上手与开发指南

- [01 本地开发运行手册](./guides/01-local-dev-runbook.md) — fnm + Node 24.16.0 跑通 `npm start`
- [02 新手学习路线图](./guides/02-learning-roadmap.md) — 从“能跑页面”到深入 VM 的分阶段学习
- [03 公司产品改版作战手册](./guides/03-company-product-change-playbook.md) — 每个需求先分层，再定位改哪个包

### 📊 progress/ — 进度总览

- [项目进度总览与商用差距](./progress/project-progress-and-commercial-gap.md) — **总控文档**，看这里了解当前完成度、缺口和下一步路线

### 🛠 plans/ — 实现计划（按主题）

- **[desktop/](./plans/desktop/)** — Electron 桌面端：运行入口、生产打包、浏览器式多 Tab、首页模式入口
- **[python/](./plans/python/)** — Python 编码模式：编码模式方案、`.py` 文件生成与运行、Terminal 产品化、积木分类语法
- **[editor/](./plans/editor/)** — 编辑器通用：模式首页/标签页、项目保存与恢复
- **[extension-library/](./plans/extension-library/)** — 自定义积木拓展库：自定义积木 + 本地上传/下载（参考 Mixly）

## 快速上手

本机使用 `fnm` 切换到 Node `24.16.0` 后可启动：

```powershell
npm start          # 浏览器开发模式，默认 http://localhost:8601/
npm run desktop    # Electron 桌面开发模式
```

首次运行需先安装依赖、生成 microbit 资源并构建内部包，详见 [本地开发运行手册](./guides/01-local-dev-runbook.md)。

## 从哪里下手（按任务）

| 你的任务 | 优先阅读 | 优先改动目录 |
| - | - | - |
| 改整体编辑器布局 | reference/02 | `packages/scratch-gui/src/components/gui/` |
| 改顶部菜单、品牌、文件按钮 | reference/02、guides/03 | `packages/scratch-gui/src/components/menu-bar/` |
| 改积木外观、颜色选择器、字段 | reference/03、reference/05 | `packages/scratch-blocks/` |
| 添加硬件/积木扩展 | reference/04、reference/05 | `packages/scratch-vm/src/extensions/` + gui 扩展库 |
| 接入项目保存/加载 | plans/editor/02 | `scratch-gui` gui-config / legacy-storage |
| 桌面端打包发布 | plans/desktop/02 | 根目录 `desktop/`、`electron-builder.yml` |
| Python 代码模式 | plans/python/* | `scratch-vm` Python 扩展 + `scratch-gui` 代码面板 |
| 自定义扩展库（导入导出） | progress 阶段 H、`extension-library/`（若存在） | 待方案确定 |
