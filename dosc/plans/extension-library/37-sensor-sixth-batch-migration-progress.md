# 输入传感器第六批迁移与评审记录

> 当前状态：LED 超声波传感器已加入 editor 内置 `sensor-1.5.0.mpext`，无需远程发布即可随支持产品测试。

## 数据来源与范围

| 内容 | 唯一来源 |
| - | - |
| 积木、参数、分类和菜单 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\sensor\index.js` 的 `ledUltrasonic` |
| Python 初始化与调用 | `D:\google download\python-generator (1).js` 中 7 个 `sensor_aimech_*led_ultrasonic*` 生成函数 |

本轮与第五批 IMU 合计迁移 11 个积木，符合每轮约 10 个积木的规模。第六批新增 1 类、7 个 opcode：

| opcode | 作用 |
| - | - |
| `aimech_led_ultrasonic_init` | 按 IIC 端口初始化 `DEV_SONAR` |
| `aimech_get_led_ultrasonic_distance` | 读取障碍物距离 |
| `aimech_set_led_ultrasonic_color` | 用颜色选择器设置全部或单个 LED |
| `aimech_set_led_ultrasonic_color_arg` | 用 R/G/B 数值设置 LED |
| `aimech_close_led_ultrasonic` | 关闭全部或单个 LED |
| `aimech_set_led_ultrasonic_breath` | 设置单个 LED 的呼吸颜色与周期 |
| `aimech_set_led_ultrasonic_random` | 进入随机变色模式 |

完成后共享输入模块累计 16 个分类、42 个 opcode、13 个实际菜单。

## 产品支持边界

- `aimech`、`aimecanum`、`aiquadruped`、`aiquadrupedpro`、`aihexa` 开放 `led-ultrasonic`。
- `minihexa`、`aidoggy` 的旧版 LED 超声波初始化分别使用专用 opcode，本批没有把专用初始化错误合并到 `aimech_led_ultrasonic_init`，因此暂不开放。
- editor 新增独立“LED超声波传感器”模块卡片；添加后仍组合到唯一的 `sensor` 输入模块扩展。

## 颜色与 Python 等价性

- Mind+ 作者源支持 `COLOR.shadow="color"`，解析后映射为 Scratch `ArgumentType.COLOR` 和 `colour_picker` shadow。
- Python 模板显式使用 `{COLOR.rgb}`，把 `#RRGGBB` 展开为 `0xRR,0xGG,0xBB`，例如 `#ff8040` 生成 `0xff,0x80,0x40`。
- 颜色值不符合 `#RRGGBB` 时抛出带参数名的错误，不生成含糊代码。
- 数值 RGB、关闭灯、呼吸周期和随机模式保持旧调用：`setRGB`、`setBreathingCycle`、`startSymphony`。
- 测距 reporter 禁用舞台监视器，避免显示旧版没有的复选框。

## 内置与远程 RGB 整体检查

本轮复查所有已迁移产品的颜色选择积木，修正以下 5 条原本仍在真机运行时调用 `int()` 的路径：

| 产品 | opcode | 修正后的模板 |
| - | - | - |
| `aimecanum` | `set_led_color` | `rgb.setRGB(0,{COLOR.rgb})` |
| `aiquadruped` | `set_led_color` | `rgb.setRGB(0,{COLOR.rgb})` |
| `aiquadrupedpro` | `set_led_color` | `rgb.setRGB(0,{COLOR.rgb})` |
| `aihexa` | `set_led_color` | `rgb.setRGB(0,{COLOR.rgb})` |
| `aimecanum` | `set_led_ultrasonic_color` | `mecanumCar.sonar.setRGB({NUMS},{COLOR.rgb})` |

这些积木的 `COLOR` 参数同时从普通 `string` 修正为 `color`，工具箱和工作区恢复旧版颜色色块，而不是显示 `#ff0000` 文本输入框。

已发布的 `aimech-1.0.0.mpext` 仍携带旧模板。editor 的 Mind+ 导入适配层会精确识别完整的三个 `int({COLOR}[...],16)` 通道表达式，并规范化为 `color + {COLOR.rgb}`。只有三个参数名一致且默认值是合法 `#RRGGBB` 时才转换，其他字符串切片保持原样。直接读取现有远程包已确认得到：

```text
type: color
scratchType: color
template: rgb.setRGB(0,{COLOR.rgb})
```

