# AiDoggy 产品积木包

> 验收状态：未完成人工校对和真机验证，暂不可发布到远程产品仓库。

本目录保存从旧 VM `src/extensions/aidoggy/index.js` 提取的 AiDoggy 声明式积木配置。

- `manifest.json`：产品信息和积木菜单。
- `blocks.json`：17 个启用积木及分栏、参数和中文文案。
- `generator/python.json`：旧 Python 生成器对应的代码模板、入口和初始化变量。

旧源码中已注释的蜂鸣器音量、关闭蜂鸣器和 XY 移动积木不属于当前迁移范围。人工验收应重点对比运动方向、左右转、动作组阻塞模式和主程序最终 Python 文本。
