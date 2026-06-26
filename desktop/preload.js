const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('scratchDesktopTabs', {
    list: () => ipcRenderer.invoke('tabs:list'),
    create: options => ipcRenderer.invoke('tabs:create', options),
    activate: tabId => ipcRenderer.invoke('tabs:activate', tabId),
    close: tabId => ipcRenderer.invoke('tabs:close', tabId),
    onChanged: handler => {
        const listener = (_event, payload) => handler(payload);
        ipcRenderer.on('tabs:changed', listener);
        return () => ipcRenderer.removeListener('tabs:changed', listener);
    }
});
