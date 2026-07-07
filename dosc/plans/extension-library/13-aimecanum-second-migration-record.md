# AI机甲麦轮车第二批迁移记录

> 日期：2026-07-07
> 范围：继续迁移旧版 `aimecanum` 正式展示过的剩余核心积木。

## 本轮完成

- 将内置 `AI机甲麦轮车` manifest 文案恢复为正常中文，版本提升到 `0.2.1`。
- 补齐 `start_run_thread`，对应旧版“当启动时”帽子积木。
- 补齐 `when_key_click_thread`、`when_key_longclick_thread`，对应 A/B 按键短按、长按事件帽子。
- 保留并整理旧版正式启用的主要分组：板载资源、RGB彩灯、输出打印、按键、运动控制、IMU传感器、六路巡线传感器、超声波传感器、蓝牙通信。
- 扩展 Python codegen manifest 字段，新增 `entryTemplate` / `entryFooter`，用于生成按键事件回调函数和 `buttonA.Clicked(...)` 注册语句。
- 自定义 `.sbext` / `.zip` 拓展包的 `generator/python.json` 也支持 `entryTemplate` / `entryFooter`，后续产品包可以复用。
- 增加 VM 单测，覆盖事件帽子不会额外生成 `Hiwonder.startMain(...)` 的场景。

## 暂不迁移

- 旧版 `index.js` 中已注释的 `serial_*` 串口积木。
- 旧 Python 生成器里存在但旧扩展 blocks 清单没有正式展示的残留函数，例如 `move_rotate`、`get_euler_angle`、`get_servo_run_angle`、`reset_run_angle`。

## 人工验证

1. 运行 `npm run desktop`，进入 Python 编码模式。
2. 打开拓展页面，加载 `AI机甲麦轮车`。
3. 回到积木区，确认顶部有 `主程序`、`当启动时`，按键分组里有短按、长按和“按键被按下”。
4. 拖入 `当 A 键短按时`，下面接一个输出打印或蜂鸣器积木。
5. 右侧 Python 代码应出现类似：

```python
import Hiwonder
import Hiwonder_DEV
import time

# initialize variables
buttonA = Hiwonder.Button('A')

def on_buttonA_clicked():
    print("pressed")

buttonA.Clicked(on_buttonA_clicked)
```

6. 再拖入普通 `主程序`，确认仍生成 `Hiwonder.startMain(start_main)`；多主程序时应继续生成 `start_main1` 等稳定入口名。

## TODO

- 六路巡线传感器的第二个积木 `linefollower6_status` 目前仍是临时下拉方案，只能选择 `000000`、`000001` 等固定状态。
- 旧版使用的是定制 `ArgumentType.LINE6` / `line6` 输入控件，可以直接在积木上编辑六路探头状态；当前新版还没有迁移这个 scratch-blocks 自定义字段。
- 后续需要迁移或重做 `line6` 自定义输入控件，并把 `linefollower6_status` 从临时下拉改回可视化六路状态选择器。
