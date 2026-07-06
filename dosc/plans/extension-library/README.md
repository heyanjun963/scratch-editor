# extension-library - 自定义积木拓展库

这里集中记录自定义拓展库、公司产品库、模块库、导入导出、Python 代码生成适配相关方案。

## 文档索引

| 文档 | 讲什么 |
| - | - |
| [01 自定义积木拓展库调研与实现方案](./01-custom-extension-library-research.md) | 调研 Scratch 扩展机制和 Mixly/WonderCam 格式，给出库文件格式、实现路线、codegen 改造、管理面板、安全策略和分阶段计划 |
| [02 自定义积木拓展库具体实施方案](./02-custom-extension-library-implementation-plan.md) | 把调研结论拆成可开发模块、端到端流程、文件改造点、manifest v1 和人工测试用例 |
| [03 自定义积木拓展库 MVP 实施记录](./03-custom-extension-library-mvp-implementation-notes.md) | 记录最小实现的代码分布、测试 manifest、人工验证步骤和已知限制 |
| [04 自定义积木模板用户教学](./04-custom-extension-template-user-guide.md) | 面向不会改源码的用户，讲 manifest、参数、Python 模板和常见错误排查 |
| [05 库管理器重新调研与改造方案](./05-library-manager-redesign-research.md) | 根据 Mixly 库管理器、WonderCam 库结构和公司现有 Python 生成器，重新定义独立库管理器、`.sbext` 库包、codegen 上下文和分阶段落地计划 |
| [06 WonderCam-like 新版拓展包格式落地记录](./06-wondercam-like-package-v2-implementation.md) | 记录新版目录型拓展包格式、导入流程、示例包结构、人工测试用例和当前限制 |
| [07 自定义拓展库完整逻辑流转](./07-extension-library-runtime-flow.md) | 汇报用端到端说明：导入、规范化、注册 VM、显示工具箱、拖拽积木、生成 Python 代码的完整链路 |
| [08 产品/模块式拓展面板执行方案](./08-product-module-extension-panel-plan.md) | 参考 Mind+ 竞品形态，把自定义拓展库入口迁回拓展面板，设计主控扩展/模块扩展 Tab、产品兼容关系、灰色禁用状态、工具箱启用策略和分阶段落地计划 |
| [09 MakeCode-like 云端拓展库框架方案](./09-makecode-like-cloud-extension-registry-plan.md) | 参考 Microsoft MakeCode 扩展机制，设计公司后台上传、云端目录、远程 `.sbext` 下载、审核、版本锁定、本地导入兜底和后续只维护拓展包的框架 |

## 当前结论

当前 MVP 已证明自定义库能注册到 VM、显示积木并生成 Python 代码。下一步产品化重点不是继续强化顶部菜单里的独立库管理器，而是把导入、管理、主控选择、模块选择、云端目录、上传审核和版本锁定收敛到拓展面板与统一拓展库框架里。
