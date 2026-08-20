import classNames from 'classnames';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {defineMessages, FormattedMessage, injectIntl} from 'react-intl';

import Box from '../box/box.jsx';
import SettingsMenu from './settings-menu.jsx';
import FileMenu from './file-menu.jsx';
import intlShape from '../../lib/intlShape.js';
import {startSerialOutputMonitor} from '../../lib/serial-output-monitor';
import {restartMicroPython, uploadMicroPythonFile} from '../../lib/serial-repl-uploader';
import {
    appendPythonConsole,
    setSerialBaudRate,
    setSerialBusy,
    setSerialConnected,
    setSerialPortPath,
    setSerialPorts
} from '../../reducers/python-coding';

import styles from './menu-bar.css';

const messages = defineMessages({
    serialUnavailable: {
        id: 'gui.pythonCoding.serialUnavailable',
        defaultMessage: '[serial] Serial is only available in the desktop app.',
        description: 'Console message shown when serial actions are unavailable'
    },
    serialNoPort: {
        id: 'gui.pythonCoding.serialNoPort',
        defaultMessage: '[serial] Please select a serial port.',
        description: 'Console message shown when serial connect is requested without selecting a port'
    },
    serialListFailed: {
        id: 'gui.pythonCoding.serialListFailed',
        defaultMessage: '[serial] Failed to list ports: {message}',
        description: 'Console message shown when serial port listing fails'
    },
    serialConnected: {
        id: 'gui.pythonCoding.serialConnected',
        defaultMessage: '[serial] Connected to {path} at {baudRate} baud.',
        description: 'Console message shown when serial port connection succeeds'
    },
    serialDisconnected: {
        id: 'gui.pythonCoding.serialDisconnected',
        defaultMessage: '[serial] Disconnected.',
        description: 'Console message shown when serial port is disconnected'
    },
    serialFailed: {
        id: 'gui.pythonCoding.serialFailed',
        defaultMessage: '[serial] Operation failed: {message}',
        description: 'Console message shown when a serial operation fails'
    },
    serialUploaded: {
        id: 'gui.pythonCoding.serialUploaded',
        defaultMessage: '[serial] Wrote and verified main.py ({bytes} bytes) on {path}.',
        description: 'Console message shown after main.py is written and verified on the device'
    },
    serialUploading: {
        id: 'gui.pythonCoding.serialUploading',
        defaultMessage: '[serial] Uploading and verifying main.py...',
        description: 'Console message shown while main.py is being uploaded to the device'
    },
    serialSelected: {
        id: 'gui.pythonCoding.serialSelected',
        defaultMessage: '[serial] Selected {label}.',
        description: 'Console message shown when Electron selects a serial port candidate'
    },
    serialDetectPrompt: {
        id: 'gui.pythonCoding.serialDetectPrompt',
        defaultMessage: 'Click Refresh to detect',
        description: 'Serial port select placeholder before Web Serial has been requested'
    },
});

// 获取 preload 暴露的串口 IPC；普通浏览器环境没有该能力时返回 null。
const getDesktopSerialApi = () => {
    if (typeof window === 'undefined') return null;
    return window.scratchDesktopSerial || null;
};

// Web Serial 由 Chromium 提供，必须由用户手势触发 requestPort。
const getWebSerialApi = () => {
    if (typeof navigator === 'undefined') return null;
    return navigator.serial || null;
};

// 统一生成串口在下拉框和控制台日志中使用的可读名称。
const portLabel = port => port.label || port.portName || port.displayName || port.path || '';

// 候选列表刷新后优先保留用户原选择，否则选择第一项作为默认值。
const pickPreferredPort = (ports, selectedPath) => {
    if (selectedPath) {
        const selected = ports.find(port => port.path === selectedPath);
        if (selected) return selected;
    }
    return ports[0] || null;
};

// 使用 ANSI 红色包装串口错误，使其在 xterm 中与普通硬件日志区分。
const colorStderr = text => `\u001b[31m${text}\u001b[0m`;

