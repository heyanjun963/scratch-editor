const {BrowserWindow, Menu, WebContentsView, app, dialog, session, shell, systemPreferences} = require('electron');
const fs = require('fs');
const path = require('path');
const {pathToFileURL} = require('url');
const PythonRunner = require('./python-runner');
const {selectPreferredSerialPort} = require('./serial-port-selection');
const TerminalRunner = require('./terminal-runner');

// Electron 主进程入口：负责桌面窗口、浏览器式标签页、本机 Python、串口和本地拓展库 IPC。
const defaultSize = {width: 1280, height: 800};
const titleBarHeight = 40;
const port = process.env.PORT || 8601;

const isDevelopment = !app.isPackaged && process.env.NODE_ENV !== 'production';
const allowedExternalProtocols = ['http:', 'https:', 'mailto:'];

const devToolKey = process.platform === 'darwin' ?
    {alt: true, control: false, meta: true, shift: false, code: 'KeyI'} :
    {alt: false, control: true, meta: false, shift: true, code: 'KeyI'};

let mainWindow = null;
let shellView = null;
let homeView = null;
let loadingView = null;
let activeTabId = null;
let nextTabIndex = 1;
let pythonRunner = null;
let terminalRunner = null;

const tabs = new Map();
const editorViews = new Map();
const editorWebContentsIds = new Set();
const editorWebContentsTabIds = new Map();
const preferredSerialPortIds = new Map();

app.commandLine.appendSwitch('host-resolver-rules', 'MAP device-manager.scratch.mit.edu 127.0.0.1');

process.on('uncaughtException', error => {
    console.error('[desktop-main] Uncaught exception');
    console.error(error);
});

process.on('unhandledRejection', error => {
    console.error('[desktop-main] Unhandled rejection');
    console.error(error);
});

const getAppUrl = () => {
    if (process.env.SCRATCH_DESKTOP_URL) {
        return process.env.SCRATCH_DESKTOP_URL;
    }

    if (isDevelopment) {
        return `http://127.0.0.1:${port}/`;
    }

    return pathToFileURL(path.join(app.getAppPath(), 'packages', 'scratch-gui', 'build', 'index.html')).toString();
};

// 打包后桌面壳资源会跟随 app 路径；开发环境直接读 desktop 目录。
const getDesktopAssetPath = (...segments) => (
    isDevelopment ?
        path.join(__dirname, ...segments) :
        path.join(app.getAppPath(), 'desktop', ...segments)
);

const getShellUrl = () => pathToFileURL(getDesktopAssetPath('shell', 'index.html')).toString();
const getHomeUrl = () => pathToFileURL(getDesktopAssetPath('home', 'index.html')).toString();
const getLoadingUrl = () => pathToFileURL(getDesktopAssetPath('loading', 'index.html')).toString();
const getAllowedSerialOrigins = () => {
    const origins = new Set(['file://']);
    try {
        origins.add(new URL(getAppUrl()).origin);
    } catch {
        // Ignore malformed override URLs. Serial permission will fall back to denied.
    }
    return origins;
};

// Web Serial 给到的信息在不同驱动上差异很大，这里统一拼成可搜索标签。
const getSerialPortLabel = port => [
    port.portName,
    port.displayName,
    port.portId
].filter(Boolean).join(' ');

const getCustomExtensionLibrariesFilePath = () => path.join(
    app.getPath('userData'),
    'custom-extension-libraries',
    'libraries.json'
);

const readCustomExtensionLibraries = async () => {
    try {
        const raw = await fs.promises.readFile(getCustomExtensionLibrariesFilePath(), 'utf8');
        const manifests = JSON.parse(raw);
        return {
            manifests: Array.isArray(manifests) ? manifests : []
        };
    } catch (error) {
        if (error && error.code === 'ENOENT') {
            return {manifests: []};
        }
        throw error;
    }
};

// 本地拓展库在桌面端落盘到 userData，避免只存在浏览器 localStorage。
const writeCustomExtensionLibraries = async manifests => {
    if (!Array.isArray(manifests)) {
        throw new Error('Custom extension libraries must be an array.');
    }
    const filePath = getCustomExtensionLibrariesFilePath();
    await fs.promises.mkdir(path.dirname(filePath), {recursive: true});
    await fs.promises.writeFile(filePath, JSON.stringify(manifests, null, 2), 'utf8');
    return {ok: true};
};

