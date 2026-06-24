const UPDATE_PYTHON_CODE = 'scratch-gui/python-coding/UPDATE_PYTHON_CODE';
const APPEND_PYTHON_CONSOLE = 'scratch-gui/python-coding/APPEND_PYTHON_CONSOLE';

const maxConsoleLines = 200;

const initialState = {
    code: '',
    consoleText: ''
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

export {
    reducer as default,
    initialState as pythonCodingInitialState,
    updatePythonCode,
    appendPythonConsole
};
