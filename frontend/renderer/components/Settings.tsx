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
    <div className="max-w-xl space-y-12">
      <Section label="Microphone">
        <select
          value={settings.inputDeviceId ?? ''}
          onChange={e => update({ inputDeviceId: e.target.value || null })}
          className="w-full border-b border-rule bg-transparent py-2 font-serif text-[15px] text-ink focus:border-ink focus:outline-none"
        >
          <option value="">System default</option>
          {inputDevices.map(d => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Microphone (${d.deviceId.slice(0, 6)}…)`}
            </option>
          ))}
        </select>
        <p className="mt-2 text-[13px] italic text-muted">
          Pin to the built-in mic so Bluetooth headphones stay in high-quality
          A2DP mode and keep noise cancelling on.
        </p>
        {deviceError && (
          <p className="mt-1 text-[13px] italic text-accent">{deviceError}</p>
        )}
      </Section>

      <Section label="Transcription backend">
        <div className="flex gap-3">
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
          <div className="text-[15px] text-ink">
            Whisper base.en —{' '}
            {models.local.downloaded ? (
              <span className="italic text-muted">downloaded</span>
            ) : modelProgress != null ? (
              <span className="italic text-accent">
                downloading {modelProgress}%
              </span>
            ) : models.local.downloadingPercent != null ? (
              <span className="italic text-accent">
                downloading {models.local.downloadingPercent}%
              </span>
            ) : downloadStarting ? (
              <span className="italic text-accent">starting download…</span>
            ) : (
              <button
                onClick={startDownload}
                className="italic text-accent underline-offset-4 hover:underline"
              >
                download (~60 MB)
              </button>
            )}
          </div>
          {downloadError && (
            <p className="mt-1 text-[13px] italic text-accent">
              {downloadError}
            </p>
          )}
        </Section>
      )}

      {settings.backend === 'cloud' && (
        <>
          <Section label="Cloud model">
            <select
              value={settings.cloudModel}
              onChange={e => update({ cloudModel: e.target.value as CloudModel })}
              className="w-full border-b border-rule bg-transparent py-2 font-serif text-[15px] text-ink focus:border-ink focus:outline-none"
            >
              <option value="gpt-4o-mini-transcribe">gpt-4o-mini-transcribe</option>
              <option value="gpt-4o-transcribe">gpt-4o-transcribe</option>
              <option value="whisper-1">whisper-1</option>
            </select>
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
      <div className="mb-2 flex items-center gap-3">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted">
          {label}
        </h2>
        <span className="h-px flex-1 bg-rule" />
      </div>
      <div className="pt-2">{children}</div>
    </section>
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
      className={`flex-1 border px-4 py-3 text-left transition ${
        active
          ? 'border-ink bg-ink text-paper'
          : 'border-rule bg-paper text-ink hover:border-ink'
      }`}
    >
      <div className="text-[15px]">{label}</div>
      <div
        className={`text-[12px] italic ${active ? 'text-paper/70' : 'text-muted'}`}
      >
        {sub}
      </div>
    </button>
  )
}
