# 输入传感器第八批迁移与评审记录

> 当前状态：K230 视觉模块首批基础积木已加入 editor 内置 `sensor-1.7.0.mpext`，无需远程发布即可随支持产品测试。

## 数据来源与范围

| 内容 | 唯一来源 |
| - | - |
| 积木、参数、分类和菜单 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\sensor\index.js` 的 `K230` |
| Python 初始化与调用 | `D:\google download\python-generator (1).js` 中对应的 `sensor_k230_*` 生成函数 |

K230 旧版积木数量很大，本轮只迁移产品无关且可以独立闭环的 9 个基础 opcode：

| opcode | 作用 |
| - | - |
| `k230_aimech_init` | 按 IIC 端口初始化 `DEV_K230` |
| `k230_set_mode` | 切换视觉或在线大模型模式 |
| `k230_set_run` | 启动或停止检测 |
| `k230_set_volumn` | 设置设备音量，保留旧 API 拼写 |
| `k230_set_wifi` | 设置 WiFi 名称和密码 |
| `k230_update_detect_result` | 更新并保存检测结果 |
| `k230_result_exists` | 判断结果是否存在 |
| `k230_get_result` | 获取当前识别结果 |
| `k230_send_mcp_result` | 发送在线大模型响应结果 |

完成后共享输入模块累计 18 个分类、59 个 opcode、18 个实际菜单。

## 产品支持边界

- `aimech`、`aimecanum`、`aiquadruped`、`aiquadrupedpro`、`aihexa` 开放 `k230-vision`。
- 这五款产品在旧 VM 中共用 `k230_aimech_init` 与本轮 8 个基础调用，可以复用同一个分类。
- `minihexa`、`aidoggy` 不开放；旧版没有与本轮五款产品等价的 K230 支持路径。
- 麦轮车、四足、竞赛四足和六足各自的 MCP 默认配置不同，不能放入共享分类，本轮没有错误合并。

## Python 等价性

- 初始化保持 `k230 = Hiwonder_DEV.DEV_K230(Hiwonder_DEV.Port(PORT))`。
- 模式菜单完整保留旧版 27 个选项及编号，启停菜单保持 Python `True` / `False` 字面量。
- 音量方法保持硬件库的 `set_volumn` 拼写，不自行改为 `set_volume`。
- WiFi、更新、结果判断和结果获取分别保持 `set_wifi`、`update_result`、`result_available`、`result_get`。
- MCP 响应后保留旧版 `time.sleep(0.05)`，并由模块显式声明 `import time`，不再依赖主产品隐式导入。
- boolean/reporter 均禁用舞台监视器，避免出现旧版没有的监视复选框。

## 暂缓内容

- K230 的 MCP 工具配置会按不同主产品生成不同变量集合，需要先扩展共享模块的产品级积木过滤机制。
- 人脸、人体、手部、手势、跌倒、目标跟踪、颜色、线条、OCR、车牌、物体、垃圾、交通标志、AprilTag、DM 码、二维码和条形码识别将在后续批次按功能组迁移。
- WonderMind 依赖当前仓库中不存在的 `mcp_tools.py`；WonderLens 仍依赖尚未接通的 Python 运行库部署，本轮继续暂缓。
- ESP32Cam 和 ESP32-S3-Cam 没有当前五款 AI 机甲的完整初始化闭环，本轮不开放。

## 变更文件与 Review

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `builtin-product-snapshots/manifests/sensor.json` | 保存 K230 分类、积木、菜单与 Python 模板 | 由 `sensor-1.7.0.mpext` 经项目解析器生成 |
| `builtin-product-snapshots/packages/sensor-1.7.0.mpext` | editor 内置测试包 | 包内版本、59 个积木和 18 个菜单已校验 |
| `product-extension-catalog.js` | 把 K230 卡片接入五款产品的共享 `sensor` 模块 | miniHexa、AiDoggy 支持边界保持不变 |
| `sensor-codegen.test.js` | 锁定 K230 积木面、两个菜单和旧 Python 输出 | 覆盖全部 9 个新增 opcode |
| 产品支持、组件和快照测试 | 锁定模块可见性、本地添加流程与包哈希 | 不依赖远程 catalog 或独立产品仓库 |
| `sync-builtin-product-snapshots.mjs` | 锁定 1.7.0 内置包版本与 SHA256 | 后续同步会拒绝不一致的包 |

内置包 SHA256：

```text
5ff1b943b76216754a98d8e5e43a0bbe9ef5b63933962a7ee365d623acd793be
```

## 验证与人工验收

- 失败测试先确认 1.6.0 缺少 K230 分类、菜单、生成器和产品支持。
- GUI 聚焦测试覆盖模式值、启停布尔值及全部 9 条 K230 Python 路径。
- 内置快照测试校验 MPEXT、manifest、版本和 SHA256 一致。
- 本轮只更新 editor 内置包；独立产品仓库和远程发布包暂不更新。
- 未执行用户未要求的全量 build；ESLint 仍可能受本机 `unrs-resolver` 原生可选依赖缺失影响。

人工验收步骤：

1. 加载五款 AI 机甲中的任一产品，在“模块扩展”添加“K230视觉模块”。
2. 确认工具箱“输入模块”末尾出现 K230 子分类和 9 个积木。
3. 展开运行模式菜单，检查 27 个中文模式；展开启停菜单，检查“启动/停止”。
4. 设置接口 E，确认代码出现 `k230 = Hiwonder_DEV.DEV_K230(Hiwonder_DEV.Port(5))`。
5. 调整模式、启停、音量、WiFi，并检查更新、结果判断和结果 reporter 的代码变化。
6. 检查发送响应生成 `k230.send_mcp_result(...)` 和 `time.sleep(0.05)`。
7. 真机验证模式切换、检测结果和在线大模型响应。
