const UPDATE_PYTHON_CODE = 'scratch-gui/python-coding/UPDATE_PYTHON_CODE';
const APPEND_PYTHON_CONSOLE = 'scratch-gui/python-coding/APPEND_PYTHON_CONSOLE';
const CLEAR_PYTHON_CONSOLE = 'scratch-gui/python-coding/CLEAR_PYTHON_CONSOLE';
const SET_PYTHON_RUNNING = 'scratch-gui/python-coding/SET_PYTHON_RUNNING';
const SET_PYTHON_SCRIPT_PATH = 'scratch-gui/python-coding/SET_PYTHON_SCRIPT_PATH';
const SET_PYTHON_EXIT_CODE = 'scratch-gui/python-coding/SET_PYTHON_EXIT_CODE';
const SET_PYTHON_ERROR = 'scratch-gui/python-coding/SET_PYTHON_ERROR';

const maxConsoleLines = 200;

const initialState = {
    code: '',
    consoleText: '',
    isRunning: false,
    scriptPath: null,
    lastExitCode: null,
    error: null
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case UPDATE_PYTHON_CODE:
        return Object.assign({}, state, {
            code: action.code
        });
    case APPEND_PYTHON_CONSOLE: {
        const nextConsoleText = [
            state.consoleText,
            action.consoleText
        ].filter(Boolean).join('\n');
        const lines = nextConsoleText.split('\n');
        return Object.assign({}, state, {
            consoleText: lines.slice(Math.max(lines.length - maxConsoleLines, 0)).join('\n')
        });
    }
    case CLEAR_PYTHON_CONSOLE:
        return Object.assign({}, state, {
            consoleText: '',
            lastExitCode: null,
            error: null
        });
    case SET_PYTHON_RUNNING:
        return Object.assign({}, state, {
            isRunning: action.isRunning
        });
    case SET_PYTHON_SCRIPT_PATH:
        return Object.assign({}, state, {
            scriptPath: action.scriptPath
        });
    case SET_PYTHON_EXIT_CODE:
        return Object.assign({}, state, {
            lastExitCode: action.exitCode
        });
    case SET_PYTHON_ERROR:
        return Object.assign({}, state, {
            error: action.error
        });
    default:
        return state;
    }
};

const updatePythonCode = function (code) {
    return {
        type: UPDATE_PYTHON_CODE,
        code
    };
};

const appendPythonConsole = function (consoleText) {
    return {
        type: APPEND_PYTHON_CONSOLE,
        consoleText
    };
};

const clearPythonConsole = function () {
    return {
        type: CLEAR_PYTHON_CONSOLE
    };
};

const setPythonRunning = function (isRunning) {
    return {
        type: SET_PYTHON_RUNNING,
        isRunning
    };
};

const setPythonScriptPath = function (scriptPath) {
    return {
        type: SET_PYTHON_SCRIPT_PATH,
        scriptPath
    };
};

const setPythonExitCode = function (exitCode) {
    return {
        type: SET_PYTHON_EXIT_CODE,
        exitCode
    };
};

const setPythonError = function (error) {
    return {
        type: SET_PYTHON_ERROR,
        error
    };
};

export {
    reducer as default,
    initialState as pythonCodingInitialState,
    updatePythonCode,
    appendPythonConsole,
    clearPythonConsole,
    setPythonRunning,
    setPythonScriptPath,
    setPythonExitCode,
    setPythonError
};
