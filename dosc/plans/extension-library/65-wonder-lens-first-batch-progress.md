# WonderLens 首批迁移记录

> 当前状态：WonderLens 初始化、功能控制和人脸检测首批 10 个积木已加入 `sensor 1.21.0` editor 内置包，可直接由旧版明确支持的当前产品进行本地验收；其余迁移现已暂停。

## 暂停 TODO

- WonderLens 旧版共有 54 个适用于当前产品的唯一 opcode，本轮完成 10 个，剩余 44 个。
- 剩余积木适用于五款大型 AI 机甲和 miniHexa，不开放给 AiDoggy。
- 当前分类属于部分迁移状态，不得据此判定 WonderLens 已全面迁移。
- 恢复迁移时继续从 `isAnyLearnedFaceRec` 开始核对，旧 Python generator 中剩余 44 个 opcode 均有对应实现。

## 本轮范围

| 能力 | 新增积木数 | 主要内容 |
| - | -: | - |
| 产品初始化 | 2 | 五款大型 AI 机甲指定 IIC 接口初始化；miniHexa 使用板载 IIC 初始化 |
| 功能与 LED 控制 | 6 | 固件版本、功能常量、当前功能、功能切换、LED、结果更新 |
| 人脸检测 | 2 | 是否检测到人脸、检测到的人脸数量 |

首批 opcode 为：

```text
aimech_wondercamInitI2c
minihexa_wondercamInitI2c
getFwVersion
getFuncNumber
getCurrentFunc
switchFunc
setLed
wondercamUpdateResult
isAnyFaceDetected
numOfDetectedFaces
```

## 产品兼容边界

旧版 `wonderCamSensor(boardKit)` 明确区分初始化分支：

- `aimech`、`aimecanum`、`aiquadruped`、`aiquadrupedpro`、`aihexa` 使用带端口的初始化积木。
- `minihexa` 使用无端口初始化积木。
- `aidoggy` 未声明支持 WonderLens，本轮不开放任何 WonderLens 积木。
- `aiblocksboard` 虽有独立初始化分支，但不属于当前七款内置产品，本轮不迁移。

两个初始化 opcode 通过产品级过滤互斥显示，其余 8 个公共积木仅开放给上述六款支持产品。

## Python 生成规则

初始化保持旧版对象名和调用：

```python
# 五款大型 AI 机甲
cam = Hiwonder_DEV.WonderCam(Hiwonder_DEV.Port(PORT))

# miniHexa
cam = Hiwonder_DEV.WonderCam()
```

功能菜单通过 literal dropdown 和 `templateSelector` 映射为 `cam.FaceDetect`、`cam.AprilTag` 等硬件库常量；LED 菜单映射为 `cam.LED_ON` 或 `cam.LED_OFF`。`getFuncNumber` 保持旧生成器边界，仅转换 0～9；`switchFunc` 保持旧生成器完整映射，转换 0～11。

## 文件职责与评审结论

| 文件 | 职责 | 结论 |
| - | - | - |
| `sensor-package/config.json` | WonderLens 分类、产品范围和菜单模板映射 | 六款支持产品与 AiDoggy、AIBlocksBoard 的边界清晰 |
| `sensor-package/python/main.ts` | 首批 10 个作者源函数 | 初始化对象、公共调用和旧 Python 输出一致 |
| `sensor-package/python/_menus/index.json` | 功能与 LED 固定菜单 | 菜单值保持旧版 0～11、1/0 协议值 |
| `sensor-1.21.0.mpext`、`sensor.json`、`index.json` | editor 内置包、manifest 和校验索引 | 187 个积木、19 个分类、55 个菜单，版本与 SHA256 一致 |
| `sensor-codegen.test.js` | 作者源结构、产品过滤和生成代码测试 | 锁定两类初始化、功能常量、LED 与首批人脸结果 |

## 后续范围

WonderLens 仍有已学习/未学习人脸、ID、坐标与置信度等 44 个积木未迁移。传感器拓展迁移恢复后，继续从旧版明确支持当前六款产品的 WonderLens 公共积木中选择，不优先处理仅 AIBlocksBoard 可用的初始化分支。
