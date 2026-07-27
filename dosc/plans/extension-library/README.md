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
| [22 miniHexa 积木与 Python 迁移记录](./22-minihexa-block-migration-progress.md) | 记录从旧 VM 和旧 Python generator 提取 miniHexa 积木、菜单、入口及代码生成规则，并注册为内置产品的过程 |
| [23 AiDoggy 积木与 Python 迁移记录](./23-aidoggy-block-python-migration-progress.md) | 记录从旧 VM 和旧 Python generator 提取 AiDoggy 的 17 个积木、运动菜单及最终代码生成规则 |
| [24 Mind+ 用户库格式兼容方案](./24-mindplus-package-compatibility-research.md) | 对比 Mind+ 与现有 SBEXT 的目录、字段和生成器能力，定义安全兼容子集、测试包和实施顺序 |
| [25 Mind+ 产品仓库迁移进度](./25-mindplus-product-repository-migration-progress.md) | 记录 AiDoggy、miniHexa 产品源码迁移、MPEXT 发布包、catalog 同步、自动验证和人工发版待办 |
| [26 Mind+ 产品远程发布指南](./26-mindplus-product-release-guide.md) | 指导单人维护者升级版本、生成包、推送 GitHub/Gitee、创建 Release、开放 catalog 和验证离线缓存 |

## 当前结论

当前 MVP 已证明自定义库能注册到 VM、显示积木并生成 Python 代码。Mind+ Python 兼容解析器现已支持 `.mpext`、元数据、积木注释、菜单、多语言、本地库和 Generator 白名单调用。AiDoggy、miniHexa 与 AI 机甲麦轮车均已迁移到独立产品仓库的 Mind+ Python 作者源，统一生成 `.mpext` 并完成旧行为等价性验证；编辑器内置加载也已切换为 MPEXT 生成快照，三个 catalog 条目均已开放为 `published`。Arduino C 继续延后处理。
