import { useState, type JSX } from 'react'
import { api } from '../api'
import type { ApiKeyStatus } from '@shared/types'
import { chipBtnStyle, ghostBtnStyle } from './Settings'

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
        <div className="flex items-center" style={{ gap: 10 }}>
          <div
            className="font-mono rounded-lg border border-rule bg-paper-deep text-ink-soft"
            style={{
              fontSize: 13,
              padding: '8px 12px',
              letterSpacing: '0.04em'
            }}
          >
            sk-…·{status.openai.lastFour}
          </div>
          <button disabled={busy} onClick={() => setEditing(true)} style={chipBtnStyle}>
            Replace
          </button>
          <button
            disabled={busy}
            onClick={clear}
            style={{ ...ghostBtnStyle, color: '#F5511D' }}
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="flex items-center" style={{ gap: 10 }}>
          <input
            type="password"
            placeholder="sk-..."
            value={value}
            onChange={e => setValue(e.target.value)}
            className="font-mono w-full rounded-lg border border-rule bg-white text-ink placeholder:text-mute"
            style={{
              padding: '8px 12px',
              fontSize: 13,
              letterSpacing: '0.04em'
            }}
          />
          <button
            disabled={busy || !value.trim()}
            onClick={save}
            style={{
              ...chipBtnStyle,
              opacity: busy || !value.trim() ? 0.4 : 1,
              cursor: busy || !value.trim() ? 'not-allowed' : 'pointer'
            }}
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
              style={ghostBtnStyle}
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {err && <p className="text-[12.5px] text-coral">{err}</p>}
    </div>
  )
}
