import type {
  ApiKeyStatus,
  ModelsStatus,
  Settings,
  TranscribeResponse
} from '@shared/types'

let baseUrl = ''
let token = ''

export async function initApi(): Promise<void> {
  const bs = await window.freestyle.bootstrap()
  baseUrl = bs.baseUrl
  token = bs.token
}

export function getBootstrap(): { baseUrl: string; token: string } {
  return { baseUrl, token }
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return { 'x-freestyle-token': token, ...extra }
}

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  async getSettings(): Promise<Settings> {
    const r = await fetch(`${baseUrl}/settings`, { headers: headers() })
    return asJson<Settings>(r)
  },
  async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    const r = await fetch(`${baseUrl}/settings`, {
      method: 'PUT',
      headers: headers({ 'content-type': 'application/json' }),
      body: JSON.stringify(patch)
    })
    return asJson<Settings>(r)
  },
  async getApiKeyStatus(): Promise<ApiKeyStatus> {
    const r = await fetch(`${baseUrl}/api-key/status`, { headers: headers() })
    return asJson<ApiKeyStatus>(r)
  },
  async setApiKey(provider: 'openai', key: string): Promise<void> {
    const r = await fetch(`${baseUrl}/api-key`, {
      method: 'POST',
      headers: headers({ 'content-type': 'application/json' }),
      body: JSON.stringify({ provider, key })
    })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
  },
  async clearApiKey(provider: 'openai'): Promise<void> {
    const r = await fetch(`${baseUrl}/api-key`, {
      method: 'DELETE',
      headers: headers({ 'content-type': 'application/json' }),
      body: JSON.stringify({ provider })
    })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
  },
  async getModels(): Promise<ModelsStatus> {
    const r = await fetch(`${baseUrl}/models`, { headers: headers() })
    return asJson<ModelsStatus>(r)
  },
  async downloadLocalModel(): Promise<void> {
    const r = await fetch(`${baseUrl}/models/local/download`, {
      method: 'POST',
      headers: headers()
    })
    if (!r.ok) {
      const text = await r.text().catch(() => '')
      throw new Error(`HTTP ${r.status}: ${text || r.statusText}`)
    }
  },
  async transcribe(wav: Blob): Promise<TranscribeResponse> {
    const form = new FormData()
    form.append('audio', wav, 'audio.wav')
    const r = await fetch(`${baseUrl}/transcribe`, {
      method: 'POST',
      headers: headers(),
      body: form
    })
    return asJson<TranscribeResponse>(r)
  }
}
