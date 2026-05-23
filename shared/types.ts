export type STTBackend = 'local' | 'cloud'

export type CloudModel =
  | 'gpt-4o-mini-transcribe'
  | 'gpt-4o-transcribe'
  | 'whisper-1'

export interface Settings {
  hotkey: string
  backend: STTBackend
  cloudModel: CloudModel
}

export const DEFAULT_SETTINGS: Settings = {
  hotkey: 'CommandOrControl+Shift+Space',
  backend: 'local',
  cloudModel: 'gpt-4o-mini-transcribe'
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
