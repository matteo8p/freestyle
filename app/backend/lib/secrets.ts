import { promises as fs } from 'fs'
import path from 'path'
import { app, safeStorage } from 'electron'

type Provider = 'openai'

function secretsPath(): string {
  return path.join(app.getPath('userData'), 'secrets.bin')
}

interface SecretStore {
  openai?: string
}

async function readStore(): Promise<SecretStore> {
  try {
    const raw = await fs.readFile(secretsPath())
    if (!safeStorage.isEncryptionAvailable()) {
      return {}
    }
    const decrypted = safeStorage.decryptString(raw)
    return JSON.parse(decrypted)
  } catch {
    return {}
  }
}

async function writeStore(store: SecretStore): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage encryption not available on this system')
  }
  const encrypted = safeStorage.encryptString(JSON.stringify(store))
  await fs.mkdir(path.dirname(secretsPath()), { recursive: true })
  await fs.writeFile(secretsPath(), encrypted)
}

export async function getKey(provider: Provider): Promise<string | undefined> {
  const store = await readStore()
  return store[provider]
}

export async function setKey(provider: Provider, key: string): Promise<void> {
  const store = await readStore()
  store[provider] = key
  await writeStore(store)
}

export async function deleteKey(provider: Provider): Promise<void> {
  const store = await readStore()
  delete store[provider]
  await writeStore(store)
}

export async function keyStatus(provider: Provider): Promise<{
  present: boolean
  lastFour?: string
}> {
  const key = await getKey(provider)
  if (!key) return { present: false }
  return { present: true, lastFour: key.slice(-4) }
}