// 串口信息在不同 Windows 驱动里不稳定，这里不做过滤，先完整交给前端展示。
const getSelectableSerialPorts = portList => {
    const ports = portList.map(port => ({
        portId: port.portId,
        portName: port.portName,
        displayName: port.displayName,
        vendorId: port.vendorId,
        productId: port.productId
    }));
    return ports;
};

// 桌面端 tab 的 mode 会透传到 GUI，用来决定舞台模式或 Python 编码模式。
const editorModes = {
    stage: {
        mode: 'stage',
        titlePrefix: 'New Stage Project'
    },
    code: {
        mode: 'code',
        titlePrefix: 'New Python Project'
    }
};

const normalizeEditorMode = mode => {
    if (mode === 'code') return editorModes.code.mode;
    return editorModes.stage.mode;
};

const createEditorUrl = tab => {
    const url = new URL(getAppUrl());
    url.searchParams.set('desktopTabId', tab.id);
    url.searchParams.set('desktopMode', tab.mode);
    return url.toString();
};

// shell 顶栏只消费轻量 tab 状态，真正的编辑器 WebContentsView 独立保存。
const getTabList = () => Array.from(tabs.values()).map(tab => ({
    id: tab.id,
    title: tab.title,
    mode: tab.mode,
    dirty: tab.dirty,
    loading: tab.loading,
    crashed: tab.crashed,
    active: tab.id === activeTabId
}));

const broadcastTabsChanged = () => {
    if (!shellView || shellView.webContents.isDestroyed()) return;
    shellView.webContents.send('tabs:changed', {
        tabs: getTabList(),
        activeTabId
    });
};

const markEditorReady = webContents => {
    const tabId = editorWebContentsTabIds.get(webContents.id);
    const tab = tabs.get(tabId);
    if (!tab) return;
    tab.loading = false;
    layoutViews();
    broadcastTabsChanged();
};

const getContentSize = () => {
    if (!mainWindow) return {width: defaultSize.width, height: defaultSize.height};
    const bounds = mainWindow.getContentBounds();
    return {width: bounds.width, height: bounds.height};
};

const getEditorBounds = () => {
    const {width, height} = getContentSize();
    return {
        x: 0,
        y: titleBarHeight,
        width,
        height: Math.max(0, height - titleBarHeight)
    };
};

// WebContentsView 没有 display:none，隐藏非活动视图时移到屏幕外。
const hiddenEditorBounds = () => ({
    x: -10000,
    y: titleBarHeight,
    width: 10,
    height: 10
});

const layoutViews = () => {
    if (!mainWindow || !shellView) return;
    const {width} = getContentSize();
    const activeTab = tabs.get(activeTabId);
    const showLoading = Boolean(activeTab && activeTab.loading);

    shellView.setBounds({
        x: 0,
        y: 0,
        width,
        height: titleBarHeight
    });

    if (homeView) {
        homeView.setBounds(activeTabId === null ? getEditorBounds() : hiddenEditorBounds());
    }

    if (loadingView) {
        loadingView.setBounds(showLoading ? getEditorBounds() : hiddenEditorBounds());
    }

    for (const [tabId, editorView] of editorViews) {
        const tab = tabs.get(tabId);
        const isVisible = tabId === activeTabId && tab && !tab.loading;
        editorView.setBounds(isVisible ? getEditorBounds() : hiddenEditorBounds());
    }
};

const askForMediaAccess = mediaType => {
    if (systemPreferences.askForMediaAccess) {
        return systemPreferences.askForMediaAccess(mediaType);
    }
    return true;
};

const showPermissionWarning = (browserWindow, permissionType) => {
    const label = permissionType === 'microphone' ? 'Microphone' : 'Camera';
    dialog.showMessageBox(browserWindow, {
        type: 'warning',
        title: `${label} Permission Denied`,
        message: `${label} permission was denied. Scratch may not be able to use related features.`
    });
};

