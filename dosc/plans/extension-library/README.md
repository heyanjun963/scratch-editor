# plans/extension-library/ — 自定义积木拓展库

让学生/产品人员自定义积木、组织成拓展库、并像 Mixly「管理库」那样本地上传/下载的方案调研。对应 [进度总览](../../progress/project-progress-and-commercial-gap.md) 的**阶段 H**（当前未开始）。

| 文档 | 讲什么 |
| - | - |
| [01 自定义积木拓展库调研与实现方案](./01-custom-extension-library-research.md) | 调研 Scratch 扩展机制 + Mixly WonderCam 格式，给出库文件格式、三种实现路线、codegen 改造、管理面板、安全与分阶段计划 |
| [02 自定义积木拓展库具体实施方案](./02-custom-extension-library-implementation-plan.md) | 把调研结论拆成可开发的模块分布、端到端流程、文件改造点、manifest v1、阶段计划和人工测试用例 |
| [03 自定义积木拓展库 MVP 实施记录](./03-custom-extension-library-mvp-implementation-notes.md) | 记录本轮最小实现的代码分布、测试 manifest、人工验证步骤和已知限制 |
| [04 自定义积木模板用户教学](./04-custom-extension-template-user-guide.md) | 面向不会改源码的用户，讲 manifest 怎么写、参数怎么对齐、模板怎么生成 Python、常见错误怎么排查 |
| [05 库管理器重新调研与改造方案](./05-library-manager-redesign-research.md) | 根据 Mixly 库管理器、WonderCam 库结构和公司现有 Python 生成器，重新定义独立库管理器、`.sbext` 库包、codegen 上下文和分阶段落地计划 |
| [06 WonderCam-like 新版拓展包格式落地记录](./06-wondercam-like-package-v2-implementation.md) | 记录新版目录型拓展包格式、导入流程、示例包结构、人工测试用例和当前限制 |
| [07 自定义拓展库完整逻辑流转](./07-extension-library-runtime-flow.md) | 汇报用端到端说明：导入、规范化、注册 VM、显示工具箱、拖拽积木、生成 Python 代码的完整链路 |

> 核心结论：当前 MVP 已证明自定义库能注册和生成 Python，但产品形态不足。下一步应把导入/导出/删除从 Scratch 扩展库卡片中移出，升级为 Python 顶部菜单里的独立“库管理器”，再逐步支持 `.sbext` 包、运行库文件和公司机器人产品生成器。
