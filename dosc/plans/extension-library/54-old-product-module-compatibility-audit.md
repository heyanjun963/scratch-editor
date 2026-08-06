# 旧产品模块兼容矩阵复核记录

> 当前状态：七款内置产品的模块支持关系已按 WonderLab 实际发布代码重新核对，不再根据新版迁移批次推测硬件兼容性。

## 旧版依据

旧版安装目录：

```text
D:\Program Files (x86)\WonderLab\resources\app.asar
```

从 `build/lib.min.js.map` 还原的 `src/components/library/data.js` 是本轮唯一兼容性依据。旧版分别通过
`sensorClassification`、`actuatorClassification`、`displayClassification` 和
`communicationClassification` 声明每个模块支持的产品，再由 `sensorClass` 决定实际展示的模块。

因此，模块是否已经迁移、是否已经发布和硬件是否支持是三个独立状态。旧版未进入 `sensorClass` 的
`ultrasonic` 不属于可添加的共享模块，即使产品自身带有超声波功能，也不能据此开放该模块卡片。

## ID 映射

| 旧版模块 ID | 新版卡片 | 说明 |
| - | - | - |
| `linefollow` / `linefollow4` / `linefollow6` | `line-4` / `line-4-rotary` / `line-6` | 两类四路与六路巡线 |
| `avoid_obstacle` / `acceleration` / `key` | `infrared-sensor` / `imu-sensor` / `button-module` | 输入模块名称调整 |
| `wondercam` / `aitv` / `wonderecho` / `k230` | `wonder-lens` / `wonder-mind` / `wonder-echo` / `k230-vision` | 视觉和语音模块名称调整 |
| `busservo` / `iicpwm` | `actuator:bus-servo` / `actuator:iic-pwm` | 动力模块卡片 |
| `aimech_arm` / `aimech_3dof_arm` / `aimech_rod_arm` | `xarm:xarm` / `xarm:xarm-series` / `xarm:xarm-linkage` | 三类机械臂卡片 |
| `fan_iic` / `dot_screen` / `rgb_module` | `actuator:fan` / `display:dot-matrix` / `display:rgb-module` | `fan` 当前由 actuator 包提供 |
| `ps3` | `communication:communication` | 当前通信卡片承接旧版 PS3 通信模块入口 |

## 复核结果

| 产品 | 输入 | 动力 | 输出 | 通信 | 合计 |
| - | -: | -: | -: | -: | -: |
| AI机甲双驱车 | 19 | 5 | 3 | 1 | 28 |
| AI机甲麦轮车 | 19 | 4 | 3 | 1 | 27 |
| AI机甲四足机器人 | 19 | 4 | 3 | 1 | 27 |
| AI机甲四足竞赛版 | 19 | 4 | 3 | 1 | 27 |
| AI机甲六足机器人 | 19 | 4 | 3 | 1 | 27 |
| miniHexa | 4 | 0 | 0 | 0 | 4 |
| AiDoggy | 2 | 4 | 2 | 1 | 9 |

AI机甲四足机器人此前遗漏了总线舵机、IIC 转 PWM、串联机械臂、连杆机械臂、风扇、点阵屏、RGB
模块和通信模块，共 8 张现有卡片。AI机甲双驱车额外支持基础机械臂；其他四款大型 AI 机甲不支持该卡片。

同时修正以下旧推断：

- 五款大型 AI 机甲不开放共享 `ultrasonic` 卡片。
- AI机甲麦轮车旧版支持六路巡线，新版恢复该支持关系。
- miniHexa 支持红外检测、LED 超声波、WonderEcho 和 WonderLens，不支持共享 `ultrasonic`。
- AiDoggy 支持温湿度、LED 超声波、总线舵机、IIC 转 PWM、两类机械臂、风扇、点阵屏和通信模块。

## 变更与验证

| 文件 | 作用 | Review 结论 |
| - | - | - |
| `product-extension-catalog.js` | 保存每款产品按扩展包分组的支持卡片 | 与旧版四张 classification 表一致 |
| `product-module-support.test.js` | 锁定七款产品完整矩阵和关键正反例 | 覆盖四足遗漏项及 miniHexa、AiDoggy 修正 |
| `product-extension-library.test.jsx` | 校验“待发布”和“不支持”文案 | 使用真正不支持的 180° 舵机作为反例 |

聚焦测试结果：2 个 suite、18 个测试通过。ESLint 仍因本机缺失 `unrs-resolver` 原生可选依赖无法启动，
未执行依赖安装。
