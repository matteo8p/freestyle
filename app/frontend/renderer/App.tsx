import { useEffect, useRef, useState, type JSX } from 'react'
import { api, getBootstrap, initApi } from './api'
import { Recorder } from './lib/recorder'
import { Streamer } from './lib/streamer'
import { prewarmAudio } from './lib/audio-ctx'
import { pcm16ToWavBlob } from './lib/wav'
import { AudioLevelMeter } from './lib/audio-level-meter'
import { Settings } from './components/Settings'
import { Sidebar, type Page } from './components/Sidebar'
import { HomePage, type PillState, type Take } from './components/HomePage'
import type { Settings as SettingsType } from '@shared/types'

const FINAL_TIMEOUT_MS = 5000

type ActiveCapture =
  | { kind: 'recorder'; recorder: Recorder }
  | { kind: 'streamer'; streamer: Streamer; finalPromise: Promise<string> | null }

export function App(): JSX.Element {
  const [ready, setReady] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)
  const [settings, setSettings] = useState<SettingsType | null>(null)
  const [page, setPage] = useState<Page>('home')
  const [pill, setPill] = useState<PillState>('idle')
  const [pillMessage, setPillMessage] = useState<string | undefined>(undefined)
  const [takes, setTakes] = useState<Take[]>([])
  const [modelProgress, setModelProgress] = useState<number | null>(null)
  const captureRef = useRef<ActiveCapture | null>(null)
  const recordingRef = useRef(false)
  const settingsRef = useRef<SettingsType | null>(null)
  const meterRef = useRef<AudioLevelMeter | null>(null)

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
        prewarmAudio()
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

  function shouldStream(s: SettingsType | null): boolean {
    return (
      !!s &&
      s.backend === 'cloud' &&
      s.streaming &&
      s.cloudModel !== 'whisper-1'
    )
  }

  function setUiState(
    s: PillState,
    extras?: { message?: string; durationMs?: number }
  ): void {
    setPill(s)
    setPillMessage(extras?.message)
    window.freestyle.publishPillState(s, extras)
  }

  async function startMeter(stream: MediaStream | null): Promise<void> {
    if (!stream) return
    const meter = new AudioLevelMeter(stream, frame => {
      window.freestyle.publishAudioFrame(frame)
    })
    try {
      await meter.start()
      meterRef.current = meter
    } catch (e) {
      console.warn('[freestyle] meter start failed', e)
    }
  }

  function stopMeter(): void {
    meterRef.current?.stop()
    meterRef.current = null
  }

  async function onStart(): Promise<void> {
    if (recordingRef.current) return
    const s = settingsRef.current
    const deviceId = s?.inputDeviceId ?? null

    if (shouldStream(s)) {
      try {
        const bs = getBootstrap()
        const streamer = new Streamer({
          baseUrl: bs.baseUrl,
          token: bs.token,
          deviceId,
          onPartial: text => window.freestyle.publishTranscriptPartial(text),
          onFinal: () => {},
          onError: () => {}
        })
        await streamer.start()
        captureRef.current = { kind: 'streamer', streamer, finalPromise: null }
        recordingRef.current = true
        setUiState('recording')
        await startMeter(streamer.getStream())
        return
      } catch (e) {
        console.warn('[freestyle] streaming start failed, using batch mode', e)
      }
    }

    try {
      const rec = new Recorder()
      await rec.start(deviceId)
      captureRef.current = { kind: 'recorder', recorder: rec }
      recordingRef.current = true
      setUiState('recording')
      await startMeter(rec.getStream())
    } catch (e) {
      setUiState('error', {
        message: e instanceof Error ? e.message : String(e)
      })
    }
  }

  async function onStop(): Promise<void> {
    if (!recordingRef.current) return
    recordingRef.current = false
    const capture = captureRef.current
    captureRef.current = null
    if (!capture) return

    try {
      setUiState('transcribing')
      const tStart = performance.now()
      let text: string

      if (capture.kind === 'streamer') {
        text = await finalizeStream(capture.streamer)
      } else {
        const wav = await capture.recorder.stop()
        const res = await api.transcribe(wav)
        text = res.text
      }

      stopMeter()

      const durationMs = performance.now() - tStart

      if (text.trim().length === 0) {
        setUiState('error', { message: 'No speech detected' })
        setTimeout(() => setUiState('idle'), 1500)
        return
      }

      const trimmed = text.trim()
      const take: Take = {
        id:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text,
        createdAt: Date.now(),
        wordCount: trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length
      }
      setTakes(prev => [take, ...prev])
      window.freestyle.publishTranscriptFinal(text, durationMs)
      setUiState('pasting')
      await window.freestyle.paste(text)
      setUiState('pasted', { durationMs })
      setTimeout(() => setUiState('idle'), 1500)
    } catch (e) {
      stopMeter()
      setUiState('error', {
        message: e instanceof Error ? e.message : String(e)
      })
      setTimeout(() => setUiState('idle'), 2500)
    }
  }

  async function finalizeStream(streamer: Streamer): Promise<string> {
    try {
      const text = await withTimeout(streamer.commit(), FINAL_TIMEOUT_MS)
      return text
    } catch (e) {
      const buffered = streamer.getBufferedPcm()
      try {
        streamer.close()
      } catch {}
      if (buffered.length === 0) throw e
      const wav = pcm16ToWavBlob(buffered)
      const res = await api.transcribe(wav)
      return res.text
    }
  }

  if (bootError) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="max-w-md space-y-2 rounded-lg border-l-2 border-blush bg-elevated p-4">
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
    <div className="flex h-full bg-canvas">
      <Sidebar page={page} onNavigate={setPage} />
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-canvas">
        <div
          className="absolute inset-x-0 top-0 h-10 z-10"
          style={{ WebkitAppRegion: 'drag' }}
        />
        {page === 'home' ? (
          <HomePage
            settings={settings}
            pillState={pill}
            pillMessage={pillMessage}
            takes={takes}
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

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('finalize timeout')), ms)
    p.then(
      v => {
        clearTimeout(t)
        resolve(v)
      },
      e => {
        clearTimeout(t)
        reject(e)
      }
    )
  })
}

function ComingSoon({ page }: { page: Page }): JSX.Element {
  const label = page.charAt(0).toUpperCase() + page.slice(1)
  return (
    <div
      className="flex h-full flex-col items-center justify-center text-center"
      style={{ padding: '48px 64px' }}
    >
      <div
        className="mono uppercase text-mute"
        style={{
          fontSize: 11,
          letterSpacing: '0.18em',
          marginBottom: 12
        }}
      >
        {label}
      </div>
      <h1
        className="serif m-0 text-ink"
        style={{ fontSize: 72, letterSpacing: '-0.025em', lineHeight: 0.95 }}
      >
        Coming <span className="serif-italic" style={{ color: '#6B8F12' }}>soon.</span>
      </h1>
    </div>
  )
}
