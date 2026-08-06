# 输入传感器第十七批迁移与评审记录

> 当前状态：K230 DM 码和二维码识别积木已加入 editor 内置 `sensor-1.16.0.mpext`，无需远程发布即可测试。

## 数据来源与范围

| 内容 | 唯一来源 |
| - | - |
| 积木、参数和菜单 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\sensor\index.js` 的 `K230` |
| Python 结果调用 | `D:\google download\python-generator (1).js` 中对应的 `sensor_k230_*` 生成函数 |

本轮新增 10 个唯一 opcode：

| 功能组 | opcode |
| - | - |
| DM 码识别 | `k230_dm_code_detected`、`k230_dm_code_count`、`k230_result_dmcode_get_name_arg`、`k230_dm_code_near_center`、`k230_result_dmcode_get_pos_arg` |
| 二维码识别 | `k230_qr_code_detected`、`k230_qr_code_count`、`k230_result_orcode_get_arg`、`k230_qr_code_near_center`、`k230_result_orcode_get_pos_arg` |

完成后共享输入模块累计 18 个分类、154 个唯一 opcode、39 个实际菜单；K230 分类累计 104 个唯一积木。

## 菜单和代码生成规则

- 本轮不新增菜单；DM 码角点复用 `ocr_point`，二维码坐标复用 `axis_result`。
- DM 码和二维码文本均使用普通字符串输入，生成时直接保留输入表达式，不额外包裹引号。
- 两组靠近中心的文本均从 `extra[0]` 读取。
- DM 码八个角点从 `points` 读取；旧 VM 声明但未显示、旧生成器也未使用的 `INDEX` 参数不加入新积木。
- 二维码中心坐标和宽高从普通结果字段读取。
- 所有 boolean/reporter 均禁用舞台监视器。

## 剩余迁移量

- 通用 K230 视觉部分只剩条形码识别 5 个唯一 opcode，预计 1 轮。
- 在线大模型/MCP 参数部分还剩 29 个唯一 opcode，预计约 3 轮。
- 全部 K230 启用积木合计还剩 34 个唯一 opcode，预计约 4 轮。

## 迁移边界

- 本轮只迁移旧 VM 中启用的 DM 码和二维码积木，不迁移已注释积木。
- 条形码和在线大模型/MCP 参数留在后续批次。
- 本轮仍使用前批确定的五款 AI 机甲支持列表，不扩大 miniHexa、AiDoggy 边界。
- 本轮只更新 editor 内置包；独立产品仓库和远程发布包暂不更新。

## 变更文件与 Review

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `builtin-product-snapshots/manifests/sensor.json` | 保存新增 K230 积木和 Python 模板 | 由 `sensor-1.16.0.mpext` 经项目解析器生成，不手工维护 |
| `builtin-product-snapshots/packages/sensor-1.16.0.mpext` | editor 内置测试包 | 包内版本、154 个积木和 39 个菜单已校验 |
| `sensor-codegen.test.js` | 锁定 10 个 opcode 和 Python 输出 | 覆盖全部新增积木且禁止 unsupported 输出 |
| `builtin-product-snapshots.test.js` | 锁定包版本和 SHA256 | MPEXT、manifest 与索引保持一致 |
| `sync-builtin-product-snapshots.mjs` | 锁定 1.16.0 包 | 不一致的包无法覆盖内置快照 |

内置包 SHA256：

```text
7dfd11bc006313c3c9d6dd2438a917eff701c7eeb87e2016dab4e0e3b3df3fa0
```

## 验证与人工验收

- 失败测试先确认 1.15.0 缺少本轮版本、10 个 opcode 和生成器模板。
- 聚焦代码生成测试覆盖两组状态、数量、文本比较、文本读取和坐标分支。
- 内置快照测试校验 MPEXT、manifest、版本和 SHA256 一致。
- 未执行用户未要求的全量 build。

人工验收步骤：

1. 加载任一支持的 AI 机甲并添加“K230视觉模块”。
2. 确认 AprilTag 之后出现 DM 码和二维码识别的 10 个积木。
3. 给两组文本判断积木接入文本或变量，确认生成表达式不被额外添加引号。
4. 切换 DM 码八个角点，确认生成 `near_center_result('points', POS)`。
5. 切换二维码中心坐标和宽高，确认生成 `near_center_result('x/y/w/h')`。
6. 真机切换 DM 码和二维码模式，更新结果后验证各 boolean/reporter。
