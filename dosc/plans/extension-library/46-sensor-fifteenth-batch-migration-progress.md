# 输入传感器第十五批迁移与评审记录

> 当前状态：K230 物体分类、物体检测和垃圾分类积木已加入 editor 内置 `sensor-1.14.0.mpext`，无需远程发布即可测试。

## 数据来源与范围

| 内容 | 唯一来源 |
| - | - |
| 积木、参数和菜单 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\sensor\index.js` 的 `K230` |
| Python 结果调用 | `D:\google download\python-generator (1).js` 中对应的 `sensor_k230_*` 生成函数 |

旧工具栏三个功能组共有 12 个显示项，其中物体分类和物体检测复用检测状态与数量 opcode。本轮新增 10 个唯一 opcode：

| 功能组 | opcode |
| - | - |
| 物体分类/检测共用 | `k230_object_detected`、`k230_object_count` |
| 物体分类 | `k230_object_classify_parameter` |
| 物体检测 | `k230_object_named_detected`、`k230_object_parameter` |
| 垃圾分类 | `k230_trash_detected`、`k230_trash_count`、`k230_result_garbage_get_name_arg`、`k230_trash_near_center`、`k230_result_garbage_get_pos_arg` |

完成后共享输入模块累计 18 个分类、135 个 opcode、38 个实际菜单；K230 分类累计 85 个唯一积木。

## 菜单和代码生成规则

- 新增 `obj_menu`、`objs`、`garbage`、`name_confidence` 四个旧版菜单。
- `objs` 完整保留 80 项 COCO 物体中文名称和硬件英文值；`garbage` 完整保留 12 项垃圾分类值。
- 物体分类名称从 `extra[0]` 读取，中心坐标读取普通字段。
- 物体检测名称和置信度从 `extra[0/1]` 读取，坐标与宽高读取普通字段；按名称判断保持 `find_result('extra', NAME)`。
- 垃圾名称与置信度从 `extra[0/1]` 读取，四角坐标继续复用 `ocr_point` 并从 `points` 读取。
- 所有 boolean/reporter 均禁用舞台监视器。

## 剩余迁移量

- 通用 K230 视觉部分还剩 24 个唯一 opcode，预计约 3 轮。
- 在线大模型/MCP 参数部分还剩 29 个唯一 opcode，预计约 3 轮。
- 全部 K230 启用积木合计还剩 53 个唯一 opcode，预计约 6 轮。

## 迁移边界

- 旧 VM 物体分类组中已注释的按名称判断不重复迁移；分类与检测共用 opcode 只实现一次。
- 交通检测、AprilTag、DM 码、二维码和条形码留在后续批次。
- 本轮仍使用前批确定的五款 AI 机甲支持列表，不扩大 miniHexa、AiDoggy 边界。
- 本轮只更新 editor 内置包；独立产品仓库和远程发布包暂不更新。

## 变更文件与 Review

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `builtin-product-snapshots/manifests/sensor.json` | 保存新增 K230 积木、菜单和分支模板 | 由 `sensor-1.14.0.mpext` 经项目解析器生成，不手工维护 |
| `builtin-product-snapshots/packages/sensor-1.14.0.mpext` | editor 内置测试包 | 包内版本、135 个积木和 38 个菜单已校验 |
| `sensor-codegen.test.js` | 锁定 10 个唯一 opcode、4 个菜单和 Python 输出 | 覆盖所有新增积木且禁止 unsupported 输出 |
| `builtin-product-snapshots.test.js` | 锁定包版本和 SHA256 | MPEXT、manifest 与索引保持一致 |
| `sync-builtin-product-snapshots.mjs` | 锁定 1.14.0 包 | 不一致的包无法覆盖内置快照 |

内置包 SHA256：

```text
d964a4beaca5df0ea38873919f4cf87c894abb9a0acf1d040e05b4d666eeec2b
```

## 验证与人工验收

- 失败测试先确认 1.13.0 缺少本轮 10 个唯一 opcode、4 个菜单及生成器模板。
- 聚焦代码生成测试覆盖分类名称、物体名称、置信度、普通字段、垃圾名称和四角坐标。
- 内置快照测试校验 MPEXT、manifest、版本和 SHA256 一致。
- 未执行用户未要求的全量 build。

人工验收步骤：

1. 加载任一支持的 AI 机甲并添加“K230视觉模块”。
2. 确认车牌识别之后出现物体分类、物体检测和垃圾分类相关积木。
3. 展开物体名称菜单，确认首项为“人”、末项为“牙刷”，共 80 项。
4. 在分类/检测参数中切换名称、置信度、坐标和宽高，确认 Python 在 `extra` 与普通字段之间切换。
5. 检查 12 项垃圾菜单，并分别验证垃圾名称、置信度和四角坐标代码。
6. 真机切换物体分类、物体检测、垃圾分类模式，更新结果后验证各 boolean/reporter。
