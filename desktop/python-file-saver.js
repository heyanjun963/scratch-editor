const fs = require('fs');

const MAX_PYTHON_CODE_BYTES = 5 * 1024 * 1024;

// 将工程标题转换成 Windows、macOS 和 Linux 都可用的 Python 文件名。
const sanitizePythonFilename = suggestedName => {
    const sourceName = typeof suggestedName === 'string' ? suggestedName.trim() : '';
    const withoutExtension = sourceName.replace(/\.(?:py|sb|sb2|sb3)$/i, '');
    const safeBaseName = withoutExtension
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
        .replace(/[. ]+$/g, '')
        .slice(0, 120);
    return `${safeBaseName || 'project'}.py`;
};

// 弹出本机保存对话框并以 UTF-8 写入生成的 Python 代码。
const savePythonFile = async ({
    browserWindow,
    code,
    dialog,
    suggestedName,
    writeFile = fs.promises.writeFile
} = {}) => {
    if (typeof code !== 'string') {
        throw new TypeError('Python code must be a string.');
    }
    if (Buffer.byteLength(code, 'utf8') > MAX_PYTHON_CODE_BYTES) {
        throw new Error('Python code is too large to save.');
    }
    if (!dialog || typeof dialog.showSaveDialog !== 'function') {
        throw new TypeError('A save dialog implementation is required.');
    }

    const result = await dialog.showSaveDialog(browserWindow, {
        title: 'Save Python Code',
        defaultPath: sanitizePythonFilename(suggestedName),
        filters: [{name: 'Python', extensions: ['py']}]
    });
    if (result.canceled || !result.filePath) {
        return {canceled: true};
    }

    await writeFile(result.filePath, code, 'utf8');
    return {canceled: false, filePath: result.filePath};
};

module.exports = {
    MAX_PYTHON_CODE_BYTES,
    sanitizePythonFilename,
    savePythonFile
};