// Python 模式专用头部菜单：只保留设置、文件和串口相关操作。
const PythonMenuBar = ({
    ariaLabel,
    ariaRole,
    canChangeLanguage,
    canCreateCopy,
    canManageFiles,
    canRemix,
    canSave,
    className,
    depth,
    getSaveToComputerHandler,
    handleClickNew,
    isRtl,
    intl,
    onClickRemix,
    onClickSave,
    onSetSerialBaudRate,
    onSetSerialBusy,
    onSetSerialConnected,
    onSetSerialPortPath,
    onSetSerialPorts,
    onWriteConsoleLine,
    onStartSelectingFileUpload,
    remixMessage,
    serialBaudRate,
    serialBusy,
    serialConnected,
    serialPortPath,
    serialPorts,
    pythonCode
}) => {
    const desktopSerialApi = getDesktopSerialApi();
    const webSerialApi = getWebSerialApi();
    const serialApiAvailable = Boolean(desktopSerialApi && webSerialApi);
    const serialPortRef = useRef(null);
    const serialOutputMonitorRef = useRef(null);
    const serialPortPathRef = useRef(serialPortPath);
    const selectedPortLabelRef = useRef('');
    const [uploadProgress, setUploadProgress] = useState(null);

    // 串口错误统一写入 Python 控制台，并用 ANSI 红色显示。
    const writeSerialError = useCallback((message, values) => {
        onWriteConsoleLine(colorStderr(intl.formatMessage(message, values)));
    }, [
        intl,
        onWriteConsoleLine
    ]);

    // 保持串口选择 ref 为最新值，异步候选回调不会读取到旧的 React props。
    useEffect(() => {
        serialPortPathRef.current = serialPortPath;
    }, [serialPortPath]);

    // Refresh 触发 Web Serial 选择器；主进程会在 select-serial-port 事件中过滤候选端口。
    const handleRefreshSerialPorts = useCallback(async () => {
        if (!serialApiAvailable) {
            onWriteConsoleLine(intl.formatMessage(messages.serialUnavailable));
            return;
        }
        onSetSerialBusy(true);
        try {
            await webSerialApi.requestPort();
        } catch (error_) {
            const message = error_ && error_.message ? error_.message : String(error_);
            writeSerialError(messages.serialListFailed, {message});
        } finally {
            onSetSerialBusy(false);
        }
    }, [
        intl,
        onSetSerialBusy,
        onWriteConsoleLine,
        serialApiAvailable,
        webSerialApi,
        writeSerialError
    ]);

    // Electron 主进程推送过滤后的串口列表，前端只保存 portId/path 和显示名。
    useEffect(() => {
        if (!desktopSerialApi) return undefined;
        return desktopSerialApi.onPorts(payload => {
            const ports = (payload.ports || []).map(port => ({
                path: port.portId,
                label: port.portName || port.displayName || port.portId,
                portId: port.portId,
                portName: port.portName,
                displayName: port.displayName,
                vendorId: port.vendorId,
                productId: port.productId
            }));
            onSetSerialPorts(ports);
            const selectedPort = ports.find(port => port.path === payload.selectedPortId) ||
                pickPreferredPort(ports, serialPortPathRef.current);
            onSetSerialPortPath((selectedPort && selectedPort.path) || '');
            selectedPortLabelRef.current = selectedPort ? portLabel(selectedPort) : '';
            if (selectedPort) {
                onWriteConsoleLine(intl.formatMessage(messages.serialSelected, {
                    label: selectedPortLabelRef.current
                }));
            }
        });
    }, [
        desktopSerialApi,
        intl,
        onSetSerialPortPath,
        onSetSerialPorts,
        onWriteConsoleLine
    ]);

    // 下拉框选择只更新显示状态；真正授权仍需要 Web Serial requestPort。
    const handleSerialPortChange = useCallback(event => {
        const selectedPath = event.target.value;
        const selectedPort = serialPorts.find(port => port.path === selectedPath);
        selectedPortLabelRef.current = selectedPort ? portLabel(selectedPort) : '';
        onSetSerialPortPath(selectedPath);
    }, [
        onSetSerialPortPath,
        serialPorts
    ]);

    // 连接阶段再次调用 requestPort 是 Web Serial 的授权要求；连接成功后持续把硬件输出写入控制台。
    const handleSerialConnect = useCallback(async () => {
        if (!serialApiAvailable) {
            onWriteConsoleLine(intl.formatMessage(messages.serialUnavailable));
            return;
        }
        onSetSerialBusy(true);
        let selectedPort = null;
        try {
            // requestPort 触发主进程候选回调前，先同步用户在下拉框中选择的 portId。
            await desktopSerialApi.select(serialPortPath);
            selectedPort = await webSerialApi.requestPort();
            const selectedPortInfo = selectedPort.getInfo();
            await selectedPort.open({baudRate: serialBaudRate});
            serialPortRef.current = selectedPort;
            const outputMonitor = startSerialOutputMonitor(selectedPort, {
                // reader 异常统一转成控制台红色错误信息。
                onError: error => {
                    const message = error && error.message ? error.message : String(error);
                    writeSerialError(messages.serialFailed, {message});
                },
                // 普通硬件输出追加到 Redux 轻量历史，再由 Python 控制台增量显示。
                onOutput: output => onWriteConsoleLine(output)
            });
            serialOutputMonitorRef.current = outputMonitor;
            // 设备拔出或可读流结束时同步连接状态；主动断开会先清空 ref，避免重复提示。
            outputMonitor.done.then(async () => {
                if (serialOutputMonitorRef.current !== outputMonitor) return;
                serialOutputMonitorRef.current = null;
                const disconnectedPort = serialPortRef.current;
                serialPortRef.current = null;
                if (disconnectedPort) {
                    try {
                        await disconnectedPort.close();
                    } catch {
                        // 设备已拔出时端口通常已经关闭。
                    }
                }
                onSetSerialConnected(false);
                onWriteConsoleLine(intl.formatMessage(messages.serialDisconnected));
            });
            onSetSerialConnected(true);
            onWriteConsoleLine(intl.formatMessage(messages.serialConnected, {
                path: selectedPortLabelRef.current || serialPortPath || selectedPortInfo.usbVendorId || 'serial port',
                baudRate: serialBaudRate
            }));
            try {
                await restartMicroPython(outputMonitor);
            } catch (restartError) {
                const message = restartError && restartError.message ? restartError.message : String(restartError);
                writeSerialError(messages.serialFailed, {message});
            }
        } catch (error_) {
            serialPortRef.current = null;
            if (selectedPort) {
                try {
                    await selectedPort.close();
                } catch {
                    // 授权或打开失败时端口可能尚未进入可关闭状态。
                }
            }
            const errorMessage = error_ && error_.message ? error_.message : String(error_);
            const message = selectedPortLabelRef.current ?
                `${selectedPortLabelRef.current}: ${errorMessage}` :
                errorMessage;
            writeSerialError(messages.serialFailed, {message});
        } finally {
            onSetSerialBusy(false);
        }
    }, [
        intl,
        onSetSerialBusy,
        onSetSerialConnected,
        onWriteConsoleLine,
        serialBaudRate,
        serialPortPath,
        serialApiAvailable,
        desktopSerialApi,
        webSerialApi,
        writeSerialError
    ]);

    // 断开时先取消读取并释放 reader 锁，再关闭 Web Serial Port。
    const handleSerialDisconnect = useCallback(async () => {
        onSetSerialBusy(true);
        try {
            const outputMonitor = serialOutputMonitorRef.current;
            serialOutputMonitorRef.current = null;
            const port = serialPortRef.current;
            serialPortRef.current = null;
            if (outputMonitor) {
                await outputMonitor.stop();
            }
            if (port) {
                await port.close();
            }
            onWriteConsoleLine(intl.formatMessage(messages.serialDisconnected));
        } catch (error_) {
            const message = error_ && error_.message ? error_.message : String(error_);
            writeSerialError(messages.serialFailed, {message});
        } finally {
            onSetSerialConnected(false);
            onSetSerialBusy(false);
        }
    }, [
        intl,
        onSetSerialBusy,
        onSetSerialConnected,
        onWriteConsoleLine,
        writeSerialError
    ]);

    // 页面卸载时只释放串口资源，不再向已卸载组件写状态或控制台消息。
    useEffect(() => () => {
        const outputMonitor = serialOutputMonitorRef.current;
        const port = serialPortRef.current;
        serialOutputMonitorRef.current = null;
        serialPortRef.current = null;
        const stopPromise = outputMonitor ? outputMonitor.stop() : Promise.resolve();
        stopPromise.then(() => {
            if (port) return port.close();
            return null;
        }).catch(() => {});
    }, []);

    // AI 机甲产品使用 MicroPython Raw REPL 写入 main.py，设备端字节数校验通过后才报告成功。
    const handleSerialUpload = useCallback(async () => {
        const outputMonitor = serialOutputMonitorRef.current;
        if (!serialPortRef.current || !outputMonitor) {
            onWriteConsoleLine(intl.formatMessage(messages.serialUnavailable));
            return;
        }
        onSetSerialBusy(true);
        onWriteConsoleLine(intl.formatMessage(messages.serialUploading));
        try {
            setUploadProgress(0);
            const result = await uploadMicroPythonFile(outputMonitor, pythonCode, {
                onProgress: progress => setUploadProgress(progress)
            });
            onWriteConsoleLine(intl.formatMessage(messages.serialUploaded, {
                bytes: result.bytes,
                path: selectedPortLabelRef.current || serialPortPath || 'serial port'
            }));
        } catch (error_) {
            const errorMessage = error_ && error_.message ? error_.message : String(error_);
            const message = selectedPortLabelRef.current ?
                `${selectedPortLabelRef.current}: ${errorMessage}` :
                errorMessage;
            writeSerialError(messages.serialFailed, {message});
        } finally {
            onSetSerialBusy(false);
            setUploadProgress(null);
        }
    }, [
        intl,
        onSetSerialBusy,
        onWriteConsoleLine,
        pythonCode,
        serialPortPath,
        writeSerialError
    ]);

    return (
        <Box
            className={classNames(
                className,
                styles.menuBar
            )}
            aria-label={ariaLabel}
            role={ariaRole}
            element="header"
        >
            <div className={styles.mainMenu}>
                <div className={styles.fileGroup}>
                    <SettingsMenu
                        canChangeLanguage={canChangeLanguage}
                        isRtl={isRtl}
                        depth={depth}
                    />
                    {canManageFiles && (
                        <FileMenu
                            onStartSelectingFileUpload={onStartSelectingFileUpload}
                            onClickNew={handleClickNew}
                            onClickRemix={onClickRemix}
                            onClickSave={onClickSave}
                            getSaveToComputerHandler={getSaveToComputerHandler}
                            canSave={canSave}
                            canCreateCopy={canCreateCopy}
                            canRemix={canRemix}
                            isRtl={isRtl}
                            remixMessage={remixMessage}
                            depth={depth}
                        />
                    )}
                </div>
                <div className={styles.pythonSerialGroup}>
                    <span className={styles.pythonSerialLabel}>Serial</span>
                    <select
                        className={styles.pythonSerialSelect}
                        disabled={!serialApiAvailable || serialBusy || serialConnected}
                        value={serialPortPath}
                        onChange={handleSerialPortChange}
                    >
                        {serialPorts.length === 0 ? (
                            <option value="">
                                <FormattedMessage
                                    defaultMessage="Click Refresh to detect"
                                    description="Serial port select placeholder before Web Serial has been requested"
                                    id="gui.pythonCoding.serialDetectPrompt"
                                />
                            </option>
                        ) : serialPorts.map(port => (
                            <option
                                key={port.path}
                                value={port.path}
                            >
                                {port.portName || port.path}
                            </option>
                        ))}
                    </select>
                    <select
                        className={styles.pythonBaudSelect}
                        disabled={!serialApiAvailable || serialBusy || serialConnected}
                        value={serialBaudRate}
                        onChange={event => onSetSerialBaudRate(Number(event.target.value))}
                    >
                        {[9600, 19200, 38400, 57600, 115200].map(rate => (
                            <option
                                key={rate}
                                value={rate}
                            >
                                {rate}
                            </option>
                        ))}
                    </select>
                    <button
                        className={styles.pythonSerialButton}
                        disabled={!serialApiAvailable || serialBusy}
                        type="button"
                        onClick={handleRefreshSerialPorts}
                    >
                        Refresh
                    </button>
                    {serialConnected ? (
                        <button
                            className={styles.pythonSerialButton}
                            disabled={serialBusy}
                            type="button"
                            onClick={handleSerialDisconnect}
                        >
                            Disconnect
                        </button>
                    ) : (
                        <button
                            className={styles.pythonSerialButton}
                            disabled={!serialApiAvailable || serialBusy}
                            type="button"
                            onClick={handleSerialConnect}
                        >
                            Connect
                        </button>
                    )}
                    <button
                        className={styles.pythonSerialButton}
                        disabled={!serialApiAvailable || serialBusy || !serialConnected || !pythonCode.trim()}
                        type="button"
                        onClick={handleSerialUpload}
                    >
                        {uploadProgress === null ? (
                            <FormattedMessage
                                defaultMessage="Upload"
                                description="Button to upload Python code to the connected device"
                                id="gui.pythonCoding.serialUpload"
                            />
                        ) : (
                            <FormattedMessage
                                defaultMessage="Upload {progress}%"
                                description="Progress shown on the serial upload button"
                                id="gui.pythonCoding.serialUploadButtonProgress"
                                values={{progress: uploadProgress}}
                            />
                        )}
                    </button>
                </div>
            </div>
        </Box>
    );
};

