import { useEffect, useRef, useState, type JSX } from 'react'
import { api, initApi } from './api'
import { Recorder } from './lib/recorder'
import { Pill } from './components/Pill'
import { Settings } from './components/Settings'
import type { Settings as SettingsType } from '@shared/types'

type PillState = 'idle' | 'recording' | 'transcribing' | 'pasting' | 'error'

export function App(): JSX.Element {
  const [ready, setReady] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)
  const [settings, setSettings] = useState<SettingsType | null>(null)
  const [pill, setPill] = useState<PillState>('idle')
  const [pillMessage, setPillMessage] = useState<string | undefined>(undefined)
  const [lastTranscript, setLastTranscript] = useState<string>('')
  const [modelProgress, setModelProgress] = useState<number | null>(null)
  const recorderRef = useRef<Recorder | null>(null)
  const recordingRef = useRef(false)
  const settingsRef = useRef<SettingsType | null>(null)

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    void (async (): Promise<void> => {
      try {
        await initApi()
        const s = await api.getSettings()
        setSettings(s)
        setReady(true)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error('[freestyle] boot failed', e)
        setBootError(msg)
      }
    })()
  }, [])

  useEffect(() => {
    const offDown = window.freestyle.onHotkeyDown(() => void onStart())
    const offUp = window.freestyle.onHotkeyUp(() => void onStop())
    const offProgress = window.freestyle.onModelDownloadProgress(p => {
      setModelProgress(p)
      if (p >= 100) setTimeout(() => setModelProgress(null), 1500)
    })
    return () => {
      offDown()
      offUp()
      offProgress()
    }
  }, [])

  async function onStart(): Promise<void> {
    if (recordingRef.current) return
    try {
      const rec = new Recorder()
      await rec.start(settingsRef.current?.inputDeviceId ?? null)
      recorderRef.current = rec
      recordingRef.current = true
      setPill('recording')
      setPillMessage(undefined)
    } catch (e) {
      setPill('error')
      setPillMessage(e instanceof Error ? e.message : String(e))
    }
  }

  async function onStop(): Promise<void> {
    if (!recordingRef.current) return
    recordingRef.current = false
    const rec = recorderRef.current
    recorderRef.current = null
    if (!rec) return
    try {
      setPill('transcribing')
      const wav = await rec.stop()
      const res = await api.transcribe(wav)
      setLastTranscript(res.text)
      if (res.text.trim().length === 0) {
        setPill('error')
        setPillMessage('No speech detected')
        setTimeout(() => setPill('idle'), 1500)
        return
      }
      setPill('pasting')
      await window.freestyle.paste(res.text)
      setPill('idle')
    } catch (e) {
      setPill('error')
      setPillMessage(e instanceof Error ? e.message : String(e))
      setTimeout(() => setPill('idle'), 2500)
    }
  }

  if (bootError) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="max-w-md space-y-2 rounded border border-rose-700 bg-rose-950/40 p-4">
          <div className="text-sm font-semibold text-rose-200">Boot failed</div>
          <pre className="whitespace-pre-wrap text-xs text-rose-300">
            {bootError}
          </pre>
        </div>
      </div>
    )
  }

  if (!ready || !settings) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-zinc-400">Booting…</div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col gap-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Freestyle</h1>
          <p className="text-xs text-zinc-500">
            Hotkey → speak → text at your cursor
          </p>
        </div>
        <Pill state={pill} message={pillMessage} />
      </header>

      <Settings
        settings={settings}
        onSettingsChange={setSettings}
        modelProgress={modelProgress}
      />

      {lastTranscript && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Last transcript
          </h2>
          <pre className="whitespace-pre-wrap rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200">
            {lastTranscript}
          </pre>
        </section>
      )}
    </div>
  )
}
