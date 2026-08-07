# 机械臂模块首批迁移与评审记录

> 本批基础机械臂与 AI 机甲串联机械臂首发于 `xarm-1.0.0.mpext`，当前已合并到第三批 `xarm-1.1.0.mpext`。

## 本轮范围

| 分类 | 积木数 | 主要能力 |
| - | -: | - |
| 机械臂 | 7 | 设置机械臂/机械爪 ID、上电、掉电、位置控制、位置读取、停止 |
| AI机甲串联机械臂 | 2 | 机械臂参数初始化、Y/Z 坐标与末端姿态控制 |

本轮共迁移 2 个完整分类、9 个启用积木和 2 个实际菜单。机械臂使用独立 `xarm` 共享包，不与总线舵机等 `actuator` 分类混装。

## 旧版依据

| 内容 | 来源 |
| - | - |
| 积木、参数和产品分支 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\actuator\index.js` |
| Python 生成规则 | `D:\google download\python-generator (1).js` |
| 简体中文文案与兼容矩阵 | `D:\Program Files (x86)\WonderLab\resources\app.asar` |

基础机械臂仅 `aimech` 支持。串联机械臂由 `aimech`、`aimecanum`、`aiquadruped`、`aiquadrupedpro`、`aihexa` 和 `aidoggy` 支持；`minihexa` 不支持本轮两个分类。

## 生成规则

基础机械臂动作使用：

```python
_clawId = 1
_armId = 2
busservos = Hiwonder.BusServo()
```

“设置机械臂/机械爪 ID”积木在初始化区生成新的赋值，位于默认值之后，因此用户 ID 能正确覆盖默认 ID。动作积木分别调用 `load`、`unload`、`run`、`get_position` 和 `stop`。

串联机械臂初始化生成：

```python
dof3Arm = Hiwonder.Arm_3DOF(upper_arm, forearm, offset, end, arm_type)
```

移动积木调用 `dof3Arm.move_to_yz(y, z, angle, duration)`。共享包自行声明 `import Hiwonder`，不依赖主产品碰巧提供导入。

## 文件职责

| 文件 | 职责 | 评审结论 |
| - | - | - |
| `builtin-product-snapshots/packages/xarm-1.0.0.mpext` | editor 内置 Mind+ 作者包 | 包含 9 个积木和 2 个菜单，可离线读取 |
| `builtin-product-snapshots/manifests/xarm.json` | 运行时同步 manifest | 由 MPEXT 经项目解析器生成，不手工维护 |
| `builtin-product-manifests/index.js` | 注册内置机械臂模块 | 两张已迁移卡片可自动进入可添加状态 |
| `builtin-product-snapshots/index.json` | 锁定包版本和 SHA256 | 防止包、manifest 与索引漂移 |
| `scripts/sync-builtin-product-snapshots.mjs` | 后续同步内置包 | xarm 暂复用 editor 已验证资产，产品仓库补源后再切换 |
| `xarm-codegen.test.js` | 锁定分类、菜单、兼容矩阵和 Python 输出 | 覆盖本轮全部 9 个 opcode 及 ID 覆盖顺序 |

## 人工验收

1. 加载 `aimech`，打开动力模块，确认“AI机甲机械臂”和“AI机甲串联机械臂”都可添加。
2. 添加两类模块，确认工具箱出现“机械臂”和“AI机甲串联机械臂”两个子分类，共 9 个积木。
3. 检查机械臂/机械爪菜单和短机械臂/长机械臂菜单均可正常切换。
4. 设置机械臂 ID 为 7、机械爪 ID 为 8，再添加动作积木，确认 Python 中自定义赋值位于默认赋值之后。
5. 加载 `aimecanum` 或其他支持产品，确认只可添加串联机械臂，基础机械臂显示当前主控不支持。
6. 加载 `minihexa`，确认本轮两个模块均显示当前主控不支持。

## 后续事项

- 下一批迁移 `xarm-linkage` 连杆机械臂完整分类。
- 风扇由 `actuator` 包提供，但位于输出模块列表，后续与约 10 个输出积木一起迁移。
- 180°/360°舵机和长电机只支持尚未迁移的 `aiblocksboard`，当前七款产品不开放这些卡片。
