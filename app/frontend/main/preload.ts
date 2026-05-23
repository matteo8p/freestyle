import { contextBridge, ipcRenderer } from 'electron'

export type PillState =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'pasting'
  | 'pasted'
  | 'error'

export interface AudioFrameMessage {
  bars: number[]
  rms: number
  t: number
}

interface FreestyleBridge {
  bootstrap: () => Promise<{ baseUrl: string; token: string }>
  onHotkeyDown: (cb: () => void) => () => void
  onHotkeyUp: (cb: () => void) => () => void
  onModelDownloadProgress: (cb: (pct: number) => void) => () => void
  paste: (text: string) => Promise<void>
  publishAudioFrame: (frame: AudioFrameMessage) => void
  publishTranscriptPartial: (text: string) => void
  publishTranscriptFinal: (text: string, durationMs?: number) => void
  publishPillState: (
    state: PillState,
    extras?: { message?: string; durationMs?: number }
  ) => void
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
  paste: text => ipcRenderer.invoke('paste:do', text),
  publishAudioFrame: frame => ipcRenderer.send('audio:frame', frame),
  publishTranscriptPartial: text =>
    ipcRenderer.send('transcript:partial', { text }),
  publishTranscriptFinal: (text, durationMs) =>
    ipcRenderer.send('transcript:final', { text, durationMs }),
  publishPillState: (state, extras) =>
    ipcRenderer.send('pill:state', { state, ...extras })
}

contextBridge.exposeInMainWorld('freestyle', api)

export type { FreestyleBridge }
