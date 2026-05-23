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

export interface PillStateMessage {
  state: PillState
  message?: string
  durationMs?: number
}

interface FreestylePillBridge {
  onAudioFrame: (cb: (f: AudioFrameMessage) => void) => () => void
  onPillState: (cb: (m: PillStateMessage) => void) => () => void
  onTranscriptPartial: (cb: (text: string) => void) => () => void
  onTranscriptFinal: (cb: (text: string) => void) => () => void
}

const api: FreestylePillBridge = {
  onAudioFrame: cb => {
    const handler = (_e: unknown, frame: AudioFrameMessage): void => cb(frame)
    ipcRenderer.on('audio:frame', handler)
    return () => ipcRenderer.removeListener('audio:frame', handler)
  },
  onPillState: cb => {
    const handler = (_e: unknown, m: PillStateMessage): void => cb(m)
    ipcRenderer.on('pill:state', handler)
    return () => ipcRenderer.removeListener('pill:state', handler)
  },
  onTranscriptPartial: cb => {
    const handler = (_e: unknown, m: { text: string }): void => cb(m.text)
    ipcRenderer.on('transcript:partial', handler)
    return () => ipcRenderer.removeListener('transcript:partial', handler)
  },
  onTranscriptFinal: cb => {
    const handler = (_e: unknown, m: { text: string }): void => cb(m.text)
    ipcRenderer.on('transcript:final', handler)
    return () => ipcRenderer.removeListener('transcript:final', handler)
  }
}

contextBridge.exposeInMainWorld('freestylePill', api)

export type { FreestylePillBridge }
