# 输入传感器第十一批迁移与评审记录

> 当前状态：K230 手掌关键点和手势识别积木已加入 editor 内置 `sensor-1.10.0.mpext`，无需远程发布即可测试。

## 数据来源与范围

| 内容 | 唯一来源 |
| - | - |
| 积木、参数和菜单 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\sensor\index.js` 的 `K230` |
| Python 结果调用 | `D:\google download\python-generator (1).js` 中对应的 `sensor_k230_*` 生成函数 |

本轮在已有 `k230-vision` 分类内新增 10 个 opcode：

| 功能组 | opcode |
| - | - |
| 手掌关键点 | `k230_hand_detected`、`k230_hand_count`、`k230_hand_detected_posture`、`k230_result_hand_keypoint_get_arg`、`k230_hand_near_center` |
| 手势识别 | `k230_gesture_detected`、`k230_gesture_count`、`k230_result_hand_gesture_get_arg`、`k230_result_hand_gesture_get_pos_arg_by_name`、`k230_result_hand_gesture_get_pos_arg` |

完成后共享输入模块累计 18 个分类、93 个 opcode、30 个实际菜单；K230 分类累计 43 个积木。

## 菜单和代码生成规则

- 新增 `hand_menu`、`hand_gesture`、`face_args3` 三个旧版菜单，继续复用已有 `axis_result`。
- `hand_menu` 完整保留 `id/score/x/y/w/h` 和 21 个手掌关键点的 X/Y 索引 `0~41`。
- 手掌数字项从 `keypoints` 数组读取，名称、置信度、中心坐标和宽高直接读取结果字段。
- 手掌姿态名称判断保持 `k230.find_result('id', NAME)`，按名称读取保持 `k230.get_key_result('id', NAME, ...)`。
- 手势菜单保留 `ok/fist/five/gun/love/one/six/three/thumbUp/yeah` 十个硬件英文值。
- 靠近中心的手势名称从 `extra[0]` 读取；指定手势的边框属性通过 `get_key_result('extra', NAME, FIELD)` 读取。
- 所有 boolean/reporter 均禁用舞台监视器。

## 迁移边界

- 旧 VM 中已注释的 `k230_gesture_near_center_name`、`k230_gesture_near_center` 不迁移。
- 跌倒检测、目标追踪、动态手势和后续视觉模式留在下一批。
- 本轮仍使用前批确定的五款 AI 机甲支持列表，不扩大 miniHexa、AiDoggy 边界。
- 本轮只更新 editor 内置包；独立产品仓库和远程发布包暂不更新。

## 变更文件与 Review

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `builtin-product-snapshots/manifests/sensor.json` | 保存新增 K230 积木、菜单和分支模板 | 由 `sensor-1.10.0.mpext` 经项目解析器生成，不手工维护 |
| `builtin-product-snapshots/packages/sensor-1.10.0.mpext` | editor 内置测试包 | 包内版本、93 个积木和 30 个菜单已校验 |
| `sensor-codegen.test.js` | 锁定 10 个 opcode、3 个菜单及数字/字段分支 | 覆盖所有新增积木且禁止 unsupported 输出 |
| `builtin-product-snapshots.test.js` | 锁定包版本和 SHA256 | MPEXT、manifest 与索引保持一致 |
| `sync-builtin-product-snapshots.mjs` | 锁定 1.10.0 包 | 不一致的包无法覆盖内置快照 |

内置包 SHA256：

```text
c8c45d25a12e1b541af925a0dafcb7d01a1cf56ec6c5efd42b8da5c6b6ec98cf
```

## 验证与人工验收

- 失败测试先确认 1.9.0 缺少本轮 10 个 opcode、3 个菜单及生成器模板。
- 聚焦代码生成测试覆盖手掌名称、关键点数组、普通字段、手势判断和按手势名称读取边框属性。
- 内置快照测试校验 MPEXT、manifest、版本和 SHA256 一致。
- 未执行用户未要求的全量 build。

人工验收步骤：

1. 加载任一支持的 AI 机甲并添加“K230视觉模块”。
2. 确认人体关键点之后新增 5 个手掌关键点积木和 5 个手势识别积木。
3. 展开手掌参数菜单，确认包含普通字段及完整关键点索引，末项为“小指点4Y坐标”。
4. 分别选择关键点数字项与 `名称/置信度/中心坐标`，确认 Python 在 `keypoints` 数组和普通字段读取之间切换。
5. 检查 10 个手势菜单值，并验证靠近中心手势判断、按名称读取边框参数和中心手势参数代码。
6. 真机切换手部关键点和手势识别模式，更新结果后验证各 reporter。
