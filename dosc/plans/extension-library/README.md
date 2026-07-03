# plans/extension-library/ — 自定义积木拓展库

让学生/产品人员自定义积木、组织成拓展库、并像 Mixly「管理库」那样本地上传/下载的方案调研。对应 [进度总览](../../progress/project-progress-and-commercial-gap.md) 的**阶段 H**（当前未开始）。

| 文档 | 讲什么 |
| - | - |
| [01 自定义积木拓展库调研与实现方案](./01-custom-extension-library-research.md) | 调研 Scratch 扩展机制 + Mixly WonderCam 格式，给出库文件格式、三种实现路线、codegen 改造、管理面板、安全与分阶段计划 |
| [02 自定义积木拓展库具体实施方案](./02-custom-extension-library-implementation-plan.md) | 把调研结论拆成可开发的模块分布、端到端流程、文件改造点、manifest v1、阶段计划和人工测试用例 |
| [03 自定义积木拓展库 MVP 实施记录](./03-custom-extension-library-mvp-implementation-notes.md) | 记录本轮最小实现的代码分布、测试 manifest、人工验证步骤和已知限制 |
| [04 自定义积木模板用户教学](./04-custom-extension-template-user-guide.md) | 面向不会改源码的用户，讲 manifest 怎么写、参数怎么对齐、模板怎么生成 Python、常见错误怎么排查 |

> 核心结论：仓库已具备扩展注册/URL 加载/扩展库 UI 基础；当前 MVP 已把 Python 生成核心迁到 `scratch-vm/src/codegen/python.js`，并通过 manifest 模板支持自定义积木自动产码。参考样本：`D:\qq download\WonderCam\WonderCam`。
