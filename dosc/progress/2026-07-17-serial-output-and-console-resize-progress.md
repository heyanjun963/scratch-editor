# 2026-07-17 串口硬件输出、控制台拖拽与 Raw REPL 上传执行记录

> 本轮目标：参考旧工程串口接收和 CoreX 上传逻辑，让新工程显示硬件输出、支持控制台拖拽，并通过 MicroPython Raw REPL 真实写入和校验 `main.py`。

## 架构结论

旧工程的硬件输出逻辑确实在 Electron 主进程目录：

```text
D:\qq download\main\handle.js
  -> open-port / close-port / write-port
  -> D:\qq download\main\serial.js
  -> Delimiter 按换行解析串口数据
  -> 20ms 批量发送 spDataShow IPC
  -> 渲染层控制台
```

新工程当前使用 Chromium Web Serial。端口由 `python-menu-bar.jsx` 中的 `navigator.serial` 打开并持有，Electron 主进程只处理权限和候选端口，不使用 Node `serialport`。

本轮保留新工程架构，没有直接复制旧工程的 `serialport` 原生模块。直接迁移会引入 Electron ABI、native rebuild 和安装包打包风险。迁移的是已经验证的业务规则：

- 数据块需要跨块拼接成完整文本行。
- 高频输出按 20ms 批量刷新，避免每个字节触发 React/Redux 更新。
- 流结束时刷新没有换行的尾部文本。
- 断开前取消 reader 并释放 readable lock，再关闭端口。
- 设备拔出或可读流结束后恢复断开状态。

## 当前链路

```text
用户点击 Connect
  -> scratchDesktopSerial.select(portId)
  -> 主进程在本次候选列表中匹配该 portId
  -> navigator.serial.requestPort()
  -> port.open({baudRate})
  -> startSerialOutputMonitor(port)
  -> port.readable.getReader()
  -> TextDecoder 解码并跨块拼行
  -> 20ms 批量调用 onWriteConsoleLine
  -> Redux 轻量历史
  -> PythonCodingPanel
  -> xterm 显示硬件输出
```

主动断开流程：

```text
清空当前 monitor 引用
  -> reader.cancel()
  -> reader.releaseLock()
  -> port.close()
  -> serialConnected = false
```

## main.py 上传链路

原实现仅执行 `writer.write(pythonCode)`，writer 成功后立即显示 Uploaded。产品实测证明设备内的 `main.py` 没有变化，因此该提示属于虚假成功。

当前上传流程改为：

```text
普通日志 reader 临时切换为协议模式
  -> Ctrl+B 退出上次失败可能遗留的 Raw REPL，但不等待 >>>
  -> Ctrl+C 两次中断当前程序
  -> 等待并清空中断响应
  -> Ctrl+A 直接进入 Raw REPL，不依赖固件返回友好 REPL 的 >>>
  -> 校验设备返回 raw REPL banner 和 > 提示符
  -> 打开 main.py 为 wb
  -> 256 字节分块写入
  -> 每条命令检查 OK、stdout 和 stderr
  -> flush 并关闭文件
  -> os.stat('main.py')[6] 校验设备端字节数
  -> Ctrl+B 退出 Raw REPL
  -> Ctrl+D 软复位并执行新的 main.py
  -> reader 恢复普通日志模式
```

任何命令拒绝、stderr、超时或字节数不一致都会显示失败。只有设备端校验通过才显示 `Wrote and verified main.py`。连接完成后也会发送 Ctrl+C/Ctrl+D 软复位序列，让 boot.py/main.py 的新启动输出进入控制台。

真机曾稳定停在 `raw REPL; CTRL-B to exit` 和单个 `>` 提示符，但不会在上传准备阶段返回 `>>>`。强制等待友好 REPL 会让上传在写文件前超时；当前入口先用 Ctrl+B 清理遗留状态，再按旧版硬件协议“中断后直接 Ctrl+A”，对应单元测试也明确覆盖不返回 `>>>` 的固件。

后续真机又出现“设备返回: `>`”。原因不是设备只支持简化提示符，而是 Ctrl+C 产生的迟到 `>>>` 被通用的 `readUntil('>')` 在第一个字符处提前截断。当前改为先等待完整 `raw REPL` 特征文本，再等待其后的 `>`；仍保留旧版的入口验证，但不会把友好 REPL 残留误判为 Raw REPL 响应。

## 控制台高度调节

代码区与控制台之间新增水平分隔条：

- 鼠标上下拖拽改变控制台像素高度。
- 控制台至少保留 120px。
- Python 代码区至少保留 160px。
- 分隔条聚焦后可用方向键上、下调整，每次 16px。
- xterm 已有 `ResizeObserver`，面板尺寸变化后会自动 `fit()` 并同步 PTY 行列数。

## 变更文件

