const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('scratchDesktopTabs', {
    list: () => ipcRenderer.invoke('tabs:list'),
    create: options => ipcRenderer.invoke('tabs:create', options),
    activate: tabId => ipcRenderer.invoke('tabs:activate', tabId),
    close: tabId => ipcRenderer.invoke('tabs:close', tabId),
    showHome: () => ipcRenderer.invoke('home:show'),
    onChanged: handler => {
        const listener = (_event, payload) => handler(payload);
        ipcRenderer.on('tabs:changed', listener);
        return () => ipcRenderer.removeListener('tabs:changed', listener);
    }
});

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
