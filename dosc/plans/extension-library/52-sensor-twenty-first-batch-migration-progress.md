# 输入传感器第二十一批迁移与评审记录

> 当前状态：K230 最后四个产品默认 MCP 配置积木已加入 editor 内置 `sensor-1.20.0.mpext`。当前 AI 机甲公共传感器迁移清单已完成。

## 本轮范围

新增 4 个唯一 opcode：

- `k230_aimecanum_set_mcp_default`
- `k230_aiquadruped_set_mcp_default`
- `k230_aiquadrupedpro_set_mcp_default`
- `k230_aihexa_set_mcp_default`

完成后共享输入模块累计 18 个分类、177 个唯一 opcode、53 个实际菜单；K230 分类累计 127 个唯一积木。

## 产品与变量集合

| 产品 | 默认配置积木 | 静态 MCP 变量数 |
| - | - | -: |
| `aimecanum` | 麦轮底盘默认工具 | 9 |
| `aiquadruped` | 四足机器人默认工具 | 9 |
| `aiquadrupedpro` | 四足竞赛版默认工具 | 10 |
| `aihexa` | 六足机器人默认工具 | 10 |
| `aimech` | 不显示默认配置积木 | 0 |

四组变量的名称、顺序和 JSON 内容均与旧 Python generator 逐字比较。四足竞赛版与六足使用相同变量名，但分别保留四足和六足运动描述。

## 代码生成规则

- 作者源在 `scratchEditor.blocks[opcode].variables` 中声明静态 Python 变量。
- Mind+ 适配器把配置变量与函数内 `Generator.addObject` 结果合并并去重。
- 四个积木不生成主函数语句，只在 Python 变量区注入产品对应的 MCP 工具定义。
- `products` 保证每款产品只显示自己的默认配置积木，双驱车不显示这四个积木。

## 变更文件与 Review

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `mindplus-package-adapter.js` | 读取作者源静态变量覆盖 | 只接受字符串数组，继续沿用统一去重流程 |
| `sensor-1.20.0.mpext` | editor 内置作者包 | 177 个积木、53 个菜单和 11 个产品条件积木已校验 |
| `sensor-codegen.test.js` | 锁定四产品变量集合与过滤规则 | 覆盖变量名称、顺序、关键中文描述和五产品可见性 |
| `sync-builtin-product-snapshots.mjs` | 锁定内置包版本与哈希 | 已同步生成 manifest 和 index |
| `builtin-product-snapshots.test.js` | 校验内置资产清单 | 版本、文件名和 SHA256 已更新 |

内置包 SHA256：

```text
e8e1750bdfdb90f224ff366c6b49a07388cc1e8bd1fb69a857049c91cb6d02f4
```

## 迁移结论

- 当前 AI 机甲公共传感器迁移清单已全部迁入 editor 内置包。
- WonderLens、WonderMind 仍为支持但待发布模块，不计入本批 K230 完成量。
- 其他主控专属模块和 Arduino C 不属于本批迁移范围。
- 旧 VM 中 8 个已注释串口积木按既定范围不迁移，不计为遗漏。
- 独立产品仓库本轮不更新，editor 内置包可直接用于本地人工检查。

## 人工验收

1. 分别加载麦轮车、四足、四足竞赛版和六足产品，再添加“K230视觉模块”。
2. 确认每款产品只出现一个“设置K230默认MCP工具”积木。
3. 确认双驱车不显示该积木。
4. 将积木接到启动积木后检查 Python：麦轮车和四足各生成 9 个 `_mcp_k230_` 变量，竞赛版和六足各生成 10 个。
5. 检查竞赛版的 `robot_move` 描述包含“四足底盘”，六足版本包含“六足底盘”。
