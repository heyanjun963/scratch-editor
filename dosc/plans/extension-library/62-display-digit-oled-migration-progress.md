# 输出模块数码管与 OLED 第二批迁移记录

> 当前状态：数码管 1 个积木、OLED-12864 8 个积木已加入 `display 1.2.0` editor 内置包，共 9 个积木。

## 旧版依据与兼容边界

旧版 `WonderLab/resources/build/lib.min.js.map` 中的 `displayClassification` 将 `digit_display` 和 `oled` 归入 `aimech` 输出模块，旧 `display/index.js` 的产品分支实际覆盖：

`aimech`、`aimecanum`、`aiquadruped`、`aiquadrupedpro`、`aihexa`。

`aidoggy` 和 `minihexa` 不开放这两个模块。此前新版兼容矩阵只登记了点阵屏和 RGB，遗漏了这两个旧版支持项；本轮同步修正产品模块列表和模块卡片。

## 本批积木

| 分类 | 积木数 | 旧 Python 调用 |
| - | -: | - |
| 数码管 | 1 | `DEV_NixieTube(...).show_int` |
| OLED-12864 | 8 | 初始化、字符、像素、清屏、水平线、垂直线、直线、矩形 |

OLED 矩形保留旧版空心/实心菜单：`rect` / `fill_rect`。字符行菜单值为 0–5，生成规则保持旧版 `Y * 10`；OLED 设备变量固定为 `my_oled`，需要先放置初始化积木。

## 变更文件评审

| 文件 | 作用 | 结论 |
| - | - | - |
| `product-extension-catalog.js` | 为五款大型 AI 机甲增加 `digit-display`、`oled` 支持和卡片 | 与旧版分支一致，AiDoggy/miniHexa 不增加 |
| `display-package/config.json`、`python/main.ts`、`_menus/index.json` | Mind+ 作者源、分类、菜单和 Python 模板 | 9 个积木全部来自旧启用分支 |
| `display-1.2.0.mpext`、`display.json`、`index.json` | editor 内置包及快照索引 | 20 个输出积木、4 个分类，SHA256 一致 |
| `display-codegen.test.js` | 锁定数码管/OLED 生成和产品过滤 | 覆盖矩形模板选择器、OLED 菜单和端口 |
| `product-module-support.test.js` | 锁定五款产品新增模块矩阵 | 确认 AiDoggy 不支持新增模块 |

## 验证

- display 聚焦代码生成测试：4/4 通过。
- 产品模块支持测试：通过，五款大型 AI 机甲支持新增卡片，AiDoggy/miniHexa 不支持。
- 内置快照测试：display 版本、包内容和 SHA256 一致。
- 未执行完整构建；ESLint 仍受本机 `unrs-resolver` 原生可选依赖缺失影响。

## 当前进度

editor 内置四个公共模块累计 50 个积木：`actuator 9 + xarm 12 + display 20 + communication 9`。

按旧四个公共模块目录约 221 个启用 opcode 计算，约剩 171 个；按每轮约 10 个，理论还需约 17 轮。当前七款产品已覆盖旧版支持的动力、机械臂、输出和通信公共卡片；剩余积木主要属于控制器、其他机器人和未开放的旧设备分支。

## 人工验收

1. 重建 scratch-blocks 和 desktop 后加载任一大型 AI 机甲。
2. 在“输出模块”添加“数码管”和“OLED-12864”。
3. 数码管选择端口和数字，确认出现 `digit_PORT.show_int(NUM)`。
4. OLED 先放初始化，再检查字符、像素、线条、清屏和空心/实心矩形。
5. 切换 AiDoggy，确认模块卡片显示为不支持，工具箱不会出现新增积木。
