# 输入传感器第九批迁移与评审记录

> 当前状态：K230 人脸识别、人脸姿态和注视方向积木已加入 editor 内置 `sensor-1.8.0.mpext`，无需远程发布即可测试。

## 数据来源与范围

| 内容 | 唯一来源 |
| - | - |
| 积木、参数和菜单 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\sensor\index.js` 的 `K230` |
| Python 结果调用 | `D:\google download\python-generator (1).js` 中对应的 `sensor_k230_*` 生成函数 |

本轮在已有 `k230-vision` 分类内新增 12 个 opcode：

| 功能组 | opcode |
| - | - |
| 人脸识别 | `k230_face_detected`、`k230_face_count`、`k230_face_exists`、`k230_face_recognition_get_arg_by_name` |
| 人脸姿态 | `k230_face2_detected`、`k230_face2_count`、`k230_result_face_pose_get_oriention`、`k230_face2_near_center` |
| 注视方向 | `k230_gaze_detected`、`k230_gaze_count`、`k230_gaze_near_center_result`、`k230_gaze_near_center` |

完成后共享输入模块累计 18 个分类、71 个 opcode、23 个实际菜单；K230 分类累计 21 个积木。

## 菜单和代码生成规则

- 新增 `face_args2`、`face2_args`、`face_pos_oriention`、`gaze_name`、`gaze_result` 五个旧版菜单。
- 人脸名称判断保持 `k230.find_result('extra', NAME)`。
- 按名称读取人脸置信度时，菜单值 `1` 生成 `k230.get_key_result('extra', NAME, 'extra', 1)`；坐标和宽高生成 `k230.get_key_result('extra', NAME, 'x')` 一类调用。
- 人脸姿态数字项 `0~4` 和注视结果数字项 `0~5` 从 `extra` 数组读取；`x/y/w/h` 直接读取结果字段。
- 姿态朝向和注视方向保持对 `near_center_result('extra', 0)` 的字符串比较。
- `face_pos_oriention` 保留旧版 `unknown`，`gaze_name` 保留旧版 `unknow`，不自行修正硬件返回值拼写。
- 所有 boolean/reporter 均禁用舞台监视器。

## 迁移边界

- 旧 VM 中已注释的 `k230_face_near_center` 不迁移。
- 表情识别需要保持旧生成器的 Unicode 转义规则，将单独迁移并锁定输出。
- 产品专属 MCP 默认配置、具体视觉算法和阈值设置继续留在后续 K230 批次。
- 本轮仍使用上一批确定的五款 AI 机甲支持列表，不扩大 miniHexa、AiDoggy 边界。

## 变更文件与 Review

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `builtin-product-snapshots/manifests/sensor.json` | 保存新增 K230 积木、菜单和分支模板 | 由 `sensor-1.8.0.mpext` 经项目解析器生成 |
| `builtin-product-snapshots/packages/sensor-1.8.0.mpext` | editor 内置测试包 | 包内版本、71 个积木和 23 个菜单已校验 |
| `sensor-codegen.test.js` | 锁定 12 个 opcode、5 个菜单及数字/坐标分支 | 新旧输出逐项比对通过 |
| `builtin-product-snapshots.test.js` | 锁定包版本和 SHA256 | MPEXT 与 manifest 保持一致 |
| `sync-builtin-product-snapshots.mjs` | 锁定 1.8.0 包 | 不一致的包无法覆盖内置快照 |

内置包 SHA256：

```text
e7bd1ce2bddedb5c3c1a68b7f2b8548eaee25845084c170fe1627f1565eb8586
```

## 验证与人工验收

- 失败测试先确认 1.7.0 缺少本轮 12 个 opcode、5 个菜单及生成器模板。
- 聚焦代码生成测试覆盖人脸名称、置信度、坐标、姿态、朝向、注视方向和结果字段。
- 内置快照测试校验 MPEXT、manifest、版本和 SHA256 一致。
- 本轮只更新 editor 内置包；独立产品仓库和远程发布包暂不更新。
- 未执行用户未要求的全量 build。

人工验收步骤：

1. 加载任一支持的 AI 机甲并添加“K230视觉模块”。
2. 确认 K230 分类在原 9 个基础积木后新增 12 个结果积木。
3. 检查人脸属性、姿态属性、姿态朝向、注视方向和注视结果五个菜单。
4. 分别选择数字结果与 `X/Y/宽度/高度`，确认生成代码在 `extra` 数组和字段读取之间切换。
5. 输入人脸名称，检查存在判断和按名称读取属性的 Python 代码。
6. 真机切换人脸识别、人脸姿态、注视方向模式，更新结果后验证各 reporter。
