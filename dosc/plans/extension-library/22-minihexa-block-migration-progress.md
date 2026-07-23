# miniHexa 积木配置迁移记录

## 本轮目标

将旧 VM `src/extensions/minihexa/index.js` 的积木定义和旧 `python-generator (1).js` 的生成逻辑提取为标准目录型配置包，不从其他仓库推测产品 API。

## 变更文件

| 文件 | 作用 |
| - | - |
| `builtin-product-packages/minihexa/manifest.json` | 保存 miniHexa 包信息和 19 个菜单 |
| `builtin-product-packages/minihexa/blocks.json` | 保存 39 个启用积木及 9 个分栏 |
| `builtin-product-packages/minihexa/generator/python.json` | 保存 39 个 opcode 的 Python 模板、入口、变量和方向分支 |
| `builtin-product-packages/minihexa/docs/README.md` | 说明包来源、文件职责和人工验收范围 |
| `test/unit/lib/custom-extension/minihexa-package.test.js` | 校验打包、重新导入、积木顺序、菜单数和内置注册状态 |
| `test/unit/lib/custom-extension/minihexa-codegen.test.js` | 校验主程序、启动程序、方向映射、串口、按键和 IMU 代码生成 |
| `src/lib/custom-extension/manifest-schema.js` | 兼容旧扩展使用的驼峰 opcode，保留旧工程积木标识 |
| `src/lib/custom-extension/codegen-registry.js` | 将模板选择器随产品 manifest 注册到 VM 代码生成器 |
| `src/lib/custom-extension/package-manifest.js` | 合并目录包时保留 `templateSelector` 配置 |
| `packages/scratch-vm/src/codegen/python.js` | 按菜单字段值选择声明式 Python 模板分支 |
| `scripts/sync-product-extensions.mjs` | 支持用 `publish: false` 阻止未来未完成产品包误发布 |
| `src/lib/custom-extension/product-extension-catalog.js` | 按旧版主控页收敛为 7 个真实产品，移除无依据的占位项 |
| `src/components/product-extension-library/product-extension-library.jsx` | 主控页只使用机器人产品分类，不再显示空控制器分类 |
| `test/unit/components/product-extension-library.test.jsx` | 锁定旧版主控页的 7 个产品名称和需排除的占位产品 |

## 迁移规则

1. 旧 VM 的 `getInfo()` 是本轮积木、参数、菜单和分栏的唯一来源。
2. 注释掉的积木不迁移，启用的 39 个 opcode 保持原值和原顺序。
3. 旧 `slider` 参数转换为当前配置格式支持的 `number`。
4. 菜单参数保留旧菜单值，并以首项作为默认值。
5. Python API、imports、变量和入口规则只取自旧 `python-generator (1).js`，并以 `finish()` 处理后的最终代码为准。
6. 旧生成器中的 `switch` 分支使用 `templateSelector` 声明，按菜单值生成相同坐标向量。
7. 同名的两个 `serial_write` 以旧文件中后定义、运行时实际生效的 `uart.send_data` 为准。
8. miniHexa 以 `0.1.1` 注册到 `builtinProductManifests`，产品目录状态为 `available`。
9. 旧 VM 的英文 `defaultMessage` 依赖运行时翻译表；声明式包改用中文分栏、积木和菜单文案，保留 opcode、参数名和菜单 value 不变。
10. `start_run` 子积木输出为顶层 setup，主程序使用 `def start_main()` 和 `Hiwonder.startMain(start_main)`，按键事件使用回调注册语句。
11. imports 和变量按工作区遍历顺序收集，函数内只为实际引用的硬件对象声明 `global`，与旧 `finish()` 一致。
12. 运动菜单选择器同时读取外层 dropdown 和扩展菜单 shadow 的实际 value，下拉变化后重新选择坐标模板。
13. 运动菜单修复将内置版本升级为 `0.1.1`，避免本地同版本 `0.1.0` 缓存继续覆盖新模板。

## Review 结论

miniHexa 已具备完整标准包目录，可通过现有打包器生成 `.sbext` 并重新导入。39 个积木均具有模板、入口模板或变量初始化规则，内置产品可加载并参与 VM Python 代码生成。

中文界面已覆盖板载资源、输出打印、舵机、动作组、按键、IMU、串口等分栏和积木，并补齐节拍、播放模式、姿态等菜单翻译。测试锁定中文文案，防止后续重新从旧 `defaultMessage` 导入英文。

代码生成测试使用同一画布同时放置主程序、动作组、串口波特率、启动程序和蜂鸣器，逐行锁定旧版最终输出。旧生成器函数最初返回的 `@Hiwonder.start_main`、`@Hiwonder.start_run` 只是中间代码，不能直接作为新版最终输出基线。

主控拓展目录已对齐旧版产品页，只保留 AI机甲双驱车、AI机甲麦轮车、AI机甲四足机器人、AI机甲四足竞赛版、AI机甲六足机器人、miniHexa 和 AiDoggy。miniHexa 已从计划状态切换为内置可用状态。

## 后续事项

1. 人工在新旧软件中搭建同一组积木，对照完整 Python 文本和实际运行结果。
2. 使用 miniHexa 真机验证主程序、启动程序、蜂鸣器、动作组、运动、按键、IMU 和串口。
3. 人工验证通过后运行产品总仓库同步命令，检查 `minihexa-0.1.1.sbext` 并发布远程版本。
