# 输入传感器第四批迁移与评审记录

> 当前状态：四路巡线和旋钮四路巡线已加入 editor 内置 `sensor-1.3.0.mpext`，无需远程发布即可测试。

## 数据来源与范围

| 内容 | 唯一来源 |
| - | - |
| 积木、参数、分类和菜单 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\sensor\index.js` |
| Python 初始化与调用 | `D:\google download\python-generator (1).js` 中 `sensor_*linefollower*` 生成函数 |

本批迁移 2 类、9 个 opcode：

| 模块 | opcode | 作用 |
| - | - | - |
| 四路巡线 | `aimech_linefollower_init` | 初始化 `DEV_LINE_FOLLOW_4` |
| 四路巡线 | `linefollower_one_status` | 判断单通道亮灭 |
| 四路巡线 | `linefollower_status` | 使用 LINE4 可视化字段判断组合状态 |
| 四路巡线 | `linefollower_status_result` | 使用 LINE4 可视化字段判断组合状态 |
| 四路巡线 | `linefollower_read_offset` | 读取偏差值 |
| 旋钮四路巡线 | `linefollower4_init` | 初始化 `DEV_LINE_FOLLOW_4_O` |
| 旋钮四路巡线 | `linefollower4_one_status` | 判断单通道亮灭 |
| 旋钮四路巡线 | `linefollower4_status_result` | 使用 LINE4 可视化字段判断组合状态 |
| 旋钮四路巡线 | `linefollower4_read_offset` | 读取偏差值 |

普通四路的阈值和灰度积木只对旧 `aiblocks/aiblocksboard` 主控开放，本批 AI 产品包不迁移。旧 VM 已注释的 `linefollower4_status` 不迁移。当前共享输入模块累计 14 个分类、31 个 opcode、9 个菜单。

## LINE4 字段链路

- `scratch-blocks` 的巡线字段现在按通道数配置，LINE6 的外部注册和 `0x00-0x3f` 范围保持不变。
- 新增 `field_line4` 和 `line4` shadow block，显示四个可点击圆点，字段值限制为 `0x00-0x0f`。
- `line4` shadow block 直接创建 `FieldLine4`，避免产品工具箱早于字段注册时出现空白圆角输入。
- VM 新增 `ArgumentType.LINE4` 及 `LINE4` shadow 字段映射。
- manifest schema 接受 `line4`，Mind+ 配置可以覆盖普通字符串参数为 LINE4。
- Python codegen 从 `LINE4` 字段直接读取规范化的两位十六进制掩码。

四路组合状态积木统一使用 LINE4 弹层，每一路均可独立切换。字段按两位十六进制保存，四路全选为 `0f`，最终 Python 比较值为 `0x0f`。

旧生成器的两个 `*_status_result` 函数在积木声明为 `ArgumentType.LINE4` 时仍读取子字段 `LINE6`，与旧 VM 的 `fieldName: LINE4` 契约冲突。新版按正确的 LINE4 契约生成 `get_result_data() == 0x{VALUE}`，避免组合状态退回默认值。

## 产品支持边界

- `aimech`、`aimecanum`、`aiquadruped`、`aiquadrupedpro`、`aihexa` 均开放两类四路巡线。
- `aimecanum` 只排除产品包已有的共享六路巡线，两类四路巡线没有重复功能，可以正常开放。
- `minihexa`、`aidoggy` 继续只开放超声波。

## 变更文件与 Review

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `scratch-blocks/src/fields/field_line6.ts` | 参数化巡线位掩码交互 | LINE6 注册名、默认值和范围不变 |
| `scratch-blocks/src/fields/field_line4.ts`、`blocks/line4.ts` | 新增四路字段和 shadow block | 四通道固定布局，掩码最大为 `0x0f`，字段不依赖注册时序创建 |
| `scratch-vm/src/extension-support/argument-type.js`、`engine/runtime.js` | 注册 LINE4 参数类型 | shadow 字段名统一为 `LINE4` |
| `scratch-vm/src/codegen/python.js` | 读取 LINE4 掩码 | 与 LINE6 使用相同的直接十六进制输出规则 |
| `manifest-schema.js`、`mindplus-package-adapter.js` | 接受 Mind+ LINE4 覆盖 | 仍由统一 schema 校验 |
| `builtin-product-snapshots/manifests/sensor.json` | 保存 14 类输入模块 | 由 MPEXT 经项目解析器生成 |
| `builtin-product-snapshots/packages/sensor-1.3.0.mpext` | editor 内置包 | ID、版本、内容和 SHA256 已锁定 |
| `product-extension-catalog.js` | 更新五款产品支持列表 | 保留麦轮车六路去重规则 |
| 字段、解析、codegen、产品和组件测试 | 锁定本批行为 | 覆盖四路范围、LINE4 类型、9 个 opcode 和卡片状态 |

内置包 SHA256：

```text
38fb296f13c31754ff6d9c2269aae74cc2acd4d534c7fba1de6fa25d6ca7bef2
```

## 人工校对与 TODO

1. 加载任一 AI 机甲产品，添加两类四路巡线，确认仍只出现一个“输入模块”工具箱分类。
2. 点击三个组合状态积木的 LINE4 输入，确认弹层只有四个通道、每一路可独立切换且可确认或取消。
3. 选择单通道 1~4，确认 Python 位掩码依次为 `1/2/4/8`。
4. 四路全部选中后，确认普通四路生成 `linefollow.get_result_data() == 0x0f`，旋钮四路生成 `linefollow4.get_result_data() == 0x0f`。
5. 确认旋钮四路没有旧版已注释的普通组合菜单积木。
6. 真机验证两种设备初始化、状态和偏差读取。
7. 本轮仍只更新 editor；统一快照同步或远程发布前，需要将独立产品作者源升级到 `sensor 1.3.0`。
