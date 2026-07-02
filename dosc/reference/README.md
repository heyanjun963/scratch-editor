# reference/ — 架构与实现参考

描述“系统是怎样的”的稳定文档：架构地图、模块导读、机制研究。改代码前先在这里建立心智模型。

| 文档 | 讲什么 | 何时看 |
| - | - | - |
| [01 Monorepo 架构总览](./01-monorepo-architecture.md) | 各包职责、依赖方向、构建顺序 | 第一篇必读 |
| [02 scratch-gui 前端导读](./02-scratch-gui-frontend-guide.md) | GUI 入口、组件/容器/Redux 分层 | 改前端界面前 |
| [03 scratch-blocks 模块导读](./03-scratch-blocks-module-guide.md) | 积木外观、拖拽连接、字段扩展点 | 改积木/字段/颜色器前 |
| [04 scratch-vm 模块导读](./04-scratch-vm-module-guide.md) | 运行内核、积木事件、扩展体系 | 改运行逻辑/扩展前 |
| [05 Blocks/VM/GUI 扩展研究](./05-blocks-vm-gui-extension-research.md) | 自定义扩展 block、颜色字段专题 | 做自定义积木/扩展前 |

> 维护约定：只有当代码结构/机制发生变化时才更新本目录。功能进度、待办不写这里，写 `../progress/` 或 `../plans/`。
