import { useEffect, useState, type JSX } from 'react'
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

  return (
    <div className="mx-auto w-full max-w-2xl space-y-10">
      <Section label="Microphone">
        <Select
          value={settings.inputDeviceId ?? ''}
          onChange={v => update({ inputDeviceId: v || null })}
        >
          <option value="">System default</option>
          {inputDevices.map(d => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Microphone (${d.deviceId.slice(0, 6)}…)`}
            </option>
          ))}
        </Select>
        <p className="mt-2 text-[12.5px] text-muted">
          Pin to the built-in mic so Bluetooth headphones stay in high-quality
          A2DP mode and keep noise cancelling on.
        </p>
        {deviceError && (
          <p className="mt-1 text-[12.5px] text-accent">{deviceError}</p>
        )}
      </Section>

      <Section label="Transcription backend">
        <div className="grid grid-cols-2 gap-3">
          <BackendOption
            label="Local"
            sub="whisper.cpp on this Mac"
            active={settings.backend === 'local'}
            onClick={() => update({ backend: 'local' })}
          />
          <BackendOption
            label="Cloud"
            sub="OpenAI (your API key)"
            active={settings.backend === 'cloud'}
            onClick={() => update({ backend: 'cloud' })}
          />
        </div>
      </Section>

      {settings.backend === 'local' && models && (
        <Section label="Local model">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-rule bg-surface px-4 py-3">
            <div>
              <div className="text-[13.5px] font-medium text-ink">
                Whisper base.en
              </div>
              <div className="font-mono text-[12px] text-muted">
                ggml-base.en · q5_1 · ~60 MB
              </div>
            </div>
            <div className="text-[12.5px]">
              {models.local.downloaded ? (
                <span className="inline-flex items-center gap-1.5 text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Installed
                </span>
              ) : modelProgress != null ? (
                <span className="text-accent">Downloading {modelProgress}%</span>
              ) : models.local.downloadingPercent != null ? (
                <span className="text-accent">
                  Downloading {models.local.downloadingPercent}%
                </span>
              ) : downloadStarting ? (
                <span className="text-accent">Starting…</span>
              ) : (
                <button
                  onClick={startDownload}
                  className="rounded-md border border-ink bg-ink px-3 py-1.5 text-[12.5px] font-medium text-paper transition hover:bg-ink/90"
                >
                  Download
                </button>
              )}
            </div>
          </div>
          {downloadError && (
            <p className="mt-2 text-[12.5px] text-accent">{downloadError}</p>
          )}
        </Section>
      )}

      {settings.backend === 'cloud' && (
        <>
          <Section label="Cloud model">
            <Select
              value={settings.cloudModel}
              onChange={v => update({ cloudModel: v as CloudModel })}
            >
              <option value="gpt-4o-mini-transcribe">gpt-4o-mini-transcribe</option>
              <option value="gpt-4o-transcribe">gpt-4o-transcribe</option>
              <option value="whisper-1">whisper-1</option>
            </Select>
          </Section>

          <Section label="OpenAI API key">
            {keyStatus && <ApiKeyField status={keyStatus} onChange={refresh} />}
          </Section>
        </>
      )}
    </div>
  )
}

function Section({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <section>
      <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
        {label}
      </h2>
      <div>{children}</div>
    </section>
  )
}

function Select({
  value,
  onChange,
  children
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}): JSX.Element {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none rounded-md border border-rule bg-paper px-3 py-2 pr-9 text-[13.5px] text-ink transition hover:border-ink/40 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  )
}

function BackendOption({
  label,
  sub,
  active,
  onClick
}: {
  label: string
  sub: string
  active: boolean
  onClick: () => void
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group relative rounded-lg border px-4 py-3 text-left transition ${
        active
          ? 'border-ink bg-ink text-paper'
          : 'border-rule bg-paper text-ink hover:border-ink/40 hover:bg-subtle/40'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13.5px] font-medium">{label}</span>
        {active && (
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </div>
      <div
        className={`mt-0.5 text-[12px] ${active ? 'text-paper/70' : 'text-muted'}`}
      >
        {sub}
      </div>
    </button>
  )
}
