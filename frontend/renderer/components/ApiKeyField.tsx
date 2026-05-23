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
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md border border-rule bg-surface px-3 py-2 font-mono text-[13px] text-ink">
            sk-…{status.openai.lastFour}
          </code>
          <button
            disabled={busy}
            onClick={() => setEditing(true)}
            className="rounded-md border border-rule bg-paper px-3 py-2 text-[12.5px] font-medium text-ink transition hover:border-ink/40 hover:bg-subtle/40 disabled:opacity-40"
          >
            Replace
          </button>
          <button
            disabled={busy}
            onClick={clear}
            className="rounded-md border border-rule bg-paper px-3 py-2 text-[12.5px] font-medium text-accent transition hover:border-accent/60 hover:bg-accent/5 disabled:opacity-40"
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
            className="w-full rounded-md border border-rule bg-paper px-3 py-2 font-mono text-[13px] text-ink placeholder:text-muted transition hover:border-ink/40 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
          />
          <button
            disabled={busy || !value.trim()}
            onClick={save}
            className="rounded-md border border-ink bg-ink px-3 py-2 text-[12.5px] font-medium text-paper transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
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
              className="rounded-md border border-rule bg-paper px-3 py-2 text-[12.5px] font-medium text-muted transition hover:border-ink/40 hover:text-ink"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {err && <p className="text-[12.5px] text-accent">{err}</p>}
      <p className="text-[12.5px] text-muted">
        Stored encrypted via macOS Keychain. Never logged, never sent anywhere
        except api.openai.com.
      </p>
    </div>
  )
}