// 只允许编辑器主 frame 申请媒体和串口权限，避免外链或子 frame 越权。
const handlePermissionRequest = async (webContents, permission, callback, details) => {
    if (!mainWindow || !editorWebContentsIds.has(webContents.id)) return callback(false);
    if (permission === 'serial') return callback(true);
    if (!details.isMainFrame || permission !== 'media') return callback(false);

    let askForMicrophone = false;
    let askForCamera = false;
    for (const mediaType of details.mediaTypes) {
        if (mediaType === 'audio') askForMicrophone = true;
        else if (mediaType === 'video') askForCamera = true;
        else return callback(false);
    }

    if (askForMicrophone && !(await askForMediaAccess('microphone'))) {
        showPermissionWarning(mainWindow, 'microphone');
        return callback(false);
    }

    if (askForCamera && !(await askForMediaAccess('camera'))) {
        showPermissionWarning(mainWindow, 'camera');
        return callback(false);
    }

    return callback(true);
};

// 复用 Scratch 原版 sb3 下载逻辑，但通过原生保存对话框决定最终位置。
const handleProjectDownload = (browserWindow, downloadItem) => {
    const filename = downloadItem.getFilename();
    const userChosenPath = dialog.showSaveDialogSync(browserWindow, {
        defaultPath: filename,
        filters: [
            {name: 'Scratch Project', extensions: ['sb3']},
            {name: 'All Files', extensions: ['*']}
        ]
    });

    if (!userChosenPath) {
        downloadItem.cancel();
        return;
    }

    const tempPath = path.join(app.getPath('temp'), path.basename(userChosenPath));
    downloadItem.setSavePath(tempPath);
    downloadItem.once('done', (_event, state) => {
        if (state !== 'completed') return;
        fs.rename(tempPath, userChosenPath, error => {
            if (!error) {
                return;
            }
            if (error.code === 'EXDEV') {
                fs.copyFile(tempPath, userChosenPath, copyError => {
                    fs.unlink(tempPath, () => {});
                    if (!copyError) return;
                    dialog.showMessageBox(browserWindow, {
                        type: 'error',
                        title: 'Failed to save project',
                        message: `Save failed:\n${userChosenPath}`,
                        detail: copyError.message
                    });
                });
                return;
            }
            dialog.showMessageBox(browserWindow, {
                type: 'error',
                title: 'Failed to save project',
                message: `Save failed:\n${userChosenPath}`,
                detail: error.message
            });
        });
    });
};

// 自定义标题栏隐藏了系统菜单，保留快捷键方便调试桌面壳和编辑器页面。
const registerDevToolsShortcut = webContents => {
    webContents.on('before-input-event', (event, input) => {
        if (input.code === devToolKey.code &&
            input.alt === devToolKey.alt &&
            input.control === devToolKey.control &&
            input.meta === devToolKey.meta &&
            input.shift === devToolKey.shift &&
            input.type === 'keyDown' &&
            !input.isAutoRepeat &&
            !input.isComposing) {
            event.preventDefault();
            webContents.openDevTools({mode: 'detach', activate: true});
        }
    });
};

// 编辑器内的新窗口请求统一转系统浏览器打开，主窗口不承载第三方页面。
const registerExternalLinkPolicy = webContents => {
    webContents.setWindowOpenHandler(({url}) => {
        let protocol = '';
        try {
            protocol = new URL(url).protocol;
        } catch {
            return {action: 'deny'};
        }

        if (allowedExternalProtocols.includes(protocol)) {
            shell.openExternal(url);
        }
        return {action: 'deny'};
    });
};

// shellView 是顶部 tab 条；它和编辑器视图分离，避免切 tab 时重建整个壳。
const createShellView = () => {
    const view = new WebContentsView({
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: getDesktopAssetPath('preload.js')
        }
    });

    registerDevToolsShortcut(view.webContents);
    registerExternalLinkPolicy(view.webContents);
    view.webContents.loadURL(getShellUrl());
    view.webContents.once('did-finish-load', broadcastTabsChanged);
    return view;
};

