# 2026-07-15 串口上传代码静态审查

> 后续状态：2026-07-17 已取得产品测试结果，并按 MicroPython Raw REPL 实现 `main.py` 写入、设备端字节数校验和软复位。当前实现见 [串口硬件输出、控制台拖拽与 Raw REPL 上传执行记录](./2026-07-17-serial-output-and-console-resize-progress.md)。下文保留当时静态审查结论，用于追溯问题来源。

> 审查类型：代码静态 Review
> 当前决策：记录问题，暂不修改代码；取得目标产品、固件和上传协议后再进入实现与真机测试。
> 关联总进度：[阶段 G：串口和上传代码](./project-progress-and-commercial-gap.md#阶段-g串口和上传代码)

## 审查结论

当前链路可以验证 Electron Web Serial 的端口授权、打开和文本写入，但还不能作为正式的“上传程序”功能。

目前 Upload 的实际语义是把完整 Python 文本加一个换行后写入串口。浏览器的 `writer.write()` 成功只能说明数据交给了串口流，不代表设备已经接收、校验、保存为 `main.py`、执行或烧录成功。

本轮不直接修改代码，原因是正确实现依赖目标产品的真实协议。没有产品、固件行为和协议资料时提前实现 MicroPython REPL、文件复制或 bootloader 中任意一种路线，都可能形成错误抽象和无效兼容代码。

## 审查文件

| 文件 | 当前职责 | Review 结论 |
| - | - | - |
| `packages/scratch-gui/src/components/menu-bar/python-menu-bar.jsx` | 串口列表状态、授权、连接、断开和 Python 文本写入 | MVP 主链路已存在；端口选择、异常复位、超时和协议语义需要后续修改 |
| `packages/scratch-gui/src/reducers/python-coding.js` | 保存端口、波特率、连接和 busy 状态 | 状态字段足够支撑 MVP，但没有设备身份、上传阶段、进度和错误恢复状态 |
| `desktop/preload.js` | 转发主进程给出的候选串口列表 | 暴露范围较小；当前没有选择指定端口或上传协议 IPC |
| `desktop/main.js` | Web Serial 权限、候选端口事件和 Electron tab 生命周期 | 当前自动选择第一个候选端口；权限边界需要在产品化时收紧 |

## 已确认问题

### P1：Upload 不是正式上传协议

位置：`python-menu-bar.jsx` 的 `handleSerialUpload`。

当前行为：

```text
pythonCode
  -> UTF-8 编码
  -> 末尾增加换行
  -> writer.write(bytes)
  -> 立即显示 Uploaded
```

缺少：

- 设备握手和型号/固件识别。
- 中断当前程序、进入 REPL/bootloader 或文件接收模式。
- 文件名、文件长度、分包序号和结束标记。
- checksum、设备 ACK 和失败重试。
- 保存为 `main.py` 或厂商指定文件。
- 上传后运行、复位和结果确认。

风险：界面显示 Uploaded，但设备可能只是收到一段普通文本，甚至完全忽略或按错误命令执行。

### P1：下拉框选择不决定实际连接端口

位置：`python-menu-bar.jsx` 的 `handleSerialPortChange/handleSerialConnect`，以及 `desktop/main.js` 的 `select-serial-port` 处理器。

当前下拉框只更新 Renderer 状态。Connect 会再次调用 `requestPort()`，主进程随后固定对候选列表执行 `callback(ports[0].portId)`。

风险：用户在界面选择一个端口，实际打开的可能仍是候选列表第一项。多串口环境下可能连接或写入错误设备。

### P1：关闭或拔出设备后连接状态可能失真

位置：`python-menu-bar.jsx` 的 `handleSerialDisconnect/handleSerialUpload`。

当前断开流程会先清空 `serialPortRef`，再等待 `port.close()`，只有 close 成功后才把 Redux 的 `serialConnected` 设为 false。close 抛错时可能出现“引用已丢失、界面仍显示已连接”的状态。

当前也没有监听 `navigator.serial` 的 `disconnect` 事件。USB 拔出后，连接按钮状态不会及时复位；后续写入失败也只打印错误，不会统一清理连接状态。

### P2：写入没有超时、取消、进度和 ACK

位置：`python-menu-bar.jsx` 的 `await writer.write(bytes)`。

如果驱动或设备阻塞，`serialBusy` 可能长时间保持 true，所有串口按钮都被禁用。当前没有超时、取消、分包进度、设备响应等待和重试策略。

### P2：设备权限范围需要收紧

位置：`desktop/main.js` 的 `setPermissionCheckHandler/setDevicePermissionHandler`。

当前 device permission handler 对所有 `deviceType === 'serial'` 返回 true，没有同时校验允许来源、编辑器 WebContents 和 frame。产品化时应把权限检查统一限制到受信任编辑器页面。

### P2：没有串口链路自动化测试

当前没有测试覆盖：

- 下拉端口和实际打开端口一致。
- requestPort/open/write/close 失败后的状态复位。
- writer lock 始终释放。
- USB disconnect 事件。
- 超时与取消。
- 重复连接、重复上传和标签页关闭。
- 设备 ACK、分包和 checksum。

## 当前正确部分

- `requestPort()` 由用户点击触发，符合 Web Serial 用户手势要求。
- 串口 writer 在 `finally` 中执行 `releaseLock()`。
- 串口操作统一使用 `serialBusy` 避免用户并发点击。
- 异常会写入 Python 控制台，不会直接造成页面白屏。
- preload 没有暴露任意脚本执行或系统命令能力。

## 延后修改的前置条件

取得产品测试时，需要先收集下面信息，再决定实现路线：

1. 产品型号、主控芯片、固件名称和固件版本。
2. USB 串口芯片、VID、PID、Windows 端口名和驱动要求。
3. 波特率、dataBits、stopBits、parity 和 flowControl。
4. 设备上电、复位、进入下载模式和退出下载模式的方法。
5. 上传协议属于普通 REPL、MicroPython raw REPL、文件系统复制、厂商工具还是自定义 bootloader。
6. 目标文件名、保存目录、最大文件大小和单包大小。
7. 握手命令、响应格式、ACK/NACK、checksum 和重试规则。
8. 上传后是否自动运行、软复位、硬复位或等待用户启动。
9. 设备回传日志的编码、行结束符和错误码定义。
10. 一台电脑连接多个产品时，如何稳定识别用户选择的目标设备。

## 后续修改顺序

取得产品和协议后按下面顺序处理：

1. 先写串口 API mock 测试，复现端口选择和异常状态问题。
2. 修复“用户选择端口”和“实际 requestPort 返回端口”的一致性。
3. 增加 disconnect 监听和统一连接状态清理。
4. 抽出设备上传协议接口，避免把协议继续写在菜单组件中。
5. 实现握手、分包、超时、取消、ACK、checksum 和进度。
6. 收紧 Electron 串口权限边界。
7. 使用真实产品完成正常、拔线、占用、传输中断、错误固件和多串口测试。

## 产品到位后的验收重点

```text
界面选择端口 A -> 实际只能打开端口 A
上传前识别到正确产品和固件
设备拒绝握手 -> 不发送正文、不显示成功
传输中拔线 -> 取消上传、释放 writer、恢复断开状态
传输超时 -> 可取消或重试，按钮恢复
checksum/ACK 失败 -> 明确失败，不显示 Uploaded
上传成功 -> 设备中存在目标文件或固件，并按协议运行
关闭标签页 -> 串口被释放，新标签不继承连接状态
```

## 本轮验证边界

本轮只完成静态代码审查，没有连接真实产品，没有执行串口写入，也没有修改业务代码。结论应在取得产品后通过真机测试再次确认。
