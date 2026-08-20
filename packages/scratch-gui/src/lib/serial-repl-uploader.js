// MicroPython 上传器通过 Raw REPL 写入并校验设备文件，不能用串口 write 成功代替上传成功。
const CONTROL_B = new Uint8Array([0x02]);
const CONTROL_D = new Uint8Array([0x04]);
const OK_RESPONSE = 'OK';
const DEFAULT_CHUNK_SIZE = 256;
const AUTO_CHUNK_THRESHOLDS = Object.freeze([
    {maxBytes: 1024, chunkSize: 256},
    {maxBytes: 8192, chunkSize: 512},
    {maxBytes: Number.POSITIVE_INFINITY, chunkSize: 1024}
]);

// 根据代码体积选择传输分块；小文件保持保守设置，大文件减少串口往返次数。
const resolveChunkSize = (fileSize, chunkSize) => {
    if (Number.isInteger(chunkSize) && chunkSize > 0) return chunkSize;
    const threshold = AUTO_CHUNK_THRESHOLDS.find(item => fileSize <= item.maxBytes);
    return threshold ? threshold.chunkSize : DEFAULT_CHUNK_SIZE;
};

// 提供上传状态切换所需的异步短延时。
const sleep = delay => new Promise(resolve => setTimeout(resolve, delay));
// 把 JavaScript 字符串编码为串口发送的 UTF-8 字节。
const encode = text => new TextEncoder().encode(text);
// 把设备返回的 UTF-8 字节解码为可读文本。
const decode = bytes => new TextDecoder().decode(bytes);

// 把任意文件字节转换成安全的 Python bytes 字面量，避免中文和控制字符破坏命令。
const bytesToPythonLiteral = bytes => {
    let result = "b'";
    bytes.forEach(byte => {
        if (byte >= 32 && byte <= 126 && byte !== 39 && byte !== 92) {
            result += String.fromCharCode(byte);
        } else if (byte === 39) {
            result += "\\'";
        } else if (byte === 92) {
            result += '\\\\';
        } else if (byte === 10) {
            result += '\\n';
        } else if (byte === 13) {
            result += '\\r';
        } else if (byte === 9) {
            result += '\\t';
        } else {
            result += `\\x${byte.toString(16).padStart(2, '0')}`;
        }
    });
    return `${result}'`;
};

// 转义目标文件名，生成可直接放入 Python 命令的字符串字面量。
const pythonStringLiteral = value => `'${String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")}'`;

// readUntil 返回值包含结束控制字节，业务读取 stdout/stderr 时去掉该末尾标记。
const withoutLastByte = bytes => bytes.slice(0, Math.max(bytes.byteLength - 1, 0));

// 在 Raw REPL 中执行一条命令，依次校验 OK、stdout、stderr 和下一次命令提示符。
const rawExec = async (protocol, command, timeout = 10000) => {
    await protocol.write(encode(command));
    await protocol.write(CONTROL_D);
    const response = decode(await protocol.readBytes(2, timeout));
    if (response !== OK_RESPONSE) {
        throw new Error(`Raw REPL 执行被拒绝: ${response}`);
    }
    const stdout = withoutLastByte(await protocol.readUntil(CONTROL_D, timeout));
    const stderr = withoutLastByte(await protocol.readUntil(CONTROL_D, timeout));
    await protocol.readUntil('>', timeout);
    if (stderr.byteLength) {
        throw new Error(`Raw REPL 执行错误: ${decode(stderr)}`);
    }
    return decode(stdout);
};

