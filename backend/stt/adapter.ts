import type { STTBackend } from '../../shared/types'

export interface TranscribeResult {
  text: string
  model: string
  backend: STTBackend
}

export interface STTAdapter {
  readonly backend: STTBackend
  transcribe(wav: Buffer): Promise<TranscribeResult>
}
