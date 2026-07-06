# AI 机甲麦轮车拓展包示例

这个示例包从 `D:\google download\python-generator.js` 里挑选 `aimecanum_*` 相关 Python 生成语法迁移而来。

## 已迁移的旧引擎语法

| 新积木 opcode | 参考旧函数 | 生成语法 |
| - | - | - |
| `when_start` | 旧版“当启动时”帽子积木 | 下面的积木生成到 `def start_main()` 前 |
| `main` | 旧版“主程序”帽子积木 | 下面的积木生成到 `def start_main()` 里 |
| `move_dir` | `aimecanum_move_oriention` | `mecanumCar.move_dir(direction, speed)` |
| `move_distance` | `aimecanum_move_distance` | `mecanumCar.move_distance(distance, direction, speed)` |
| `turn_speed` | `aimecanum_turn_speed` | `mecanumCar.rotate_speed(direction * speed)` |
| `stop` | `aimecanum_move_stop` | `mecanumCar.stop()` |
| `set_motor_speeds` | `aimecanum_set_motor_speed_all` | `mecanumCar.set_motors_speed(speed4, speed3, speed2, speed1)` |
| `reset_motor` | `aimecanum_reset_motor` | `mecanumCar.reset()` |
| `sonar_distance` | `aimecanum_get_led_ultrasonic_distance` | `mecanumCar.sonar.getDistance()` |
| `sonar_set_rgb` | `aimecanum_set_led_ultrasonic_color_arg` | `mecanumCar.sonar.setRGB(num, red, green, blue)` |
| `line_status` | `aimecanum_linefollower6_one_status` | `getattr(mecanumCar, sensor).get_result_data()` |
| `line_offset` | `aimecanum_linefollower6_read_offset` | `getattr(mecanumCar, sensor).read_offset()` |
| `battery` | `aimecanum_get_battery_level` | `Hiwonder.Battery_power()` |
| `buzzer_tone` | `aimecanum_buzzer_tone_set_arg` | `beep.playTone(tone, rhythm, mode)` |
| `buzzer_close` | `aimecanum_close_buzzer` | `beep.onoff(False)` |
| `disable_lowpower_alarm` | `aimecanum_disable_lowPower_alarm` | `Hiwonder.disableLowPowerAlarm()` |

## 初始化变量如何生成

旧引擎的 `Blockly.Python.addVariable()` 会把对象初始化代码提升到全局区，并且只生成一次。

当前新版模板用 `variables` 字段表达同一件事。例如运动积木会声明：

```python
mecanumCar = Hiwonder_DEV.DEV_MecanumCar( )
```

蜂鸣器积木会声明：

```python
beep = Hiwonder.Buzzer()
```

生成器会把这些变量统一放到主函数之前的 `# initialize variables` 区域。

## 主函数如何启动

`generator/python.json` 顶层声明：

```json
{
  "launcher": "Hiwonder.startMain({MAIN})"
}
```

`{MAIN}` 会替换成实际主函数名。因此第一个主程序最后会生成：

```python
Hiwonder.startMain(start_main)
```

如果有第二个主程序，会继续生成：

```python
def start_main1():
    ...

Hiwonder.startMain(start_main1)
```

`主程序` 帽子积木会生成：

```python
def start_main():
    global beep
    global mecanumCar
    ...
```

## 测试方式

1. 把本目录内容压缩成 zip。
2. 可选：把 zip 后缀改成 `.sbext`。
3. 在 Python 模式打开 **Manage Libraries**。
4. 导入压缩包。
5. 在扩展库中添加 **AI 机甲麦轮车**。
6. 拖拽“当启动时”“主程序”和硬件积木，查看右侧 Python 代码。

## 当前限制

- 方向、模式等旧下拉字段目前先用数字/字符串输入代替。
- 生成代码依赖真实硬件环境里的 `Hiwonder`、`Hiwonder_DEV`。
- 包内 `libraries/aimecanum_notes.py` 只是随包文件示例，当前生成代码不会 import 它。
