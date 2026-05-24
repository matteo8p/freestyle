import { BrowserWindow, globalShortcut } from 'electron'
import { GlobalKeyboardListener } from 'node-global-key-listener'

let listener: GlobalKeyboardListener | null = null
let pressed = false
let toggleActive = false

// macOS: use node-global-key-listener (hold FN = hold-to-record)
// Windows: WinKeyServer.exe is not shipped in the npm package, so we fall back to
// Electron's globalShortcut in toggle mode (press once to start, press again to stop).
const WINDOWS_SHORTCUT = 'F9'

export function registerHotkey(win: BrowserWindow): void {
  unregisterAll()

  if (process.platform === 'darwin') {
    listener = new GlobalKeyboardListener()
    listener.addListener(e => {
      if (e.name !== 'FN') return
      if (e.state === 'DOWN' && !pressed) {
        pressed = true
        win.webContents.send('hotkey:down')
      } else if (e.state === 'UP' && pressed) {
        pressed = false
        win.webContents.send('hotkey:up')
      }
    })
  } else {
    globalShortcut.register(WINDOWS_SHORTCUT, () => {
      if (win.isDestroyed() || win.webContents.isDestroyed()) return
      if (!toggleActive) {
        toggleActive = true
        win.webContents.send('hotkey:down')
      } else {
        toggleActive = false
        win.webContents.send('hotkey:up')
      }
    })
  }
}

export function unregisterAll(): void {
  if (listener) {
    listener.kill()
    listener = null
  }
  if (process.platform !== 'darwin') {
    globalShortcut.unregisterAll()
    toggleActive = false
  }
  pressed = false
}
