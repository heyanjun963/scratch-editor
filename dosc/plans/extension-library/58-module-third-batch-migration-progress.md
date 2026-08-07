# 公共模块第三批迁移与评审记录

> 当前状态：连杆机械臂、风扇和 RGB 模块共 9 个积木已加入 editor 内置共享包，无需远程发布即可测试。

## 本轮范围

| 扩展包 | 分类 | 新增积木 | 当前版本 |
| - | - | -: | - |
| `xarm` | 连杆机械臂 | 3 | `1.1.0` |
| `actuator` | 风扇 | 1 | `1.1.0` |
| `display` | RGB模块 | 5 | `1.0.0` |

本轮新增 3 个完整分类、9 个启用积木和 4 个新增菜单或产品菜单覆盖。`aimech_rod_arm_get_angle` 在旧 VM 中已注释，本轮不恢复。

## 旧版依据

| 内容 | 来源 |
| - | - |
| 连杆机械臂积木 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\actuator\index.js` |
| 风扇与 RGB 积木 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\display\index.js` |
| Python 生成规则 | `D:\google download\python-generator (1).js` |
| 中文文案与兼容矩阵 | `D:\Program Files (x86)\WonderLab\resources\app.asar` |

## 兼容边界

- 连杆机械臂支持 `aimech`、`aimecanum`、`aiquadruped`、`aiquadrupedpro`、`aihexa` 和 `aidoggy`。
- 风扇支持上述六款产品；`aidoggy` 使用 C/D/E/F 端口，其余产品使用 A/B/C/D/E/J/K。
- RGB 模块只支持五款大型 AI 机甲，不支持 `aidoggy` 和 `minihexa`。
- `minihexa` 不支持本轮三个分类。

## 生成规则

连杆机械臂初始化和动作分别生成：

```python
rodArm = Hiwonder.Arm_Link()
rodArm.is_s1s2_angle(y, z)
rodArm.move_to_yz(y, z, duration, wait)
```

风扇按端口建立独立对象：

```python
iic_fan_PORT = Hiwonder_DEV.DEV_FAN(Hiwonder_DEV.Port(PORT))
iic_fan_PORT.set_speed(speed)
```

RGB 模块按端口复用 `rgbModule_PORT`，覆盖数值颜色、颜色选择、单色呼吸、炫彩和关闭。颜色选择在生成阶段转换成十六进制通道：

```python
rgbModule_3.set_rgb(0xff,0x99,0x66)
```

生成结果不保留 `int("#ff9966"[...])` 运行时切片。

## 文件职责

| 文件 | 职责 | 评审结论 |
| - | - | - |
| `xarm-1.1.0.mpext` / `xarm.json` | 累计 3 类机械臂、12 个积木 | 连杆初始化、可达检测和移动完整 |
| `actuator-1.1.0.mpext` / `actuator.json` | 累计 3 类动力/输出模块、9 个积木 | 风扇含 `aidoggy` 端口覆盖 |
| `display-1.0.0.mpext` / `display.json` | 首批 RGB 输出模块、5 个积木 | 颜色参数与十六进制模板已校验 |
| `builtin-product-manifests/index.js` | 注册三个共享包 | 已迁移卡片离线可添加 |
| `builtin-product-snapshots/index.json` | 锁定版本和 SHA256 | 包、manifest 和索引一致 |
| `xarm-codegen.test.js` | 锁定 12 个机械臂积木 | 覆盖菜单、兼容性和 Python 输出 |
| `actuator-codegen.test.js` | 锁定 9 个 actuator 积木 | 覆盖风扇产品参数覆盖 |
| `display-codegen.test.js` | 锁定 5 个 RGB 积木 | 覆盖颜色转换和对象去重 |

## 人工验收

1. 加载任一大型 AI 机甲，添加“AI机甲连杆机械臂”“风扇”“RGB模块”。
2. 确认工具箱分别出现 3、1、5 个积木，菜单可以正常操作。
3. 连杆机械臂选择“延时”后，确认生成参数为 `True`。
4. RGB 颜色选择 `#ff9966`，确认代码为 `0xff,0x99,0x66`，没有 `int(`。
5. 加载 `aidoggy`，确认风扇端口只有 C/D/E/F，连杆机械臂可添加，RGB 模块不支持。
6. 加载 `minihexa`，确认本轮三个模块均显示当前主控不支持。

## 后续事项

- 下一批优先迁移点阵屏 AI 产品分支，可与其他小型输出设备组凑成约 10 个积木。
- 180°/360°舵机和长电机继续等待 `aiblocksboard` 主控迁移，不向当前七款产品开放。