## 变更文件与 Review

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `mindplus-package-adapter.js` | 接受 `color` shadow 并兼容已发布包的旧 RGB 模板 | 只匹配完整三通道和合法颜色默认值 |
| `manifest-schema.js` | 校验 color 参数及 `{ARG.rgb}` | RGB 格式化只允许用于 color 参数 |
| `scratch-vm/src/codegen/python.js` | 读取颜色字段并展开 RGB 通道 | 保持旧生成器的十六进制输出形式 |
| 四款主产品 manifest/MPEXT | 修正板载 RGB 和麦轮车发光超声波 | UI 和 Python 输出均恢复旧版语义 |
| `builtin-product-snapshots/manifests/sensor.json` | 保存 16 类输入模块与模板 | 由新 MPEXT 经项目解析器生成 |
| `builtin-product-snapshots/packages/sensor-1.5.0.mpext` | editor 内置测试包 | 包内版本、42 个积木和 13 个菜单已校验 |
| `product-extension-catalog.js` | 注册卡片和五款产品支持关系 | miniHexa、AiDoggy 边界保持不变 |
| `sensor-codegen.test.js` | 锁定积木面、菜单和旧 Python 输出 | 覆盖 7 个新增 opcode 与实际颜色值 |
| `rgb-color-codegen.test.js` | 横向检查所有 RGB 颜色路径 | 5 条路径禁止生成 `int()` |
| 其余快照、组件和产品支持测试 | 锁定包哈希与本地添加流程 | 未依赖远程 catalog 或产品仓库 |

联调阶段同时修复了三个影响本地验收的问题：

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `product-extension-library.jsx`、`scratch-vm/src/virtual-machine.js` | 切换主产品时清空当前 VM 和 Blockly 画布 | 只清当前编辑目标，代码区和画布保持一致 |
| `scratch-gui/src/containers/blocks.jsx` | 扩展页关闭后重新计算 Blockly 尺寸 | 复用既有 resize 路径，工具箱滚轮无需全屏恢复 |
| `desktop/start.js`、`desktop/process-lifecycle.js` | 直接管理 webpack/Electron 并在退出时释放 8601 | 不再通过 npm 包装层遗留 webpack，也不静默复用未知旧服务 |
| 对应 GUI、VM、桌面生命周期测试 | 锁定画布清理、布局刷新、端口所有权和幂等退出 | 聚焦覆盖本轮发现的三个回归点 |

内置包 SHA256：

```text
3a4f4279fec5d7245bd5c379323942602a0bd0ba8663101864e82abe8877a6ae
```

RGB 修正后四个同版本内置产品包的新 SHA256：

| 包 | SHA256 |
| - | - |
| `aimecanum-0.2.3.mpext` | `c5cbbdc546cc6cc215bbc774b66a98606ae7a6b1a91ed356333046788cc937be` |
| `aiquadruped-1.0.0.mpext` | `a1504b49876cc78c4bc454bb93c0f23ec05999eb48e34c6ec833f21e8a03f456` |
| `aiquadrupedpro-1.0.0.mpext` | `7f93e619466d5e4a895942825c60b269042c399c28490f348f2df5ce2cd1a458` |
| `aihexa-1.0.0.mpext` | `c90b9c09ab64ce88cefd89a93b276acc7abf8311c9f99cfbfdf88eecfa337fe0` |

## 验证与人工验收

- 失败测试先确认当前解析器拒绝 color shadow、旧包版本仍为 1.4.0、7 个 opcode 均 unsupported。
- Mind+ 包解析测试通过，确认颜色类型和 `{COLOR.rgb}` 模板被完整保留。
- GUI 代码生成、产品支持、组件和内置快照测试 26/26 通过。
- RGB 整体修正后，Mind+ 导入、四款产品、传感器、产品支持、组件、RGB 横向检查和快照测试 56/56 通过。
- 提交前 review 未发现阻断问题；当前聚焦集合 GUI 48/48、VM 225/225、桌面生命周期 4/4 通过。
- 实际启动验证确认 `start.js` 直接持有 webpack；关闭 Electron 后启动器、webpack 和 8601 监听均自动退出。

人工验收步骤：

1. 加载任一支持的 AI 机甲产品，在“模块扩展”添加“LED超声波传感器”。
2. 确认工具箱“输入模块”末尾出现“LED超声波传感器”子分类和 7 个积木。
3. 打开颜色积木的颜色选择器，选择非纯红色，例如 `#ff8040`。
4. 确认 Python 代码出现 `sonar.setRGB(0,0xff,0x80,0x40)`。
5. 分别调整全部/1/2、红/绿/蓝、呼吸周期和 RGB 数值，核对代码同步变化。
6. 真机验证距离、灯光、呼吸灯和随机变色行为。
7. 本轮只更新 editor 内置包；独立产品仓库和远程发布包暂不更新。
8. ESLint 仍受本机 `unrs-resolver` 原生可选依赖缺失影响；本轮未重装依赖，也未执行用户未要求的全量 build。
