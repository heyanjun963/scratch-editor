# 输入传感器第十批迁移与评审记录

> 当前状态：K230 表情识别、人体检测和人体关键点积木已加入 editor 内置 `sensor-1.9.0.mpext`，无需远程发布即可测试。

## 数据来源与范围

| 内容 | 唯一来源 |
| - | - |
| 积木、参数和菜单 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\sensor\index.js` 的 `K230` |
| Python 结果调用 | `D:\google download\python-generator (1).js` 中对应的 `sensor_k230_*` 生成函数 |

本轮在已有 `k230-vision` 分类内新增 12 个 opcode：

| 功能组 | opcode |
| - | - |
| 表情识别 | `k230_face3_detected`、`k230_face3_count`、`k230_facial_detect`、`k230_get_facial_args` |
| 人体检测 | `k230_person_detected`、`k230_person_count`、`k230_person_near_center` |
| 人体关键点 | `k230_person_point_detected`、`k230_person2_count`、`k230_person_keypoint_detect_name`、`k230_result_person_keypoint_get_arg`、`k230_person_keypoint_near_center` |

完成后共享输入模块累计 18 个分类、83 个 opcode、27 个实际菜单；K230 分类累计 33 个积木。

## 菜单和代码生成规则

- 新增 `facial_result`、`face_args`、`axis_result`、`person_keypoint_detect` 四个旧版菜单。
- 表情菜单保留硬件返回的 `Happiness`、`Angry`、`Disgust`、`Fear`、`Neutral`、`Sadness`、`Surprise` 英文值；旧生成器的 `toUnicode16` 对这些值不产生改写。
- 表情属性菜单值 `0/1` 从 `extra` 数组读取，`x/y/w/h` 直接读取结果字段。
- 人体检测继续复用 `result_available()`、`result_len()` 和 `near_center_result(FIELD)`。
- 人体姿态名称判断保持 `k230.find_result('id', NAME)`。
- 人体关键点菜单完整保留 `id`、`score` 和 17 个关键点的 X/Y 索引 `0~33`；数字项从 `keypoints` 数组读取，`id/score` 直接读取结果字段。
- 所有 boolean/reporter 均禁用舞台监视器。

## 迁移边界

- 本轮不迁移手掌关键点、静态手势、跌倒检测等后续 K230 模式。
- 产品专属 MCP 默认配置、具体视觉算法和阈值设置继续留在后续批次。
- 本轮仍使用前批确定的五款 AI 机甲支持列表，不扩大 miniHexa、AiDoggy 边界。
- 本轮只更新 editor 内置包；独立产品仓库和远程发布包暂不更新。

## 变更文件与 Review

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `builtin-product-snapshots/manifests/sensor.json` | 保存新增 K230 积木、菜单和分支模板 | 由 `sensor-1.9.0.mpext` 经项目解析器生成，不手工维护 |
| `builtin-product-snapshots/packages/sensor-1.9.0.mpext` | editor 内置测试包 | 包内版本、83 个积木和 27 个菜单已校验 |
| `sensor-codegen.test.js` | 锁定 12 个 opcode、4 个菜单及数字/字段分支 | 覆盖所有新增积木且禁止 unsupported 输出 |
| `builtin-product-snapshots.test.js` | 锁定包版本和 SHA256 | MPEXT、manifest 与索引保持一致 |
| `sync-builtin-product-snapshots.mjs` | 锁定 1.9.0 包 | 不一致的包无法覆盖内置快照 |

内置包 SHA256：

```text
6183b6701e46d3461f557d8654a9cd479bd0cda5728afd5c1432038fea4f313f
```

## 验证与人工验收

- 失败测试先确认 1.8.0 缺少本轮 12 个 opcode、4 个菜单及生成器模板。
- 聚焦代码生成测试覆盖表情名称、表情属性、人体边框、人体姿态名称、关键点数组和普通字段分支。
- 内置快照测试校验 MPEXT、manifest、版本和 SHA256 一致。
- 未执行用户未要求的全量 build。

人工验收步骤：

1. 加载任一支持的 AI 机甲并添加“K230视觉模块”。
2. 确认人脸姿态之后依次出现表情识别、注视方向、人体检测和人体关键点积木。
3. 检查表情、表情参数、人体边框和人体关键点四个菜单，尤其确认关键点菜单含完整 `0~33` 项。
4. 分别选择关键点数字项与 `名称/置信度`，确认 Python 在 `keypoints` 数组和普通字段读取之间切换。
5. 输入人体姿态名称，检查存在判断和按名称读取属性的 Python 代码。
6. 真机切换表情识别、人体检测、人体关键点模式，更新结果后验证各 reporter。
