// 串口输出监视器负责把 Web Serial 字节流拼成文本行，并批量交给 Python 控制台。
const DEFAULT_FLUSH_DELAY = 20;

// 合并连续到达的串口字节块，供协议读取器按统一缓冲区消费。
const concatBytes = (left, right) => {
    const result = new Uint8Array(left.byteLength + right.byteLength);
    result.set(left, 0);
    result.set(right, left.byteLength);
    return result;
};

// 在字节缓冲区中查找协议结束标记，支持标记跨串口数据块出现。
const findBytes = (buffer, search) => {
    for (let offset = 0; offset <= buffer.byteLength - search.byteLength; offset++) {
        let matches = true;
        for (let index = 0; index < search.byteLength; index++) {
            if (buffer[offset + index] !== search[index]) {
                matches = false;
                break;
            }
        }
        if (matches) return offset;
    }
    return -1;
};

// 启动唯一串口 reader，并在普通日志模式与独占协议模式之间分发收到的字节。
const startSerialOutputMonitor = (port, {
    flushDelay = DEFAULT_FLUSH_DELAY,
    onError = () => {},
    onOutput
} = {}) => {
    if (!port || !port.readable || typeof port.readable.getReader !== 'function') {
        throw new Error('串口没有可读取的数据流');
    }
    if (typeof onOutput !== 'function') {
        throw new Error('串口输出监视器缺少 onOutput 回调');
    }

    let decoder = new TextDecoder();
    let activeReader = null;
    let lineBuffer = '';
    let pendingLines = [];
    let flushTimer = null;
    let stopped = false;
    let protocolMode = false;
    let protocolBuffer = new Uint8Array(0);
    let protocolWaiters = [];
    let streamFailure = null;

    // 把已完成的多行日志合并后交给界面，减少高频串口输出触发的渲染次数。
    const flushLines = () => {
        if (flushTimer) {
            clearTimeout(flushTimer);
            flushTimer = null;
        }
        if (!pendingLines.length) return;
        const output = pendingLines.join('\n');
        pendingLines = [];
        onOutput(output);
    };

    // 延迟一个很短的窗口批量刷新日志，同一窗口内只创建一个定时器。
    const scheduleFlush = () => {
        if (flushTimer) return;
        flushTimer = setTimeout(flushLines, flushDelay);
    };

    // 串口流失败时立即拒绝所有正在等待协议数据的操作。
    const rejectProtocolWaiters = error => {
        const waiters = protocolWaiters;
        protocolWaiters = [];
        waiters.forEach(waiter => waiter.reject(error));
    };

    // 新字节到达后唤醒协议读取操作，由读取操作重新检查缓冲区是否满足条件。
    const notifyProtocolWaiters = () => {
        const waiters = protocolWaiters;
        protocolWaiters = [];
        waiters.forEach(waiter => waiter.resolve());
    };

    // 等待下一批协议字节，并在超时或串口流失败时返回明确错误。
    const waitForProtocolData = (timeout, description) => new Promise((resolve, reject) => {
        if (streamFailure) {
            reject(streamFailure);
            return;
        }
        const waiter = {
            reject: error => {
                clearTimeout(waiter.timer);
                reject(error);
            },
            resolve: () => {
                clearTimeout(waiter.timer);
                resolve();
            },
            timer: null
        };
        waiter.timer = setTimeout(() => {
            protocolWaiters = protocolWaiters.filter(candidate => candidate !== waiter);
            reject(new Error(`等待串口${description}超时`));
        }, timeout);
        protocolWaiters.push(waiter);
    });

    // 把字符串、ArrayBuffer 和 TypedArray 统一转换成 Uint8Array。
    const toBytes = value => {
        if (ArrayBuffer.isView(value)) {
            return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        }
        if (value instanceof ArrayBuffer) return new Uint8Array(value);
        return new TextEncoder().encode(String(value));
    };

    // 从协议缓冲区头部取出指定字节，并保留尚未消费的后续响应。
    const consumeProtocolBytes = byteCount => {
        const result = protocolBuffer.slice(0, byteCount);
        protocolBuffer = protocolBuffer.slice(byteCount);
        return result;
    };

    // 等待并读取固定数量的协议字节，例如 Raw REPL 的两字节 OK 响应。
    const readProtocolBytes = async (byteCount, timeout = 5000) => {
        while (protocolBuffer.byteLength < byteCount) {
            await waitForProtocolData(timeout, `${byteCount}字节`);
        }
        return consumeProtocolBytes(byteCount);
    };

    // 持续读取到指定结束标记，返回内容包含结束标记本身。
    const readProtocolUntil = async (ending, timeout = 5000) => {
        const endingBytes = toBytes(ending);
        while (true) {
            const endingOffset = findBytes(protocolBuffer, endingBytes);
            if (endingOffset !== -1) {
                return consumeProtocolBytes(endingOffset + endingBytes.byteLength);
            }
            await waitForProtocolData(timeout, `响应 ${new TextDecoder().decode(endingBytes)}`);
        }
    };

    // 获取短生命周期 writer 写入串口，并保证每次写入后释放 writer lock。
    const write = async data => {
        if (!port.writable || typeof port.writable.getWriter !== 'function') {
            throw new Error('串口没有可写入的数据流');
        }
        const writer = port.writable.getWriter();
        try {
            await writer.write(toBytes(data));
        } finally {
            writer.releaseLock();
        }
    };

    // 为设备状态切换提供可等待的短延时，避免连续控制字符被固件漏处理。
    const sleep = delay => new Promise(resolve => setTimeout(resolve, delay));

    // 进入上传协议前刷新普通日志的解码器、完整行和残留半行。
    const flushNormalOutput = () => {
        consumeText(decoder.decode());
        decoder = new TextDecoder();
        flushLines();
        if (lineBuffer) {
            onOutput(lineBuffer);
            lineBuffer = '';
        }
    };

    // 数据块边界不等于文本行边界，先保留残行，遇到换行后再批量输出。
    const consumeText = text => {
        lineBuffer += text;
        let newlineIndex = lineBuffer.indexOf('\n');
        while (newlineIndex !== -1) {
            let line = lineBuffer.slice(0, newlineIndex);
            if (line.endsWith('\r')) line = line.slice(0, -1);
            pendingLines.push(line);
            lineBuffer = lineBuffer.slice(newlineIndex + 1);
            newlineIndex = lineBuffer.indexOf('\n');
        }
        if (pendingLines.length) scheduleFlush();
    };

    // 持续占用唯一 reader 读取设备数据；结束时统一释放 reader lock 和残留日志。
    const done = (async () => {
        try {
            activeReader = port.readable.getReader();
            while (!stopped) {
                const result = await activeReader.read();
                if (result.done) {
                    streamFailure = new Error('串口读取流已结束');
                    rejectProtocolWaiters(streamFailure);
                    break;
                }
                if (result.value) {
                    if (protocolMode) {
                        protocolBuffer = concatBytes(protocolBuffer, result.value);
                        notifyProtocolWaiters();
                    } else {
                        consumeText(decoder.decode(result.value, {stream: true}));
                    }
                }
            }
            if (!protocolMode) consumeText(decoder.decode());
        } catch (error) {
            streamFailure = error;
            rejectProtocolWaiters(error);
            if (!stopped) onError(error);
        } finally {
            if (activeReader) {
                activeReader.releaseLock();
                activeReader = null;
            }
            flushLines();
            if (lineBuffer) {
                onOutput(lineBuffer);
                lineBuffer = '';
            }
        }
    })();

    return {
        done,
        // 上传协议与普通日志共用一个 reader，协议期间收到的字节不会误显示为硬件日志。
        runProtocol: async callback => {
            if (protocolMode) throw new Error('已有串口协议操作正在执行');
            if (streamFailure) throw streamFailure;
            flushNormalOutput();
            protocolBuffer = new Uint8Array(0);
            protocolMode = true;
            try {
                return await callback({
                    // 丢弃状态切换期间的旧响应，确保下一步只匹配新命令返回的数据。
                    discardInput: async (delay = 0) => {
                        protocolBuffer = new Uint8Array(0);
                        if (delay > 0) await sleep(delay);
                        protocolBuffer = new Uint8Array(0);
                    },
                    readBytes: readProtocolBytes,
                    readUntil: readProtocolUntil,
                    sleep,
                    write
                });
            } finally {
                protocolMode = false;
                protocolBuffer = new Uint8Array(0);
                decoder = new TextDecoder();
            }
        },
        // 主动断开时先取消读取并等待 reader 完整退出，调用方随后才能安全关闭 port。
        stop: async () => {
            stopped = true;
            if (activeReader) {
                try {
                    await activeReader.cancel();
                } catch {
                    // 设备已经拔出时 cancel 可能失败，done 仍负责释放 reader 锁。
                }
            }
            await done;
        },
        write
    };
};

export {
    DEFAULT_FLUSH_DELAY,
    startSerialOutputMonitor
};