| 文件 | 职责 | 结论 |
| - | - | - |
| `src/lib/serial-output-monitor.js` | Web Serial 字节解码、跨块拼行、20ms 批量输出和 reader 清理 | 对应旧 `serial.js` 的普通硬件输出链路 |
| `src/lib/serial-repl-uploader.js` | Raw REPL 命令、分块文件写入、字节数校验和软复位 | 只有设备端校验通过才返回成功 |
| `src/components/menu-bar/python-menu-bar.jsx` | 连接后启动输出监视器，主动断开和页面卸载时释放串口 | 硬件输出进入现有 Python 控制台 |
| `desktop/serial-port-selection.js` | 在 Electron 本次候选列表中匹配用户选择的 portId | 找不到请求项时才回退第一个候选 |
| `desktop/main.js`、`desktop/preload.js` | 保存每个编辑器页签的串口选择并暴露白名单 IPC | 下拉框选择决定实际 requestPort 结果 |
| `src/components/python-coding-panel/python-coding-panel.jsx` | 控制台分隔条、拖拽状态、上下限和键盘调节 | 不改变 Run/Stop/Clear 行为 |
| `src/components/python-coding-panel/python-coding-panel.css` | 独立控制台面板和拖拽条视觉 | 默认控制台占 35% 高度 |
| `src/containers/python-coding-panel.jsx` | 把 Redux 轻量历史增量写入 xterm | 历史裁剪到 200 行后不会重复写入保留内容 |
| `webpack.config.js` | 保留 xterm 官方 CSS 的全局类名 | viewport、screen、辅助输入框和滚动样式能匹配运行时 DOM |
| `serial-output-monitor.test.js` | 数据块拼行、尾部刷新和 reader 取消测试 | 覆盖串口读取核心边界 |
| `serial-repl-uploader.test.js` | Raw REPL 写文件、校验、命令拒绝和软复位测试 | 覆盖真实上传成功/失败语义 |
| `python-menu-bar.test.jsx` | 连接、硬件输出、断开释放顺序测试 | 覆盖菜单到控制台的集成链路 |
| `serial-port-selection.test.js` | 首选端口匹配和安全回退测试 | 覆盖非第一候选端口连接 |
| `python-coding-panel.test.jsx` | 拖拽高度和代码区/控制台最小空间测试 | 覆盖布局约束 |

## 自动验证

```text
npx jest test/unit/lib/serial-output-monitor.test.js \
  test/unit/lib/serial-repl-uploader.test.js \
  test/unit/components/python-coding-panel.test.jsx \
  test/unit/components/python-menu-bar.test.jsx \
  test/unit/desktop/serial-port-selection.test.js --runInBand

5 suites / 16 tests 通过
```

测试仍会输出仓库已有的重复 Jest mock、过期 Browserslist、ts-jest 配置和 React `defaultProps` 警告，不属于本轮新增失败。

Playwright 在 `1440x900` 页面实测中识别到一个水平分隔条；向上拖动 100px 后，控制台高度从约 298px 变为 399px，代码区和控制台没有重叠。

首次只移除终端外层冲突高度后，外层测量看似保留了 8px padding，但真机输出仍显示最后一行被裁剪。进一步检查发现 xterm 官方 CSS 被 CSS Modules 改写，运行时固定类名没有匹配到样式：旧页面 `.xterm-viewport` 高度为 0，最后一行底边超出 host 约 46.8px。

当前已将 xterm 官方 CSS 加入全局样式例外。新页面 `.xterm-viewport` 恢复绝对定位并填满 host，最后一行完整位于 host 内，底部剩余约 7.2px；隐藏输入框、滚动层和 screen 定位也同时恢复。

真机人工复测仍发现最底行贴边并被截断。代码检查确认 FitAddon 只会从行数计算中扣除 `.xterm` 自身的 padding，外层黑色容器的 padding 不属于它的计算输入。当前把 8px 底部安全区直接设置到 `.xterm`，确保 FitAddon 计算 rows 时主动预留该空间；最终显示效果交由真机人工验收。

## 2026-07-20 可维护性补充

上一轮新增的生产代码已补齐中文函数职责说明，覆盖串口候选选择、普通输出缓冲、协议模式切换、Raw REPL 命令与文件校验、控制台拖拽、xterm 写入和 Redux 状态映射。此次只增加注释，不改变运行逻辑；原有 5 个聚焦测试套件共 16 项继续通过。

## 人工真机验收

1. 启动桌面端并进入 Python 编码模式。
2. 插入目标硬件，选择正确波特率后点击 **Connect**。
3. 确认连接后设备软复位，控制台显示固件版本、boot.py/main.py 等启动日志。
4. 生成容易识别的新代码并点击 **Upload**，确认先显示 Uploading，校验后才显示 Wrote and verified。
5. 用另一款设备文件工具打开产品，确认 `main.py` 内容与本次生成代码一致。
6. 确认设备软复位后执行新的 `main.py`，而不是继续运行旧代码。
7. 让硬件连续输出多行日志，确认控制台实时显示，中文和英文不乱码。
8. 高频输出持续一分钟，确认界面仍可操作、控制台能滚动。
9. 拖动 Console 上方分隔条，确认代码区和控制台同步变化，终端内容不消失。
10. 点击 **Disconnect**，确认按钮恢复且串口能被其他软件立即打开。
11. 再次连接后直接拔出 USB，确认界面恢复断开状态并且不白屏。
12. 连接后关闭当前标签页，确认串口释放，新标签页可以重新连接。

## 仍未解决

- 下拉框选择已决定主进程候选端口，仍需真机多串口验证不同驱动返回的 portId 稳定性。
- 当前协议按 AI 机甲产品的 MicroPython Raw REPL 实现，尚未按设备型号和固件版本选择协议。
- 不依赖 `>>>` 的 Raw REPL 入口已经自动测试通过，仍需在当前产品真机确认能继续收到 `OK` 并完成 `main.py` 校验。
- 已有 Raw REPL ACK、分块和设备端文件大小校验，但尚无取消按钮、重试 UI 和可视化进度。
- 较大代码、中文代码、传输中拔线和设备存储空间不足需要真机回归。
- 没有使用 `navigator.serial` 全局 disconnect 事件；当前依赖 readable 流结束恢复状态，需要真机确认不同驱动行为。
- Electron 串口权限和设备授权边界仍需产品化收紧。

当前成功标准是 Raw REPL 命令通过且设备端 `main.py` 字节数一致。下一步真机验收还要确认文件内容和实际执行结果，不能只看界面提示。