// 清理设备可能遗留的 REPL 状态并进入可接收上传命令的 Raw REPL。
const enterRawRepl = async protocol => {
    // 上一次失败可能遗留在 Raw REPL，先退出；部分固件不稳定返回 >>>，因此不把它作为前置条件。
    await protocol.discardInput(20);
    await protocol.write(encode('\r\x02'));
    await protocol.sleep(60);
    await protocol.discardInput(40);
    await protocol.write(encode('\r\x03\x03'));
    await protocol.sleep(80);
    await protocol.discardInput(40);
    await protocol.write(encode('\r\x01'));
    try {
        // 先匹配 Raw REPL 特征文本，避免迟到的友好提示符 >>> 被误认成 Raw 提示符。
        await protocol.readUntil('raw REPL', 4000);
        await protocol.readUntil('>', 1000);
    } catch (error) {
        throw new Error(`无法进入 MicroPython Raw REPL: ${error.message}`);
    }
};

// 通过 Raw REPL 分块写入目标文件，并以设备端文件大小作为成功返回前的校验条件。
const uploadMicroPythonFile = async (session, code, {
    chunkSize = 'auto',
    fileName = 'main.py',
    onProgress = () => {}
} = {}) => {
    if (!session || typeof session.runProtocol !== 'function' || typeof session.write !== 'function') {
        throw new Error('当前串口连接不支持 MicroPython 上传');
    }
    const fileData = encode(String(code || ''));
    if (!fileData.byteLength) throw new Error('没有可上传的 Python 代码');
    const resolvedChunkSize = resolveChunkSize(fileData.byteLength, chunkSize);
    const fileLiteral = pythonStringLiteral(fileName);
    const reportProgress = (progress, phase) => onProgress(progress, {
        phase,
        bytes: fileData.byteLength,
        fileName
    });

    // 上传期间独占普通日志 reader，避免协议响应被控制台提前消费。
    const result = await session.runProtocol(async protocol => {
        let rawReplEntered = false;
        try {
            reportProgress(0, 'preparing');
            await enterRawRepl(protocol);
            rawReplEntered = true;
            reportProgress(5, 'entering-repl');
            await rawExec(protocol, `f = open(${fileLiteral}, 'wb')`);
            reportProgress(10, 'writing');
            for (let offset = 0; offset < fileData.byteLength; offset += resolvedChunkSize) {
                const chunk = fileData.slice(offset, offset + resolvedChunkSize);
                await rawExec(protocol, `_ = f.write(${bytesToPythonLiteral(chunk)})`);
                reportProgress(Math.min(85, 10 + Math.floor(((offset + chunk.byteLength) / fileData.byteLength) * 75)), 'writing');
            }
            reportProgress(90, 'verifying');
            await rawExec(protocol, 'f.flush(); f.close()');
            const sizeOutput = await rawExec(protocol, `import os; print(os.stat(${fileLiteral})[6])`);
            const uploadedSize = Number.parseInt(sizeOutput.trim(), 10);
            if (uploadedSize !== fileData.byteLength) {
                throw new Error(`main.py 校验失败: 期望 ${fileData.byteLength} 字节，设备返回 ${sizeOutput.trim()}`);
            }
            return {
                bytes: fileData.byteLength,
                fileName
            };
        } finally {
            if (rawReplEntered) {
                try {
                    await protocol.write(encode('\r'));
                    await protocol.write(CONTROL_B);
                } catch {
                    // 上传失败后设备可能已经离线，保留原始失败原因。
                }
            }
        }
    });

    // 回到友好 REPL 后软复位，让设备重新执行 boot.py/main.py，启动日志继续进入控制台。
    await session.write(CONTROL_D);
    onProgress(100, {
        phase: 'completed',
        bytes: result.bytes,
        fileName: result.fileName
    });
    return result;
};

// 把设备切回友好 REPL 后执行软复位，使 boot.py/main.py 重新运行并输出启动日志。
const restartMicroPython = async (session, {delayMs = 100} = {}) => {
    if (!session || typeof session.write !== 'function') return;
    await session.write(encode('\r\x02'));
    if (delayMs > 0) await sleep(Math.min(delayMs, 60));
    await session.write(encode('\r\x03\x03'));
    if (delayMs > 0) await sleep(delayMs);
    await session.write(CONTROL_D);
};

export {
    resolveChunkSize,
    restartMicroPython,
    uploadMicroPythonFile
};
