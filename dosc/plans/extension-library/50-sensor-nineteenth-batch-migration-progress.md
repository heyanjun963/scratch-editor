# 输入传感器第十九批迁移与评审记录

> 当前状态：K230 三个通用 MCP 工具设置积木已加入 editor 内置 `sensor-1.18.0.mpext`，无需远程发布即可测试。

## 数据来源与范围

| 内容 | 唯一来源 |
| - | - |
| 积木和参数 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\sensor\index.js` 的在线大模型分组 |
| Python 全局配置 | `D:\google download\python-generator (1).js` 中对应的 `sensor_k230_mcp_*` 生成函数 |

本轮新增 3 个唯一 opcode：

- `k230_mcp_action_setting`
- `k230_mcp_move_setting`
- `k230_mcp_setting`

完成后共享输入模块累计 18 个分类、166 个唯一 opcode、42 个实际菜单；K230 分类累计 116 个唯一积木。

## 代码生成规则

- 动作工具生成固定全局变量 `_mcp_k230_run_action`，工具名称为 `run_action`。
- 运动工具生成固定全局变量 `_mcp_k230_move`，工具名称为 `move`。
- 自定义工具把静态名称规整为 `_mcp_k230_<name>` Python 标识符，并在 JSON 中保留原工具名称。
- 工具描述和自定义参数沿用旧生成器规则，移除输入表达式中的全部空白后作为 JSON 字符串保存。
- 阻塞时长保持数值表达式，动作和运动工具的参数描述、必填字段与旧版一致。
- 三个 command 本身不生成函数体代码，只向 Python 顶层变量区写入 MCP 工具配置。

## 公共模板能力

为安全表达旧生成器的静态配置规则，本轮新增三个仅显式使用时生效的 formatter：

| formatter | 作用 |
| - | - |
| `compactJson` | 移除 Python 输入表达式空白后输出 JSON 字符串 |
| `jsonValue` | 要求静态字符串输入并输出 JSON 字符串值 |
| `identifier` | 要求静态字符串输入并规整为合法 Python 标识符 |

`scratch-vm/test/unit/python_codegen.js` 已独立锁定三种 formatter 的组合输出。

## 剩余迁移量

- 旧 VM 中仍启用但未迁移的 K230 积木剩 11 个，全部带产品条件或产品菜单差异。
- 包含 4 个产品专用默认 MCP 配置、1 个默认工具名称判断和 6 个产品动作返回参数积木。
- 预计还需约 2 轮；下一轮先增加共享模块的产品级积木过滤能力。

## 迁移边界

- 旧 VM 已注释的 `k230_set_mcp` 继续不迁移。
- 本轮三个 MCP 设置积木在五款相关 AI 机甲中行为一致，可安全加入共享 K230 列表。
- 产品专用 MCP 积木不直接加入共享列表，避免不同产品的工具名称和参数菜单混用。
- 本轮只更新 editor 内置包；独立产品仓库和远程发布包暂不更新。

## 变更文件与 Review

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `packages/scratch-vm/src/codegen/python.js` | 渲染静态 MCP 元数据 formatter | formatter 仅由模板显式触发，静态字符串无效时明确报错 |
| `manifest-schema.js` | 声明允许的 formatter | 未开放任意函数或包内代码执行 |
| `builtin-product-snapshots/manifests/sensor.json` | 保存三个 MCP 积木和全局变量模板 | 由 `sensor-1.18.0.mpext` 经项目解析器生成 |
| `builtin-product-snapshots/packages/sensor-1.18.0.mpext` | editor 内置测试包 | 包内版本、166 个积木和 42 个菜单已校验 |
| `sensor-codegen.test.js` | 锁定三个 opcode 和完整 JSON 输出 | 禁止 unsupported 输出并逐项校验全局变量 |
| `packages/scratch-vm/test/unit/python_codegen.js` | 锁定公共 formatter | 覆盖空白压缩、JSON 字符串和标识符规整 |

内置包 SHA256：

```text
9e242b1aec90bcf44f9d6e64288fca8eb8bcefe7e12ac16e096d3e7f51aa5d88
```

## 人工验收

1. 加载任一支持的 AI 机甲并添加“K230视觉模块”。
2. 确认更新结果之后出现动作组、运动和自定义 MCP 工具设置积木。
3. 分别填写带空格的中文描述，确认 Python 顶层生成 `_mcp_k230_run_action` 和 `_mcp_k230_move`。
4. 自定义工具名称填写 `custom_tool`，确认生成 `_mcp_k230_custom_tool` 且 JSON name 为 `custom_tool`。
5. 修改阻塞时长，确认 JSON 的 `block` 保持数值而非字符串。
6. 确认三个积木在主函数中不生成多余语句。
