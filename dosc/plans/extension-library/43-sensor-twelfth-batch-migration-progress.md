# 输入传感器第十二批迁移与评审记录

> 当前状态：K230 跌倒检测、目标追踪、动态手势和自学习积木已加入 editor 内置 `sensor-1.11.0.mpext`，无需远程发布即可测试。

## 数据来源与范围

| 内容 | 唯一来源 |
| - | - |
| 积木、参数和菜单 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\sensor\index.js` 的 `K230` |
| Python 结果调用 | `D:\google download\python-generator (1).js` 中对应的 `sensor_k230_*` 生成函数 |

本轮在已有 `k230-vision` 分类内新增 10 个 opcode：

| 功能组 | opcode |
| - | - |
| 跌倒检测 | `k230_fall_detected`、`k230_fall_count`、`k230_fall_near_center_result`、`k230_fall_near_center` |
| 目标追踪 | `k230_target_detected`、`k230_target_near_center` |
| 动态手势 | `k230_dynamic_gesture_detected`、`k230_result_dynamic_gesture_get_arg` |
| 自学习 | `k230_result_self_learn_get_arg`、`k230_result_self_learn_get_pos_arg` |

完成后共享输入模块累计 18 个分类、103 个 opcode、30 个实际菜单；K230 分类累计 53 个积木。

## 菜单和代码生成规则

- 本轮不新增菜单，跌倒检测和自学习复用 `face_args2`，目标追踪复用 `axis_result`。
- 跌倒状态保持 `k230.near_center_result('extra', 0) == 1`，置信度从 `extra[1]` 读取，坐标和宽高读取普通字段。
- 目标追踪保持 `result_available()` 和 `near_center_result(FIELD)`，不新增旧 VM 已注释的目标数量积木。
- 动态手势判断保持 `k230.near_center_result('value') == GESTURE`，手势名称仍为普通字符串输入。
- 自学习名称判断保持 `k230.find_result('extra', NAME)`；置信度通过 `get_key_result('extra', NAME, 'extra', 1)` 读取，坐标和宽高读取普通字段。
- 所有 boolean/reporter 均禁用舞台监视器。

## 迁移边界

- 旧 VM 中已注释的 `k230_target_count` 不迁移。
- 单颜色、多颜色、线检测及后续视觉模式留在下一批。
- 本轮仍使用前批确定的五款 AI 机甲支持列表，不扩大 miniHexa、AiDoggy 边界。
- 本轮只更新 editor 内置包；独立产品仓库和远程发布包暂不更新。

## 变更文件与 Review

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `builtin-product-snapshots/manifests/sensor.json` | 保存新增 K230 积木和 Python 分支模板 | 由 `sensor-1.11.0.mpext` 经项目解析器生成，不手工维护 |
| `builtin-product-snapshots/packages/sensor-1.11.0.mpext` | editor 内置测试包 | 包内版本、103 个积木和 30 个菜单已校验 |
| `sensor-codegen.test.js` | 锁定 10 个 opcode 及数字/字段分支 | 覆盖所有新增积木且禁止 unsupported 输出 |
| `builtin-product-snapshots.test.js` | 锁定包版本和 SHA256 | MPEXT、manifest 与索引保持一致 |
| `sync-builtin-product-snapshots.mjs` | 锁定 1.11.0 包 | 不一致的包无法覆盖内置快照 |

内置包 SHA256：

```text
87ba17ad8c703d0b4d1d90c34e7cfb07b658259445aa72bbf6367a2c28368bf0
```

## 验证与人工验收

- 失败测试先确认 1.10.0 缺少本轮 10 个 opcode 及生成器模板。
- 聚焦代码生成测试覆盖跌倒状态、置信度、目标坐标、动态手势字符串和自学习名称/属性分支。
- 内置快照测试校验 MPEXT、manifest、版本和 SHA256 一致。
- 未执行用户未要求的全量 build。

人工验收步骤：

1. 加载任一支持的 AI 机甲并添加“K230视觉模块”。
2. 确认手势识别之后依次新增跌倒检测、目标追踪、动态手势和自学习积木。
3. 在跌倒检测和自学习属性积木中切换置信度与坐标字段，确认 Python 在 `extra[1]` 和普通字段之间切换。
4. 检查跌倒状态判断生成 `extra[0] == 1`，目标追踪属性直接读取选择字段。
5. 输入动态手势和自学习名称，检查生成代码保持字符串表达式。
6. 真机切换对应 K230 模式，更新结果后验证各 boolean/reporter。
