# 输入传感器第七批迁移与评审记录

> 当前状态：WonderEcho 语音模块已加入 editor 内置 `sensor-1.6.0.mpext`，无需远程发布即可随支持产品测试。

## 数据来源与范围

| 内容 | 唯一来源 |
| - | - |
| 积木、参数、分类和菜单 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\sensor\index.js` 的 `WonderEcho` |
| Python 初始化与调用 | `D:\google download\python-generator (1).js` 中 8 个 `sensor_*wonderecho*` 生成函数 |

本轮新增 1 类、8 个 opcode：

| opcode | 作用 |
| - | - |
| `aimech_wonderecho_init` | 按 IIC 端口初始化 `DEV_ASR` |
| `wonderecho_get_results` | 更新 `wonderecho_result` |
| `wonderecho_results` | 判断是否识别到指定命令词 |
| `wonderecho_get_result_num` | 返回识别词 ID |
| `wonderecho_speech_cmd` | 按菜单播放命令应答词 |
| `wonderecho_speech_cmd_number` | 按编号播放命令应答词 |
| `wonderecho_speech_play` | 按菜单播放播报词 |
| `wonderecho_speech_play_number` | 按编号播放播报词 |

完成后共享输入模块累计 17 个分类、50 个 opcode、16 个实际菜单。

## 产品支持边界

- `aimech`、`aimecanum`、`aiquadruped`、`aiquadrupedpro`、`aihexa` 开放 `wonder-echo`。
- 五款产品在旧 VM 中共用 `aimech_wonderecho_init` 和 `Hiwonder_DEV.DEV_ASR`，可以复用同一个分类。
- `minihexa` 的旧版初始化使用独立端口参数和 `minihexa_wonderecho_init`，本轮不合并。
- `aidoggy` 没有对应的旧版初始化分支，本轮不开放。
- ESP32Cam、ESP32-S3-Cam 和 WonderLens 继续暂缓；前两者不属于当前五款产品的公共支持范围，WonderLens 仍依赖尚未接通的 Python 运行库部署。

## Python 等价性

- 初始化保持 `asr2 = Hiwonder_DEV.DEV_ASR(Hiwonder_DEV.Port(PORT))`。
- 更新识别结果保持 `wonderecho_result = asr2.getResult()`。
- 判断和 reporter 分别保持 `(wonderecho_result == WORD)` 与 `wonderecho_result`。
- 命令词与播报词分别使用硬件库的 `ASR_CMDMAND`、`ASR_ANNOUNCER`。`ASR_CMDMAND` 是现有硬件 API 的实际常量名，生成器必须原样保留。
- 三个旧菜单完整迁移，共 69 个识别词、23 个命令应答词和 18 个播报词；菜单值保留旧版十进制或十六进制写法。
- boolean/reporter 均禁用舞台监视器，避免圆角或六边形积木前出现旧版没有的监视复选框。

## 变更文件与 Review

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `builtin-product-snapshots/manifests/sensor.json` | 保存 WonderEcho 分类、积木、菜单和 Python 模板 | 由 `sensor-1.6.0.mpext` 经项目解析器生成 |
| `builtin-product-snapshots/packages/sensor-1.6.0.mpext` | editor 内置测试包 | 包内版本、50 个积木和 16 个菜单已校验 |
| `product-extension-catalog.js` | 把 WonderEcho 卡片接入共享 `sensor` 模块及五款产品 | miniHexa、AiDoggy 支持边界未扩大 |
| `sensor-codegen.test.js` | 锁定积木面、菜单数量与旧 Python 输出 | 覆盖全部 8 个新增 opcode |
| 产品支持、组件和快照测试 | 锁定模块可见性、本地添加流程与包哈希 | 不依赖远程 catalog 或独立产品仓库 |
| `sync-builtin-product-snapshots.mjs` | 锁定 1.6.0 内置包版本与 SHA256 | 后续同步会拒绝不一致的包 |

内置包 SHA256：

```text
06afd1656bc2eb91c1d15bc07c6dad8243639d796bd51f486ddfe639d74a6ed0
```

## 验证与人工验收

- 失败测试先确认 1.5.0 缺少新分类、菜单、生成器和产品支持。
- GUI 聚焦测试通过，覆盖 17 个分类、50 个 opcode、16 个菜单及 8 条 WonderEcho Python 路径。
- 内置快照测试校验 MPEXT、manifest、版本和 SHA256 一致。
- 本轮只更新 editor 内置包；独立产品仓库和远程发布包暂不更新。
- 未执行用户未要求的全量 build；ESLint 仍可能受本机 `unrs-resolver` 原生可选依赖缺失影响。

人工验收步骤：

1. 加载五款 AI 机甲中的任一产品，在“模块扩展”添加“WonderEcho语音模块”。
2. 确认工具箱“输入模块”末尾出现 WonderEcho 子分类和 8 个积木。
3. 分别展开识别词、命令应答词、播报词三个菜单，检查中文选项和滚动选择。
4. 设置接口 J，确认 Python 出现 `asr2 = Hiwonder_DEV.DEV_ASR(Hiwonder_DEV.Port(9))`。
5. 串联更新、判断、ID、菜单播报和编号播报积木，核对代码使用 `wonderecho_result`、`ASR_CMDMAND`、`ASR_ANNOUNCER`。
6. 真机验证识别结果和两类语音播放。
