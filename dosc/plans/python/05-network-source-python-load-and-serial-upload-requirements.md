# 网络源选择、Python 文件加载与串口上传优化需求

> 记录日期：2026-08-18
> 当前状态：网络源自动选择、Python 文件加载、串口进度和动态分块已实现；代码测试已通过，未人工检验（暂无测试机器）；Raw-Paste、临时文件替换和真机验证尚待继续
> 范围：远程拓展下载、Python 代码区、MicroPython 串口上传

## 1. 根据当前网络自动选择拓展源

### 当前基线

远程拓展已经同时配置 Gitee 和 GitHub 来源。现在目录请求会并发竞争，按首个可用响应选择来源，并在会话内短期缓存选择结果。

入口位于 `packages/scratch-gui/src/lib/custom-extension/remote-library-client.js`：

- `DEFAULT_REMOTE_CATALOG_SOURCES` 定义默认来源集合和回退顺序。
- `loadRemoteLibraryCatalog` 默认测速并选择目录来源；显式传入 `catalogSources` 时仍按调用方顺序读取。
- `downloadRemoteLibraryPackage` 按顺序下载拓展包。
- 下载完成后执行 SHA256 校验，来源切换不能绕过该校验。

### 当前实现

- 目录来源使用真实 HTTPS 请求进行并发探测，默认超时为 4000ms。
- 选择结果缓存 5 分钟；缓存过期后重新探测，失败时仍按来源顺序回退。
- 目录选中的来源会决定产品包首选下载地址，另一个来源保留为备用地址。
- 包下载和 SHA256 校验仍逐来源执行，不会为了测速重复下载产品包。

自动化测试覆盖 Gitee 较快、GitHub 较快、会话缓存和来源失败回退。仍需在真实桌面网络环境中验收跨域、超时和断网重连行为。

### 目标行为

- 在当前网络环境中探测 Gitee 和 GitHub 的可用性与响应速度。
- 自动优先使用本次会话中更快且可用的来源。
- 首选来源超时、断网、返回错误或校验失败时，自动切换备用来源。
- 选择结果按会话短期缓存，避免每次打开拓展库都重复探测。
- 网络发生明显变化或缓存过期后重新探测。
- 不使用地区、IP 或 `navigator.onLine` 直接推断来源；以真实请求结果为准。

### 实现边界

- 目录请求可以并发竞争，优先采用最先返回且格式校验通过的结果。
- 拓展包不应默认完整下载两份。包下载优先沿用目录探测结果，再按失败回退。
- 探测请求必须有独立超时和取消机制，慢来源不能长期占用连接。
- 日志只记录公开来源、耗时和失败原因，不记录用户网络标识。
- Gitee 与 GitHub 返回同一版本时仍以 catalog 中的 SHA256 为最终完整性依据。

### 验收点

- Gitee 快时优先从 Gitee 获取目录和拓展包。
- GitHub 快时优先从 GitHub 获取目录和拓展包。
- 首选来源失败后无需用户操作即可切换备用来源。
- 两个来源都失败时，错误信息包含每个来源的失败摘要。
- 自动选择不会造成重复安装、版本漂移或跳过 SHA256 校验。

## 2. 在代码区加载 Python 文件

### 当前实现

- 代码区提供 `.py` 文件加载入口，只读取 UTF-8 文本并限制文件不超过 5 MiB。
- 加载后仅更新 Python 代码区，当前积木工作区和连接关系保持不变。
- 代码来源记录为 `loaded`；积木变化不会静默覆盖加载内容。
- “使用积木代码”是明确的切换操作，切回后重新生成当前工作区代码。
- 不执行 Python 语法解析，也不尝试把 Python 代码反向转换为积木。

### 当前基线

- Python 文本保存在 `pythonCoding.code`。
- 积木工作区变化后，`blocks.jsx` 会重新生成 Python 并覆盖该字段。
- `python-coding-panel.jsx` 中的代码区当前是只读 `textarea`。
- 当前代码可以保存、本机运行或通过串口上传，但没有“加载 `.py`”入口。

### 目标行为

