# AI机甲双驱车积木与 Python 迁移记录

> 人工校对状态：未完成。`aimech-1.0.0.mpext` 已生成、发布并通过自动解析校验，远程 catalog 已开放为 `published`。

## 本轮目标

将旧 VM 中 AI机甲双驱车实际启用的积木和旧 Python generator 对应规则迁移到独立产品仓库，修复远程产品安装状态，并补齐 IMU 校准对同名初始化的强制覆盖能力。

## 数据来源

| 内容 | 唯一来源 |
| - | - |
| 积木、参数、分栏和菜单 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\aimech\index.js` |
| Python API、变量初始化和入口 | `D:\google download\python-generator (1).js` 中的 `aimech_*` 生成函数及 `addVariableForce` |

## 迁移范围

- 迁移 40 个启用积木，其中包含 4 个帽子积木。
- 保留 7 个可见业务分栏；Mind+ 配置另含 1 个隐藏的主程序入口分栏。
- 迁移 11 个被启用积木引用的菜单。旧源中 `wheel` 与不含“全部”的 `wheel2` 分别被不同积木引用，因此不能合并；这比迁移前初查的 10 个多 1 个。
- 不迁移旧 VM 中已整体注释的 8 个串口积木。
- 初始远程版本为 `1.0.0`，复用编辑器现有 `aimech` 占位卡片，不新增产品目录项或内置快照。

## 变更文件

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `scratch-product-extensions/products/aimech/config.json` | 声明版本、分类、帽子入口和电机菜单分支 | 40 个 opcode 全部进入分类，版本字段一致 |
| `scratch-product-extensions/products/aimech/python/main.ts` | Mind+ Python 唯一作者源 | 40 个启用积木均有生成规则，串口积木未混入 |
| `scratch-product-extensions/products/aimech/python/_menus/index.json` | 保存中文菜单和原始 value | 11 个实际引用菜单已保留 |
| `scratch-product-extensions/dist/aimech-1.0.0.mpext` | 确定性发布候选包 | SHA256 为 `0d1b95ea60a647e2e664d432d72f418a7c71a72bae9ce4d3004fa498e37a76b1` |
| `scratch-product-extensions/catalog.json` | 登记远程版本 | 状态为 `published`，编辑器可检测并安装 |
| `product-extension-library.jsx` | 区分可远程安装和真正不可用的产品卡片 | `downloadable` 不再置灰或显示占位文案 |
| `mindplus-package-adapter.js` 等 manifest 链路 | 解析并持久化 `addVariableForce` | 强制变量元数据可从 MPEXT 传到 VM |
| `scratch-vm/src/codegen/python/context.js` | 按变量名收集初始化并支持强制替换 | 普通初始化先出现或后出现时，强制初始化都获胜 |
| `blocks.jsx` | 等待远程分类完成重建，并允许产品 catalog 中的远程产品进入 Python 工具箱 | 修复首次点击“添加”后只滚动到末尾但积木区空白 |
| 相关 GUI 与 VM 测试 | 锁定远程卡片、静态解析和最终 Python | 定向测试通过 |

## IMU 覆盖规则

旧生成器的普通 `addVariable` 对同名变量采用“首次写入有效”，`addVariableForce` 则先删除旧值再写入新值。新实现使用按名称索引的变量集合复现该规则：

```python
buttonA = Hiwonder.Button('A')
def is_stop_3091ratyxq():
  return buttonA.read()
imu = Hiwonder.IMU(True, is_stop_3091ratyxq)
```

当同一程序同时使用 `imu_init` 和 `imu_cali` 时，不再输出 `imu = Hiwonder.IMU()`。测试同时覆盖两个积木的前后顺序。

## 自动验证

- 产品同步连续执行两次，`aimech-1.0.0.mpext` 均为 5766 字节，SHA256 保持不变。
- 实际解析发布候选包后得到 40 个唯一 opcode、7 个可见分栏、4 个帽子积木和 11 个菜单；未发现串口 opcode。
- 产品拓展共享回归 15 个 Jest suite、68 项测试全部通过。
- VM Python codegen 19 项 Tap 断言全部通过。
- GitHub Release 附件经真实 VM 注册后得到 40 个积木和 11 个菜单，确认发布包内容完整。
- `git diff --check` 在编辑器仓库和产品仓库均通过。
- ESLint 尚未执行到规则检查：现有 `node_modules` 缺少 `unrs-resolver` 原生可选依赖。按仓库规则本轮未重装依赖。

## 已知待办

1. 在新旧软件中逐项核对 40 个积木的中文文案、参数默认值、菜单顺序和分栏位置。
2. 对电机“全部”分支、RGB 颜色、按键回调、蓝牙常量和 IMU 校准生成代码进行人工逐项对照。
3. 使用真机验证蜂鸣器、RGB、电机、按键、IMU 和蓝牙通信。
4. 修正 `aimech-v1.0.0` tag 的提交指向；Release 附件内容和校验值已经正确，不需要重新生成发布包。
