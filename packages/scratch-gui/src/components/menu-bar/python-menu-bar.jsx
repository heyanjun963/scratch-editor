import classNames from 'classnames';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useRef} from 'react';
import {defineMessages, FormattedMessage, injectIntl} from 'react-intl';

import Box from '../box/box.jsx';
import SettingsMenu from './settings-menu.jsx';
import FileMenu from './file-menu.jsx';
import intlShape from '../../lib/intlShape.js';
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
        defaultMessage: '[serial] Uploaded {bytes} bytes to {path}.',
        description: 'Console message shown when serial upload succeeds'
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

const getDesktopSerialApi = () => {
    if (typeof window === 'undefined') return null;
    return window.scratchDesktopSerial || null;
};

// Web Serial 由 Chromium 提供，必须由用户手势触发 requestPort。
const getWebSerialApi = () => {
    if (typeof navigator === 'undefined') return null;
    return navigator.serial || null;
};

const portLabel = port => port.label || port.portName || port.displayName || port.path || '';

const pickPreferredPort = (ports, selectedPath) => {
    if (selectedPath) {
        const selected = ports.find(port => port.path === selectedPath);
        if (selected) return selected;
    }
    return ports[0] || null;
};

const colorStderr = text => `\u001b[31m${text}\u001b[0m`;

// Python 模式专用头部菜单：只保留设置、文件和串口相关操作。
const PythonMenuBar = ({
    ariaLabel,
    ariaRole,
    canChangeColorMode,
    canChangeLanguage,
    canChangeTheme,
    canCreateCopy,
    canManageFiles,
    canRemix,
    canSave,
    className,
    depth,
    getSaveToComputerHandler,
    handleClickNew,
    hasActiveMembership,
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
    const serialPortPathRef = useRef(serialPortPath);
    const selectedPortLabelRef = useRef('');

    // 串口错误统一写入 Python 控制台，并用 ANSI 红色显示。
    const writeSerialError = useCallback((message, values) => {
        onWriteConsoleLine(colorStderr(intl.formatMessage(message, values)));
    }, [
        intl,
        onWriteConsoleLine
    ]);

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

    // 连接阶段再次调用 requestPort 是 Web Serial 的授权要求，当前实现还不是自动直连指定 COM。
    const handleSerialConnect = useCallback(async () => {
        if (!serialApiAvailable) {
            onWriteConsoleLine(intl.formatMessage(messages.serialUnavailable));
            return;
        }
        onSetSerialBusy(true);
        try {
            const selectedPort = await webSerialApi.requestPort();
            const selectedPortInfo = selectedPort.getInfo();
            await selectedPort.open({baudRate: serialBaudRate});
            serialPortRef.current = selectedPort;
            onSetSerialConnected(true);
            onWriteConsoleLine(intl.formatMessage(messages.serialConnected, {
                path: selectedPortLabelRef.current || serialPortPath || selectedPortInfo.usbVendorId || 'serial port',
                baudRate: serialBaudRate
            }));
        } catch (error_) {
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
        webSerialApi,
        writeSerialError
    ]);

    // 断开时关闭 Web Serial Port，并清掉当前连接引用。
    const handleSerialDisconnect = useCallback(async () => {
        onSetSerialBusy(true);
        try {
            const port = serialPortRef.current;
            serialPortRef.current = null;
            if (port) {
                await port.close();
            }
            onSetSerialConnected(false);
            onWriteConsoleLine(intl.formatMessage(messages.serialDisconnected));
        } catch (error_) {
            const message = error_ && error_.message ? error_.message : String(error_);
            writeSerialError(messages.serialFailed, {message});
        } finally {
            onSetSerialBusy(false);
        }
    }, [
        intl,
        onSetSerialBusy,
        onSetSerialConnected,
        onWriteConsoleLine,
        writeSerialError
    ]);

    // MVP 上传只是把生成的 Python 文本写入串口；后续硬件烧录协议需要在这里替换。
    const handleSerialUpload = useCallback(async () => {
        if (!serialPortRef.current) {
            onWriteConsoleLine(intl.formatMessage(messages.serialUnavailable));
            return;
        }
        onSetSerialBusy(true);
        try {
            const writer = serialPortRef.current.writable.getWriter();
            const bytes = new TextEncoder().encode(`${pythonCode}\n`);
            try {
                await writer.write(bytes);
            } finally {
                writer.releaseLock();
            }
            onWriteConsoleLine(intl.formatMessage(messages.serialUploaded, {
                bytes: bytes.byteLength,
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
                    {(canChangeColorMode || canChangeLanguage || canChangeTheme) && (
                        <SettingsMenu
                            canChangeLanguage={canChangeLanguage}
                            canChangeColorMode={canChangeColorMode}
                            canChangeTheme={canChangeTheme}
                            hasActiveMembership={hasActiveMembership}
                            isRtl={isRtl}
                            depth={depth}
                        />
                    )}
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
                        Upload
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

const mapStateToProps = state => ({
    pythonCode: state.scratchGui.pythonCoding.code,
    serialBaudRate: state.scratchGui.pythonCoding.serialBaudRate,
    serialBusy: state.scratchGui.pythonCoding.serialBusy,
    serialConnected: state.scratchGui.pythonCoding.serialConnected,
    serialPortPath: state.scratchGui.pythonCoding.serialPortPath,
    serialPorts: state.scratchGui.pythonCoding.serialPorts
});

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
