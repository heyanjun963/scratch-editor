# 输入传感器第十八批迁移与评审记录

> 当前状态：K230 条形码识别和四个通用 MCP 返回参数积木已加入 editor 内置 `sensor-1.17.0.mpext`，无需远程发布即可测试。

## 数据来源与范围

| 内容 | 唯一来源 |
| - | - |
| 积木、参数和菜单 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\sensor\index.js` 的 `K230` |
| Python 结果调用 | `D:\google download\python-generator (1).js` 中对应的 `sensor_k230_*` 生成函数 |

本轮新增 9 个唯一 opcode：

| 功能组 | opcode |
| - | - |
| 通用 MCP 返回参数 | `k230_get_buzzer_params`、`k230_get_rgb_light_params`、`k230_get_sonar_rgb_params`、`k230_get_arm_claw_params` |
| 条形码识别 | `k230_barcode_detected`、`k230_barcode_count`、`k230_result_barcode_get_arg`、`k230_barcode_near_center`、`k230_result_barcode_get_pos_arg` |

完成后共享输入模块累计 18 个分类、163 个唯一 opcode、42 个实际菜单；K230 分类累计 113 个唯一积木。

## 菜单和代码生成规则

- 新增 `buzzer_params`、`rgb_light_params`、`arm_claw_params` 三个旧版菜单。
- MCP 返回值保持 `{RESULT}['工具名']['参数名']` 两级字典访问，`RESULT` 作为表达式输入，不额外包裹引号。
- RGB 彩灯与发光超声波 RGB 复用同一个红、绿、蓝参数菜单，但分别读取 `RGB_setRGB` 和 `sonar_setRGB`。
- 条形码文本使用普通字符串输入，靠近中心文本从 `extra[0]` 读取。
- 条形码中心坐标和宽高复用 `axis_result`，从普通结果字段读取。
- 所有 boolean/reporter 均禁用舞台监视器。

## 剩余迁移量

- 旧 VM 中仍启用但未迁移的 K230 积木剩 14 个，全部属于在线大模型/MCP。
- 其中包含 4 个产品专用默认配置、3 个通用 MCP 设置、1 个按产品切换菜单的默认工具判断，以及 6 个带产品支持差异的返回参数积木。
- 预计还需约 2 轮；开始前需要先确定共享包中的产品级积木过滤方式。

## 迁移边界

- `k230_face_near_center`、两个旧手势靠近中心积木、`k230_target_count`、`k230_line_count`、阈值调节 4 个积木和 `k230_set_mcp` 在旧 VM 中已注释，本轮及后续均不迁移。
- 本轮四个 MCP 返回参数在旧版对所有相关产品显示，因此可安全加入共享 K230 列表。
- 产品专用 MCP 积木不直接加入共享列表，避免一个产品看到其他产品的默认配置和参数菜单。
- 本轮只更新 editor 内置包；独立产品仓库和远程发布包暂不更新。

## 变更文件与 Review

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `builtin-product-snapshots/manifests/sensor.json` | 保存新增 K230 积木、菜单和 Python 模板 | 由 `sensor-1.17.0.mpext` 经项目解析器生成，不手工维护 |
| `builtin-product-snapshots/packages/sensor-1.17.0.mpext` | editor 内置测试包 | 包内版本、163 个积木和 42 个菜单已校验 |
| `sensor-codegen.test.js` | 锁定 9 个 opcode、3 个菜单和 Python 输出 | 覆盖全部新增积木且禁止 unsupported 输出 |
| `builtin-product-snapshots.test.js` | 锁定包版本和 SHA256 | MPEXT、manifest 与索引保持一致 |
| `sync-builtin-product-snapshots.mjs` | 锁定 1.17.0 包 | 不一致的包无法覆盖内置快照 |

内置包 SHA256：

```text
8a42aad638d034c2381b5e0d7df81b2b68a202b065631981759437050b935113
```

## 验证与人工验收

- 失败测试先确认 1.16.0 缺少本轮版本、3 个菜单、9 个 opcode 和生成器模板。
- 聚焦代码生成测试覆盖四种 MCP 字典访问和条形码全部结果分支。
- 内置快照测试校验 MPEXT、manifest、版本和 SHA256 一致。
- 未执行用户未要求的全量 build。

人工验收步骤：

1. 加载任一支持的 AI 机甲并添加“K230视觉模块”。
2. 确认在线结果区域出现四个通用 MCP 返回参数积木，二维码之后出现五个条形码积木。
3. 检查蜂鸣器、RGB 和机械臂夹爪菜单内容，确认发光超声波复用 RGB 菜单。
4. 给 MCP 返回参数的 `RESULT` 接入文本或变量，确认生成两级字典索引。
5. 给条形码文本判断接入文本或变量，确认表达式不被重复添加引号。
6. 切换条形码中心坐标和宽高，确认生成 `near_center_result('x/y/w/h')`。
