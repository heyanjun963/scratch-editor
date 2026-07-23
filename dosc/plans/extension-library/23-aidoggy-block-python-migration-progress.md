# AiDoggy 积木与 Python 迁移记录

> 人工校对状态：未完成。当前仅通过自动化测试，尚未完成新旧界面对照和 AiDoggy 真机验收。

## 本轮目标

将旧 VM `src/extensions/aidoggy/index.js` 中实际启用的积木，以及旧 `python-generator (1).js` 中对应的生成规则，提取为可打包、可重新导入的标准配置包。

本轮只处理编辑器内置离线版本，不同步产品总仓库，也不发布远程版本。

## 数据来源

| 内容 | 唯一来源 |
| - | - |
| 积木、参数、菜单和分栏 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\aidoggy\index.js` |
| Python API、初始化变量和入口 | `D:\google download\python-generator (1).js` 中的 `aidoggy_*` 生成函数及 `finish()` |

未从官方仓库或其他产品代码推测接口。

## 变更文件

| 文件 | 作用 |
| - | - |
| `builtin-product-packages/aidoggy/manifest.json` | 保存 AiDoggy `0.1.0` 包信息和 8 个实际使用菜单 |
| `builtin-product-packages/aidoggy/blocks.json` | 保存 17 个启用积木、5 个分栏、参数默认值和中文文案 |
| `builtin-product-packages/aidoggy/generator/python.json` | 保存 17 个 opcode 的 Python 模板、变量、入口和转向分支 |
| `builtin-product-packages/aidoggy/docs/README.md` | 说明包目录职责和人工验收重点 |
| `builtin-product-manifests/index.js` | 将标准源包注册为内置 AiDoggy manifest |
| `product-extension-catalog.js` | 将 AiDoggy 从占位状态切换为 `0.1.0` 可用产品 |
| `aidoggy-package.test.js` | 校验打包重导入、积木顺序、中文文案、菜单 value 和产品状态 |
| `aidoggy-codegen.test.js` | 校验主程序、启动程序、运动、动作组和 reporter 的最终 Python |
| `sync-product-extensions.test.js` | 校验 `publish: false` 会阻止未验收 AiDoggy 包进入公开仓库 |

## 迁移规则

1. 保留旧 VM 中实际启用的 17 个 opcode、原参数名、默认值和顺序。
2. 不迁移已注释的 `buzzer_tone_set_volume`、`close_buzzer` 和 `set_move_xy`。
3. 只保留启用积木实际引用的 8 个菜单，不复制旧文件中的无引用菜单。
4. 固化中文分栏、积木和菜单文案，避免旧翻译表缺失时显示英文。
5. `start_thread` 生成 `def start_main()`，并在末尾调用 `Hiwonder.startMain(start_main)`。
6. `start_run_thread` 下方代码进入顶层 setup，与旧 `finish()` 最终输出一致。
7. `set_turn` 按 `oriention_turn` 菜单选择正负角速度模板，切换左右转后重新生成代码。
8. 动作组名称、阻塞布尔值、音调、节拍、方向和步态保持旧菜单 value，不使用显示文本生成 Python。
9. 源包设置 `publish: false`。在真机验收和远程版本规划完成前，同步命令不会发布 AiDoggy。

## Review 结论

AiDoggy 已具备完整标准包目录，可通过现有打包器生成 `.sbext` 并重新导入。内置产品目录已显示为可用，17 个积木均已关联 Python 生成配置。

定向测试覆盖旧版最终 Python 的 import、变量初始化、启动区、主函数和 launcher。运动测试覆盖行走方向和左右转下拉变化，动作组测试覆盖自定义名称、预设名称、阻塞参数和停止动作。

## 已知待办

1. 人工对照新旧软件中的 17 个积木外观、默认值和菜单顺序。
2. 使用 AiDoggy 真机验证蜂鸣器、低电压报警、运动、动作组和启动流程。
3. 真机验收后决定发布版本，再移除 `publish: false` 并执行产品仓库同步。
