# 传感器拓展迁移暂停 TODO

> 当前状态：从 `sensor 1.21.0` 起暂停继续迁移传感器拓展；已完成内容保留在 editor 内置包中，未完成模块不得标记为全面迁移。

## 未完成模块

| 模块 | 旧版当前产品可用 opcode | 已迁移 | 剩余 TODO | 旧版明确支持产品 |
| - | -: | -: | -: | - |
| WonderLens | 54 | 10 | 44 | aimech、aimecanum、aiquadruped、aiquadrupedpro、aihexa、minihexa |
| WonderMind | 20 | 0 | 20 | aimech、aimecanum、aiquadruped、aiquadrupedpro、aihexa |

合计剩余 64 个唯一 opcode，旧 Python generator 均有对应实现。按每轮约 10 个估算，恢复迁移后约需 7 轮。

## 统计边界

- 只统计旧版明确支持当前七款内置产品的积木。
- 排除 `aiblocks_wondercamInitI2c` 和 `aitv_aiblocksboard_init` 两个 AIBlocksBoard 专用初始化积木。
- WonderLens 首批 10 个保留为部分可验收分类，不代表其余识别能力已经迁移。
- AiDoggy 不支持 WonderLens 和 WonderMind，不应显示为可添加模块。

## 恢复迁移建议

恢复时先完成 WonderLens 剩余 44 个识别积木，再迁移 WonderMind 20 个积木。每批继续核对旧 VM 的产品分支、菜单值和旧 Python generator 输出，并优先保证 editor 内置包可本地验收。
