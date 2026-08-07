# 动力模块首批迁移与评审记录

> 本批总线舵机与 IIC 转 PWM 首发于 `actuator-1.0.0.mpext`，当前已合并到第三批 `actuator-1.1.0.mpext`。

## 本轮范围

| 分类 | 积木数 | 主要能力 |
| - | -: | - |
| 总线舵机 | 5 | 位置控制、电机模式、上电、掉电、位置读取 |
| IIC转PWM控制模块 | 3 | 模块初始化、180°舵机位置控制、电机速度控制 |

本轮共迁移 2 个完整分类、8 个启用积木和 2 个实际菜单。机械臂属于独立 `xarm` 共享包，不并入动力模块凑批次。

## 旧版依据

| 内容 | 来源 |
| - | - |
| 积木、参数和产品分支 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\actuator\index.js` |
| Python 生成规则 | `D:\google download\python-generator (1).js` |
| 简体中文文案 | `D:\Program Files (x86)\WonderLab\resources\app.asar` |

旧版兼容清单确认 `aimech`、`aimecanum`、`aiquadruped`、`aiquadrupedpro`、`aihexa`、`aidoggy` 支持这两个分类，`minihexa` 不支持。

## 生成规则

总线舵机统一生成并去重：

```python
busservos = Hiwonder.BusServo()
```

五个积木分别调用 `run`、`set_mode`、`load`、`unload`、`get_position`。IIC 转 PWM 初始化生成：

```python
iicpwm = Hiwonder_DEV.DEV_PWMModule(Hiwonder_DEV.Port(PORT))
```

其余两个积木分别调用 `set_angle(NUM, ANGLE, TIME, 180)` 和 `set_speed(NUM, SPEED)`。端口菜单保持 A/B/C/D/E/J/K，对应旧版数值 1/2/3/4/5/9/10；通道菜单保持 1/2。

## 文件职责

| 文件 | 职责 | 评审结论 |
| - | - | - |
| `builtin-product-snapshots/packages/actuator-1.0.0.mpext` | editor 内置 Mind+ 作者包 | 包含 8 个积木和 2 个菜单，可离线读取 |
| `builtin-product-snapshots/manifests/actuator.json` | 运行时同步 manifest | 由 MPEXT 经项目解析器生成，不手工维护 |
| `builtin-product-manifests/index.js` | 注册内置动力模块 | 模块卡可由共享 manifest 自动进入可添加状态 |
| `builtin-product-snapshots/index.json` | 锁定包版本和 SHA256 | 防止包、manifest 与索引漂移 |
| `scripts/sync-builtin-product-snapshots.mjs` | 后续同步内置包 | actuator 暂复用 editor 已验证资产，产品仓库补源后再切换 |
| `actuator-codegen.test.js` | 锁定分类、参数、兼容矩阵和 Python 输出 | 覆盖本轮全部 8 个 opcode |

## 人工验收

1. 启动 editor，加载任一受支持的 AI 机甲产品。
2. 打开模块拓展，确认“总线舵机”和“IIC转PWM控制模块”可添加。
3. 添加两个模块，确认工具箱出现两个子分类，合计 8 个积木。
4. 检查 IIC 接口下拉项为 A/B/C/D/E/J/K，通道下拉项为 1/2。
5. 拖入全部积木并修改数值，确认 Python 对象初始化只出现一次，调用参数与积木一致。
6. 切换到 `minihexa`，确认这两个模块显示为当前主控不支持。

## 后续事项

- 下一批继续迁移动力模块的完整设备组，仍以约 10 个积木为一轮。
- 独立产品仓库作者源和远程发布包暂不在本轮范围内。
