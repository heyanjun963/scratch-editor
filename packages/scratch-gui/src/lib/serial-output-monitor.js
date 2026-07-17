// 串口输出监视器负责把 Web Serial 字节流拼成文本行，并批量交给 Python 控制台。
const DEFAULT_FLUSH_DELAY = 20;

const concatBytes = (left, right) => {
    const result = new Uint8Array(left.byteLength + right.byteLength);
    result.set(left, 0);
    result.set(right, left.byteLength);
    return result;
};

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

    const scheduleFlush = () => {
        if (flushTimer) return;
        flushTimer = setTimeout(flushLines, flushDelay);
    };

    const rejectProtocolWaiters = error => {
        const waiters = protocolWaiters;
        protocolWaiters = [];
        waiters.forEach(waiter => waiter.reject(error));
    };

    const notifyProtocolWaiters = () => {
        const waiters = protocolWaiters;
        protocolWaiters = [];
        waiters.forEach(waiter => waiter.resolve());
    };

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

    const toBytes = value => {
        if (ArrayBuffer.isView(value)) {
            return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        }
        if (value instanceof ArrayBuffer) return new Uint8Array(value);
        return new TextEncoder().encode(String(value));
    };

    const consumeProtocolBytes = byteCount => {
        const result = protocolBuffer.slice(0, byteCount);
        protocolBuffer = protocolBuffer.slice(byteCount);
        return result;
    };

    const readProtocolBytes = async (byteCount, timeout = 5000) => {
        while (protocolBuffer.byteLength < byteCount) {
            await waitForProtocolData(timeout, `${byteCount}字节`);
        }
        return consumeProtocolBytes(byteCount);
    };

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

    const sleep = delay => new Promise(resolve => setTimeout(resolve, delay));

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
