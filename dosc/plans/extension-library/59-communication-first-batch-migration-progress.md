# 通信模块首批迁移与评审记录

> 当前状态：PS3 手柄 9 个积木已加入 editor 内置共享包，无需发布远程版本即可测试。

## 本轮范围

| 扩展包 | 分类 | 新增积木 | 当前版本 |
| - | - | -: | - |
| `communication` | PS3手柄 | 9 | `1.0.0` |

本轮迁移旧 VM `ps3Module()` 的全部 9 个启用积木和 4 组实际菜单，没有扩展到 PS2、Wi-Fi、头环或脑波模块。

旧 VM 将震动强度声明为自定义 `SLIDER` 参数；当前 VM 已没有该参数类型，因此使用数值输入保留默认值 `60`、可编辑能力和 Python 生成语义。恢复通用数值滑块需要单独扩展 scratch-blocks，不并入本轮通信迁移。

## 旧版依据

| 内容 | 来源 |
| - | - |
| 积木、参数和菜单 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\communication\index.js` |
| Python 生成规则 | `D:\google download\python-generator (1).js` |
| 中文文案与兼容矩阵 | `D:\Program Files (x86)\WonderLab\resources\build\lib.min.js` |

## 兼容边界

- 支持 `aimech`、`aimecanum`、`aiquadruped`、`aiquadrupedpro`、`aihexa` 和 `aidoggy`。
- `minihexa` 旧版没有通信模块入口，本轮保持不支持。
- 模块卡片 ID 继续使用 `communication:communication`，本批 PS3 分类承接该入口。

## 生成规则

初始化积木负责导入 PS3 库并写入手柄 MAC 地址：

```python
import PS3
PS3.init("10:20:30:40:50:60")
```

其余积木保持旧接口，包括连接状态、LED、震动、按键、摇杆和 IMU：

```python
PS3.isconnected()
PS3.setleds([1,0,1,0])
PS3.set_rumble(80, 2500)
PS3.get_button(PS3.TRIANGLE)
PS3.get_axis(PS3.LX)
PS3.get_sensor(PS3.ACCEL_Y)
```

## 文件职责

| 文件 | 职责 | 评审结论 |
| - | - | - |
| `communication-1.0.0.mpext` / `communication.json` | PS3 手柄 9 个积木和 4 组菜单 | 包、manifest 和旧生成规则一致 |
| `builtin-product-manifests/index.js` | 注册通信模块内置 manifest | 本地离线可添加 |
| `product-extension-catalog.js` | 开放通信模块卡片 | 保持旧产品兼容边界 |
| `builtin-product-snapshots/index.json` | 锁定版本和 SHA256 | 内置资产可复核 |
| `communication-codegen.test.js` | 锁定中文文案、菜单和 Python 输出 | 覆盖全部 9 个 opcode |

## 人工验收

1. 加载任一大型 AI 机甲或 `aidoggy`，在模块扩展中添加“通信模块”。
2. 确认工具箱显示“PS3手柄”分类和 9 个积木，按键、摇杆、IMU 和四个 LED 菜单可操作。
3. 将 9 个积木接入主程序，确认代码区出现 `import PS3` 和对应 `PS3.*` 调用。
4. 修改 MAC 地址、震动参数、LED 开关、按键、摇杆和 IMU 选项，确认生成值同步变化。
5. 加载 `minihexa`，确认通信模块显示为当前主控不支持。

## 后续事项

- 下一批迁移输出模块的点阵屏 6 个积木，重点验证 LEDMATRIX 自定义字段。
- PS2、Wi-Fi、头环和脑波模块需要按旧产品支持矩阵另行评估，不在本轮范围。
- 如需恢复震动强度的滑块 UI，应单独设计并验证通用数值滑块字段。
