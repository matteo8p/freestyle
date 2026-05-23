import { BrowserWindow, screen, ipcMain } from 'electron'
import path from 'path'

const PILL_WIDTH = 400
const PILL_HEIGHT = 72
const BOTTOM_MARGIN = 20

let pillWindow: BrowserWindow | null = null
let hideTimer: NodeJS.Timeout | null = null

export function createPillWindow(rendererDir: string): BrowserWindow {
  const { workArea } = screen.getPrimaryDisplay()
  const x = Math.round(workArea.x + (workArea.width - PILL_WIDTH) / 2)
  const y = Math.round(workArea.y + workArea.height - PILL_HEIGHT - BOTTOM_MARGIN)

  const win = new BrowserWindow({
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    x,
    y,
    type: process.platform === 'darwin' ? 'panel' : undefined,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    show: false,
    roundedCorners: false,
    acceptFirstMouse: true,
    webPreferences: {
      preload: path.join(rendererDir, '../preload/preload-pill.cjs'),
      sandbox: false,
      contextIsolation: true
    }
  })

  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/pill/index.html`)
  } else {
    void win.loadFile(path.join(rendererDir, 'pill/index.html'))
  }

  win.on('closed', () => {
    pillWindow = null
  })

  pillWindow = win
  wireIpc()
  return win
}

function wireIpc(): void {
  ipcMain.removeAllListeners('audio:frame')
  ipcMain.removeAllListeners('pill:state')
  ipcMain.removeAllListeners('transcript:partial')
  ipcMain.removeAllListeners('transcript:final')

  ipcMain.on('audio:frame', (_e, frame) => {
    pillWindow?.webContents.send('audio:frame', frame)
  })

  ipcMain.on('pill:state', (_e, msg) => {
    handleStateChange(msg)
  })

  ipcMain.on('transcript:partial', (_e, msg) => {
    pillWindow?.webContents.send('transcript:partial', msg)
  })

  ipcMain.on('transcript:final', (_e, msg) => {
    pillWindow?.webContents.send('transcript:final', msg)
  })
}

function handleStateChange(msg: {
  state: string
  message?: string
  durationMs?: number
}): void {
  if (!pillWindow) return

  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }

  if (msg.state === 'idle') {
    pillWindow.webContents.send('pill:state', msg)
    pillWindow.hide()
    return
  }

  if (!pillWindow.isVisible()) showPill()
  pillWindow.webContents.send('pill:state', msg)

  if (msg.state === 'pasted') {
    hideTimer = setTimeout(() => {
      pillWindow?.hide()
      hideTimer = null
    }, 1500)
  } else if (msg.state === 'error') {
    hideTimer = setTimeout(() => {
      pillWindow?.hide()
      hideTimer = null
    }, 2500)
  }
}

function showPill(): void {
  if (!pillWindow) return
  const { workArea } = screen.getPrimaryDisplay()
  const x = Math.round(workArea.x + (workArea.width - PILL_WIDTH) / 2)
  const y = Math.round(workArea.y + workArea.height - PILL_HEIGHT - BOTTOM_MARGIN)
  pillWindow.setBounds({ x, y, width: PILL_WIDTH, height: PILL_HEIGHT })
  pillWindow.showInactive()
}

export function getPillWindow(): BrowserWindow | null {
  return pillWindow
}

export function destroyPillWindow(): void {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  if (pillWindow && !pillWindow.isDestroyed()) {
    pillWindow.destroy()
  }
  pillWindow = null
}
