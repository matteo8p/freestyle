import { app, BrowserWindow, ipcMain, nativeImage } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { startBackend } from '../../backend/index'
import { onProgress } from '../../backend/lib/model-manager'
import { registerHotkey, unregisterAll } from './hotkey'
import { pasteIntoFocusedApp } from './paste'
import { createPillWindow, destroyPillWindow } from './pill-window'
import type { ServerBootstrap } from '../../shared/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let bootstrap: ServerBootstrap | null = null
let mainWindow: BrowserWindow | null = null
let appIsQuitting = false

async function createWindow(): Promise<void> {
  const win = new BrowserWindow({
    width: 880,
    height: 620,
    minWidth: 720,
    minHeight: 520,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#F1EBDD',
    icon: path.join(__dirname, '../../build/icon.png'),
    title: 'Freestyle',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.cjs'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow = win
  win.once('ready-to-show', () => win.show())

  win.on('close', event => {
    if (process.platform === 'darwin' && !appIsQuitting) {
      event.preventDefault()
      win.hide()
    }
  })

  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
  })

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

// TODO: externalize electron-devtools-installer in electron.vite.config.ts so the dynamic
// import doesn't pull a ~330 KB chunk into the packaged main bundle. Gated by app.isPackaged
// so it never runs in prod, but the bytes still ship.
async function installReactDevTools(): Promise<void> {
  if (app.isPackaged) return
  try {
    const { default: installExtension, REACT_DEVELOPER_TOOLS } = await import('electron-devtools-installer')
    await installExtension(REACT_DEVELOPER_TOOLS, { loadExtensionOptions: { allowFileAccess: true } })
  } catch (err) {
    console.warn('[freestyle] failed to load React DevTools:', err)
  }
}

app.whenReady().then(async () => {
  // Set the Dock icon first, before any awaits, so macOS shows our icon instead of
  // the default Electron atom during the (often multi-second) startup work below.
  if (process.platform === 'darwin' && app.dock) {
    if (!app.isPackaged) {
      const icon = nativeImage.createFromPath(path.join(__dirname, '../../build/icon.png'))
      if (!icon.isEmpty()) app.dock.setIcon(icon)
    }
    void app.dock.show()
  }

  await installReactDevTools()

  bootstrap = await startBackend()

  ipcMain.handle('server:bootstrap', () => bootstrap)
  ipcMain.handle('paste:do', async (_e, text: string) => {
    await pasteIntoFocusedApp(text)
  })

  await createWindow()
  createPillWindow(path.join(__dirname, '../renderer'))

  app.on('activate', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (!mainWindow.isVisible()) mainWindow.show()
      mainWindow.focus()
    } else {
      void createWindow()
    }
  })
})

app.on('before-quit', () => {
  appIsQuitting = true
})

app.on('will-quit', () => {
  unregisterAll()
  destroyPillWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
