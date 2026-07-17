const {contextBridge, ipcRenderer} = require('electron');

// preload 是渲染进程唯一可见的桌面能力出口，保持 contextIsolation 下的最小 API 面。
contextBridge.exposeInMainWorld('scratchDesktopTabs', {
    list: () => ipcRenderer.invoke('tabs:list'),
    create: options => ipcRenderer.invoke('tabs:create', options),
    activate: tabId => ipcRenderer.invoke('tabs:activate', tabId),
    close: tabId => ipcRenderer.invoke('tabs:close', tabId),
    showHome: () => ipcRenderer.invoke('home:show'),
    // 订阅函数返回取消订阅方法，方便 React effect 和普通页面统一清理监听。
    onChanged: handler => {
        const listener = (_event, payload) => handler(payload);
        ipcRenderer.on('tabs:changed', listener);
        return () => ipcRenderer.removeListener('tabs:changed', listener);
    }
});

contextBridge.exposeInMainWorld('scratchDesktopEditor', {
    // code 模式初始化完成后通知主进程隐藏 loadingView。
    ready: payload => ipcRenderer.send('editor:ready', payload)
});

// 非交互 Python 通道，保留给没有 PTY 能力的降级运行方式。
contextBridge.exposeInMainWorld('scratchDesktopPython', {
    run: options => ipcRenderer.invoke('python:run', options),
    stop: tabId => ipcRenderer.invoke('python:stop', tabId),
    getStatus: tabId => ipcRenderer.invoke('python:status', tabId),
    onOutput: handler => {
        const listener = (_event, payload) => handler(payload);
        ipcRenderer.on('python:output', listener);
        return () => ipcRenderer.removeListener('python:output', listener);
    },
    onExit: handler => {
        const listener = (_event, payload) => handler(payload);
        ipcRenderer.on('python:exit', listener);
        return () => ipcRenderer.removeListener('python:exit', listener);
    }
});

// 交互式终端通道，对应主进程 TerminalRunner 和前端 xterm。
contextBridge.exposeInMainWorld('scratchDesktopTerminal', {
    startPython: options => ipcRenderer.invoke('terminal:startPython', options),
    input: data => ipcRenderer.invoke('terminal:input', data),
    resize: size => ipcRenderer.invoke('terminal:resize', size),
    stop: () => ipcRenderer.invoke('terminal:stop'),
    getStatus: () => ipcRenderer.invoke('terminal:status'),
    onData: handler => {
        const listener = (_event, payload) => handler(payload);
        ipcRenderer.on('terminal:data', listener);
        return () => ipcRenderer.removeListener('terminal:data', listener);
    },
    onExit: handler => {
        const listener = (_event, payload) => handler(payload);
        ipcRenderer.on('terminal:exit', listener);
        return () => ipcRenderer.removeListener('terminal:exit', listener);
    }
});

// 串口选择仍走浏览器 Web Serial，preload 只转发主进程过滤后的端口列表。
contextBridge.exposeInMainWorld('scratchDesktopSerial', {
    isAvailable: () => ipcRenderer.invoke('serial:available'),
    select: portId => ipcRenderer.invoke('serial:select', portId),
    onPorts: handler => {
        const listener = (_event, payload) => handler(payload);
        ipcRenderer.on('serial:ports', listener);
        return () => ipcRenderer.removeListener('serial:ports', listener);
    }
});

// 桌面端本地拓展库持久化通道，浏览器端仍可用 localStorage 降级。
contextBridge.exposeInMainWorld('scratchDesktopCustomExtensions', {
    load: () => ipcRenderer.invoke('customExtensions:load'),
    save: manifests => ipcRenderer.invoke('customExtensions:save', manifests)
});
