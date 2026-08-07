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
| [27 AI机甲双驱车积木与 Python 迁移记录](./27-aimech-block-python-migration-progress.md) | 记录 aimech 40 个积木、11 个菜单、远程可安装卡片和 IMU 强制变量覆盖的迁移结果 |
| [28 AI机甲四足机器人积木与 Python 迁移记录](./28-aiquadruped-block-python-migration-progress.md) | 记录 aiquadruped 38 个启用积木、10 个菜单、四足运动生成规则和本地内置快照 |
| [29 AI机甲四足竞赛版积木与 Python 迁移记录](./29-aiquadrupedpro-block-python-migration-progress.md) | 记录 aiquadrupedpro 44 个启用积木、10 个菜单、三自由度运动分支和本地内置快照 |
| [30 AI机甲六足机器人积木与 Python 迁移记录](./30-aihexa-block-python-migration-progress.md) | 记录 aihexa 42 个启用积木、10 个菜单、六足运动生成规则和本地内置快照 |
| [31 输入传感器首批迁移与评审记录](./31-sensor-first-batch-migration-progress.md) | 记录 9 类基础传感器、产品支持列表、共享输入模块组合流程和本地内置快照 |
| [32 输入传感器第二批迁移与评审记录](./32-sensor-second-batch-migration-progress.md) | 记录颜色识别、温湿度 7 个积木、产品兼容边界和 sensor 1.1.0 内置快照 |
| [33 输入传感器第三批迁移与评审记录](./33-sensor-third-batch-migration-progress.md) | 记录六路巡线 6 个积木、LINE6 位掩码、产品去重边界和 sensor 1.2.0 内置快照 |
| [34 输入传感器第四批迁移与评审记录](./34-sensor-fourth-batch-migration-progress.md) | 记录两类四路巡线 9 个积木、LINE4 字段链路和 sensor 1.3.0 内置快照 |
| [35 2026-08-05 开发日志](./35-2026-08-05-development-log.md) | 汇总输入传感器第二至第四批迁移、巡线字段实现、验收排障和后续事项 |
| [36 输入传感器第五批迁移与评审记录](./36-sensor-fifth-batch-migration-progress.md) | 记录外接 IMU 4 个积木、欧拉角菜单、产品支持边界和 sensor 1.4.0 内置快照 |
| [37 输入传感器第六批迁移与评审记录](./37-sensor-sixth-batch-migration-progress.md) | 记录 LED 超声波 7 个积木、颜色参数适配、Python RGB 通道转换和 sensor 1.5.0 内置快照 |
| [38 输入传感器第七批迁移与评审记录](./38-sensor-seventh-batch-migration-progress.md) | 记录 WonderEcho 8 个积木、三组语音菜单、产品支持边界和 sensor 1.6.0 内置快照 |
| [39 输入传感器第八批迁移与评审记录](./39-sensor-eighth-batch-migration-progress.md) | 记录 K230 首批 9 个基础积木、运行模式菜单、产品支持边界和 sensor 1.7.0 内置快照 |
| [40 输入传感器第九批迁移与评审记录](./40-sensor-ninth-batch-migration-progress.md) | 记录 K230 人脸识别、人脸姿态、注视方向 12 个积木和 sensor 1.8.0 内置快照 |
| [41 输入传感器第十批迁移与评审记录](./41-sensor-tenth-batch-migration-progress.md) | 记录 K230 表情识别、人体检测、人体关键点 12 个积木和 sensor 1.9.0 内置快照 |
| [42 输入传感器第十一批迁移与评审记录](./42-sensor-eleventh-batch-migration-progress.md) | 记录 K230 手掌关键点、手势识别 10 个积木和 sensor 1.10.0 内置快照 |
| [43 输入传感器第十二批迁移与评审记录](./43-sensor-twelfth-batch-migration-progress.md) | 记录 K230 跌倒检测、目标追踪、动态手势、自学习 10 个积木和 sensor 1.11.0 内置快照 |
| [44 输入传感器第十三批迁移与评审记录](./44-sensor-thirteenth-batch-migration-progress.md) | 记录 K230 单颜色、多颜色检测 10 个积木、中文颜色转换和 sensor 1.12.0 内置快照 |
| [45 输入传感器第十四批迁移与评审记录](./45-sensor-fourteenth-batch-migration-progress.md) | 记录 K230 线检测、文字识别、车牌识别 12 个积木和 sensor 1.13.0 内置快照 |
| [46 输入传感器第十五批迁移与评审记录](./46-sensor-fifteenth-batch-migration-progress.md) | 记录 K230 物体分类、物体检测、垃圾分类 10 个唯一积木和 sensor 1.14.0 内置快照 |
| [47 输入传感器第十六批迁移与评审记录](./47-sensor-sixteenth-batch-migration-progress.md) | 记录 K230 交通检测、AprilTag 识别 9 个积木和 sensor 1.15.0 内置快照 |
| [48 输入传感器第十七批迁移与评审记录](./48-sensor-seventeenth-batch-migration-progress.md) | 记录 K230 DM 码、二维码识别 10 个积木和 sensor 1.16.0 内置快照 |
| [49 输入传感器第十八批迁移与评审记录](./49-sensor-eighteenth-batch-migration-progress.md) | 记录 K230 条形码识别、通用 MCP 返回参数 9 个积木和 sensor 1.17.0 内置快照 |
| [50 输入传感器第十九批迁移与评审记录](./50-sensor-nineteenth-batch-migration-progress.md) | 记录 K230 三个通用 MCP 工具设置积木、静态 JSON formatter 和 sensor 1.18.0 内置快照 |
| [51 输入传感器第二十批迁移与评审记录](./51-sensor-twentieth-batch-migration-progress.md) | 记录 K230 七个产品条件 MCP 返回积木、产品级过滤和 sensor 1.19.0 内置快照 |
| [52 输入传感器第二十一批迁移与评审记录](./52-sensor-twenty-first-batch-migration-progress.md) | 记录 K230 四个产品默认 MCP 配置积木、静态变量集合和 sensor 1.20.0 内置快照 |
| [53 模块卡片状态与 aimech 内置快照评审记录](./53-product-module-card-and-aimech-builtin-progress.md) | 记录模块兼容状态、移除交互、调试卡清理和 aimech 1.0.0 内置快照 |
| [54 旧产品模块兼容矩阵复核记录](./54-old-product-module-compatibility-audit.md) | 从 WonderLab 发布包还原七款产品的输入、动力、输出和通信模块支持关系 |
| [55 2026-08-06 开发日志](./55-2026-08-06-development-log.md) | 汇总开发端口治理、输入模块 1.20.0、K230、模块库交互、兼容矩阵复核和待迁移范围 |
| [56 动力模块首批迁移与评审记录](./56-actuator-first-batch-migration-progress.md) | 记录总线舵机与 IIC 转 PWM 共 8 个积木、产品兼容边界和 actuator 1.0.0 内置快照 |
| [57 机械臂模块首批迁移与评审记录](./57-xarm-first-batch-migration-progress.md) | 记录基础机械臂与串联机械臂共 9 个积木、ID 覆盖顺序和 xarm 1.0.0 内置快照 |
| [58 公共模块第三批迁移与评审记录](./58-module-third-batch-migration-progress.md) | 记录连杆机械臂、风扇和 RGB 模块共 9 个积木及三个内置共享包版本 |
| [59 通信模块首批迁移与评审记录](./59-communication-first-batch-migration-progress.md) | 记录 PS3 手柄 9 个积木、4 组菜单、兼容边界和 communication 1.0.0 内置快照 |
| [60 2026-08-07 开发日志](./60-2026-08-07-development-log.md) | 汇总四个公共模块首批内置迁移、快照校验、代码生成和提交前评审结论 |

## 当前结论

当前 MVP 已证明自定义库能注册到 VM、显示积木并生成 Python 代码。Mind+ Python 兼容解析器现已支持 `.mpext`、元数据、积木注释、菜单、多语言、本地库、颜色参数、中文颜色名称转换、静态 MCP JSON formatter、产品级积木过滤和 Generator 白名单调用。AiDoggy、miniHexa 与五款 AI 机甲产品均已有 editor 内置快照；输入模块已更新到 `sensor-1.20.0`，动力模块已更新到 `actuator-1.1.0`，机械臂模块已更新到 `xarm-1.1.0`，输出模块已建立 `display-1.0.0` 首批内置快照，通信模块已建立 `communication-1.0.0` PS3 首批快照。WonderLens、WonderMind 仍为支持但待发布模块；点阵屏仍待迁移。