// homeView 是没有活动 tab 时显示的首页，也用于新建 tab 前选择编辑器模式。
const createHomeView = () => {
    const view = new WebContentsView({
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: getDesktopAssetPath('preload.js')
        }
    });

    registerDevToolsShortcut(view.webContents);
    registerExternalLinkPolicy(view.webContents);
    view.webContents.loadURL(getHomeUrl());
    return view;
};

// code 模式初始化较慢，loadingView 用来覆盖 WebContentsView 首屏白屏。
const createLoadingView = () => {
    const view = new WebContentsView({
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    registerDevToolsShortcut(view.webContents);
    registerExternalLinkPolicy(view.webContents);
    view.webContents.loadURL(getLoadingUrl());
    return view;
};

// 每个编辑器 tab 对应一个独立 WebContentsView，从而隔离页面状态和 Redux 实例。
const createEditorView = tab => {
    const view = new WebContentsView({
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: getDesktopAssetPath('preload.js')
        }
    });

    const webContentsId = view.webContents.id;
    editorWebContentsIds.add(webContentsId);
    editorWebContentsTabIds.set(webContentsId, tab.id);
    registerDevToolsShortcut(view.webContents);
    registerExternalLinkPolicy(view.webContents);

    view.webContents.once('did-finish-load', () => {
        if (tab.mode !== editorModes.code.mode) {
            markEditorReady(view.webContents);
        }
    });

    view.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
        tab.loading = false;
        tab.crashed = true;
        tab.crashReason = `${errorCode}: ${errorDescription}`;
        console.error('[desktop-main] Editor failed to load', validatedURL, tab.crashReason);
        layoutViews();
        broadcastTabsChanged();
    });

    view.webContents.on('render-process-gone', (_event, details) => {
        tab.loading = false;
        tab.crashed = true;
        tab.crashReason = details.reason;
        layoutViews();
        broadcastTabsChanged();
    });

    view.webContents.on('destroyed', () => {
        editorWebContentsIds.delete(webContentsId);
        editorWebContentsTabIds.delete(webContentsId);
        preferredSerialPortIds.delete(webContentsId);
    });

    view.webContents.loadURL(createEditorUrl(tab));
    return view;
};

const activateTab = tabId => {
    if (!tabs.has(tabId)) return null;
    activeTabId = tabId;
    layoutViews();
    broadcastTabsChanged();
    return {tabs: getTabList(), activeTabId};
};

// 回到首页不会销毁已有 tab，只是让活动 tab 置空并显示 homeView。
const showHome = () => {
    activeTabId = null;
    layoutViews();
    broadcastTabsChanged();
    return {tabs: getTabList(), activeTabId};
};

const createTab = ({mode = 'scratch', title} = {}) => {
    if (!mainWindow) return null;
    const editorMode = normalizeEditorMode(mode);
    const modeConfig = editorModes[editorMode];
    const id = `tab-${Date.now()}-${nextTabIndex}`;
    const tab = {
        id,
        title: title || `${modeConfig.titlePrefix} ${nextTabIndex}`,
        mode: editorMode,
        dirty: false,
        loading: true,
        crashed: false
    };
    nextTabIndex++;

    const editorView = createEditorView(tab);
    tabs.set(id, tab);
    editorViews.set(id, editorView);
    mainWindow.contentView.addChildView(editorView);
    activateTab(id);
    return {tabs: getTabList(), activeTabId};
};

// 关闭 tab 时必须同步停止 Python/PTY，避免后台进程继续占用资源。
const closeTab = tabId => {
    if (!tabs.has(tabId)) return {tabs: getTabList(), activeTabId};
    if (pythonRunner) {
        pythonRunner.stop(tabId);
    }
    if (terminalRunner) {
        terminalRunner.stop(tabId);
    }
    const view = editorViews.get(tabId);
    if (view) {
        mainWindow.contentView.removeChildView(view);
        editorViews.delete(tabId);
        editorWebContentsIds.delete(view.webContents.id);
        editorWebContentsTabIds.delete(view.webContents.id);
        preferredSerialPortIds.delete(view.webContents.id);
        if (!view.webContents.isDestroyed()) {
            view.webContents.close();
        }
    }

    tabs.delete(tabId);
    if (activeTabId === tabId) {
        activeTabId = tabs.size ? Array.from(tabs.keys())[tabs.size - 1] : null;
    }
    if (!activeTabId) {
        showHome();
    } else {
        layoutViews();
        broadcastTabsChanged();
    }
    return {tabs: getTabList(), activeTabId};
};

