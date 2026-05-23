import { useState, type JSX } from 'react'
import { api } from '../api'
import type { ApiKeyStatus } from '@shared/types'
import { COLORS } from './art'
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {!editing && status.openai.present ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            className="mono"
            style={{
              fontSize: 13,
              padding: '8px 12px',
              background: COLORS.PAPER,
              border: `1px solid ${COLORS.RULE}`,
              borderRadius: 8,
              color: COLORS.INK_SOFT,
              letterSpacing: '0.04em',
              flex: 1
            }}
          >
            sk-…·{status.openai.lastFour}
          </div>
          <button
            disabled={busy}
            onClick={() => setEditing(true)}
            style={chipBtnStyle}
          >
            Replace
          </button>
          <button
            disabled={busy}
            onClick={clear}
            style={{
              ...ghostBtnStyle,
              color: COLORS.BLUSH,
              borderColor: `${COLORS.BLUSH}55`
            }}
          >
            Clear
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="password"
            placeholder="sk-..."
            value={value}
            onChange={e => setValue(e.target.value)}
            className="mono"
            style={{
              flex: 1,
              fontSize: 13,
              padding: '8px 12px',
              background: COLORS.CANVAS,
              border: `1px solid ${COLORS.RULE}`,
              borderRadius: 8,
              color: COLORS.INK,
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

      {err && (
        <p style={{ fontSize: 11.5, color: COLORS.BLUSH, margin: 0 }}>{err}</p>
      )}
    </div>
  )
}
