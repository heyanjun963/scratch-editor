import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage} from 'react-intl';

import Box from '../box/box.jsx';
import PythonTerminal from '../python-terminal/python-terminal.jsx';

import styles from './python-coding-panel.css';

const PythonCodingPanel = ({
    code,
    desktopApiAvailable,
    error,
    hasConsoleOutput,
    isRunning,
    lastExitCode,
    onClearConsole,
    onTerminalResize,
    onRun,
    onStop,
    scriptPath,
    terminalRef
}) => (
    <Box
        className={styles.pythonCodingPanel}
        element="section"
    >
        <Box className={styles.editorHeader}>
            <span>
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
        <Box className={styles.consoleHeader}>
            <FormattedMessage
                defaultMessage="Console"
                description="Header for the Python coding mode console area"
                id="gui.pythonCoding.consoleHeader"
            />
        </Box>
        <PythonTerminal
            ref={terminalRef}
            onResize={onTerminalResize}
        />
    </Box>
);

PythonCodingPanel.propTypes = {
    code: PropTypes.string,
    desktopApiAvailable: PropTypes.bool,
    error: PropTypes.string,
    hasConsoleOutput: PropTypes.bool,
    isRunning: PropTypes.bool,
    lastExitCode: PropTypes.number,
    onClearConsole: PropTypes.func,
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
    onTerminalResize: null,
    onRun: null,
    onStop: null,
    scriptPath: null,
    terminalRef: null
};

export default PythonCodingPanel;
