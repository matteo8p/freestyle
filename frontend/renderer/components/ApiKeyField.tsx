import { useState, type JSX } from 'react'
import { api } from '../api'
import type { ApiKeyStatus } from '@shared/types'

interface Props {
  status: ApiKeyStatus
  onChange: () => Promise<void>
}

export function ApiKeyField({ status, onChange }: Props): JSX.Element {
  const [editing, setEditing] = useState(!status.openai.present)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save(): Promise<void> {
    if (!value.trim()) return
    setBusy(true)
    setErr(null)
    try {
      await api.setApiKey('openai', value.trim())
      setValue('')
      setEditing(false)
      await onChange()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function clear(): Promise<void> {
    setBusy(true)
    setErr(null)
    try {
      await api.clearApiKey('openai')
      await onChange()
      setEditing(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-zinc-200">
        OpenAI API key
      </label>

      {!editing && status.openai.present ? (
        <div className="flex items-center gap-2">
          <code className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-300">
            sk-…{status.openai.lastFour}
          </code>
          <button
            disabled={busy}
            onClick={() => setEditing(true)}
            className="rounded border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Replace
          </button>
          <button
            disabled={busy}
            onClick={clear}
            className="rounded border border-rose-700/50 px-3 py-2 text-sm text-rose-200 hover:bg-rose-900/30"
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="password"
            placeholder="sk-..."
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
          />
          <button
            disabled={busy || !value.trim()}
            onClick={save}
            className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
          >
            Save
          </button>
          {status.openai.present && (
            <button
              disabled={busy}
              onClick={() => {
                setEditing(false)
                setValue('')
              }}
              className="rounded border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {err && <p className="text-xs text-rose-400">{err}</p>}
      <p className="text-xs text-zinc-500">
        Stored encrypted via macOS Keychain. Never logged, never sent anywhere
        except api.openai.com.
      </p>
    </div>
  )
}
