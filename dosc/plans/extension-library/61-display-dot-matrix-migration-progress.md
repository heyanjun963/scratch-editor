# 输出模块点阵屏迁移与评审记录

> 当前状态：点阵屏完整设备组 6 个积木已加入 `display 1.1.0` editor 内置包；无需发布远程版本即可本地测试。

## 本批范围

| 分类 | 积木数 | 主要能力 |
| - | -: | - |
| 点阵屏 | 6 | 亮度、数字、字符串、单点亮灭、16×8 位图、清屏 |

本批保留旧版正式启用的 6 个 opcode：

- `aimech_matrixLed_brightness`
- `aimech_matrixLed_show_num`
- `aimech_matrixLed_show_str`
- `aimech_matrixLed_pos_onoff`
- `aimech_matrix_led`
- `aimech_clear_matrix_led`

## 字段与弹框

旧版 `LEDMATRIX` 的交互实现在 `scratch-blocks` 自定义字段而不是 VM。新字段保持 16 列 × 8 行、共 128 位的值协议，并恢复为覆盖编辑区的遮罩弹框：

- 积木圆角输入内显示 16×8 缩略图。
- 点击后打开大点阵编辑区，支持单击和拖动绘制、清空、全亮、关闭和确认。
- 内置旧安装目录中的 10 个点阵图案，可点击载入并顺序播放。
- 用户图案支持保存和删除；使用 `localStorage` 持久化，避免重新引入旧版 Electron 文件系统依赖。

## Python 生成规则

所有积木按端口复用设备对象：

```python
import Hiwonder_DEV
ledMatrix_1 = Hiwonder_DEV.DEV_LEDMatrix(Hiwonder_DEV.Port(1))
```

位图按旧生成器的列字节规则转换：字段中同一列的 8 行依次对应 bit0-bit7，最终生成 16 个不补零的十六进制值。例如第一列全亮、其他列关闭：

```python
ledMatrix_1.drawBitMap((0xff,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0))
```

## 产品兼容边界

- 五款大型 AI 机甲使用 A/B/C/D，对应端口值 1/2/3/4。
- AiDoggy 使用 C/D/E/F，对应端口值 3/4/5/6。
- miniHexa 不支持点阵屏。
- RGB 积木继续只对五款大型 AI 机甲开放；AiDoggy 添加点阵屏时不会混入 RGB 分类积木。

## 变更文件评审

| 文件 | 作用 | 评审结论 |
| - | - | - |
| `scratch-blocks/src/blocks/led_matrix.ts` | 注册点阵 shadow block | 直接创建字段，规避动态拓展字段注册时序导致的空圆角 |
| `scratch-blocks/src/fields/field_led_matrix.ts` | 16×8 缩略图、遮罩弹框和本地图案库 | 保持 128 位协议；不依赖 Electron API |
| `scratch-vm/src/extension-support/argument-type.js`、`engine/runtime.js` | 声明 `led_matrix` 参数及 shadow 映射 | 字段名固定为 `LEDMATRIX` |
| `scratch-vm/src/codegen/python.js` | `{MATRIX.bitmap}` formatter | 列优先字节转换与旧生成器一致 |
| `manifest-schema.js`、`mindplus-package-adapter.js` | 接受 `ledmatrix` 并规范化位图模板 | `.bitmap` 只允许用于点阵参数 |
| `display-1.1.0.mpext`、`display.json`、`index.json` | 11 个输出模块积木的内置快照 | 包、manifest、版本和 SHA256 一致 |
| `display-codegen.test.js` | 锁定分类、菜单、兼容范围和生成代码 | 覆盖 AiDoggy 端口及第一列 `0xff` 转换 |
| `field_line_mask.test.ts` | 点阵值与 shadow block 单元测试 | 覆盖补零、截断、脏值和字段实例 |

## 验证结论

- scratch-blocks 聚焦测试：1 个文件、5 个测试通过。
- scratch-gui 聚焦测试：4 个文件、25 个测试通过。
- 内置 MPEXT、同步 manifest 和索引 SHA256 一致。
- 本机 ESLint / Prettier 配置仍因缺失 `unrs-resolver` 可选原生绑定无法启动；未重装依赖。
- 本轮未执行完整构建。

## 迁移进度

当前 editor 内置公共模块累计 41 个积木：`actuator 9 + xarm 12 + display 11 + communication 9`。

- 按当前七款内置产品的旧兼容矩阵统计，动力、机械臂、输出和通信模块已完成本地可测试闭环；该口径本轮后基本收尾。
- 按旧公共模块四个源目录的全部启用 opcode 统计，共约 221 个，当前完成 41 个，约剩 180 个；剩余大多属于尚未迁移的 `aiblocksboard` 等主控分支。
- 继续按每轮约 10 个积木推进，旧公共模块全量约还需 18 轮。开始下一批前应先确定要新增支持的主控产品，避免把不兼容积木直接开放给现有七款产品。

## 人工验收建议

1. 重新构建 scratch-blocks 和 desktop 后，加载任一大型 AI 机甲并添加“点阵屏”。
2. 确认工具箱显示 6 个点阵积木，绘制积木的圆角内有 16×8 缩略图。
3. 点击缩略图，确认出现遮罩弹框、大点阵、10 个内置图案和保存/删除/播放按钮。
4. 只点亮第一列 8 个灯，确认代码为 `0xff` 加 15 个 `0x0`。
5. 切换 AiDoggy，确认端口只有 C/D/E/F，且添加点阵屏时不显示 RGB 积木。
