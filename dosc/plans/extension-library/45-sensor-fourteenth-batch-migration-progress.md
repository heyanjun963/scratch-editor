# 输入传感器第十四批迁移与评审记录

> 当前状态：K230 线检测、文字识别和车牌识别积木已加入 editor 内置 `sensor-1.13.0.mpext`，无需远程发布即可测试。

## 数据来源与范围

| 内容 | 唯一来源 |
| - | - |
| 积木、参数和菜单 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\sensor\index.js` 的 `K230` |
| Python 结果调用 | `D:\google download\python-generator (1).js` 中对应的 `sensor_k230_*` 生成函数 |

本轮在已有 `k230-vision` 分类内新增 12 个 opcode：

| 功能组 | opcode |
| - | - |
| 线检测 | `k230_set_line_color`、`k230_set_line_color_arg`、`k230_line_detected`、`k230_result_line_detect_get_arg` |
| 文字识别 | `k230_ocr_detected`、`k230_ocr_count`、`k230_result_ocr_get_arg`、`k230_result_ocr_get_pos_arg` |
| 车牌识别 | `k230_license_plate_detected`、`k230_license_plate_count`、`k230_result_lpr_get_arg`、`k230_result_lpr_get_pos_arg` |

完成后共享输入模块累计 18 个分类、125 个 opcode、34 个实际菜单；K230 分类累计 75 个积木。

## 菜单和代码生成规则

- 新增 `line_result` 和 `ocr_point` 两个旧版菜单，线颜色继续复用 `color_li`。
- 线检测固定菜单使用硬件英文颜色值；自由输入保持旧生成器行为，直接传递表达式，不执行 `colorName` 转换。
- 线结果保持 `k230.result_get(0, FIELD)`，字段为中心 X 坐标、角度或颜色。
- 文字识别和车牌识别均使用 `result_available()`、`result_len()`；文本读取 `near_center_result('text')`。
- 文字与车牌四角坐标共用 `ocr_point` 的 `0~7` 索引，并从 `near_center_result('points', INDEX)` 读取。
- 所有 boolean/reporter 均禁用舞台监视器。

## 剩余迁移量

- 通用 K230 视觉部分还剩 34 个唯一 opcode，预计约 4 轮。
- 在线大模型/MCP 参数部分还剩 29 个唯一 opcode，预计约 3 轮。
- 全部 K230 启用积木合计还剩 63 个唯一 opcode，预计约 7 轮。

## 迁移边界

- 旧 VM 中已注释的 `k230_line_count` 和整组阈值调节积木不迁移。
- 物体分类、物体检测、垃圾分类及后续视觉模式留在下一批。
- 本轮仍使用前批确定的五款 AI 机甲支持列表，不扩大 miniHexa、AiDoggy 边界。
- 本轮只更新 editor 内置包；独立产品仓库和远程发布包暂不更新。

## 变更文件与 Review

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `builtin-product-snapshots/manifests/sensor.json` | 保存新增 K230 积木和菜单 | 由 `sensor-1.13.0.mpext` 经项目解析器生成，不手工维护 |
| `builtin-product-snapshots/packages/sensor-1.13.0.mpext` | editor 内置测试包 | 包内版本、125 个积木和 34 个菜单已校验 |
| `sensor-codegen.test.js` | 锁定 12 个 opcode、2 个菜单和 Python 输出 | 覆盖所有新增积木且禁止 unsupported 输出 |
| `builtin-product-snapshots.test.js` | 锁定包版本和 SHA256 | MPEXT、manifest 与索引保持一致 |
| `sync-builtin-product-snapshots.mjs` | 锁定 1.13.0 包 | 不一致的包无法覆盖内置快照 |

内置包 SHA256：

```text
38a98d26c5672b9da8d9fa91c0516d1b234694a9c77958636e5a7f22a0ef16e2
```

## 验证与人工验收

- 失败测试先确认 1.12.0 缺少本轮 12 个 opcode、2 个菜单及生成器模板。
- 聚焦代码生成测试覆盖线颜色、线结果字段、OCR/车牌文本和四角坐标索引。
- 内置快照测试校验 MPEXT、manifest、版本和 SHA256 一致。
- 未执行用户未要求的全量 build。

人工验收步骤：

1. 加载任一支持的 AI 机甲并添加“K230视觉模块”。
2. 确认多颜色检测之后依次新增线检测、文字识别和车牌识别积木。
3. 检查线颜色和线结果菜单，确认中心 X、角度、颜色三个字段。
4. 检查文字识别和车牌识别共用的八项四角坐标菜单。
5. 分别生成文本、左上坐标和左下坐标代码，确认使用 `text` 与 `points` 结果字段。
6. 真机切换线检测、文字识别、车牌识别模式，更新结果后验证各 boolean/reporter。
