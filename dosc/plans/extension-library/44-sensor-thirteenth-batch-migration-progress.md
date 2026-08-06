# 输入传感器第十三批迁移与评审记录

> 当前状态：K230 单颜色和多颜色检测积木已加入 editor 内置 `sensor-1.12.0.mpext`，无需远程发布即可测试。

## 数据来源与范围

| 内容 | 唯一来源 |
| - | - |
| 积木、参数和菜单 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\sensor\index.js` 的 `K230` |
| Python 结果调用 | `D:\google download\python-generator (1).js` 中对应的 `sensor_k230_*` 生成函数 |

本轮在已有 `k230-vision` 分类内新增 10 个 opcode：

| 功能组 | opcode |
| - | - |
| 单颜色检测 | `k230_set_single_color`、`k230_set_single_color_arg`、`k230_single_color_detected`、`k230_result_single_color_get_pos_arg` |
| 多颜色检测 | `k230_set_multi_color_arg`、`k230_color_detected`、`k230_color_count`、`k230_color_near_center_name`、`k230_color_near_center`、`k230_result_multi_color_get_pos_arg` |

完成后共享输入模块累计 18 个分类、113 个 opcode、32 个实际菜单；K230 分类累计 63 个积木。

## 菜单和代码生成规则

- 新增 `color_li` 和 `color_angle_axis_result` 两个旧版菜单。
- `color_li` 保留 `red/green/blue/black/white` 五个硬件英文值。
- 新增 `{ARG.colorName}` Python 模板格式化器，保持旧 `colorToEnglish` 规则，将自由输入中的红、绿、蓝、黄、紫、青、白、黑转换为硬件英文名称；不包含这些中文颜色名的表达式保持不变。
- 单颜色和多颜色结果的名称读取 `color` 字段，角度、中心坐标和宽高从 `blobs[0]` 读取。
- 按颜色名称查询时，继续通过 `find_result('color', NAME)` 和 `get_key_result('color', NAME, ...)` 访问结果。
- 所有 boolean/reporter 均禁用舞台监视器。

## 剩余迁移量

- 通用 K230 视觉部分还剩 46 个唯一 opcode，预计约 5 轮；旧工具栏有 48 个显示项，其中物体分类和物体检测复用了两个 opcode。
- 在线大模型/MCP 参数部分还剩 29 个唯一 opcode，预计约 3 轮；该部分含按产品切换的默认配置和菜单，需要先明确共享 sensor 包的产品差异表达方式。
- 全部 K230 启用积木合计还剩 75 个唯一 opcode，按每轮约 10 个预计约 8 轮。

## 迁移边界

- 线检测、文字识别、车牌识别及后续视觉模式留在下一批。
- 本轮仍使用前批确定的五款 AI 机甲支持列表，不扩大 miniHexa、AiDoggy 边界。
- 本轮只更新 editor 内置包；独立产品仓库和远程发布包暂不更新。

## 变更文件与 Review

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `scratch-vm/src/codegen/python.js` | 实现中文颜色名称格式化 | 仅显式使用 `.colorName` 的模板触发，不影响普通字符串参数 |
| `manifest-schema.js` | 允许 `.colorName` 模板格式化器 | 未知格式化器仍会在导入阶段报错 |
| `builtin-product-snapshots/manifests/sensor.json` | 保存新增 K230 积木、菜单和分支模板 | 由 `sensor-1.12.0.mpext` 经项目解析器生成，不手工维护 |
| `builtin-product-snapshots/packages/sensor-1.12.0.mpext` | editor 内置测试包 | 包内版本、113 个积木和 32 个菜单已校验 |
| `sensor-codegen.test.js` | 锁定 10 个 opcode、菜单、中文颜色和结果分支 | 覆盖所有新增积木且禁止 unsupported 输出 |
| `builtin-product-snapshots.test.js` | 锁定包版本和 SHA256 | MPEXT、manifest 与索引保持一致 |

内置包 SHA256：

```text
f7c2455e9c4130fca9709c76e236d8068d4b38925d6609fec6ba72ff0f799a27
```

## 验证与人工验收

- 失败测试先确认 1.11.0 缺少本轮 10 个 opcode、2 个菜单及生成器模板。
- 聚焦代码生成测试覆盖固定颜色、中文自由输入、多颜色列表、名称字段和 `blobs[0]` 属性分支。
- 内置快照测试校验 MPEXT、manifest、版本和 SHA256 一致。
- 未执行用户未要求的全量 build。

人工验收步骤：

1. 加载任一支持的 AI 机甲并添加“K230视觉模块”。
2. 确认自学习之后新增 4 个单颜色检测积木和 6 个多颜色检测积木。
3. 检查固定颜色菜单和结果参数菜单，确认名称、角度、中心坐标、宽度、高度完整显示。
4. 在自由颜色输入中填写“红”“绿”“蓝”，确认生成代码分别使用 `red/green/blue`。
5. 切换结果参数“名称”和“角度/坐标”，确认 Python 在 `color` 与 `blobs[0]` 读取之间切换。
6. 真机切换单颜色和多颜色模式，更新结果后验证各 boolean/reporter。
