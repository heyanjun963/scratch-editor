import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {defineMessages, injectIntl} from 'react-intl';
import {connect} from 'react-redux';

import PythonCodingPanelComponent from '../components/python-coding-panel/python-coding-panel.jsx';
import intlShape from '../lib/intlShape.js';
import {
    clearPythonConsole,
    setPythonError,
    setPythonExitCode,
    setPythonRunning,
    setPythonScriptPath
} from '../reducers/python-coding';

const messages = defineMessages({
    noDesktopPython: {
        id: 'gui.pythonCoding.noDesktopPython',
        defaultMessage: 'Python running is only available in the desktop app.',
        description: 'Console message shown when Python run is used outside the Electron desktop app'
    },
    noCode: {
        id: 'gui.pythonCoding.noCode',
        defaultMessage: 'There is no Python code to run.',
        description: 'Console message shown when Python run is requested without generated code'
    },
    starting: {
        id: 'gui.pythonCoding.starting',
        defaultMessage: '[python] Starting local Python...',
        description: 'Console message shown when Python starts running'
    },
    scriptPath: {
        id: 'gui.pythonCoding.scriptPath',
        defaultMessage: '[python] Script written to {scriptPath}',
        description: 'Console message showing where the generated Python file was written'
    },
    stopped: {
        id: 'gui.pythonCoding.stopped',
        defaultMessage: '[python] Stop requested.',
        description: 'Console message shown when Python stop is requested'
    },
    stoppedBySignal: {
        id: 'gui.pythonCoding.stoppedBySignal',
        defaultMessage: '[python] Process stopped by signal {signal}.',
        description: 'Console message shown when Python exits because of a signal'
    },
    finished: {
        id: 'gui.pythonCoding.finished',
        defaultMessage: '[python] Process finished with exit code {exitCode}.',
        description: 'Console message shown when Python exits normally'
    },
    runFailed: {
        id: 'gui.pythonCoding.runFailed',
        defaultMessage: '[python] Run failed: {message}',
        description: 'Console message shown when Python cannot be started'
    }
});

// 通过 preload 暴露的非交互 Python API；浏览器环境下不存在。
const getDesktopPythonApi = () => {
    if (typeof window === 'undefined') return null;
    return window.scratchDesktopPython || null;
};

// 通过 preload 暴露的 PTY 终端 API；桌面端优先使用它获得真实交互能力。
const getDesktopTerminalApi = () => {
    if (typeof window === 'undefined') return null;
    return window.scratchDesktopTerminal || null;
};

// 每个 Electron 编辑器 tab 的 id 写在 URL 参数里，用来过滤本 tab 的进程输出。
const getDesktopTabId = () => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('desktopTabId');
};

// 使用 ANSI 红色包装本地 Python 错误输出。
const colorStderr = text => `\u001b[31m${text}\u001b[0m`;

// Redux 历史达到上限后会从头部裁行，这里只提取裁剪后新增的尾部文本，避免重复写入 xterm。
const getConsoleTextDelta = (previousText, currentText) => {
    if (!previousText) return currentText;
    let retainedText = previousText;
    while (retainedText) {
        if (currentText.startsWith(retainedText)) {
            return currentText.slice(retainedText.length).replace(/^\n/, '');
        }
        const newlineIndex = retainedText.indexOf('\n');
        if (newlineIndex === -1) break;
        retainedText = retainedText.slice(newlineIndex + 1);
    }
    return currentText;
};

