# plans/extension-library/ — 自定义积木拓展库

让学生/产品人员自定义积木、组织成拓展库、并像 Mixly「管理库」那样本地上传/下载的方案调研。对应 [进度总览](../../progress/project-progress-and-commercial-gap.md) 的**阶段 H**（当前未开始）。

| 文档 | 讲什么 |
| - | - |
| [01 自定义积木拓展库调研与实现方案](./01-custom-extension-library-research.md) | 调研 Scratch 扩展机制 + Mixly WonderCam 格式，给出库文件格式、三种实现路线、codegen 改造、管理面板、安全与分阶段计划 |

> 核心结论：仓库已具备扩展注册/URL 加载/扩展库 UI 基础，最大缺口是 **Python 代码生成在 GUI 里硬编码**（`python-codegen/index.js`），需改造为模板驱动才能支持自定义积木自动产码。参考样本：`D:\qq download\WonderCam\WonderCam`。
