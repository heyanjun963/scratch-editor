const {BrowserWindow, Menu, WebContentsView, app, dialog, session, shell, systemPreferences} = require('electron');
const fs = require('fs');
const path = require('path');
const {pathToFileURL} = require('url');
const PythonRunner = require('./python-runner');
const TerminalRunner = require('./terminal-runner');

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

const writeCustomExtensionLibraries = async manifests => {
    if (!Array.isArray(manifests)) {
        throw new Error('Custom extension libraries must be an array.');
    }
    const filePath = getCustomExtensionLibrariesFilePath();
    await fs.promises.mkdir(path.dirname(filePath), {recursive: true});
    await fs.promises.writeFile(filePath, JSON.stringify(manifests, null, 2), 'utf8');
    return {ok: true};
};

const isBluetoothSerialPort = port => (
    /bluetooth|\u84dd\u7259|spp|edifier|\u8033\u673a/i.test(getSerialPortLabel(port))
);

const isPreferredSerialPort = port => /COM7|CH340|CH341|USB-SERIAL|USB2\.0-Serial/i.test(getSerialPortLabel(port));

const isHardwareSerialPort = port => (
    !isBluetoothSerialPort(port) &&
    /USB|COM\d+|CH340|CH341|CP210|FTDI|Arduino|CDC|Serial/i.test(getSerialPortLabel(port))
);

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
};

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

const registerSerialDeviceHandlers = () => {
    const allowedOrigins = getAllowedSerialOrigins();
    session.defaultSession.on('select-serial-port', (event, portList, webContents, callback) => {
        if (!editorWebContentsIds.has(webContents.id)) {
            callback('');
            return;
        }
        event.preventDefault();
        const ports = portList
            .map(port => ({
                portId: port.portId,
                portName: port.portName,
                displayName: port.displayName,
                vendorId: port.vendorId,
                productId: port.productId
            }))
            .filter(isHardwareSerialPort);
        const selectedPort = ports.find(isPreferredSerialPort) || ports[0];
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
    });
    layoutViews();
    showHome();
});
