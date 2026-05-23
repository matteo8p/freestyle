import { BrowserWindow } from 'electron'
import { GlobalKeyboardListener } from 'node-global-key-listener'

let listener: GlobalKeyboardListener | null = null
let pressed = false

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
