import { promises as fs } from 'fs'
import path from 'path'
import { app } from 'electron'
import { DEFAULT_SETTINGS, type Settings } from '../../shared/types'

let cached: Settings | null = null

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

export async function loadSettings(): Promise<Settings> {
  if (cached) return cached
  try {
    const raw = await fs.readFile(settingsPath(), 'utf-8')
    const parsed = JSON.parse(raw)
    cached = { ...DEFAULT_SETTINGS, ...parsed }
    return cached!
  } catch {
    cached = { ...DEFAULT_SETTINGS }
    return cached
  }
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await loadSettings()
  const next = { ...current, ...patch }
  cached = next
  await fs.mkdir(path.dirname(settingsPath()), { recursive: true })
  await fs.writeFile(settingsPath(), JSON.stringify(next, null, 2), 'utf-8')
  return next
}
