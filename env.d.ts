/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ElectronAPI {
  readFile: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>
  copyFile: (src: string, dest: string) => Promise<{ success: boolean; error?: string }>
  selectOpenFile: () => Promise<string | null>
  selectSaveFile: (defaultPath: string) => Promise<string | null>
  getDefaultPath: () => Promise<string>
  /** 监听主进程发出的全局锁定快捷键事件 */
  onLockShortcut: (callback: () => void) => void
  removeLockShortcutListener: () => void
  /** 监听原生菜单事件，回调参数为频道名 */
  onMenuAction: (callback: (channel: string) => void) => void
  removeMenuActionListener: () => void
  /** 背景图管理 */
  getBgPath: () => Promise<string>
  listBgImages: () => Promise<string[]>
  openBgFolder: () => Promise<void>
  importBgImage: () => Promise<string[]>
  readBgImage: (filename: string) => Promise<string | null>
  deleteBgImage: (filename: string) => Promise<boolean>
}

interface Window {
  electronAPI: ElectronAPI
}