PythonMenuBar.propTypes = {
    ariaLabel: PropTypes.string,
    ariaRole: PropTypes.string,
    canChangeColorMode: PropTypes.bool,
    canChangeLanguage: PropTypes.bool,
    canChangeTheme: PropTypes.bool,
    canCreateCopy: PropTypes.bool,
    canManageFiles: PropTypes.bool,
    canRemix: PropTypes.bool,
    canSave: PropTypes.bool,
    className: PropTypes.string,
    depth: PropTypes.number,
    getSaveToComputerHandler: PropTypes.func.isRequired,
    handleClickNew: PropTypes.func.isRequired,
    hasActiveMembership: PropTypes.bool,
    intl: intlShape.isRequired,
    isRtl: PropTypes.bool,
    onClickRemix: PropTypes.func,
    onClickSave: PropTypes.func,
    onSetSerialBaudRate: PropTypes.func.isRequired,
    onSetSerialBusy: PropTypes.func.isRequired,
    onSetSerialConnected: PropTypes.func.isRequired,
    onSetSerialPortPath: PropTypes.func.isRequired,
    onSetSerialPorts: PropTypes.func.isRequired,
    onWriteConsoleLine: PropTypes.func.isRequired,
    onStartSelectingFileUpload: PropTypes.func,
    remixMessage: PropTypes.node,
    pythonCode: PropTypes.string,
    serialBaudRate: PropTypes.number,
    serialBusy: PropTypes.bool,
    serialConnected: PropTypes.bool,
    serialPortPath: PropTypes.string,
    serialPorts: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.string,
        path: PropTypes.string
    }))
};

