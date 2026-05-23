import OpenAI, { toFile } from 'openai'
import { getKey } from '../lib/secrets'
import { loadSettings } from '../lib/settings-store'
import type { STTAdapter, TranscribeResult } from './adapter'

export const openaiAdapter: STTAdapter = {
  backend: 'cloud',
  async transcribe(wav: Buffer): Promise<TranscribeResult> {
    const apiKey = await getKey('openai')
    if (!apiKey) {
      throw new Error('OpenAI API key not set. Add it in Settings.')
    }
    const settings = await loadSettings()
    const model = settings.cloudModel

    const client = new OpenAI({ apiKey })
    const file = await toFile(wav, 'audio.wav', { type: 'audio/wav' })

    const res = await client.audio.transcriptions.create({
      file,
      model,
      response_format: 'text'
    })

    const text = typeof res === 'string' ? res : (res as { text?: string }).text ?? ''
    return { text: text.trim(), model, backend: 'cloud' }
  }
}
