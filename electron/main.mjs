import { app, BrowserWindow, ipcMain, dialog, globalShortcut, Menu } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ===== 单实例锁：防止同时运行多个实例操作同一 vault 文件 =====
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // 用户尝试打开第二个实例 → 聚焦已有窗口
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'SecureVault',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// ===== 全局快捷键：Ctrl+Shift+L 锁定保险库 =====
function registerLockShortcut() {
  globalShortcut.register('CommandOrControl+Shift+L', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('shortcut:lock')
    }
  })
}

// ===== IPC Handlers =====

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Vault Files', extensions: ['enc'] },
    ],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('dialog:saveFile', async (_event, defaultPath) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters: [{ name: 'Vault Files', extensions: ['enc'] }],
  })
  if (result.canceled) return null
  return result.filePath
})

ipcMain.handle('file:read', async (_event, filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf-8')
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('file:write', async (_event, filePath, content) => {
  try {
    const dir = path.dirname(filePath)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(filePath, content, 'utf-8')
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('file:copy', async (_event, src, dest) => {
  try {
    const dir = path.dirname(dest)
    fs.mkdirSync(dir, { recursive: true })
    fs.copyFileSync(src, dest)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('app:defaultPath', async () => {
  const docs = app.getPath('documents')
  return path.join(docs, 'SecureVault', 'vault.enc')
})

// ===== 背景图管理 =====
const bgDir = path.join(app.getPath('userData'), 'backgrounds')

function ensureBgDir() {
  if (!fs.existsSync(bgDir)) {
    fs.mkdirSync(bgDir, { recursive: true })
  }
}

ipcMain.handle('bg:getPath', async () => {
  ensureBgDir()
  return bgDir
})

ipcMain.handle('bg:listImages', async () => {
  ensureBgDir()
  try {
    const files = fs.readdirSync(bgDir)
    return files.filter(f => /\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(f))
  } catch {
    return []
  }
})

ipcMain.handle('bg:openFolder', async () => {
  ensureBgDir()
  const { shell } = await import('electron')
  shell.openPath(bgDir)
})

ipcMain.handle('bg:importImage', async () => {
  ensureBgDir()
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] },
    ],
  })
  if (result.canceled || result.filePaths.length === 0) return []
  const imported = []
  for (const src of result.filePaths) {
    const name = path.basename(src)
    const dest = path.join(bgDir, name)
    try {
      fs.copyFileSync(src, dest)
      imported.push(name)
    } catch { /* skip duplicates or permission errors */ }
  }
  return imported
})

ipcMain.handle('bg:readImage', async (_event, filename) => {
  ensureBgDir()
  const filePath = path.join(bgDir, filename)
  try {
    const data = fs.readFileSync(filePath)
    const ext = path.extname(filename).toLowerCase().replace('.', '')
    const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp' }
    const mime = mimeMap[ext] || 'image/png'
    const base64 = data.toString('base64')
    return `data:${mime};base64,${base64}`
  } catch {
    return null
  }
})

ipcMain.handle('bg:deleteImage', async (_event, filename) => {
  ensureBgDir()
  const filePath = path.join(bgDir, filename)
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      return true
    }
    return false
  } catch {
    return false
  }
})

// ===== 应用菜单 =====
function buildMenu() {
  const isMac = process.platform === 'darwin'
  const template = [
    {
      label: '文件',
      submenu: [
        { label: '新建保险库...', accelerator: 'CmdOrCtrl+N', click: () => sendToRenderer('menu:create') },
        { label: '打开保险库...', accelerator: 'CmdOrCtrl+O', click: () => sendToRenderer('menu:open') },
        { type: 'separator' },
        { label: '保存', accelerator: 'CmdOrCtrl+S', click: () => sendToRenderer('menu:save') },
        { type: 'separator' },
        { label: '导出保险库...', click: () => sendToRenderer('menu:export') },
        { label: '导入保险库...', click: () => sendToRenderer('menu:import') },
        { type: 'separator' },
        { label: '锁定保险库', accelerator: 'CmdOrCtrl+Shift+L', click: () => sendToRenderer('shortcut:lock') },
        { type: 'separator' },
        { label: isMac ? '退出 SecureVault' : '退出', accelerator: isMac ? 'Cmd+Q' : 'Alt+F4', role: 'quit' },
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '刷新', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '强制刷新', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: '开发者工具', accelerator: 'CmdOrCtrl+Shift+I', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '放大', accelerator: 'CmdOrCtrl+=', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: '重置缩放', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
      ]
    },
    {
      label: '帮助',
      submenu: [
        { label: '使用说明', click: () => sendToRenderer('menu:help') },
        { type: 'separator' },
        { label: '关于 SecureVault', click: () => sendToRenderer('menu:about') },
      ]
    },
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function sendToRenderer(channel) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel)
  }
}

// ===== App 生命周期 =====

app.whenReady().then(() => {
  createWindow()
  registerLockShortcut()
  buildMenu()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
