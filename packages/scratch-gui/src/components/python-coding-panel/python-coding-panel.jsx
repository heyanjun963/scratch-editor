import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {FormattedMessage} from 'react-intl';

import Box from '../box/box.jsx';
import PythonTerminal from '../python-terminal/python-terminal.jsx';

import styles from './python-coding-panel.css';

const MIN_CONSOLE_HEIGHT = 120;
const MIN_EDITOR_HEIGHT = 160;
const KEYBOARD_RESIZE_STEP = 16;

// 把控制台高度限制在控制台最小高度与代码区最小高度共同允许的范围内。
const clampConsoleHeight = (panelRect, requestedHeight) => Math.min(
    Math.max(requestedHeight, MIN_CONSOLE_HEIGHT),
    Math.max(MIN_CONSOLE_HEIGHT, panelRect.height - MIN_EDITOR_HEIGHT)
);

// 展示 Python 代码、运行状态和可调节高度的 xterm 控制台。
const PythonCodingPanel = ({
    code,
    desktopApiAvailable,
    error,
    hasConsoleOutput,
    isRunning,
    lastExitCode,
    onClearConsole,
    onTerminalInput,
    onTerminalResize,
    onRun,
    onStop,
    scriptPath,
    terminalRef
}) => {
    const panelRef = useRef(null);
    const removeDragListenersRef = useRef(null);
    const [consoleHeight, setConsoleHeight] = useState(null);

    // 根据鼠标在面板中的纵向位置换算控制台高度，并应用上下限。
    const resizeConsoleAt = useCallback(clientY => {
        if (!panelRef.current) return;
        const panelRect = panelRef.current.getBoundingClientRect();
        setConsoleHeight(clampConsoleHeight(panelRect, panelRect.bottom - clientY));
    }, []);

    // 结束拖拽并移除 document 级监听，防止切换页面后残留事件。
    const stopDragging = useCallback(() => {
        if (removeDragListenersRef.current) {
            removeDragListenersRef.current();
            removeDragListenersRef.current = null;
        }
    }, []);

    // 开始拖拽后在 document 上跟踪鼠标，确保指针移出分隔条仍能连续调整。
    const handleResizeMouseDown = useCallback(event => {
        event.preventDefault();
        stopDragging();
        resizeConsoleAt(event.clientY);
        const handleMouseMove = moveEvent => resizeConsoleAt(moveEvent.clientY);
        const handleMouseUp = () => stopDragging();
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        removeDragListenersRef.current = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [
        resizeConsoleAt,
        stopDragging
    ]);

    // 分隔条获得焦点时支持方向键按固定步长调整控制台高度。
    const handleResizeKeyDown = useCallback(event => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        if (!panelRef.current) return;
        event.preventDefault();
        const panelRect = panelRef.current.getBoundingClientRect();
        const currentHeight = consoleHeight === null ? panelRect.height * 0.35 : consoleHeight;
        const delta = event.key === 'ArrowUp' ? KEYBOARD_RESIZE_STEP : -KEYBOARD_RESIZE_STEP;
        setConsoleHeight(clampConsoleHeight(panelRect, currentHeight + delta));
    }, [consoleHeight]);

    // 组件卸载时终止可能仍在进行的拖拽，清理 document 监听。
    useEffect(() => stopDragging, [stopDragging]);

    const consolePaneStyle = consoleHeight === null ? undefined : {
        flexBasis: `${consoleHeight}px`,
        height: `${consoleHeight}px`
    };

    return (
        <Box
            aria-labelledby="python-code-header"
            className={styles.pythonCodingPanel}
            componentRef={node => {
                panelRef.current = node;
            }}
            element="section"
        >
            <Box className={styles.editorHeader}>
                <span id="python-code-header">
                    <FormattedMessage
                        defaultMessage="Python Code"
                        description="Header for the Python coding mode code area"
                        id="gui.pythonCoding.codeHeader"
                    />
                </span>
                <Box className={styles.editorActions}>
                    <button
                        className={styles.actionButton}
                        disabled={!desktopApiAvailable || isRunning || !code.trim()}
                        type="button"
                        onClick={onRun}
                    >
                        <FormattedMessage
                            defaultMessage="Run"
                            description="Button to run generated Python code"
                            id="gui.pythonCoding.run"
                        />
                    </button>
                    <button
                        className={styles.actionButton}
                        disabled={!desktopApiAvailable || !isRunning}
                        type="button"
                        onClick={onStop}
                    >
                        <FormattedMessage
                            defaultMessage="Stop"
                            description="Button to stop running Python code"
                            id="gui.pythonCoding.stop"
                        />
                    </button>
                    <button
                        className={styles.actionButton}
                        disabled={!hasConsoleOutput}
                        type="button"
                        onClick={onClearConsole}
                    >
                        <FormattedMessage
                            defaultMessage="Clear"
                            description="Button to clear the Python console"
                            id="gui.pythonCoding.clear"
                        />
                    </button>
                </Box>
            </Box>
            <Box className={styles.statusRow}>
                {isRunning ? (
                    <FormattedMessage
                        defaultMessage="Running local Python..."
                        description="Status shown while local Python code is running"
                        id="gui.pythonCoding.runningStatus"
                    />
                ) : error ? (
                    <FormattedMessage
                        defaultMessage="Error: {error}"
                        description="Status shown when local Python running fails"
                        id="gui.pythonCoding.errorStatus"
                        values={{error}}
                    />
                ) : lastExitCode !== null ? (
                    <FormattedMessage
                        defaultMessage="Last exit code: {exitCode}"
                        description="Status shown after local Python exits"
                        id="gui.pythonCoding.exitCodeStatus"
                        values={{exitCode: lastExitCode}}
                    />
                ) : !desktopApiAvailable ? (
                    <FormattedMessage
                        defaultMessage="Desktop app required to run local Python."
                        description="Status shown when local Python is unavailable outside Electron"
                        id="gui.pythonCoding.desktopRequiredStatus"
                    />
                ) : scriptPath ? (
                    <FormattedMessage
                        defaultMessage="Script: {scriptPath}"
                        description="Status showing generated Python script path"
                        id="gui.pythonCoding.scriptPathStatus"
                        values={{scriptPath}}
                    />
                ) : (
                    <FormattedMessage
                        defaultMessage="Ready"
                        description="Status shown when Python code can be run"
                        id="gui.pythonCoding.readyStatus"
                    />
                )}
            </Box>
            <textarea
                readOnly
                className={styles.codeArea}
                spellCheck={false}
                value={code}
            />
            <Box
                aria-labelledby="python-console-header"
                className={styles.consolePane}
                role="group"
                style={consolePaneStyle}
            >
                <div
                    aria-labelledby="python-console-header"
                    aria-orientation="horizontal"
                    className={styles.consoleResizeHandle}
                    role="separator"
                    tabIndex={0}
                    onKeyDown={handleResizeKeyDown}
                    onMouseDown={handleResizeMouseDown}
                />
                <Box
                    className={styles.consoleHeader}
                    id="python-console-header"
                >
                    <FormattedMessage
                        defaultMessage="Console"
                        description="Header for the Python coding mode console area"
                        id="gui.pythonCoding.consoleHeader"
                    />
                </Box>
                <PythonTerminal
                    ref={terminalRef}
                    onInput={onTerminalInput}
                    onResize={onTerminalResize}
                />
            </Box>
        </Box>
    );
};

PythonCodingPanel.propTypes = {
    code: PropTypes.string,
    desktopApiAvailable: PropTypes.bool,
    error: PropTypes.string,
    hasConsoleOutput: PropTypes.bool,
    isRunning: PropTypes.bool,
    lastExitCode: PropTypes.number,
    onClearConsole: PropTypes.func,
    onTerminalInput: PropTypes.func,
    onTerminalResize: PropTypes.func,
    onRun: PropTypes.func,
    onStop: PropTypes.func,
    scriptPath: PropTypes.string,
    terminalRef: PropTypes.shape({
        current: PropTypes.any
    })
};

PythonCodingPanel.defaultProps = {
    code: '',
    desktopApiAvailable: false,
    error: null,
    hasConsoleOutput: false,
    isRunning: false,
    lastExitCode: null,
    onClearConsole: null,
    onTerminalInput: null,
    onTerminalResize: null,
    onRun: null,
    onStop: null,
    scriptPath: null,
    terminalRef: null
};

export default PythonCodingPanel;
