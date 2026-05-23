import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { startBackend } from '../../backend/index'
import { onProgress } from '../../backend/lib/model-manager'
import { registerHotkey, unregisterAll } from './hotkey'
import { pasteIntoFocusedApp } from './paste'
import type { ServerBootstrap } from '../../shared/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let bootstrap: ServerBootstrap | null = null

async function createWindow(): Promise<void> {
  const win = new BrowserWindow({
    width: 520,
    height: 640,
    show: false,
    autoHideMenuBar: true,
    title: 'Freestyle',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.cjs'),
      sandbox: false,
      contextIsolation: true
    }
  })

  win.once('ready-to-show', () => win.show())

  if (process.env.ELECTRON_RENDERER_URL) {
    await win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    await win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  registerHotkey(win)

  onProgress(pct => {
    win.webContents.send('model:download-progress', pct)
  })
}

app.whenReady().then(async () => {
  bootstrap = await startBackend()

  ipcMain.handle('server:bootstrap', () => bootstrap)
  ipcMain.handle('paste:do', async (_e, text: string) => {
    await pasteIntoFocusedApp(text)
  })

  await createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('will-quit', () => {
  unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
