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
| [10 旧产品拓展迁移计划](./10-old-product-migration-plan.md) | 结合旧 `scratch-vm/src/extensions` 和旧 `python-generator`，规划旧产品、公共模块、启动帽子块、初始化变量、Python 生成器和测试基线的迁移路线 |
| [13 AI机甲麦轮车二次迁移记录](./13-aimecanum-second-migration-record.md) | 记录 AI机甲麦轮车按声明式 manifest 迁移后的积木、Python 入口和遗留项 |
| [14 六路巡线字段迁移计划](./14-line6-field-migration-plan.md) | 记录六路巡线位掩码字段从临时菜单迁移为 LINE6 自定义字段的实现方案 |
| [15 AI机甲麦轮车 SBEXT 外置执行记录](./15-aimecanum-sbext-extraction-progress.md) | 记录内置 JS manifest 外置为标准源包、生成 `.sbext`、重新导入测试和后续远程更新接口准备情况 |
| [16 用户拓展分类与产品包来源模型](./16-user-extension-tab-and-product-source-progress.md) | 记录用户拓展独立 Tab、加载/卸载/删除、启用状态持久化，以及后台包覆盖内置默认产品配置的预留模型 |
| [17 产品配置总仓库与同步命令执行记录](./17-product-extension-repository-sync-progress.md) | 记录独立多产品配置仓库、源配置与 SBEXT 同步命令、catalog 增量更新、稳定 SHA256 和人工 Release 步骤 |
| [18 GitHub 产品拓展自动更新执行记录](./18-github-remote-update-progress.md) | 记录公开 catalog、版本比较、SBEXT 下载、SHA256、离线缓存、CORS 双地址和浏览器更新验证 |
| [19 产品积木发版流程与动态产品目录策略](./19-product-extension-release-and-catalog-strategy.md) | 整理当前产品积木发版、GitHub Release、客户端验收和回滚步骤，并确定云端新增产品与软件发版的职责边界 |
| [20 Gitee 产品积木托管调研与接入方案](./20-gitee-product-extension-hosting-research.md) | 调研 Gitee Contents/Release API、浏览器跨域、双源回退和公开产品总仓库的发布方式，给出后续适配步骤 |
| [21 Gitee 产品拓展自动更新执行记录](./21-gitee-remote-update-implementation-progress.md) | 记录 Gitee 真实 Release/API 验证、Contents Base64 解码、GitHub 回退、来源缓存和人工验收步骤 |

## 当前结论

当前 MVP 已证明自定义库能注册到 VM、显示积木并生成 Python 代码。AI机甲麦轮车已使用标准源包维护，并可生成重新导入的 `.sbext`。本地包现已归入独立“用户拓展”分类，支持保留包的加载/卸载和彻底删除。桌面端现已支持 Gitee Contents 主源、GitHub Raw 备用源、SHA256 校验和离线缓存，并完成真实 Gitee Release/API 验证。下一步补齐远端新增产品动态合并、最低软件版本兼容检查和项目版本锁定。
