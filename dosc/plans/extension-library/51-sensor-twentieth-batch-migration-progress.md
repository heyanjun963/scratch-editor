# 输入传感器第二十批迁移与评审记录

> 当前状态：K230 七个产品条件 MCP 返回积木已加入 editor 内置 `sensor-1.19.0.mpext`，共享模块会按当前 AI 机甲过滤积木和菜单。

## 本轮范围

新增 7 个唯一 opcode：

- `k230_get_default_mcp_name`
- `k230_get_robot_set_pose_params`
- `k230_get_robot_move_params`
- `k230_get_robot_runAction_params`
- `k230_motor_speed_params`
- `k230_get_move_distance_params`
- `k230_get_arm_move_to_yz_params`

完成后共享输入模块累计 18 个分类、173 个唯一 opcode、53 个实际菜单；K230 分类累计 123 个唯一积木。

## 产品过滤

本轮为声明式 manifest 增加两项可选元数据：

| 字段 | 作用 |
| - | - |
| `products` | 限制积木只在指定主产品下进入组合后的共享模块 |
| `productArguments` | 同一 opcode 按主产品覆盖参数菜单或默认值 |

共享模块安装前使用当前已加载主产品 ID 组合 manifest。未提供产品 ID 时只保留通用积木，避免专用积木泄漏。过滤积木后会重新计算实际使用菜单。

## 旧版产品矩阵

| 产品 | 专用结果积木和菜单 |
| - | - |
| `aimech` | 动作组、四参数机械臂运动；不显示默认工具名称判断 |
| `aimecanum` | 麦轮电机速度、移动距离、三参数机械臂运动；默认工具使用 `mcp_names3` |
| `aiquadruped` | 四足运动、动作组、四参数机械臂运动；使用 `mcp_names2` 和 `robot_move_params2` |
| `aiquadrupedpro` | 三自由度运动、姿态、动作组、四参数机械臂运动；使用 `mcp_names` |
| `aihexa` | 六足运动、姿态、动作组、四参数机械臂运动；使用 `mcp_names` |

## 代码生成规则

- 默认工具名称判断生成 `'工具名' in RESULT`。
- 其余 reporter 保持 `RESULT['工具名']['参数名']` 两级字典访问。
- `RESULT` 是表达式输入，工具名和参数名来自产品对应的固定菜单。
- 所有 boolean/reporter 均禁用舞台监视器。

## 剩余迁移量

- 旧 VM 中仍启用但未迁移的 K230 积木只剩 4 个产品专用默认 MCP 配置。
- 四个积木会分别展开产品对应的多组静态 MCP JSON，下一轮单独迁移并逐产品锁定变量集合。

## 变更文件与 Review

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `mindplus-package-adapter.js` | 从作者源 config 保留产品元数据 | 仅接受声明式数组和对象 |
| `manifest-schema.js` | 规范化、校验并序列化产品元数据 | 参数覆盖只能引用已定义参数 |
| `product-module-support.js` | 按产品过滤积木和覆盖菜单 | 克隆参数对象，不污染基础 manifest |
| `product-extension-library.jsx` | 组合共享模块时传入当前产品 | 产品切换仍沿用原清理流程 |
| `sensor-1.19.0.mpext` | editor 内置作者包 | 173 个积木、53 个菜单和 7 个产品规则已校验 |
| `sensor-codegen.test.js` | 锁定产品矩阵和 Python 输出 | 覆盖五款产品及全部新增 opcode |
| `product-module-support.test.js` | 锁定通用过滤能力 | 覆盖积木过滤、参数菜单覆盖和无产品回退 |

内置包 SHA256：

```text
fda537ccf8f71e6ec51e227631e5124fc9740d69c02792c52d75957348e823ef
```

## 人工验收

1. 分别加载五款 AI 机甲并添加“K230视觉模块”。
2. 检查双驱车不显示默认 MCP 工具名称判断，麦轮车显示电机速度和移动距离结果。
3. 检查四足机器人使用“方向、步数、运动时间”等菜单，不显示姿态结果。
4. 检查竞赛版和六足显示姿态结果，并使用 X/Y/Z 速度、抬腿高度、周期和步数菜单。
5. 检查麦轮车机械臂菜单没有倾角，其他四款包含倾角。
6. 切换产品后重新添加 K230，确认上一产品的专用积木和菜单不会残留。
