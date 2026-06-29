import PropTypes from 'prop-types';
import React, {useCallback, useEffect} from 'react';
import {defineMessages, injectIntl} from 'react-intl';
import {connect} from 'react-redux';

import PythonCodingPanelComponent from '../components/python-coding-panel/python-coding-panel.jsx';
import intlShape from '../lib/intlShape.js';
import {
    appendPythonConsole,
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

const getDesktopPythonApi = () => {
    if (typeof window === 'undefined') return null;
    return window.scratchDesktopPython || null;
};

const getDesktopTabId = () => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('desktopTabId');
};

const normalizeOutputText = text => (
    String(text || '').replace(/\r\n/g, '\n').replace(/\n$/, '')
);

const PythonCodingPanel = props => {
    const {
        code,
        consoleText,
        error,
        intl,
        isRunning,
        lastExitCode,
        onAppendConsole,
        onClearConsole,
        onSetError,
        onSetExitCode,
        onSetRunning,
        onSetScriptPath,
        scriptPath
    } = props;
    const desktopPythonApi = getDesktopPythonApi();
    const desktopTabId = getDesktopTabId();
    const desktopApiAvailable = Boolean(desktopPythonApi);

    useEffect(() => {
        if (!desktopPythonApi) return undefined;
        const removeOutputListener = desktopPythonApi.onOutput(data => {
            if (data.tabId !== desktopTabId) return;
            const outputText = normalizeOutputText(data.text);
            if (outputText) {
                onAppendConsole(outputText);
            }
        });
        const removeExitListener = desktopPythonApi.onExit(data => {
            if (data.tabId !== desktopTabId) return;
            onSetRunning(false);
            onSetExitCode(data.exitCode);
            if (data.scriptPath) {
                onSetScriptPath(data.scriptPath);
            }
            onAppendConsole(data.signal ?
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
        intl,
        onAppendConsole,
        onSetExitCode,
        onSetRunning,
        onSetScriptPath
    ]);

    const handleRun = useCallback(async () => {
        if (!desktopPythonApi) {
            onAppendConsole(intl.formatMessage(messages.noDesktopPython));
            return;
        }
        if (!code.trim()) {
            onAppendConsole(intl.formatMessage(messages.noCode));
            return;
        }

        onClearConsole();
        onSetError(null);
        onSetExitCode(null);
        onSetRunning(true);
        onAppendConsole(intl.formatMessage(messages.starting));

        try {
            const result = await desktopPythonApi.run({
                tabId: desktopTabId,
                code
            });
            if (result.scriptPath) {
                onSetScriptPath(result.scriptPath);
                onAppendConsole(intl.formatMessage(messages.scriptPath, {
                    scriptPath: result.scriptPath
                }));
            }
        } catch (error_) {
            const message = error_ && error_.message ? error_.message : String(error_);
            onSetRunning(false);
            onSetError(message);
            onAppendConsole(intl.formatMessage(messages.runFailed, {message}));
        }
    }, [
        code,
        desktopPythonApi,
        desktopTabId,
        intl,
        onAppendConsole,
        onClearConsole,
        onSetError,
        onSetExitCode,
        onSetRunning,
        onSetScriptPath
    ]);

    const handleStop = useCallback(async () => {
        if (!desktopPythonApi) return;
        await desktopPythonApi.stop(desktopTabId);
        onAppendConsole(intl.formatMessage(messages.stopped));
    }, [
        desktopPythonApi,
        desktopTabId,
        intl,
        onAppendConsole
    ]);

    return (
        <PythonCodingPanelComponent
            code={code}
            consoleText={consoleText}
            desktopApiAvailable={desktopApiAvailable}
            error={error}
            isRunning={isRunning}
            lastExitCode={lastExitCode}
            scriptPath={scriptPath}
            onClearConsole={onClearConsole}
            onRun={handleRun}
            onStop={handleStop}
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
    onAppendConsole: PropTypes.func.isRequired,
    onClearConsole: PropTypes.func.isRequired,
    onSetError: PropTypes.func.isRequired,
    onSetExitCode: PropTypes.func.isRequired,
    onSetRunning: PropTypes.func.isRequired,
    onSetScriptPath: PropTypes.func.isRequired,
    scriptPath: PropTypes.string
};

const mapStateToProps = state => ({
    code: state.scratchGui.pythonCoding.code,
    consoleText: state.scratchGui.pythonCoding.consoleText,
    error: state.scratchGui.pythonCoding.error,
    isRunning: state.scratchGui.pythonCoding.isRunning,
    lastExitCode: state.scratchGui.pythonCoding.lastExitCode,
    scriptPath: state.scratchGui.pythonCoding.scriptPath
});

const mapDispatchToProps = dispatch => ({
    onAppendConsole: consoleText => dispatch(appendPythonConsole(consoleText)),
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