- 用户可以选择本地 `.py` 文件并把内容加载到右侧 Python 代码区。
- 加载 Python 文件不会创建、删除或修改中间积木工作区。
- 不要求解析 Python 语法，也不要求把 Python 反向转换为积木。
- 保存、本机运行和串口上传都使用代码区当前显示的 Python 内容。
- 文件读取失败、编码不支持或文件过大时显示明确错误，不清空现有代码。

### 状态边界

需要区分两种代码来源：

1. `generated`：由积木工作区生成。
2. `loaded`：由用户加载的 Python 文件提供。

进入 `loaded` 状态后，积木变化不能静默覆盖已加载代码。重新采用积木生成结果时，需要一个明确操作或确认流程。

首期不包含：

- Python 到积木的反向转换。
- 自动合并加载代码与积木生成代码。
- 自动识别第三方库并挂载拓展。
- Python 调试器、语法补全或格式化。

是否允许直接编辑加载后的代码，需要在实现前确认；该决定不影响“只加载、不转积木”的基础要求。

### 验收点

- UTF-8 `.py` 文件可以完整加载，中文和换行保持正确。
- 加载后积木数量和连接关系保持不变。
- 加载的代码可以直接保存、运行和上传。
- 取消文件选择或加载失败时保留原代码。
- 新作品、加载 SB3、加载另一份 `.py` 时，代码来源切换规则一致且可预测。

### 新增需求：编辑器式 Python 语法高亮

当前代码区使用只读文本区域展示生成或加载的 Python 代码，缺少编辑器常见的语法层次，长代码和嵌套逻辑不易扫描。

目标是在不改变代码内容和执行语义的前提下，增加类似代码编辑器的 Python 词法高亮：

- 关键字：`def`、`class`、`if`、`elif`、`else`、`for`、`while`、`try`、`except`、`return` 等。
- 字符串：单引号、双引号、三引号字符串和转义字符。
- 注释：以 `#` 开始的注释，包括中文注释。
- 数字、布尔值、`None` 和常用内置名称。
- 运算符、括号和函数调用保持清晰的视觉层次。

交互边界：

- 第一阶段只改变展示层，保留当前只读、加载 `.py`、保存和运行行为。
- 高亮不能改变原始文本、复制内容、换行和缩进。
- 不做 Python 代码反向解析，也不自动转换为积木。
- 主题、字号和中英文切换后，高亮颜色需要保持可读和足够对比度。
- 不支持或解析失败的语法必须回退为普通文本，不得阻塞代码加载和运行。

验收点：

1. 示例代码中的关键字、字符串、注释、数字和运算符能稳定区分。
2. 多行字符串、嵌套括号、中文注释和包含转义符的字符串不破坏后续高亮。
3. 高亮前后代码文本逐字一致，复制出的内容与原始代码一致。
4. 大文件滚动和代码刷新没有明显卡顿，加载失败仍保留现有错误提示。
5. 自动化测试覆盖代表性 Python 片段和高亮失败回退路径。

## 3. 优化串口上传

### 当前实现

- Raw REPL 上传器现在报告准备、进入 REPL、写入、校验和完成阶段。
- Python 菜单栏的 Upload 按钮显示实时百分比，上传协议和设备端字节数校验保持不变。
- 进度回调只传递字节总量、文件名和阶段元数据，不重复下载或缓存代码。

本轮仍未处理 Raw-Paste、临时文件替换和真机拔线恢复；动态分块已先接入现有 Raw REPL，并保留显式固定分块参数作为兼容入口。

### 当前上传链路

```text
顶部 Upload 按钮
  -> PythonMenuBar.handleSerialUpload
  -> uploadMicroPythonFile(outputMonitor, pythonCode)
  -> outputMonitor.runProtocol 独占串口 reader
  -> 进入 MicroPython Raw REPL
  -> 打开 main.py 为 wb
  -> 每 256 字节生成一次 Python bytes 字面量
  -> 每块执行一次 f.write(...) 并等待 OK/stdout/stderr/提示符
  -> flush/close
  -> os.stat 校验设备端文件字节数
  -> 退出 Raw REPL
  -> Ctrl+D 软复位运行 main.py
```