// 容器层负责连接 Redux、xterm 组件和 Electron IPC，展示层只负责布局。
const PythonCodingPanel = props => {
    const {
        code,
        consoleText,
        error,
        intl,
        isRunning,
        lastExitCode,
        onClearConsole,
        onSetError,
        onSetExitCode,
        onSetRunning,
        onSetScriptPath,
        scriptPath
    } = props;
    const terminalRef = useRef(null);
    const consoleTextRef = useRef('');
    const [hasConsoleOutput, setHasConsoleOutput] = useState(false);
    const desktopPythonApi = getDesktopPythonApi();
    const desktopTerminalApi = getDesktopTerminalApi();
    const desktopTabId = getDesktopTabId();
    const desktopApiAvailable = Boolean(desktopTerminalApi || desktopPythonApi);
    const terminalSizeRef = useRef({
        cols: 80,
        rows: 24
    });

    // 直接写入 xterm，避免所有实时输出都经过 Redux 造成频繁状态更新。
    const writeTerminal = useCallback(text => {
        if (terminalRef.current) {
            terminalRef.current.write(text);
            setHasConsoleOutput(true);
        }
    }, []);

    // 向 xterm 写入一条完整消息并换行，供状态提示和 Redux 轻量历史使用。
    const writeTerminalLine = useCallback(text => {
        if (terminalRef.current) {
            terminalRef.current.writeln(text);
            setHasConsoleOutput(true);
        }
    }, []);

    // 清空 xterm 与 Redux 中保留的轻量控制台历史。
    const handleClearConsole = useCallback(() => {
        if (terminalRef.current) {
            terminalRef.current.clear();
        }
        setHasConsoleOutput(false);
        onClearConsole();
    }, [onClearConsole]);

    // 兼容旧的 Redux consoleText 来源，把增量文本同步进 xterm。
    useEffect(() => {
        if (!consoleText) {
            consoleTextRef.current = '';
            return;
        }
        const nextText = getConsoleTextDelta(consoleTextRef.current, consoleText);
        consoleTextRef.current = consoleText;
        if (nextText) {
            writeTerminalLine(nextText);
        }
    }, [
        consoleText,
        writeTerminalLine
    ]);

    // PTY 输出是首选通道，支持 input() 和实时终端控制字符。
    useEffect(() => {
        if (!desktopTerminalApi) return undefined;
        const removeDataListener = desktopTerminalApi.onData(data => {
            if (data.tabId !== desktopTabId) return;
            if (data.data) {
                writeTerminal(data.data);
            }
        });
        const removeExitListener = desktopTerminalApi.onExit(data => {
            if (data.tabId !== desktopTabId) return;
            onSetRunning(false);
            onSetExitCode(data.exitCode);
            if (data.scriptPath) {
                onSetScriptPath(data.scriptPath);
            }
            writeTerminalLine(data.signal ?
                intl.formatMessage(messages.stoppedBySignal, {signal: data.signal}) :
                intl.formatMessage(messages.finished, {exitCode: data.exitCode})
            );
        });

        return () => {
            removeDataListener();
            removeExitListener();
        };
    }, [
        desktopTerminalApi,
        desktopTabId,
        intl,
        onSetExitCode,
        onSetRunning,
        onSetScriptPath,
        writeTerminal,
        writeTerminalLine
    ]);

    // 如果没有 PTY，则降级监听普通 stdout/stderr 通道。
    useEffect(() => {
        if (desktopTerminalApi) return undefined;
        if (!desktopPythonApi) return undefined;
        const removeOutputListener = desktopPythonApi.onOutput(data => {
            if (data.tabId !== desktopTabId) return;
            if (data.text) {
                writeTerminal(data.stream === 'stderr' ? colorStderr(data.text) : data.text);
            }
        });
        const removeExitListener = desktopPythonApi.onExit(data => {
            if (data.tabId !== desktopTabId) return;
            onSetRunning(false);
            onSetExitCode(data.exitCode);
            if (data.scriptPath) {
                onSetScriptPath(data.scriptPath);
            }
            writeTerminalLine(data.signal ?
                intl.formatMessage(messages.stoppedBySignal, {signal: data.signal}) :
                intl.formatMessage(messages.finished, {exitCode: data.exitCode})
            );
        });

        return () => {
            removeOutputListener();
            removeExitListener();
        };
    }, [
        desktopPythonApi,
        desktopTabId,
        desktopTerminalApi,
        intl,
        onSetExitCode,
        onSetRunning,
        onSetScriptPath,
        writeTerminal,
        writeTerminalLine
    ]);

    // 运行时优先启动 PTY；不可用时走普通 PythonRunner。
    const handleRun = useCallback(async () => {
        if (!desktopApiAvailable) {
            writeTerminalLine(intl.formatMessage(messages.noDesktopPython));
            return;
        }
        if (!code.trim()) {
            writeTerminalLine(intl.formatMessage(messages.noCode));
            return;
        }

        handleClearConsole();
        onSetError(null);
        onSetExitCode(null);
        onSetRunning(true);
        writeTerminalLine(intl.formatMessage(messages.starting));

        try {
            const result = desktopTerminalApi ?
                await desktopTerminalApi.startPython({
                    tabId: desktopTabId,
                    code,
                    cols: terminalSizeRef.current.cols,
                    rows: terminalSizeRef.current.rows
                }) :
                await desktopPythonApi.run({
                    tabId: desktopTabId,
                    code
                });
            if (result.scriptPath) {
                onSetScriptPath(result.scriptPath);
                writeTerminalLine(intl.formatMessage(messages.scriptPath, {
                    scriptPath: result.scriptPath
                }));
            }
        } catch (error_) {
            const message = error_ && error_.message ? error_.message : String(error_);
            onSetRunning(false);
            onSetError(message);
            writeTerminalLine(colorStderr(intl.formatMessage(messages.runFailed, {message})));
        }
    }, [
        code,
        desktopApiAvailable,
        desktopPythonApi,
        desktopTerminalApi,
        desktopTabId,
        handleClearConsole,
        intl,
        onSetError,
        onSetExitCode,
        onSetRunning,
        onSetScriptPath,
        writeTerminalLine
    ]);

    // 停止按钮同样按 PTY 优先、普通进程降级的顺序处理。
    const handleStop = useCallback(async () => {
        if (desktopTerminalApi) {
            await desktopTerminalApi.stop();
        } else if (desktopPythonApi) {
            await desktopPythonApi.stop(desktopTabId);
        } else {
            return;
        }
        writeTerminalLine(intl.formatMessage(messages.stopped));
    }, [
        desktopPythonApi,
        desktopTerminalApi,
        desktopTabId,
        intl,
        writeTerminalLine
    ]);

    // xterm 输入只在运行中转发给 PTY，避免空闲时误写。
    const handleTerminalInput = useCallback(data => {
        if (!desktopTerminalApi || !isRunning) return;
        desktopTerminalApi.input(data);
    }, [
        desktopTerminalApi,
        isRunning
    ]);

    // 记录最新终端尺寸，下一次运行和运行中 resize 都会同步给主进程。
    const handleTerminalResize = useCallback(size => {
        terminalSizeRef.current = size;
        if (!desktopTerminalApi || !isRunning) return;
        desktopTerminalApi.resize(size);
    }, [
        desktopTerminalApi,
        isRunning
    ]);

    return (
        <PythonCodingPanelComponent
            code={code}
            desktopApiAvailable={desktopApiAvailable}
            error={error}
            hasConsoleOutput={hasConsoleOutput}
            isRunning={isRunning}
            lastExitCode={lastExitCode}
            scriptPath={scriptPath}
            terminalRef={terminalRef}
            onClearConsole={handleClearConsole}
            onRun={handleRun}
            onStop={handleStop}
            onTerminalInput={handleTerminalInput}
            onTerminalResize={handleTerminalResize}
        />
    );
};