// 所有本机能力 IPC 都按发送方 WebContents 反查 tab，避免前端伪造 tabId 操作其他标签。
const getSenderTabId = event => {
    const tabId = editorWebContentsTabIds.get(event.sender.id);
    if (!tabId || !tabs.has(tabId)) {
        throw new Error('Python actions are only available from editor tabs.');
    }
    return tabId;
};

const registerTabIpc = () => {
    const {ipcMain} = require('electron');
    ipcMain.handle('tabs:list', () => ({
        tabs: getTabList(),
        activeTabId
    }));
    ipcMain.handle('tabs:create', (_event, options) => createTab(options));
    ipcMain.handle('tabs:activate', (_event, tabId) => activateTab(tabId));
    ipcMain.handle('tabs:close', (_event, tabId) => closeTab(tabId));
    ipcMain.handle('home:show', () => showHome());
    ipcMain.on('editor:ready', event => {
        if (editorWebContentsIds.has(event.sender.id)) {
            markEditorReady(event.sender);
        }
    });
};

// 非交互 Python 运行通道，作为 PTY 不可用时的降级方案。
const registerPythonIpc = () => {
    const {ipcMain} = require('electron');
    ipcMain.handle('python:run', async (event, options = {}) => {
        const tabId = getSenderTabId(event);
        if (options.tabId && options.tabId !== tabId) {
            throw new Error('Python tab id does not match the requesting editor tab.');
        }
        return pythonRunner.run({
            tabId,
            code: options.code,
            sender: event.sender
        });
    });
    ipcMain.handle('python:stop', event => pythonRunner.stop(getSenderTabId(event)));
    ipcMain.handle('python:status', event => pythonRunner.getStatus(getSenderTabId(event)));
};

// 交互式终端通道，前端 xterm 的输入、resize 和停止都会走这里。
const registerTerminalIpc = () => {
    const {ipcMain} = require('electron');
    ipcMain.handle('terminal:startPython', async (event, options = {}) => {
        const tabId = getSenderTabId(event);
        if (options.tabId && options.tabId !== tabId) {
            throw new Error('Terminal tab id does not match the requesting editor tab.');
        }
        return terminalRunner.startPython({
            tabId,
            code: options.code,
            cols: options.cols,
            rows: options.rows,
            sender: event.sender
        });
    });
    ipcMain.handle('terminal:input', (event, data) => terminalRunner.input(getSenderTabId(event), data));
    ipcMain.handle('terminal:resize', (event, size) => terminalRunner.resize(getSenderTabId(event), size));
    ipcMain.handle('terminal:stop', event => terminalRunner.stop(getSenderTabId(event)));
    ipcMain.handle('terminal:status', event => terminalRunner.getStatus(getSenderTabId(event)));
};

const registerSerialIpc = () => {
    const {ipcMain} = require('electron');
    ipcMain.handle('serial:available', event => {
        getSenderTabId(event);
        return true;
    });
    // 下拉框选择按编辑器 WebContents 保存；真正授权时仍只接受 Electron 提供的候选端口。
    ipcMain.handle('serial:select', (event, portId = '') => {
        getSenderTabId(event);
        if (typeof portId !== 'string' || portId.length > 512) {
            throw new Error('Serial port id must be a string no longer than 512 characters.');
        }
        if (portId) {
            preferredSerialPortIds.set(event.sender.id, portId);
        } else {
            preferredSerialPortIds.delete(event.sender.id);
        }
        return {ok: true};
    });
};

// 本地拓展库持久化只开放给编辑器 tab，数据格式仍交给 GUI 侧 schema 校验。
const registerCustomExtensionIpc = () => {
    const {ipcMain} = require('electron');
    ipcMain.handle('customExtensions:load', event => {
        getSenderTabId(event);
        return readCustomExtensionLibraries();
    });
    ipcMain.handle('customExtensions:save', (event, manifests = []) => {
        getSenderTabId(event);
        return writeCustomExtensionLibraries(manifests);
    });
};

