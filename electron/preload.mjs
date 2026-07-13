const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('file:write', filePath, content),
  copyFile: (src, dest) => ipcRenderer.invoke('file:copy', src, dest),
  selectOpenFile: () => ipcRenderer.invoke('dialog:openFile'),
  selectSaveFile: (defaultPath) => ipcRenderer.invoke('dialog:saveFile', defaultPath),
  getDefaultPath: () => ipcRenderer.invoke('app:defaultPath'),

  /** 注册全局锁定快捷键监听 Ctrl+Shift+L */
  onLockShortcut: (callback) => {
    ipcRenderer.on('shortcut:lock', () => callback())
  },
  removeLockShortcutListener: () => {
    ipcRenderer.removeAllListeners('shortcut:lock')
  },

  /** 监听原生菜单事件 */
  onMenuAction: (callback) => {
    const channels = ['menu:create', 'menu:open', 'menu:save', 'menu:export', 'menu:import', 'menu:help', 'menu:about']
    channels.forEach(ch => ipcRenderer.on(ch, (_event, ...args) => callback(ch, ...args)))
  },
  removeMenuActionListener: () => {
    const channels = ['menu:create', 'menu:open', 'menu:save', 'menu:export', 'menu:import', 'menu:help', 'menu:about']
    channels.forEach(ch => ipcRenderer.removeAllListeners(ch))
  },

  /** 背景图管理 */
  getBgPath: () => ipcRenderer.invoke('bg:getPath'),
  listBgImages: () => ipcRenderer.invoke('bg:listImages'),
  openBgFolder: () => ipcRenderer.invoke('bg:openFolder'),
  importBgImage: () => ipcRenderer.invoke('bg:importImage'),
  readBgImage: (filename) => ipcRenderer.invoke('bg:readImage', filename),
  deleteBgImage: (filename) => ipcRenderer.invoke('bg:deleteImage', filename),
})
