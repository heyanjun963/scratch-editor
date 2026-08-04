const MIN_BLOCKS_PANEL_WIDTH = 480;
const MIN_PYTHON_PANEL_WIDTH = 400;
const DEFAULT_PYTHON_PANEL_RATIO = 0.4;

// 在保证积木区和 Python 区最小宽度的范围内计算代码区宽度。
const clampPythonPanelWidth = (containerWidth, requestedWidth, separatorWidth = 0) => {
    const availableWidth = Math.max(0, containerWidth - separatorWidth);
    const minimumWidth = Math.min(MIN_PYTHON_PANEL_WIDTH, availableWidth);
    const maximumWidth = Math.max(minimumWidth, availableWidth - MIN_BLOCKS_PANEL_WIDTH);
    return Math.min(Math.max(requestedWidth, minimumWidth), maximumWidth);
};

const getDefaultPythonPanelWidth = (containerWidth, separatorWidth = 0) => clampPythonPanelWidth(
    containerWidth,
    containerWidth * DEFAULT_PYTHON_PANEL_RATIO,
    separatorWidth
);

export {
    clampPythonPanelWidth,
    getDefaultPythonPanelWidth,
    MIN_BLOCKS_PANEL_WIDTH,
    MIN_PYTHON_PANEL_WIDTH
};
