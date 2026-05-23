import { BrowserWindow } from 'electron'
import { GlobalKeyboardListener } from 'node-global-key-listener'

let listener: GlobalKeyboardListener | null = null
let pressed = false

// Push-to-talk on the Fn / globe key. node-global-key-listener reports it as
// `FN` via a Swift helper that taps macOS flagsChanged events. globalShortcut
// in Electron cannot see this key.
export function registerHotkey(win: BrowserWindow): void {
  unregisterAll()
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
}

export function unregisterAll(): void {
  if (listener) {
    listener.kill()
    listener = null
  }
  pressed = false
}
