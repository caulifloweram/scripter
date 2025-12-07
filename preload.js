const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (content) => ipcRenderer.invoke('save-file', content),
  saveFileToDir: (content, filename) => ipcRenderer.invoke('save-file-to-dir', content, filename),
  autosave: (content, backgroundMode) => ipcRenderer.invoke('autosave', content, backgroundMode),
  getAutosaveDir: () => ipcRenderer.invoke('get-autosave-dir'),
  openAutosaveFolder: () => ipcRenderer.invoke('open-autosave-folder'),
  loadLastAutosave: () => ipcRenderer.invoke('load-last-autosave'),
  listAutosaveFiles: () => ipcRenderer.invoke('list-autosave-files'),
  loadAutosaveFile: (filepath) => ipcRenderer.invoke('load-autosave-file', filepath)
});

