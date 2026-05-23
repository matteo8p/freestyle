import { contextBridge, ipcRenderer } from 'electron'

interface FreestyleBridge {
  bootstrap: () => Promise<{ baseUrl: string; token: string }>
  onHotkeyDown: (cb: () => void) => () => void
  onHotkeyUp: (cb: () => void) => () => void
  onModelDownloadProgress: (cb: (pct: number) => void) => () => void
  paste: (text: string) => Promise<void>
}

const api: FreestyleBridge = {
  bootstrap: () => ipcRenderer.invoke('server:bootstrap'),
  onHotkeyDown: cb => {
    const handler = (): void => cb()
    ipcRenderer.on('hotkey:down', handler)
    return () => ipcRenderer.removeListener('hotkey:down', handler)
  },
  onHotkeyUp: cb => {
    const handler = (): void => cb()
    ipcRenderer.on('hotkey:up', handler)
    return () => ipcRenderer.removeListener('hotkey:up', handler)
  },
  onModelDownloadProgress: cb => {
    const handler = (_e: unknown, pct: number): void => cb(pct)
    ipcRenderer.on('model:download-progress', handler)
    return () => ipcRenderer.removeListener('model:download-progress', handler)
  },
  paste: text => ipcRenderer.invoke('paste:do', text)
}

contextBridge.exposeInMainWorld('freestyle', api)

export type { FreestyleBridge }
