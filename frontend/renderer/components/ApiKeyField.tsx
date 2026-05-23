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
      {!editing && status.openai.present ? (
        <div className="flex items-center gap-3">
          <code className="font-serif text-[15px] italic text-ink">
            sk-…{status.openai.lastFour}
          </code>
          <button
            disabled={busy}
            onClick={() => setEditing(true)}
            className="italic text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            replace
          </button>
          <button
            disabled={busy}
            onClick={clear}
            className="italic text-accent underline-offset-4 hover:underline"
          >
            clear
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <input
            type="password"
            placeholder="sk-…"
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-full border-b border-rule bg-transparent py-2 font-serif text-[15px] text-ink placeholder:italic placeholder:text-muted focus:border-ink focus:outline-none"
          />
          <button
            disabled={busy || !value.trim()}
            onClick={save}
            className="shrink-0 border border-ink px-3 py-1.5 text-[14px] text-ink hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-40"
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
              className="shrink-0 italic text-muted hover:text-ink"
            >
              cancel
            </button>
          )}
        </div>
      )}

      {err && <p className="text-[13px] italic text-accent">{err}</p>}
      <p className="text-[13px] italic text-muted">
        Stored encrypted via macOS Keychain. Never logged, never sent anywhere
        except api.openai.com.
      </p>
    </div>
  )
}
