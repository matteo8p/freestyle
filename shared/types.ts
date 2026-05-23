export type STTBackend = 'local' | 'cloud'

export type CloudModel =
  | 'gpt-4o-mini-transcribe'
  | 'gpt-4o-transcribe'
  | 'whisper-1'

export interface Settings {
  hotkey: string
  backend: STTBackend
  cloudModel: CloudModel
  inputDeviceId: string | null
  streaming: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  hotkey: 'CommandOrControl+Shift+Space',
  backend: 'local',
  cloudModel: 'gpt-4o-mini-transcribe',
  inputDeviceId: null,
  streaming: true
}

export interface TranscribeResponse {
  text: string
  durationMs: number
  backend: STTBackend
  model: string
}

export interface ApiKeyStatus {
  openai: { present: boolean; lastFour?: string }
}

export interface ModelsStatus {
  local: { downloaded: boolean; downloadingPercent?: number }
  cloudOptions: CloudModel[]
}

export interface ServerBootstrap {
  baseUrl: string
  token: string
}

export type StreamClientMessage =
  | { type: 'commit' }
  | { type: 'cancel' }

export type StreamServerMessage =
  | { type: 'session.ready'; model: string }
  | { type: 'partial'; text: string }
  | { type: 'final'; text: string }
  | { type: 'error'; message: string }
