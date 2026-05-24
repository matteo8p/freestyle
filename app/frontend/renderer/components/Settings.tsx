import { useEffect, useState, type CSSProperties, type JSX, type ReactNode } from 'react'
import { api } from '../api'
import { ApiKeyField } from './ApiKeyField'
import { COLORS } from './art'
import type {
  ApiKeyStatus,
  CloudModel,
  ModelsStatus,
  Settings as SettingsType
} from '@shared/types'

interface Props {
  settings: SettingsType
  onSettingsChange: (s: SettingsType) => void
  modelProgress: number | null
}

export function Settings({
  settings,
  onSettingsChange,
  modelProgress
}: Props): JSX.Element {
  const [keyStatus, setKeyStatus] = useState<ApiKeyStatus | null>(null)
  const [models, setModels] = useState<ModelsStatus | null>(null)
  const [downloadStarting, setDownloadStarting] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceError, setDeviceError] = useState<string | null>(null)

  async function refresh(): Promise<void> {
    const [k, m] = await Promise.all([api.getApiKeyStatus(), api.getModels()])
    setKeyStatus(k)
    setModels(m)
  }

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadDevices(autoPick: boolean): Promise<void> {
      try {
        let all = await navigator.mediaDevices.enumerateDevices()
        let inputs = all.filter(d => d.kind === 'audioinput')

        if (inputs.length > 0 && inputs.every(d => !d.label)) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false
            }
          })
          stream.getTracks().forEach(t => t.stop())
          all = await navigator.mediaDevices.enumerateDevices()
          inputs = all.filter(d => d.kind === 'audioinput')
        }

        if (cancelled) return
        setInputDevices(inputs)
        setDeviceError(null)

        if (
          settings.inputDeviceId &&
          !inputs.some(d => d.deviceId === settings.inputDeviceId)
        ) {
          await update({ inputDeviceId: null })
          return
        }

        if (autoPick && settings.inputDeviceId == null) {
          const builtin = inputs.find(d => /MacBook|Built-in/i.test(d.label))
          if (builtin) await update({ inputDeviceId: builtin.deviceId })
        }
      } catch (e) {
        if (!cancelled) setDeviceError(e instanceof Error ? e.message : String(e))
      }
    }

    void loadDevices(true)
    const onChange = (): void => void loadDevices(false)
    navigator.mediaDevices.addEventListener('devicechange', onChange)
    return () => {
      cancelled = true
      navigator.mediaDevices.removeEventListener('devicechange', onChange)
    }
  }, [])

  useEffect(() => {
    if (modelProgress === 100) refresh()
  }, [modelProgress])

  async function update(patch: Partial<SettingsType>): Promise<void> {
    const next = await api.updateSettings(patch)
    onSettingsChange(next)
  }

  async function startDownload(): Promise<void> {
    setDownloadStarting(true)
    setDownloadError(null)
    try {
      await api.downloadLocalModel()
      await refresh()
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : String(e))
    } finally {
      setDownloadStarting(false)
    }
  }

  const selectedMicLabel =
    settings.inputDeviceId == null
      ? 'System default'
      : inputDevices.find(d => d.deviceId === settings.inputDeviceId)?.label ||
        'System default'

  const downloadPct = models?.local.downloaded
    ? 100
    : modelProgress ?? models?.local.downloadingPercent ?? 0
  const downloading =
    !models?.local.downloaded &&
    (modelProgress != null ||
      models?.local.downloadingPercent != null ||
      downloadStarting)

  return (
    <div
      className="flex h-full flex-col overflow-y-auto"
      style={{ background: COLORS.CANVAS }}
    >
      <main
        style={{
          flex: 1,
          padding: '20px 36px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          minHeight: 0
        }}
      >
        <div
          className="mono"
          style={{
            paddingTop: 48,
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: COLORS.MUTE,
            flexShrink: 0
          }}
        >
          Preferences
        </div>
        <h1 style={{ margin: 0 }}>
          <span
            className="serif"
            style={{
              fontSize: 56,
              color: COLORS.INK,
              lineHeight: 0.95,
              letterSpacing: '-0.025em'
            }}
          >
            Make it{' '}
          </span>
          <span
            className="serif-italic"
            style={{ fontSize: 56, color: COLORS.OLIVE, lineHeight: 0.95 }}
          >
            yours.
          </span>
        </h1>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 12
          }}
        >
          <BentoCard
            span={4}
            label="Hotkey"
            desc="Hold to record. Release to transcribe."
          >
            <div
              style={{ display: 'flex', gap: 10, alignItems: 'center' }}
            >
              <KbdBig>fn</KbdBig>
              <span style={{ fontSize: 12, color: COLORS.MUTE }}>globe key</span>
            </div>
          </BentoCard>

          <BentoCard
            span={2}
            label="Microphone"
            desc="Pin to internal mic so Bluetooth stays high-quality."
          >
            <Dropdown
              value={settings.inputDeviceId ?? ''}
              renderValue={selectedMicLabel}
              options={[
                { value: '', label: 'System default' },
                ...inputDevices.map(d => ({
                  value: d.deviceId,
                  label: d.label || `Microphone (${d.deviceId.slice(0, 6)}…)`
                }))
              ]}
              onChange={v => update({ inputDeviceId: v || null })}
            />
            {deviceError && (
              <p style={{ marginTop: 6, fontSize: 11.5, color: COLORS.BLUSH }}>
                {deviceError}
              </p>
            )}
          </BentoCard>

          <BentoCard
            span={3}
            label="Transcription"
            desc="Where audio becomes text."
          >
            <Segment
              options={[
                { id: 'local', label: 'On-device', sub: 'whisper.cpp · base.en' },
                { id: 'cloud', label: 'Cloud', sub: 'OpenAI · BYOK' }
              ]}
              active={settings.backend}
              onChange={id => update({ backend: id as 'local' | 'cloud' })}
            />
          </BentoCard>

          {settings.backend === 'local' && models && (
            <BentoCard
              span={3}
              label="Local model"
              desc="60 MB · Application Support."
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <ProgressBar percent={downloadPct} />
                {models.local.downloaded ? (
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: COLORS.OLIVE,
                      fontWeight: 500,
                      letterSpacing: '0.06em'
                    }}
                  >
                    DOWNLOADED
                  </span>
                ) : downloading ? (
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: COLORS.OLIVE,
                      fontWeight: 500,
                      letterSpacing: '0.06em'
                    }}
                  >
                    {modelProgress ??
                      models.local.downloadingPercent ??
                      0}
                    %
                  </span>
                ) : (
                  <button onClick={startDownload} style={chipBtnStyle}>
                    Download
                  </button>
                )}
                <div style={{ flex: 1 }} />
                {models.local.downloaded && (
                  <button onClick={startDownload} style={ghostBtnStyle}>
                    Re-download
                  </button>
                )}
              </div>
              {downloadError && (
                <p style={{ marginTop: 6, fontSize: 11.5, color: COLORS.BLUSH }}>
                  {downloadError}
                </p>
              )}
            </BentoCard>
          )}

          {settings.backend === 'cloud' && (
            <BentoCard
              span={3}
              label="Cloud model"
              desc="OpenAI transcription endpoint."
            >
              <Dropdown
                value={settings.cloudModel}
                options={[
                  { value: 'gpt-4o-mini-transcribe', label: 'gpt-4o-mini-transcribe' },
                  { value: 'gpt-4o-transcribe', label: 'gpt-4o-transcribe' },
                  { value: 'whisper-1', label: 'whisper-1' }
                ]}
                onChange={v => update({ cloudModel: v as CloudModel })}
              />
            </BentoCard>
          )}

          {settings.backend === 'cloud' && (
            <BentoCard
              span={settings.cloudModel === 'whisper-1' ? 6 : 4}
              label="OpenAI API key"
              desc="Stored encrypted in macOS Keychain. Never logged."
            >
              {keyStatus && <ApiKeyField status={keyStatus} onChange={refresh} />}
            </BentoCard>
          )}

          {settings.backend === 'cloud' &&
            settings.cloudModel !== 'whisper-1' && (
              <BentoCard
                span={2}
                label="Stream transcript"
                desc="Send audio as you speak so paste fires fast on release."
                beta
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}
                >
                  <Toggle
                    on={settings.streaming}
                    onChange={v => update({ streaming: v })}
                  />
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: settings.streaming ? COLORS.OLIVE : COLORS.MUTE,
                      letterSpacing: '0.12em'
                    }}
                  >
                    {settings.streaming ? 'ENABLED' : 'OFF'}
                  </span>
                </div>
              </BentoCard>
            )}
        </div>
      </main>
    </div>
  )
}

