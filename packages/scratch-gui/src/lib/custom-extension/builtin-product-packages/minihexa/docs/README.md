# miniHexa 拓展包

本目录保存从旧 VM `src/extensions/minihexa/index.js` 提取的 miniHexa 声明式积木配置。

## 当前状态

- `manifest.json` 保存产品信息和旧扩展菜单。
- `blocks.json` 保存旧 VM `getInfo()` 中启用的积木、参数和分栏。
- `generator/python.json` 保存旧 `python-generator (1).js` 中 39 个 opcode 的 Python 生成规则。
- 姿态、移动和转向积木通过 `templateSelector` 按菜单值生成旧版坐标向量。
- 主程序、启动程序和按键事件按旧生成器 `finish()` 后的最终结构生成，不保留中间装饰器代码。
- 本包已注册为内置产品，离线时使用软件自带的 `0.1.1` 配置。

发布远程版本前仍需人工对照旧软件生成代码，并使用 miniHexa 真机验证主程序、动作、按键、IMU 和串口功能。