PythonCodingPanel.propTypes = {
    code: PropTypes.string,
    consoleText: PropTypes.string,
    error: PropTypes.string,
    intl: intlShape.isRequired,
    isRunning: PropTypes.bool,
    lastExitCode: PropTypes.number,
    onClearConsole: PropTypes.func.isRequired,
    onSetError: PropTypes.func.isRequired,
    onSetExitCode: PropTypes.func.isRequired,
    onSetRunning: PropTypes.func.isRequired,
    onSetScriptPath: PropTypes.func.isRequired,
    scriptPath: PropTypes.string
};

// 从 Redux 读取生成代码、轻量控制台历史和本地 Python 运行状态。
const mapStateToProps = state => ({
    code: state.scratchGui.pythonCoding.code,
    consoleText: state.scratchGui.pythonCoding.consoleText,
    error: state.scratchGui.pythonCoding.error,
    isRunning: state.scratchGui.pythonCoding.isRunning,
    lastExitCode: state.scratchGui.pythonCoding.lastExitCode,
    scriptPath: state.scratchGui.pythonCoding.scriptPath
});

// 把控制台与运行结果操作转换成 Redux 状态更新。
const mapDispatchToProps = dispatch => ({
    onClearConsole: () => dispatch(clearPythonConsole()),
    onSetError: error => dispatch(setPythonError(error)),
    onSetExitCode: exitCode => dispatch(setPythonExitCode(exitCode)),
    onSetRunning: isRunning => dispatch(setPythonRunning(isRunning)),
    onSetScriptPath: scriptPath => dispatch(setPythonScriptPath(scriptPath))
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(PythonCodingPanel));

export {
    getConsoleTextDelta
};