PythonMenuBar.defaultProps = {
    depth: 1,
    pythonCode: '',
    serialBaudRate: 115200,
    serialBusy: false,
    serialConnected: false,
    serialPortPath: '',
    serialPorts: []
};

// 从 Redux 读取串口选择、忙碌状态和当前生成的 Python 代码。
const mapStateToProps = state => ({
    pythonCode: state.scratchGui.pythonCoding.code,
    serialBaudRate: state.scratchGui.pythonCoding.serialBaudRate,
    serialBusy: state.scratchGui.pythonCoding.serialBusy,
    serialConnected: state.scratchGui.pythonCoding.serialConnected,
    serialPortPath: state.scratchGui.pythonCoding.serialPortPath,
    serialPorts: state.scratchGui.pythonCoding.serialPorts
});

// 把菜单操作转换成 Python 编码模式的 Redux 状态更新。
const mapDispatchToProps = dispatch => ({
    onSetSerialBaudRate: baudRate => dispatch(setSerialBaudRate(baudRate)),
    onSetSerialBusy: busy => dispatch(setSerialBusy(busy)),
    onSetSerialConnected: connected => dispatch(setSerialConnected(connected)),
    onSetSerialPortPath: path => dispatch(setSerialPortPath(path)),
    onSetSerialPorts: ports => dispatch(setSerialPorts(ports)),
    onWriteConsoleLine: consoleText => dispatch(appendPythonConsole(consoleText))
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(PythonMenuBar));

export {
    PythonMenuBar as PythonMenuBarComponent
};
