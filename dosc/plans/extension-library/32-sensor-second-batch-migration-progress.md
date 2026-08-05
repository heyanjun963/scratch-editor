# 输入传感器第二批迁移与评审记录

> 当前状态：颜色识别模块和温湿度传感器已加入 editor 内置 `sensor-1.1.0.mpext`，无需发布远程包即可随五款 AI 机甲产品测试。

## 数据来源与范围

| 内容 | 唯一来源 |
| - | - |
| 积木、参数、分类和菜单 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\sensor\index.js` |
| Python 初始化与调用 | `D:\google download\python-generator (1).js` 中对应的 `sensor_*` 生成函数 |

第二批迁移 2 类、7 个 opcode：

| 模块 | opcode | 作用 |
| - | - | - |
| 颜色识别模块 | `aimech_colorsensor_init` | 按端口初始化 `DEV_COLOR_RECOGNIZE` |
| 颜色识别模块 | `aiblocks_check_color` | 判断红、绿、蓝颜色编号 |
| 颜色识别模块 | `aiblocks_get_color` | 获取完整颜色值 |
| 颜色识别模块 | `aiblocks_get_color_arg` | 读取颜色值中的 R/G/B 分量 |
| 温湿度传感器 | `aimech_temphumi_init` | 按端口初始化 `DEV_TH` |
| 温湿度传感器 | `aimech_get_temp_and_humi` | 获取温度和湿度数组 |
| 温湿度传感器 | `aimech_get_temp_or_humi` | 按索引读取温度或湿度 |

加上首批内容，当前共享输入模块共 11 个分类、16 个 opcode、5 个实际菜单。

## 产品支持边界

- `aimech`、`aimecanum`、`aiquadruped`、`aiquadrupedpro`、`aihexa` 开放本批两类传感器。
- `minihexa` 和 `aidoggy` 继续只开放超声波。AiDoggy 的旧版温湿度端口菜单不同，当前共享 manifest 还不能按主产品替换菜单，因此本批不开放。
- 四路巡线、旋钮四路巡线和六路巡线依赖 LINE4/LINE6 位掩码字段及产品差异，本批继续保持占位状态。

## Python 等价性

- 颜色初始化保持 `color = Hiwonder_DEV.DEV_COLOR_RECOGNIZE(Hiwonder_DEV.Port(port))`。
- 颜色判断保持 `color.get_color_name() == value`，完整颜色值保持 `color.get_color_data()`。
- R/G/B 分量读取保持旧生成器的 `value[index]` 形式。
- 温湿度初始化保持 `temphumi = Hiwonder_DEV.DEV_TH(Hiwonder_DEV.Port(port))`。
- 温湿度读取保持 `temphumi.read_Temp_Humi()`，温度和湿度索引分别为 `0`、`1`。
- 两个初始化积木是命令块；其余 reporter/boolean 积木全部禁用舞台监视器。

## 变更文件与 Review

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `builtin-product-snapshots/manifests/sensor.json` | 保存 11 类输入模块及 Python 模板 | 由 MPEXT 经项目解析器生成，不手改压缩包结构 |
| `builtin-product-snapshots/packages/sensor-1.1.0.mpext` | editor 内置测试包 | 包内 ID、版本、分类、菜单和积木均已解析校验 |
| `product-extension-catalog.js` | 更新五款 AI 机甲支持列表 | miniHexa/AiDoggy 边界保持不变 |
| `sensor-codegen.test.js` | 锁定积木面、菜单和 Python 输出 | 覆盖新增 7 个 opcode |
| `product-module-support.test.js` | 锁定产品兼容关系 | 覆盖两批传感器组合列表 |
| `product-extension-library.test.jsx` | 锁定迁移/占位卡片状态 | 温湿度可用、四路巡线仍占位 |

内置包 SHA256：

```text
d7e266374a330c4843901548967cfdc0bfe264ea253672ba6f429ece45ee7cb2
```

## 人工校对与 TODO

1. 加载任一 AI 机甲产品，分别添加颜色和温湿度模块，确认仍只出现一个“输入模块”分类。
2. 核对颜色菜单红/绿/蓝的判断值为 1/2/3，分量索引为 0/1/2。
3. 核对温度/湿度菜单索引为 0/1，并确认两个 reporter 必须配合初始化积木使用。
4. 真机验证 `DEV_COLOR_RECOGNIZE` 和 `DEV_TH` 的端口初始化与返回值。
5. 下一批先补 LINE4 字段能力，再迁移四路巡线；六路巡线复用现有 LINE6 能力并单独校对位掩码。
6. 本轮按 editor 优先范围未写独立产品仓库；执行下一次统一快照同步或远程发布前，需将产品作者源同步升级到 `sensor 1.1.0`。