function BentoCard({
  children,
  label,
  desc,
  span = 2,
  beta
}: {
  children: ReactNode
  label: string
  desc: string
  span?: number
  beta?: boolean
}): JSX.Element {
  return (
    <div
      style={{
        gridColumn: `span ${span}`,
        background: COLORS.ELEVATED,
        border: `1px solid ${COLORS.RULE}`,
        borderRadius: 14,
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 124
      }}
    >
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 4
          }}
        >
          <span
            style={{ fontSize: 13.5, color: COLORS.INK, fontWeight: 500 }}
          >
            {label}
          </span>
          {beta && (
            <span
              className="mono"
              style={{
                fontSize: 9,
                padding: '2px 6px',
                background: COLORS.OLIVE_SOFT,
                color: COLORS.OLIVE_INK,
                border: `1px solid ${COLORS.OLIVE}33`,
                borderRadius: 999,
                letterSpacing: '0.12em'
              }}
            >
              BETA
            </span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: COLORS.MUTE, lineHeight: 1.45 }}>
          {desc}
        </div>
      </div>
      <div style={{ marginTop: 'auto' }}>{children}</div>
    </div>
  )
}

function KbdBig({ children }: { children: ReactNode }): JSX.Element {
  return (
    <span
      className="mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 36,
        height: 32,
        padding: '0 9px',
        background: COLORS.CANVAS,
        border: `1px solid ${COLORS.RULE}`,
        borderBottom: `2px solid ${COLORS.RULE}`,
        borderRadius: 7,
        fontSize: 13,
        color: COLORS.INK,
        fontWeight: 500
      }}
    >
      {children}
    </span>
  )
}

