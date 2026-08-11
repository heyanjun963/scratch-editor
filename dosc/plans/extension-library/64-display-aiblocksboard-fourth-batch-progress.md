# 输出模块 AIBlocksBoard 第四批迁移记录

> 当前状态：AIBlocksBoard 风扇、点阵屏、数码管和 OLED 初始化共 9 个积木已加入 `display 1.4.0` editor 内置包。

## 本轮范围

| 分类 | 新增积木数 | 主要能力 |
| - | -: | - |
| 点阵屏 | 6 | 亮度、数字、字符串、像素、16×8 位图、清屏 |
| 数码管 | 1 | 整数显示 |
| OLED-12864 | 1 | AIBlocksBoard IIC 初始化，并复用已有 7 个绘图积木 |
| IIC 风扇 | 1 | 端口转速控制，固定旧版设备地址 `0x58` |

## 兼容边界

旧版 `displayClassification` 明确将 `fan_iic`、`dot_screen`、`digit_display` 和 `oled` 标记为支持 `aiblocksboard`。本轮新增 opcode 的 `products` 只包含 `aiblocksboard`；现有 OLED 绘图积木补充该产品标记。当前七款机器人产品不会混入控制器积木。

AIBlocksBoard 产品包尚未迁入当前 editor 产品清单，因此本轮仍以包解析、产品过滤和代码生成为验收基线，等控制器产品迁移后再开放对应模块卡片。

## 代码生成规则

全部设备共享一份 IIC 总线对象，设备对象按端口去重：

```python
import Hiwonder_IIC
iic = Hiwonder_IIC.IIC()
matrix_2 = Hiwonder_IIC.DEV_LEDMatrix(iic,2)
digit_3 = Hiwonder_IIC.DEV_NixieTube(iic,3)
my_oled = Hiwonder_IIC.DEV_OLED(iic,4)
iic_fan_1 = Hiwonder_IIC.DEV_FAN(iic,1,0x58)
```

点阵位图继续使用 16×8 按列转换的 16 个十六进制字节，OLED 绘图调用沿用 `my_oled` 公共接口。

## 文件职责与评审结论

| 文件 | 职责 | 结论 |
| - | - | - |
| `display-package/config.json` | 版本、分类、产品范围和位图参数覆盖 | AI 产品与 AIBlocksBoard opcode 可按产品准确过滤 |
| `display-package/python/main.ts` | 9 个 AIBlocksBoard 作者源函数 | IIC 总线、设备对象和旧 Python 接口一致 |
| `display-1.4.0.mpext`、`display.json`、`index.json` | editor 内置包、manifest 和校验索引 | 38 个积木、8 个分类，SHA256 一致 |
| `display-codegen.test.js` | 产品组合和生成代码测试 | 锁定本轮 9 个 opcode、共享 IIC 对象和十六进制位图 |

## 验证与进度

- display 相关 4 个测试文件共 28/28 通过。
- editor 内置四个公共模块累计 68 个积木：`actuator 9 + xarm 12 + display 38 + communication 9`。
- 按旧四个公共模块目录约 221 个启用 opcode 估算，约剩 153 个；按每轮约 10 个，理论还需约 15～16 轮。

## 后续建议

下一批可迁移 AIBlocksBoard RGB 模块 5 个积木，并补齐输出模块中仍未迁移的 TTS 3 个启用积木，合计约 8 个积木。
