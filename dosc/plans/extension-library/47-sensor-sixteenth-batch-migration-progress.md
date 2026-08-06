# 输入传感器第十六批迁移与评审记录

> 当前状态：K230 交通检测和 AprilTag 识别积木已加入 editor 内置 `sensor-1.15.0.mpext`，无需远程发布即可测试。

## 数据来源与范围

| 内容 | 唯一来源 |
| - | - |
| 积木、参数和菜单 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\sensor\index.js` 的 `K230` |
| Python 结果调用 | `D:\google download\python-generator (1).js` 中对应的 `sensor_k230_*` 生成函数 |

本轮新增 9 个唯一 opcode：

| 功能组 | opcode |
| - | - |
| 交通检测 | `k230_traffic_sign_detected`、`k230_traffic_sign_count`、`k230_result_traffic_get_name_arg`、`k230_traffic_sign_near_center` |
| AprilTag 识别 | `k230_april_tag_detected`、`k230_april_tag_count`、`k230_result_apriltag_get_name_arg`、`k230_april_tag_near_center`、`k230_result_apriltag_get_pos_arg` |

完成后共享输入模块累计 18 个分类、144 个唯一 opcode、39 个实际菜单；K230 分类累计 94 个唯一积木。

## 菜单和代码生成规则

- 新增 `traffic_sign` 菜单，保留“前进、后退、左转、右转、停止”及硬件值 `go/back/Left/Right/stop`。
- 交通检测名称使用固定菜单值，并生成单引号字符串比较。
- 交通检测名称和置信度从 `extra[0/1]` 读取，中心坐标和宽高读取普通结果字段。
- AprilTag 文本使用普通字符串输入，生成时直接保留输入表达式，不额外包裹引号。
- AprilTag 名称和置信度从 `extra[0/1]` 读取，四角坐标复用 `ocr_point` 并从 `points` 读取。
- 所有 boolean/reporter 均禁用舞台监视器。

## 剩余迁移量

- 通用 K230 视觉部分还剩 15 个唯一 opcode，预计约 2 轮。
- 在线大模型/MCP 参数部分还剩 29 个唯一 opcode，预计约 3 轮。
- 全部 K230 启用积木合计还剩 44 个唯一 opcode，预计约 5 轮。

## 迁移边界

- 本轮只迁移旧 VM 中启用的交通检测和 AprilTag 积木，不迁移已注释积木。
- DM 码、二维码、条形码和在线大模型/MCP 参数留在后续批次。
- 本轮仍使用前批确定的五款 AI 机甲支持列表，不扩大 miniHexa、AiDoggy 边界。
- 本轮只更新 editor 内置包；独立产品仓库和远程发布包暂不更新。

## 变更文件与 Review

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `builtin-product-snapshots/manifests/sensor.json` | 保存新增 K230 积木、菜单和分支模板 | 由 `sensor-1.15.0.mpext` 经项目解析器生成，不手工维护 |
| `builtin-product-snapshots/packages/sensor-1.15.0.mpext` | editor 内置测试包 | 包内版本、144 个积木和 39 个菜单已校验 |
| `sensor-codegen.test.js` | 锁定 9 个 opcode、交通菜单和 Python 输出 | 覆盖全部新增积木且禁止 unsupported 输出 |
| `builtin-product-snapshots.test.js` | 锁定包版本和 SHA256 | MPEXT、manifest 与索引保持一致 |
| `sync-builtin-product-snapshots.mjs` | 锁定 1.15.0 包 | 不一致的包无法覆盖内置快照 |

内置包 SHA256：

```text
e3b5497104d05879bd29597d6a4429bbac3a1ffbcddb3fbf706634ff282c0433
```

## 验证与人工验收

- 失败测试先确认 1.14.0 缺少本轮版本、菜单、9 个 opcode 和生成器模板。
- 聚焦代码生成测试覆盖交通名称、名称/置信度分支、普通字段、AprilTag 表达式和四角坐标。
- 内置快照测试校验 MPEXT、manifest、版本和 SHA256 一致。
- 未执行用户未要求的全量 build。

人工验收步骤：

1. 加载任一支持的 AI 机甲并添加“K230视觉模块”。
2. 确认垃圾分类之后出现交通检测和 AprilTag 识别的 9 个积木。
3. 展开交通标志菜单，确认五项文案与顺序正确。
4. 切换交通检测参数的名称、置信度、坐标和宽高，确认 Python 在 `extra` 与普通字段之间切换。
5. 给 AprilTag 文本判断积木接入文本或变量，确认生成表达式不被额外添加引号。
6. 切换 AprilTag 名称、置信度和八个角点参数，确认分别生成 `extra` 与 `points` 调用。
