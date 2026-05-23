import { promises as fs } from 'fs'
import path from 'path'
import { app } from 'electron'

const MODEL_NAME = 'base.en'
const MODEL_FILE = `ggml-${MODEL_NAME}.bin`
const MODEL_URL = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL_FILE}`

export interface ModelState {
  downloaded: boolean
  downloadingPercent?: number
}

let state: ModelState = { downloaded: false }
let progressCallback: ((percent: number) => void) | null = null

export function onProgress(cb: (percent: number) => void): void {
  progressCallback = cb
}

export function getModelState(): ModelState {
  return state
}

export function getModelName(): string {
  return MODEL_NAME
}

function modelsDir(): string {
  return path.join(app.getPath('userData'), 'models')
}

export function modelPath(): string {
  return path.join(modelsDir(), MODEL_FILE)
}

export async function ensureModel(): Promise<string> {
  const target = modelPath()
  try {
    await fs.access(target)
    state = { downloaded: true }
    return target
  } catch {
    // download below
  }

  await fs.mkdir(modelsDir(), { recursive: true })
  state = { downloaded: false, downloadingPercent: 0 }

  const res = await fetch(MODEL_URL)
  if (!res.ok || !res.body) {
    throw new Error(`Model download failed: ${res.status}`)
  }
  const total = Number(res.headers.get('content-length') ?? 0)
  let received = 0

  const tmp = target + '.partial'
  const handle = await fs.open(tmp, 'w')
  try {
    const reader = res.body.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      await handle.write(value)
      received += value.byteLength
      if (total > 0) {
        const pct = Math.floor((received / total) * 100)
        state = { downloaded: false, downloadingPercent: pct }
        progressCallback?.(pct)
      }
    }
  } finally {
    await handle.close()
  }
  await fs.rename(tmp, target)
  state = { downloaded: true }
  progressCallback?.(100)
  return target
}
