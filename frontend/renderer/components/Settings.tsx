import { useEffect, useState, type JSX, type ReactNode } from 'react'
import { api } from '../api'
import { ApiKeyField } from './ApiKeyField'
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

  return (
    <div
      className="flex h-full flex-col overflow-y-auto"
      style={{ padding: '48px 64px', gap: 32 }}
    >
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute" style={{ marginBottom: 8 }}>
          Settings
        </div>
        <h1
          className="font-display m-0 text-ink"
          style={{
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 0.95,
            letterSpacing: '-0.035em',
            fontVariationSettings: `'wdth' 85, 'opsz' 60`
          }}
        >
          Make it yours.
        </h1>
      </div>

      <SettingsRow
        label="Hotkey"
        desc="Hold to record, release to transcribe."
      >
        <div className="flex items-center" style={{ gap: 8 }}>
          <KbdBig>fn</KbdBig>
          <span className="text-[12px] text-mute">globe key</span>
        </div>
      </SettingsRow>

      <SettingsRow
        label="Transcription"
        desc="Where audio is turned into text."
      >
        <Segment
          options={[
            { id: 'local', label: 'On-device', sub: 'whisper.cpp · base.en' },
            { id: 'cloud', label: 'Cloud', sub: 'OpenAI · BYOK' }
          ]}
          active={settings.backend}
          onChange={id => update({ backend: id as 'local' | 'cloud' })}
        />
      </SettingsRow>

      {settings.backend === 'local' && models && (
        <SettingsRow
          label="Local model"
          desc="60 MB, lives in Application Support."
        >
          <div className="flex items-center" style={{ gap: 14 }}>
            <ProgressBar percent={downloadPct} />
            {models.local.downloaded ? (
              <div className="text-[13px] font-semibold text-sage">Downloaded</div>
            ) : modelProgress != null ? (
              <div className="text-[13px] font-semibold text-coral">
                {modelProgress}%
              </div>
            ) : models.local.downloadingPercent != null ? (
              <div className="text-[13px] font-semibold text-coral">
                {models.local.downloadingPercent}%
              </div>
            ) : downloadStarting ? (
              <div className="text-[13px] font-semibold text-coral">Starting…</div>
            ) : (
              <button onClick={startDownload} style={chipBtnStyle}>
                Download
              </button>
            )}
          </div>
          {downloadError && (
            <p className="mt-2 text-[12.5px] text-coral">{downloadError}</p>
          )}
        </SettingsRow>
      )}

      {settings.backend === 'cloud' && (
        <>
          <SettingsRow
            label="Cloud model"
            desc="Which OpenAI transcription endpoint to call."
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
          </SettingsRow>

          <SettingsRow
            label="OpenAI API key"
            desc="Stored encrypted in macOS Keychain. Never logged."
          >
            {keyStatus && <ApiKeyField status={keyStatus} onChange={refresh} />}
          </SettingsRow>
        </>
      )}

      <SettingsRow
        label="Microphone"
        desc="Pin to internal mic so Bluetooth headphones stay high-quality."
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
          <p className="mt-2 text-[12.5px] text-coral">{deviceError}</p>
        )}
      </SettingsRow>
    </div>
  )
}

function SettingsRow({
  label,
  desc,
  children,
  beta
}: {
  label: string
  desc: string
  children: ReactNode
  beta?: boolean
}): JSX.Element {
  return (
    <div
      className="grid items-start border-b border-rule"
      style={{
        gridTemplateColumns: '280px 1fr',
        gap: 32,
        paddingBottom: 22
      }}
    >
      <div>
        <div className="flex items-center" style={{ gap: 8, marginBottom: 4 }}>
          <div className="text-[15px] font-semibold text-ink">{label}</div>
          {beta && (
            <span
              className="font-mono rounded-full bg-butter text-ink"
              style={{
                fontSize: 9,
                padding: '2px 6px',
                letterSpacing: '0.1em'
              }}
            >
              BETA
            </span>
          )}
        </div>
        <div
          className="text-mute"
          style={{ fontSize: 12.5, lineHeight: 1.5, maxWidth: 260 }}
        >
          {desc}
        </div>
      </div>
      <div>{children}</div>
    </div>
  )
}

function KbdBig({ children }: { children: ReactNode }): JSX.Element {
  return (
    <span
      className="font-mono inline-flex items-center justify-center rounded-md border border-rule bg-white text-ink"
      style={{
        minWidth: 36,
        height: 32,
        padding: '0 9px',
        borderBottom: '2px solid #D8CFB9',
        fontSize: 13,
        fontWeight: 500
      }}
    >
      {children}
    </span>
  )
}

export const chipBtnStyle: React.CSSProperties = {
  background: '#1B1814',
  color: '#F1EBDD',
  border: 'none',
  padding: '7px 14px',
  borderRadius: 7,
  fontSize: 13,
  fontFamily: 'inherit',
  cursor: 'pointer',
  fontWeight: 500
}

export const ghostBtnStyle: React.CSSProperties = {
  background: 'transparent',
  color: '#2B2620',
  border: '1px solid #D8CFB9',
  padding: '6px 12px',
  borderRadius: 7,
  fontSize: 12.5,
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
      className="inline-flex items-stretch rounded-[10px] border border-rule bg-paper-deep"
      style={{ padding: 4, gap: 4 }}
    >
      {options.map(o => {
        const isOn = o.id === active
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`flex flex-col rounded-[7px] border text-left transition ${
              isOn
                ? 'border-rule bg-paper shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                : 'border-transparent hover:bg-paper/50'
            }`}
            style={{ padding: '8px 14px' }}
          >
            <div className="text-[13px] font-semibold text-ink">{o.label}</div>
            <div className="font-mono text-[10px] text-mute" style={{ letterSpacing: '0.04em' }}>
              {o.sub}
            </div>
          </button>
        )
      })}
    </div>
  )
}

function ProgressBar({ percent }: { percent: number }): JSX.Element {
  return (
    <div
      className="overflow-hidden rounded-full bg-paper-deep"
      style={{ width: 160, height: 6 }}
    >
      <div
        className="h-full rounded-full bg-sage transition-[width] duration-200"
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
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
    <div className="relative inline-flex" style={{ minWidth: 280 }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-rule bg-white text-ink"
        style={{
          padding: '8px 32px 8px 12px',
          fontSize: 13,
          fontFamily: 'inherit'
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {renderValue && o.value === value ? renderValue : o.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
        width="10"
        height="6"
        viewBox="0 0 10 6"
      >
        <path
          d="M1 1l4 4 4-4"
          stroke="#8E8473"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
