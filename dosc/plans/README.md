# plans/ — 实现计划

单个功能的实施前 / 实施中方案，按主题分子目录。每篇通常包含：目标、方案、代码落点、验收标准、当前进展。

> 计划类文档更新频繁。判断某功能整体进度请回 [`../progress/`](../progress/)；这里是具体某功能“怎么做”的细节。

## 子目录

### [desktop/](./desktop/) — Electron 桌面端

- [01 Electron 桌面端运行方案](./desktop/01-electron-desktop-run-plan.md)
- [02 Electron 生产打包实施记录](./desktop/02-electron-packaging-implementation.md)
- [03 桌面端浏览器式多 Tab](./desktop/03-desktop-browser-tabs-plan.md)
- [04 桌面端首页入口与创建时选模式](./desktop/04-desktop-home-mode-entry-plan.md)

### [python/](./python/) — Python 编码模式

- [01 Python 编码模式开发方案](./python/01-python-coding-mode-implementation-plan.md)
- [02 阶段 B：Python 文件生成与本机运行](./python/02-phase-b-python-file-and-run-plan.md)
- [03 阶段 C：Python Terminal 产品化](./python/03-phase-c-terminal-productization-plan.md)
- [04 Python 积木分类和语法完善](./python/04-python-block-category-and-syntax-plan.md)

### [editor/](./editor/) — 编辑器通用

- [01 编辑器模式首页与顶部标签页](./editor/01-editor-mode-tabs-implementation-plan.md)（部分已被 desktop/03、04 覆盖）
- [02 阶段 D：项目保存和恢复](./editor/02-phase-d-project-save-restore-plan.md)

### [extension-library/](./extension-library/) — 自定义积木拓展库

- [01 自定义积木拓展库调研与实现方案](./extension-library/01-custom-extension-library-research.md)（Scratch 自定义积木 + 本地上传/下载，参考 Mixly）
