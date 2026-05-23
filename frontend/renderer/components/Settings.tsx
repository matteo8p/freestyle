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

  async function refresh(): Promise<void> {
    const [k, m] = await Promise.all([api.getApiKeyStatus(), api.getModels()])
    setKeyStatus(k)
    setModels(m)
  }

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    if (modelProgress === 100) refresh()
  }, [modelProgress])

  async function update(patch: Partial<SettingsType>): Promise<void> {
    const next = await api.updateSettings(patch)
    onSettingsChange(next)
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Hotkey
        </h2>
        <div className="rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200">
          🌐 Fn / globe key
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Hold to record, release to transcribe and paste.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Transcription backend
        </h2>
        <div className="flex gap-2">
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
      </section>

      {settings.backend === 'local' && models && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Local model
          </h2>
          <div className="rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200">
            Whisper base.en —{' '}
            {models.local.downloaded ? (
              <span className="text-emerald-400">Downloaded</span>
            ) : modelProgress != null ? (
              <span className="text-amber-400">Downloading {modelProgress}%</span>
            ) : models.local.downloadingPercent != null ? (
              <span className="text-amber-400">
                Downloading {models.local.downloadingPercent}%
              </span>
            ) : (
              <button
                onClick={() => api.downloadLocalModel()}
                className="ml-1 rounded bg-zinc-700 px-2 py-0.5 text-xs hover:bg-zinc-600"
              >
                Download (~60 MB)
              </button>
            )}
          </div>
        </section>
      )}

      {settings.backend === 'cloud' && (
        <>
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Cloud model
            </h2>
            <select
              value={settings.cloudModel}
              onChange={e => update({ cloudModel: e.target.value as CloudModel })}
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="gpt-4o-mini-transcribe">gpt-4o-mini-transcribe</option>
              <option value="gpt-4o-transcribe">gpt-4o-transcribe</option>
              <option value="whisper-1">whisper-1</option>
            </select>
          </section>

          <section>
            {keyStatus && (
              <ApiKeyField status={keyStatus} onChange={refresh} />
            )}
          </section>
        </>
      )}
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
      onClick={onClick}
      className={`flex-1 rounded-lg border px-3 py-3 text-left text-sm transition ${
        active
          ? 'border-zinc-300 bg-zinc-100 text-zinc-900'
          : 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-zinc-700'
      }`}
    >
      <div className="font-medium">{label}</div>
      <div
        className={`text-xs ${active ? 'text-zinc-600' : 'text-zinc-500'}`}
      >
        {sub}
      </div>
    </button>
  )
}

