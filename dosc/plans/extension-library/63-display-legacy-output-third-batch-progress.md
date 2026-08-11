# 输出模块旧外设第三批迁移记录

> 当前状态：MP3 5 个、RGB 灯带 3 个、黑/白风扇共用控制 1 个积木已加入 `display 1.3.0` editor 内置包，本轮共迁移 9 个积木。

## 本轮范围

| 分类 | 积木数 | 主要能力 |
| - | -: | - |
| MP3 模块 | 5 | 初始化、按编号播放、播放控制、循环模式、音量 |
| RGB 灯带 | 3 | 数值颜色、颜色选择、单灯或全部关闭 |
| 风扇模块 | 1 | 黑色与白色风扇共用端口转速控制 |

旧 VM 的 `fan` 与 `fan_w` 使用同一个 `fan_module_speed` opcode 和同一套 Python 生成规则，因此内置包使用旧版主分类 ID `fan` 并只保留一份积木，避免同一 opcode 重复注册。

## 旧版依据与兼容边界

| 内容 | 来源 |
| - | - |
| 积木、参数和菜单 | `D:\qq download\scratch-vm\scratch-vm\src\extensions\display\index.js` |
| Python 生成规则 | `D:\google download\python-generator (1).js` |
| 模块兼容矩阵 | `D:\Program Files (x86)\WonderLab\resources\build\lib.min.js.map` |

旧版 `displayClassification` 对 `mp3`、`rgb_light`、`fan` 和 `fan_w` 的 `support` 均为空。当前七款内置产品不开放本轮三个模块卡片；积木先进入 editor 内置 `display` 包，为后续迁移控制器产品保留完整实现，不擅自扩大硬件兼容范围。

## 生成规则

MP3 保持旧对象名和接口：

```python
from Hiwonder import MP3
mp3 = Hiwonder.MP3(Hiwonder.Port(4))
mp3.play(7)
mp3.next()
mp3.loop_on()
mp3.volume(20)
```

RGB 灯带按端口复用对象，“全部”与单灯由固定菜单值选择模板。颜色选择在生成阶段直接展开十六进制通道：

```python
myrgb_8 = Hiwonder.Neopixel(Hiwonder.Port(8),15)
myrgb_8.setItem(2,0xff,0x99,0x66)
myrgb_8.write()
```

风扇保持旧接口：

```python
import Hiwonder_Fan
fan_6 = Hiwonder_Fan.Fan(Hiwonder.Port(6))
fan_6.set_speed(80)
```

## 文件职责与评审结论

| 文件 | 职责 | 结论 |
| - | - | - |
| `display-package/config.json` | 版本、分类和固定菜单模板选择规则 | 3 个分类、9 个 opcode 完整 |
| `display-package/python/main.ts` | Mind+ 作者源与 Python 生成规则 | 对象初始化、分支调用和去重规则一致 |
| `display-package/python/_menus/index.json` | MP3、RGB 灯带和风扇菜单 | 旧菜单值保持不变 |
| `display-1.3.0.mpext`、`display.json`、`index.json` | editor 内置包、manifest 和 SHA256 索引 | 29 个积木、7 个分类，包与索引一致 |
| `display-codegen.test.js` | 分类、菜单、兼容边界和代码生成 | 覆盖本轮 9 个 opcode 和 RGB 十六进制输出 |

## 验证与进度

- `display-codegen.test.js`：5/5 通过。
- 内置快照、Mind+ 包读取、产品模块支持测试与本轮一起执行。
- editor 内置四个公共模块累计 59 个积木：`actuator 9 + xarm 12 + display 29 + communication 9`。
- 按旧四个公共模块目录约 221 个启用 opcode 估算，约剩 162 个；按每轮约 10 个，理论还需约 16～17 轮。

## 人工验收建议

当前七款产品按旧兼容矩阵不会显示本轮三个模块卡片。迁移控制器产品后再人工检查：MP3 下拉菜单、RGB 单灯/全部分支、颜色十六进制输出，以及黑/白风扇共用控制积木。
