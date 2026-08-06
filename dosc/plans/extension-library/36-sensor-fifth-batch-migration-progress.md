# 输入传感器第五批迁移与评审记录

> 当前状态：外接 IMU 传感器已加入 editor 内置 `sensor-1.4.0.mpext`，无需远程发布即可随支持产品测试。

## 数据来源与范围

| 内容 | 唯一来源 |
| - | - |
| 积木、参数、分类和菜单 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\sensor\index.js` |
| Python 初始化与调用 | `D:\google download\python-generator (1).js` 中对应的 `sensor_*imu*` 和 `sensor_get_euler_angle*` 生成函数 |

第五批迁移 IMU 传感器 1 类、4 个 opcode：

| opcode | 作用 |
| - | - |
| `aimech_imu_init` | 按 IIC 端口初始化外接 `DEV_IMU` |
| `get_euler_angle_element_value` | 按轴索引读取单个欧拉角 |
| `get_euler_angle` | 读取完整欧拉角数组 |
| `get_euler_angle_element` | 输出 Z/X/Y 对应的轴索引 |

加上前四批内容，当前共享输入模块共 15 个分类、35 个 opcode、10 个实际菜单。

## 产品支持边界

- `aimech`、`aimecanum`、`aiquadruped`、`aiquadrupedpro`、`aihexa` 开放外接 IMU 模块，与旧 VM 的支持条件一致。
- `minihexa`、`aidoggy` 没有走旧版 `aimech_imu_init` 分支，本批继续只开放超声波。
- 本模块使用 `imu_sensor` 设备变量；主产品内置姿态积木使用 `imu`，两者不会覆盖。

## Python 等价性

- 初始化保持 `imu_sensor = Hiwonder_DEV.DEV_IMU(Hiwonder_DEV.Port(port))`。
- Z、X、Y 轴菜单值分别保持 `0`、`1`、`2`，菜单文案为“Z轴转角”“X轴转角”“Y轴转角”。
- 单轴读取保持 `imu_sensor.read_euler()[index]`，完整读取保持 `imu_sensor.read_euler()`。
- `get_euler_angle_element` 保持旧版只输出轴索引值的行为。
- 三个 reporter 积木禁用舞台监视器，避免显示旧版没有的复选框。

主产品自身的 `imu_cali` 使用 `addVariableForce` 覆盖名为 `imu` 的普通初始化；该规则已经由产品包解析与 Python codegen 测试锁定。本批外接 IMU 使用不同变量名，因此无需增加新的强制覆盖配置。

## 变更文件与 Review

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `builtin-product-snapshots/manifests/sensor.json` | 保存 15 类输入模块及 Python 模板 | 由 MPEXT 经项目解析器生成，4 个 IMU opcode 完整 |
| `builtin-product-snapshots/packages/sensor-1.4.0.mpext` | editor 内置测试包 | 包内 ID、版本、分类、菜单和积木已解析校验 |
| `product-extension-catalog.js` | 更新五款 AI 产品支持列表 | miniHexa、AiDoggy 边界保持不变 |
| `sensor-codegen.test.js` | 锁定积木面、欧拉角菜单和 Python 输出 | 覆盖 4 个新增 opcode |
| `product-module-support.test.js` | 锁定产品兼容关系 | 覆盖五款支持产品和两个排除产品 |
| `product-extension-library.test.jsx` | 锁定拓展卡片状态 | 加载支持产品后 IMU 卡片可用 |

内置包 SHA256：

```text
b058eb91d94f5a57dca5bb4a8eb6a038d321def8628c2436c0a354f5a6066156
```

## 验证情况

- 修改测试后先得到 6 个预期失败，覆盖旧包版本、缺失菜单、unsupported 代码和产品支持缺口。
- 完成实现后，GUI 传感器、产品支持、组件和内置快照聚焦测试 25/25 通过。
- 内置快照同步器成功解析 `sensor-1.4.0.mpext` 并生成规范化 manifest。

## 人工校对与 TODO

1. 加载任一支持的 AI 机甲产品，在模块扩展页添加“IMU传感器”。
2. 确认工具箱仍只有一个“输入模块”分类，并出现“IMU传感器”子分类标签。
3. 核对初始化端口菜单为 A/B/C/D/E/J/K，默认值为 A。
4. 核对欧拉角菜单按旧版顺序显示 Z、X、Y，生成索引分别为 `0/1/2`。
5. 真机验证 `DEV_IMU` 初始化及 `read_euler()` 返回值。
6. 本轮仍只更新 editor；独立产品仓库作者源和远程包暂不更新。