export const chipBtnStyle: CSSProperties = {
  background: COLORS.INK,
  color: COLORS.CANVAS,
  border: 'none',
  padding: '7px 14px',
  borderRadius: 7,
  fontSize: 12.5,
  fontFamily: 'inherit',
  cursor: 'pointer',
  fontWeight: 500
}

export const ghostBtnStyle: CSSProperties = {
  background: 'transparent',
  color: COLORS.INK_SOFT,
  border: `1px solid ${COLORS.RULE}`,
  padding: '6px 12px',
  borderRadius: 7,
  fontSize: 12,
  fontFamily: 'inherit',
  cursor: 'pointer'
}

function Segment({
  options,
  active,
  onChange
}: {
  options: { id: string; label: string; sub: string }[]
  active: string
  onChange: (id: string) => void
}): JSX.Element {
  return (
    <div
      style={{
        display: 'inline-flex',
        background: COLORS.PAPER,
        padding: 4,
        borderRadius: 10,
        border: `1px solid ${COLORS.RULE}`,
        gap: 4
      }}
    >
      {options.map(o => {
        const isOn = o.id === active
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            style={{
              background: isOn ? COLORS.ELEVATED : 'transparent',
              border: isOn ? `1px solid ${COLORS.RULE}` : '1px solid transparent',
              padding: '7px 12px',
              borderRadius: 7,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 1,
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: isOn ? '0 1px 2px rgba(20,12,4,0.05)' : 'none'
            }}
          >
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                color: isOn ? COLORS.INK : COLORS.INK_SOFT
              }}
            >
              {o.label}
            </span>
            <span
              className="mono"
              style={{
                fontSize: 10,
                color: COLORS.MUTE,
                letterSpacing: '0.04em'
              }}
            >
              {o.sub}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function Toggle({
  on,
  onChange
}: {
  on: boolean
  onChange: (v: boolean) => void
}): JSX.Element {
  const w = 44
  const h = 26
  const knob = 20
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      style={{
        width: w,
        height: h,
        borderRadius: 999,
        background: on ? COLORS.OLIVE : COLORS.PAPER,
        border: `1px solid ${on ? COLORS.OLIVE_DEEP : COLORS.RULE}`,
        position: 'relative',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0
      }}
      aria-pressed={on}
    >
      <span
        style={{
          width: knob,
          height: knob,
          borderRadius: '50%',
          background: on ? COLORS.CANVAS : COLORS.MUTE,
          position: 'absolute',
          top: 2,
          left: on ? w - knob - 4 : 2,
          transition: 'left 0.18s'
        }}
      />
    </button>
  )
}

function ProgressBar({ percent }: { percent: number }): JSX.Element {
  return (
    <div
      style={{
        width: 110,
        height: 4,
        borderRadius: 999,
        background: COLORS.PAPER,
        overflow: 'hidden',
        border: `1px solid ${COLORS.RULE_SOFT}`
      }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(100, percent))}%`,
          height: '100%',
          background: COLORS.OLIVE,
          borderRadius: 999,
          transition: 'width 200ms ease'
        }}
      />
    </div>
  )
}

function Dropdown({
  value,
  options,
  onChange,
  renderValue
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  renderValue?: string
}): JSX.Element {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', width: '100%' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%',
          appearance: 'none',
          WebkitAppearance: 'none',
          background: COLORS.CANVAS,
          border: `1px solid ${COLORS.RULE}`,
          borderRadius: 7,
          padding: '7px 28px 7px 11px',
          fontSize: 12.5,
          color: COLORS.INK,
          fontFamily: 'inherit',
          cursor: 'pointer'
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {renderValue && o.value === value ? renderValue : o.label}
          </option>
        ))}
      </select>
      <svg
        width="10"
        height="6"
        viewBox="0 0 10 6"
        style={{
          position: 'absolute',
          right: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none'
        }}
      >
        <path
          d="M1 1l4 4 4-4"
          stroke={COLORS.MUTE}
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
