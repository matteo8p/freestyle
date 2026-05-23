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
        <div className="max-w-md space-y-2 rounded-lg border-l-2 border-coral bg-white p-4">
          <div className="text-[15px] font-semibold text-ink">Boot failed</div>
          <pre className="whitespace-pre-wrap font-mono text-[12px] text-mute">
            {bootError}
          </pre>
        </div>
      </div>
    )
  }

  if (!ready || !settings) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[14px] text-mute">Booting…</div>
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
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-paper">
        <div
          className="absolute inset-x-0 top-0 h-10 z-10"
          style={{ WebkitAppRegion: 'drag' }}
        />
        {page === 'home' ? (
          <HomePage
            pillState={pill}
            pillMessage={pillMessage}
            lastTranscript={lastTranscript}
          />
        ) : page === 'settings' ? (
          <Settings
            settings={settings}
            onSettingsChange={setSettings}
            modelProgress={modelProgress}
          />
        ) : (
          <ComingSoon page={page} />
        )}
      </main>
    </div>
  )
}

function ComingSoon({ page }: { page: Page }): JSX.Element {
  const label = page.charAt(0).toUpperCase() + page.slice(1)
  return (
    <div
      className="flex h-full flex-col items-center justify-center text-center"
      style={{ padding: '48px 64px' }}
    >
      <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute" style={{ marginBottom: 12 }}>
        {label}
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
        Coming soon.
      </h1>
    </div>
  )
}
