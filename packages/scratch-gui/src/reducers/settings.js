import {detectColorMode} from '../lib/settings/color-mode/persistence';
import {detectFontSize} from '../lib/settings/font-size/persistence';
import {detectTheme} from '../lib/settings/theme/persistence';

const SET_COLOR_MODE = 'scratch-gui/settings/SET_COLOR_MODE';
const SET_FONT_SIZE = 'scratch-gui/settings/SET_FONT_SIZE';
const SET_THEME = 'scratch-gui/settings/SET_THEME';

const initialState = {
    colorMode: detectColorMode(),
    fontSize: detectFontSize(),
    theme: detectTheme()
};

const reducer = (state = initialState, action) => {
    switch (action.type) {
    case SET_COLOR_MODE:
        return {...state, colorMode: action.colorMode};
    case SET_FONT_SIZE:
        return {...state, fontSize: action.fontSize};
    case SET_THEME:
        return {...state, theme: action.theme};
    default:
        return state;
    }
};

const setColorMode = colorMode => ({
    type: SET_COLOR_MODE,
    colorMode
});

const setFontSize = fontSize => ({
    type: SET_FONT_SIZE,
    fontSize
});

const setTheme = theme => ({
    type: SET_THEME,
    theme
});

export {
    reducer as default,
    initialState as settingsInitialState,
    setColorMode,
    setFontSize,
    setTheme
};
