import {DEFAULT_FONT_SIZE, isValidFontSize} from '.';

const STORAGE_KEY = 'scratchGuiFontSize';

// 从本地设置恢复全局字号；无效或不可访问的存储不会阻止编辑器启动。
const detectFontSize = () => {
    try {
        const fontSize = Number(window.localStorage.getItem(STORAGE_KEY));
        return isValidFontSize(fontSize) ? fontSize : DEFAULT_FONT_SIZE;
    } catch (error) {
        console.warn('detectFontSize: unable to read font size from localStorage', error);
        return DEFAULT_FONT_SIZE;
    }
};

// 保存用户输入的具体像素值，刷新编辑器后继续使用。
const persistFontSize = fontSize => {
    if (!isValidFontSize(fontSize)) {
        throw new Error(`Invalid font size: ${fontSize}`);
    }

    try {
        window.localStorage.setItem(STORAGE_KEY, String(fontSize));
    } catch (error) {
        console.warn('persistFontSize: unable to save font size to localStorage', error);
    }
};

export {
    detectFontSize,
    persistFontSize
};
