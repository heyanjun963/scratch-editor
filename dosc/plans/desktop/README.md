# plans/desktop/ — Electron 桌面端

把浏览器版编辑器演进为可安装桌面软件的相关方案，按推进顺序排列。

| 文档 | 阶段/主题 | 状态提示 |
| - | - | - |
| [01 Electron 桌面端运行方案](./01-electron-desktop-run-plan.md) | 开发运行入口 | 复用 monorepo 的 scratch-gui，主进程建窗、加载 dev server |
| [02 Electron 生产打包实施记录](./02-electron-packaging-implementation.md) | 生产打包 | electron-builder，Windows unpacked/安装包配置 |
| [03 桌面端浏览器式多 Tab](./03-desktop-browser-tabs-plan.md) | 多 Tab | 顶部标签栏 + 多 WebContentsView |
| [04 桌面端首页入口与创建时选模式](./04-desktop-home-mode-entry-plan.md) | 首页/模式入口 | Home View + 创建时固定 stage/code 模式 |

> 整体完成度与商用差距见 [../../progress](../../progress/project-progress-and-commercial-gap.md)（阶段 A 桌面可打包等）。
