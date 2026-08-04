# 输入传感器首批迁移与评审记录

> 当前状态：9 类基础传感器已生成 `sensor-1.0.0.mpext` 并同步为 editor 内置共享模块；无需远程发布即可随受支持产品进行本地测试。

## 本轮范围

旧版用 `sensor:<模块 ID>` 维护已选择传感器，再重建唯一的 `sensor` 拓展。新版保持同一交互语义：拓展页每个传感器仍是一张卡片，工具箱只注册一个“输入模块”分类，已添加传感器在其中显示为子分类标签。

首批迁移 9 类、9 个 opcode：

| 模块 ID | 子分类 | opcode |
| - | - | - |
| `knob` | 旋钮 | `aimech_read_knob` |
| `light-sensor` | 光线传感器 | `aimech_read_light` |
| `rain-sensor` | 雨滴传感器 | `aimech_get_rain_drop_value` |
| `soil-sensor` | 土壤传感器 | `aimech_get_soil_value` |
| `sound-sensor` | 声音传感器 | `aimech_read_sound` |
| `infrared-sensor` | 红外检测传感器 | `aimech_get_avoid_value` |
| `touch-sensor` | 触摸传感器 | `aimech_read_touch` |
| `button-module` | 按键模块 | `aimech_key_is_pressed` |
| `ultrasonic` | 超声波传感器 | `get_ultrasonic_distance` |

WonderLens、WonderMind、K230、巡线、颜色、温湿度等复杂或尚未迁移模块继续保持占位状态，不会误用完整 `sensor` manifest 变成可加载卡片。

## 产品支持列表

- `aimech`、`aimecanum`、`aiquadruped`、`aiquadrupedpro`、`aihexa` 支持首批全部 9 类。
- `minihexa`、`aidoggy` 本批只开放通用 `ultrasonic`。
- 未加载主产品或当前产品不支持时，模块卡片灰置并提示先加载支持该模块的主产品。
- miniHexa 专用红外积木需要产品变体生成规则，本批不迁移。

## 运行流程

1. 用户点击受支持传感器卡片。
2. `product-module-support.js` 从 VM 识别当前主产品并校验其 `modules.sensor` 列表。
3. 组合器按添加顺序筛选 `sensor` 分类、积木和实际引用菜单。
4. GUI 注销上一次组合的 Python 模板，重新注册唯一的 `sensor` VM 拓展和新模板。
5. 产品切换时卸载共享模块并清空 VM 级选择状态，防止不同硬件积木混用。

选择状态使用 `WeakMap` 绑定 VM 实例，不写入全局变量；重新打开拓展页仍可显示已加载传感器，销毁 VM 后状态可被回收。

## Python 等价性

- 8 个 AI 机甲基础模块使用旧版 `Hiwonder_DEV.DEV_*` 初始化和 `read_value()` / `read_state()` 调用。
- 红外对象名按端口生成，例如 `ir_9`，避免不同端口共用变量。
- 通用超声波保持旧版 `Hiwonder.Sonar(Hiwonder.Port(port))` 和 `sonar_<port>.read()`。
- AI 机甲端口菜单保持 A/B/C/D/E/J/K，对应值 1/2/3/4/5/9/10；超声波菜单保持 2/6/8。
- 9 个 reporter/boolean 全部禁用舞台监视器，避免值积木前出现旧版没有的复选框。

## 变更文件与 Review

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `product-extension-catalog.js` | 每个主产品维护 `modules.sensor` 支持列表 | 兼容关系显式、可继续扩展其他模块类型 |
| `product-module-support.js` | 判断兼容性、组合共享 manifest、保存 VM 级状态 | 纯逻辑可独立测试，不把规则散落在组件中 |
| `product-extension-library.jsx` | 灰置卡片、增量安装、产品切换清理 | 始终只注册一个 `sensor` 分类 |
| `builtin-product-snapshots` | 保存内置 MPEXT、manifest、版本和 SHA256 | 包可离线解析，哈希锁定为发布候选内容 |
| `sync-builtin-product-snapshots.mjs` | 将 sensor 加入统一内置同步清单 | ID、版本、文件名和 SHA256 均参与校验 |
| `product-module-support.test.js` | 锁定产品列表、组合顺序和 VM 状态 | 覆盖全部首批兼容关系 |
| `sensor-codegen.test.js` | 锁定积木面、菜单和 Python 输出 | 覆盖 9 个 opcode 及动态端口变量名 |
| `product-extension-library.test.jsx` | 锁定用户可见加载与切换流程 | 覆盖禁用、连续添加和产品切换清理 |

内置包 SHA256：

```text
819427089bd8d5fac83695b80daf7ad13805ce6925c5e667c5ddb3debaeb5174
```

## 人工校对与 TODO

1. 分别加载 AI 机甲产品、miniHexa 和 AiDoggy，核对模块卡片可用范围。
2. 连续添加多种传感器，确认工具箱只有一个“输入模块”，子分类顺序与添加顺序一致。
3. 逐项核对中文文案、圆角/六角形状、端口默认值和下拉菜单。
4. 切换主产品，确认旧“输入模块”分类被清理且模块卡片恢复未加载状态。
5. 使用真机验证 9 个 Python 调用；尤其检查土壤模块地址 `0x5A`、红外动态对象名和超声波端口。
6. 后续批次优先迁移小型巡线、颜色和温湿度模块；WonderLens、WonderMind、K230 分批单独评审。
