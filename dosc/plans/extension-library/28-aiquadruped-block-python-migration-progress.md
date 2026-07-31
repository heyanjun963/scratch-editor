# AI机甲四足机器人积木与 Python 迁移记录

> 当前状态：`aiquadruped-1.0.0.mpext` 已生成并同步为 editor 内置产品，可完全离线测试；远程 catalog 保持 `draft`，未创建 tag 或 Release。

## 本轮目标

将旧 VM 中 AI机甲四足机器人实际启用的积木和旧 Python generator 规则迁移为 Mind+ Python 作者源，优先进入 editor 内置产品包，不依赖远程发布即可验证积木显示和代码生成。

## 数据来源与范围

| 内容 | 来源 | 迁移结果 |
| - | - | - |
| 积木、参数、分类和菜单 | 旧 VM `src/extensions/aiquadruped/index.js` | 38 个实际启用积木 |
| Python 生成规则 | 旧 `python-generator (1).js` 的 `aiquadruped_*` 函数 | 38 个启用 opcode 全部有对应实现 |
| 未进入当前工具箱的兼容函数 | 旧 generator 中额外 7 个函数 | 本轮不迁移 |

- 包含 8 个分类，其中主程序分类隐藏标签，界面显示 7 个业务分栏。
- 包含 4 个帽子积木：主程序、启动、按键短按和按键长按。
- 只保留 38 个启用积木实际引用的 10 个菜单，不复制旧扩展中的未使用菜单。
- 四足运动区迁移 9 个积木，覆盖复位、连续运动、步数运动、偏移、动作、停止和舵机读写。

## 变更文件

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `scratch-product-extensions/products/aiquadruped/config.json` | 声明版本、分类和帽子入口 | 38 个 opcode 全部且仅出现一次 |
| `scratch-product-extensions/products/aiquadruped/python/main.ts` | Mind+ Python 唯一作者源 | 通用硬件规则复用已验证模式，四足调用按旧 generator 参数顺序迁移 |
| `scratch-product-extensions/products/aiquadruped/python/_menus/index.json` | 保存中文菜单与原始 value | 10 个实际引用菜单，运动值保持 `0~6` |
| `scratch-product-extensions/dist/aiquadruped-1.0.0.mpext` | 本地候选包和内置快照来源 | 5484 字节，重复生成 SHA256 不变 |
| `builtin-product-snapshots` | 保存 editor 离线 MPEXT 与同步 manifest | 不读取远程 catalog 即可安装和显示 |
| `builtin-product-manifests/index.js` | 注册内置 manifest | `aiquadruped` 可直接进入 VM 与 Python codegen |
| `product-extension-catalog.js` | 将产品卡片切换为本地可用 | `version: 1.0.0`、`status: available` |
| `aiquadruped-codegen.test.js` | 锁定产品积木面和生成代码 | 覆盖运动、舵机和 IMU 强制覆盖 |
| Mind+ manifest 转换链路 | 为 reporter/boolean 设置并传递 `disableMonitor` | 圆角取值积木不再显示无效舞台监视器复选框 |

## 内置版本锁定

同步脚本不再从远程 catalog 自动选择最新资源，而是显式锁定每个内置包的版本、文件名和 SHA256。这样 AiDoggy 仍保持 `0.1.0` 内置基线，AI机甲四足机器人固定使用本地 `1.0.0`，后续远程发布不会在未审查时改变软件内置版本。

AI机甲四足机器人内置包 SHA256：

```text
883abd0f9c51a74f1b7ce9c2b3bd1addb6b7cbc94c2475df3e0f32b71ea71c04
```

## 自动验证

- 正式产品同步连续执行两次，包大小和 SHA256 保持一致，catalog 状态保持 `draft`。
- 内置快照测试重新解析实际 MPEXT，并逐项比较同步 manifest、包内 ID、版本和 SHA256。
- 产品专用测试锁定 38 个 opcode、8 个分类、10 个菜单和 4 个帽子积木。
- VM Python codegen 测试覆盖四足运动、动作、舵机读写和 IMU 校准覆盖普通初始化。
- 产品拓展定向回归共 16 个 Jest suite、73 项测试全部通过。
- Chromium 实测卡片为本地可用状态，点击后直接显示产品分类与积木，未触发远程下载。
- Chromium 实测 flyout 中监视器控件数量为 0，行为与旧版一致。

## 人工校对

1. 在产品拓展页点击 AI机甲四足机器人，确认无需联网即可添加，左侧出现 7 个业务分栏。
2. 逐项核对 38 个积木的中文文案、默认值、菜单顺序和长积木换行显示。
3. 切换前进、后退、左右移动、左右转和扭动菜单，核对生成值与旧版一致。
4. 重点核对 `robot_move_offset` 与 `robot_move_step_arg` 的偏移参数位置。
5. 使用真机验证蜂鸣器、RGB、按键、四足运动、舵机、IMU 和蓝牙通信。
6. 人工验收前保持远程 `draft`，不创建 tag 或 Release。
