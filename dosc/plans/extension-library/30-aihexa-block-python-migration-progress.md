# AI机甲六足机器人积木与 Python 迁移记录

> 当前状态：`aihexa-1.0.0.mpext` 已生成并同步为 editor 内置产品，可完全离线测试；远程 catalog 保持 `draft`，未创建 tag 或 Release。

## 本轮目标

将旧 VM 中 AI机甲六足机器人实际启用的积木和旧 Python generator 最终生效规则迁移为 Mind+ Python 作者源，优先进入 editor 内置产品包，不依赖远程发布即可验证积木显示和代码生成。

## 数据来源与范围

| 内容 | 来源 | 迁移结果 |
| - | - | - |
| 积木、参数、分类和菜单 | 旧 VM `src/extensions/aihexa/index.js` | 42 个实际启用积木 |
| Python 生成规则 | 旧 `python-generator (1).js` 的 `aihexa_*` 函数 | 42 个启用 opcode 全部有对应实现 |
| 重复与兼容实现 | 旧 generator 中两段同名函数和额外兼容函数 | 按 JavaScript 最终覆盖语义取值，不进入工具箱的函数不迁移 |

- 早期文档统计为 43 个积木；逐项检查后确认其中 1 个旧动作积木已整体注释，实际启用数为 42。
- 包含 8 个分类，其中主程序分类隐藏标签，界面显示 7 个业务分栏。
- 包含 4 个帽子积木：主程序、启动、按键短按和按键长按。
- 只保留 42 个启用积木实际引用的 10 个菜单，不复制旧扩展中的未使用菜单。
- 运动控制区迁移 13 个积木，覆盖 XYZ 运动、动作组、姿态、舵机和负载控制。

## 关键生成规则

旧 generator 对 `robot_move` 和 `robot_move_step` 根据方向动态改变 X/Y/Z 参数。Mind+ 作者源通过 `templateSelector` 保存六种分支：

| 方向值 | X | Y | Z |
| - | - | - | - |
| `0` 前进 | `0` | `VALUE` | `0` |
| `1` 后退 | `0` | `-VALUE` | `0` |
| `2` 左平移 | `-VALUE` | `0` | `0` |
| `3` 右平移 | `VALUE` | `0` | `0` |
| `4` 原地左转 | `0` | `0` | `VALUE` |
| `5` 原地右转 | `0` | `0` | `-VALUE` |

六足设备统一初始化为 `hexa = Hiwonder_DEV.DEV_Hexa_Board(Hiwonder_DEV.Port(9))`。停止运动采用旧 generator 最终覆盖后的 `hexa.stop()`；动作组、姿态和舵机调用分别保持 `action_run`、`set_pose`、`set_servo_pose` 和 `set_LoadOrUnload`。`imu_cali` 使用 `addVariableForce` 强制覆盖普通 IMU 初始化，不依赖积木排列顺序。

## 变更文件与 Review

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `scratch-product-extensions/products/aihexa/config.json` | 声明版本、分类、帽子入口和运动方向分支 | 42 个 opcode 全部且仅出现一次 |
| `scratch-product-extensions/products/aihexa/python/main.ts` | Mind+ Python 唯一作者源 | 使用旧 generator 最终生效实现，IMU 强制变量规则已锁定 |
| `scratch-product-extensions/products/aihexa/python/_menus/index.json` | 保存中文菜单与原始 value | 10 个实际引用菜单，方向值保持 `0~5` |
| `scratch-product-extensions/dist/aihexa-1.0.0.mpext` | 本地候选包和内置快照来源 | 6194 字节，重复生成 SHA256 不变 |
| `builtin-product-snapshots` | 保存 editor 离线 MPEXT 与同步 manifest | 不读取远程 catalog 即可安装和显示 |
| `builtin-product-manifests/index.js` | 注册内置 manifest | `aihexa` 可直接进入 VM 与 Python codegen |
| `product-extension-catalog.js` | 将产品卡片切换为本地可用 | `version: 1.0.0`、`status: available` |
| `aihexa-codegen.test.js` | 锁定产品积木面和生成代码 | 覆盖六种方向、步数、姿态、动作组、停止、舵机负载和 IMU 强制覆盖 |

## 内置版本锁定

AI机甲六足机器人内置包 SHA256：

```text
86ab31786d4741e9640a45ee70985bf66a2893010bbbb2db3418e948d2b8961c
```

同步脚本显式锁定版本、文件名和 SHA256。远程 catalog 后续发布或升级不会在未审查时改变 editor 内置版本。

## 自动验证

- 正式产品同步生成候选包，catalog 状态保持 `draft`。
- 内置快照测试重新解析实际 MPEXT，并逐项比较同步 manifest、包内 ID、版本和 SHA256。
- 产品专用测试锁定 42 个 opcode、8 个分类、10 个菜单、4 个帽子积木和 10 个禁用监视器的取值积木。
- VM Python codegen 测试覆盖六种方向映射、XYZ 步数运动、最终停止实现、姿态、动作组、舵机负载和 IMU 校准覆盖。
- 产品拓展定向回归共 18 个 Jest suite、85 项测试全部通过。
- Chromium 冒烟检查确认内置卡片可点击、不是灰色，加载后工具箱出现六足复位积木且无页面异常。

## 人工校对与 TODO

1. 在产品拓展页点击 AI机甲六足机器人，确认无需联网即可添加，左侧出现 7 个业务分栏。
2. 逐项核对 42 个积木的中文文案、默认值、菜单顺序和长积木换行显示。
3. 切换六种运动方向，核对生成的 X/Y/Z 正负号与旧版一致。
4. 重点核对动作组名称、姿态七参数、舵机 ID `11~28` 和全部舵机负载控制。
5. 使用真机验证蜂鸣器、RGB、按键、六足运动、舵机、IMU 和蓝牙通信。
6. 人工验收前保持远程 `draft`，不创建 tag 或 Release。