// Web Serial 会列出蓝牙等伪串口，这里在主进程先过滤出更像硬件串口的候选项。
const registerSerialDeviceHandlers = () => {
    const allowedOrigins = getAllowedSerialOrigins();
    session.defaultSession.on('select-serial-port', (event, portList, webContents, callback) => {
        if (!editorWebContentsIds.has(webContents.id)) {
            callback('');
            return;
        }
        event.preventDefault();
        const ports = getSelectableSerialPorts(portList);
        const selectedPort = selectPreferredSerialPort(ports, preferredSerialPortIds.get(webContents.id));
        webContents.send('serial:ports', {
            ports,
            selectedPortId: selectedPort ? selectedPort.portId : ''
        });
        callback(selectedPort ? selectedPort.portId : '');
    });
    session.defaultSession.setPermissionCheckHandler((webContents, permission, _requestingOrigin, details = {}) => {
        if (permission !== 'serial') return false;
        if (webContents && editorWebContentsIds.has(webContents.id)) return true;
        return allowedOrigins.has(details.securityOrigin);
    });
    session.defaultSession.setDevicePermissionHandler(details => details.deviceType === 'serial');
};

// 主窗口只创建一次，后续 tab/home/loading 都作为 WebContentsView 挂到 contentView。
const createMainWindow = () => {
    const windowOptions = process.platform === 'darwin' ? {
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: {x: 12, y: 11}
    } : {
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#e8e8e8',
            symbolColor: '#202124',
            height: titleBarHeight
        }
    };

    const browserWindow = new BrowserWindow({
        width: defaultSize.width,
        height: defaultSize.height,
        useContentSize: true,
        show: false,
        title: 'Scratch Editor Desktop',
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false
        },
        ...windowOptions
    });

    if (!browserWindow.contentView) {
        throw new Error('Electron BrowserWindow.contentView is unavailable. WebContentsView tabs require Electron 30+.');
    }

    shellView = createShellView();
    shellView.webContents.once('did-finish-load', () => {
        if (!browserWindow.isDestroyed() && !browserWindow.isVisible()) {
            console.log('[desktop-main] Shell loaded, showing main window');
            browserWindow.show();
        }
    });
    browserWindow.contentView.addChildView(shellView);

    homeView = createHomeView();
    browserWindow.contentView.addChildView(homeView);

    loadingView = createLoadingView();
    browserWindow.contentView.addChildView(loadingView);

    browserWindow.on('resize', layoutViews);
    browserWindow.on('maximize', layoutViews);
    browserWindow.on('unmaximize', layoutViews);
    browserWindow.on('restore', layoutViews);

    return browserWindow;
};

if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
}

app.on('window-all-closed', () => {
    if (pythonRunner) {
        pythonRunner.stopAll();
    }
    if (terminalRunner) {
        terminalRunner.stopAll();
    }
    app.quit();
});

app.whenReady().then(() => {
    console.log('[desktop-main] Electron app is ready');
    pythonRunner = new PythonRunner({app});
    terminalRunner = new TerminalRunner({pythonRunner});
    session.defaultSession.setPermissionRequestHandler(handlePermissionRequest);
    registerSerialDeviceHandlers();
    session.defaultSession.on('will-download', (_event, downloadItem) => {
        if (mainWindow) handleProjectDownload(mainWindow, downloadItem);
    });
    registerTabIpc();
    registerPythonIpc();
    registerTerminalIpc();
    registerSerialIpc();
    registerCustomExtensionIpc();
    mainWindow = createMainWindow();
    mainWindow.on('closed', () => {
        if (pythonRunner) {
            pythonRunner.stopAll();
        }
        if (terminalRunner) {
            terminalRunner.stopAll();
        }
        mainWindow = null;
        shellView = null;
        homeView = null;
        loadingView = null;
        activeTabId = null;
        tabs.clear();
        editorViews.clear();
        editorWebContentsIds.clear();
        editorWebContentsTabIds.clear();
        preferredSerialPortIds.clear();
    });
    layoutViews();
    showHome();
});
