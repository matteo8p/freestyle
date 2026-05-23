import { Hono } from 'hono'
import { loadSettings } from '../lib/settings-store'
import { localWhisperAdapter } from '../stt/local-whisper'
import { openaiAdapter } from '../stt/openai'
import type { STTAdapter } from '../stt/adapter'
import type { STTBackend, TranscribeResponse } from '../../shared/types'

const route = new Hono()

function pickAdapter(backend: STTBackend): STTAdapter {
  return backend === 'cloud' ? openaiAdapter : localWhisperAdapter
}

route.post('/', async c => {
  const form = await c.req.formData()
  const audio = form.get('audio')
  const backendOverride = (form.get('backend') as STTBackend | null) ?? null

  if (!(audio instanceof File)) {
    return c.json({ error: 'audio field missing or not a file' }, 400)
  }

  const settings = await loadSettings()
  const backend: STTBackend = backendOverride ?? settings.backend
  const adapter = pickAdapter(backend)

  const wav = Buffer.from(await audio.arrayBuffer())
  const start = Date.now()
  try {
    const result = await adapter.transcribe(wav)
    const body: TranscribeResponse = {
      text: result.text,
      durationMs: Date.now() - start,
      backend: result.backend,
      model: result.model
    }
    return c.json(body)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ error: message }, 500)
  }
})

export default route
