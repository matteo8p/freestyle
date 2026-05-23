import { useEffect, useRef, useState, type JSX } from 'react'
import { api, initApi } from './api'
import { Recorder } from './lib/recorder'
import { Settings } from './components/Settings'
import { Sidebar, type Page } from './components/Sidebar'
import { HomePage, type PillState } from './components/HomePage'
import type { Settings as SettingsType } from '@shared/types'

export function App(): JSX.Element {
  const [ready, setReady] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)
  const [settings, setSettings] = useState<SettingsType | null>(null)
  const [page, setPage] = useState<Page>('home')
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
        <div className="max-w-md space-y-2 border-l-2 border-accent bg-paper p-4">
          <div className="text-[15px] text-ink">Boot failed</div>
          <pre className="whitespace-pre-wrap font-serif text-[13px] italic text-muted">
            {bootError}
          </pre>
        </div>
      </div>
    )
  }

  if (!ready || !settings) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[15px] italic text-muted">Booting…</div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <Sidebar
        page={page}
        onNavigate={setPage}
        pillState={pill}
        pillMessage={pillMessage}
      />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto px-16 py-16">
        {page === 'home' ? (
          <HomePage
            pillState={pill}
            pillMessage={pillMessage}
            lastTranscript={lastTranscript}
          />
        ) : (
          <Settings
            settings={settings}
            onSettingsChange={setSettings}
            modelProgress={modelProgress}
          />
        )}
      </main>
    </div>
  )
}
