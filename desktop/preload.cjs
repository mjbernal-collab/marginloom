const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('marginloomDesktop', { installed: true, setNotificationsEnabled: enabled => ipcRenderer.invoke('marginloom:notifications', enabled) });