Electron 主进程不直接读写串口。它只负责过滤候选端口、保存当前标签页的首选端口，并处理 Web Serial 权限。实际端口对象、reader 和 writer 都在 GUI 渲染进程中。

### 已识别的优化方向

1. 增加上传耗时、字节数、分块数和阶段进度统计，先得到真机基线。
2. 把 `uploadMicroPythonFile` 已支持的 `onProgress` 接入界面，显示准备、传输、校验和复位阶段。
3. 研究目标固件是否支持 MicroPython Raw-Paste 模式；支持时使用流控上传，不支持时回退到现有 Raw REPL 分块协议。
4. 根据代码体积自动选择 256、512、1024 字节分块；真机验证后再按固件命令长度和稳定性调整阈值，调用方仍可显式指定固定分块。
5. 协议模式期间复用 writer，减少每条命令重复获取和释放 writer lock 的开销。
6. 增加总超时、阶段超时、取消和有限重试；失败后统一恢复连接状态和按钮状态。
7. 先写入临时文件，设备端校验成功后再替换 `main.py`，避免中途失败破坏原程序。
8. 在设备能力允许时增加内容校验；至少保留当前设备端字节数校验，不能把 `writer.write` 成功当成上传成功。
9. 真机覆盖慢串口、中文代码、大文件、传输中拔线、设备忙、重复上传和多串口场景。

### 验收点

- 同一设备和代码下，优化后的上传耗时有可重复的量化改善。
- 上传期间可以看到真实进度，不出现长时间无反馈。
- 中途取消、超时或拔线后，串口 reader/writer lock 会被释放，界面可重新连接。
- 上传失败不会留下半写入的 `main.py`。
- 设备校验通过后才显示成功，并继续执行新的 `main.py`。
- 新协议不兼容时自动回退，不降低当前已验证设备的成功率。

## 串口代码研究索引

| 文件 | 研究入口 | 职责 |
| - | - | - |
| `packages/scratch-gui/src/components/menu-bar/python-menu-bar.jsx` | `handleRefreshSerialPorts`、`handleSerialConnect`、`handleSerialDisconnect`、`handleSerialUpload` | 顶部串口 UI、连接生命周期、上传入口和控制台提示 |
| `packages/scratch-gui/src/lib/serial-repl-uploader.js` | `enterRawRepl`、`rawExec`、`uploadMicroPythonFile` | Raw REPL 控制字符、分块写文件、响应检查和设备端大小校验 |
| `packages/scratch-gui/src/lib/serial-output-monitor.js` | `startSerialOutputMonitor`、`runProtocol`、`write` | 唯一 reader、普通日志/协议模式切换、协议缓冲区和 writer |
| `packages/scratch-gui/src/reducers/python-coding.js` | 串口状态和 `pythonCoding.code` | 保存端口、波特率、连接、busy 和当前 Python 文本 |
| `desktop/preload.js` | `scratchDesktopSerial` | 向 GUI 暴露受限串口选择 IPC |
| `desktop/main.js` | `registerSerialIpc`、`registerSerialDeviceHandlers` | 候选端口过滤、首选端口匹配和 Web Serial 权限 |
| `desktop/serial-port-selection.js` | `selectPreferredSerialPort` | 从 Electron 候选列表匹配用户选择的端口 |
| `packages/scratch-gui/test/unit/lib/serial-repl-uploader.test.js` | Raw REPL 上传测试 | 覆盖命令响应、分块、校验和失败恢复 |
| `packages/scratch-gui/test/unit/lib/serial-output-monitor.test.js` | reader/协议模式测试 | 覆盖跨块拼行、批量输出和协议独占 |
| `packages/scratch-gui/test/unit/components/python-menu-bar.test.jsx` | 菜单串口测试 | 覆盖端口选择和连接交互 |

## 建议实施顺序

1. 先实现网络来源探测与短期缓存，保持现有失败回退和 SHA256 校验。
2. 再增加 Python 文件加载和代码来源状态，先固定“不转积木”的边界。
3. 最后用真实硬件采集串口基线，再选择 Raw-Paste、动态分块或现有协议优化方案。
