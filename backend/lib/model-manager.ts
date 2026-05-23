import { promises as fs } from 'fs'
import { createRequire } from 'module'
import path from 'path'
import { app } from 'electron'

const nodeRequire = createRequire(import.meta.url)

const MODEL_NAME = 'base.en'
const MODEL_FILE = `ggml-${MODEL_NAME}.bin`
const MODEL_URL = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL_FILE}`

export interface ModelState {
  downloaded: boolean
  downloadingPercent?: number
}

let state: ModelState = { downloaded: false }
let progressCallback: ((percent: number) => void) | null = null
let inFlight: Promise<string> | null = null

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

function whisperCppModelsDir(): string | null {
  try {
    const pkg = nodeRequire.resolve('nodejs-whisper/package.json')
    return path.join(path.dirname(pkg), 'cpp', 'whisper.cpp', 'models')
  } catch {
    return null
  }
}

async function ensureWhisperLink(target: string): Promise<void> {
  const dir = whisperCppModelsDir()
  if (!dir) return
  const link = path.join(dir, MODEL_FILE)
  try {
    const stat = await fs.lstat(link)
    if (stat.isSymbolicLink() || stat.isFile()) return
  } catch {}
  try {
    await fs.mkdir(dir, { recursive: true })
    await fs.symlink(target, link)
  } catch (err) {
    console.warn('[freestyle] failed to symlink model into nodejs-whisper:', err)
  }
}

function setState(next: ModelState): void {
  state = next
  if (next.downloadingPercent != null) progressCallback?.(next.downloadingPercent)
}

async function doEnsureModel(): Promise<string> {
  const target = modelPath()
  try {
    await fs.access(target)
    await ensureWhisperLink(target)
    setState({ downloaded: true })
    return target
  } catch {}

  await fs.mkdir(modelsDir(), { recursive: true })
  setState({ downloaded: false, downloadingPercent: 0 })

  const res = await fetch(MODEL_URL)
  if (!res.ok || !res.body) {
    setState({ downloaded: false })
    throw new Error(`Model download failed: ${res.status}`)
  }
  const total = Number(res.headers.get('content-length') ?? 0)
  let received = 0
  let lastPct = -1

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
        if (pct !== lastPct) {
          lastPct = pct
          setState({ downloaded: false, downloadingPercent: pct })
        }
      }
    }
  } finally {
    await handle.close()
  }
  await fs.rename(tmp, target)
  await ensureWhisperLink(target)
  state = { downloaded: true }
  progressCallback?.(100)
  return target
}

export function ensureModel(): Promise<string> {
  if (inFlight) return inFlight
  inFlight = doEnsureModel().finally(() => {
    inFlight = null
  })
  return inFlight
}

export async function probeModel(): Promise<void> {
  const target = modelPath()
  try {
    await fs.access(target)
    await ensureWhisperLink(target)
    state = { downloaded: true }
  } catch {
    state = { downloaded: false }
  }
}
