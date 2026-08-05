# 输入传感器第三批迁移与评审记录

> 当前状态：六路巡线传感器已加入 editor 内置 `sensor-1.2.0.mpext`，无需发布远程包即可随支持产品测试。

## 数据来源与范围

| 内容 | 唯一来源 |
| - | - |
| 积木、参数、分类和菜单 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\sensor\index.js` |
| Python 初始化与调用 | `D:\google download\python-generator (1).js` 中对应的 `sensor_*linefollower6*` 生成函数 |

第三批迁移六路巡线 1 类、6 个 opcode：

| opcode | 作用 |
| - | - |
| `aimech_linefollower6_init` | 按 IIC 端口初始化 `DEV_LINE_FOLLOW_6` |
| `linefollower6_one_status` | 按通道位掩码判断单路亮灭状态 |
| `linefollower6_status` | 使用 LINE6 可视化字段判断六路组合状态 |
| `linefollower6_set_threshold` | 设置 1~9 阈值比例 |
| `linefollower6_get_value` | 读取指定通道灰度值 |
| `linefollower6_read_offset` | 读取巡线偏差值 |

加上前两批内容，当前共享输入模块共 12 个分类、22 个 opcode、8 个实际菜单。

## 产品支持边界

- `aimech`、`aiquadruped`、`aiquadrupedpro`、`aihexa` 开放六路巡线模块。
- `aimecanum` 产品包已经内置前后置六路巡线积木，本批不再开放同名共享模块，避免拓展页和工具箱重复入口。
- `minihexa`、`aidoggy` 继续只开放超声波。
- `line-4` 和 `line-4-rotary` 仍需先补 LINE4 字段能力，本批保持占位状态。

## Python 等价性

- 初始化保持 `linefollow6 = Hiwonder_DEV.DEV_LINE_FOLLOW_6(Hiwonder_DEV.Port(port))`。
- 单通道菜单显示 1~6，但保存旧生成器最终使用的 `1/2/4/8/16/32` 位掩码。
- 单通道未检测保持 `(result & mask) == 0`，检测到保持 `(result & mask) > 0`。
- 组合状态继续生成 `linefollow6.get_result_data() == 0x{LINE}`，`LINE` 由现有 LINE6 自定义字段提供十六进制掩码。
- 阈值、灰度和偏差读取分别保持 `set_ThresholdRatioReg`、`read_AnalogQuantity`、`read_offset` 调用。
- 初始化和阈值设置为命令块，其余 reporter/boolean 积木禁用舞台监视器。

## 变更文件与 Review

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `builtin-product-snapshots/manifests/sensor.json` | 保存 12 类输入模块及 Python 模板 | 由 MPEXT 经项目解析器生成，LINE6 类型未降级为普通字符串 |
| `builtin-product-snapshots/packages/sensor-1.2.0.mpext` | editor 内置测试包 | 包内 ID、版本、分类、菜单、积木和 SHA256 均锁定 |
| `product-extension-catalog.js` | 更新四款产品支持列表 | 麦轮车重复功能已排除 |
| `sensor-codegen.test.js` | 锁定积木面、菜单、LINE6 参数和 Python 输出 | 覆盖新增 6 个 opcode |
| `product-module-support.test.js` | 锁定产品兼容关系 | 明确 aihexa 支持、aimecanum 不重复开放 |
| `product-extension-library.test.jsx` | 锁定拓展卡片状态 | 六路巡线可用、四路巡线仍占位 |

内置包 SHA256：

```text
6ac534084069d1256717e5c58201096f190efd2a8ecd55ccdeab0fcd49c3b950
```

## 人工校对与 TODO

1. 加载 AI 机甲双驱车、四足、四足竞赛版或六足产品，确认六路巡线卡片可添加且只出现一个“输入模块”分类。
2. 点击组合状态积木的 LINE6 输入，确认六路状态面板可编辑并回写十六进制掩码。
3. 分别选择 1~6 通道和亮/灭状态，确认 Python 位掩码为 `1/2/4/8/16/32` 且比较符正确。
4. 加载 AI 机甲麦轮车，确认模块拓展页不额外开放共享六路巡线卡片。
5. 真机验证初始化、阈值、灰度和偏差读取。
6. 下一批补 LINE4 字段后迁移四路巡线与旋钮四路巡线。
7. 本轮按 editor 优先范围未写独立产品仓库；统一快照同步或远程发布前，需将产品作者源升级到 `sensor 1.2.0`。
