import { useEffect, useRef, useState, type JSX } from 'react'
import type {
  AudioFrameMessage,
  PillState,
  PillStateMessage
} from '../../main/preload-pill'
import { smoothBars } from './lib/smoothBars'

const BARS = 14
const INK = '#1B1814'
const CORAL = '#F5511D'
const PAPER = '#F1EBDD'
const SAGE_SOFT = '#BFCFB9'
const SAGE = '#6E8A6A'

export function Pill(): JSX.Element {
  const [state, setState] = useState<PillState>('idle')
  const [message, setMessage] = useState<string | undefined>(undefined)
  const [bars, setBars] = useState<number[]>(() => new Array(BARS).fill(0))
  const [elapsedMs, setElapsedMs] = useState(0)
  const [partial, setPartial] = useState<string>('')
  const [final, setFinal] = useState<string>('')
  const recordStartRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const offFrame = window.freestylePill.onAudioFrame(
      (frame: AudioFrameMessage) => {
        setBars(prev => smoothBars(prev, frame.bars))
      }
    )
    const offState = window.freestylePill.onPillState((m: PillStateMessage) => {
      setState(m.state)
      setMessage(m.message)
      if (m.state === 'recording') {
        recordStartRef.current = performance.now()
        setElapsedMs(0)
        setPartial('')
        setFinal('')
        setBars(new Array(BARS).fill(0))
      }
    })
    const offPartial = window.freestylePill.onTranscriptPartial(text =>
      setPartial(text)
    )
    const offFinal = window.freestylePill.onTranscriptFinal(text =>
      setFinal(text)
    )
    return () => {
      offFrame()
      offState()
      offPartial()
      offFinal()
    }
  }, [])

  useEffect(() => {
    if (state !== 'recording') {
      if (timerRef.current != null) {
        cancelAnimationFrame(timerRef.current)
        timerRef.current = null
      }
      return
    }
    const tick = (): void => {
      if (recordStartRef.current != null) {
        setElapsedMs(performance.now() - recordStartRef.current)
      }
      timerRef.current = requestAnimationFrame(tick)
    }
    timerRef.current = requestAnimationFrame(tick)
    return () => {
      if (timerRef.current != null) {
        cancelAnimationFrame(timerRef.current)
        timerRef.current = null
      }
    }
  }, [state])

  const visible = state !== 'idle'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: 10,
        pointerEvents: 'none'
      }}
    >
      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 180ms ease, transform 200ms ease',
          pointerEvents: visible ? 'auto' : 'none',
          WebkitAppRegion: 'drag'
        }}
      >
        <PillBody
          state={state}
          bars={bars}
          elapsedMs={elapsedMs}
          partial={partial}
          final={final}
          message={message}
        />
      </div>
    </div>
  )
}

function PillBody({
  state,
  bars,
  elapsedMs,
  partial,
  final,
  message
}: {
  state: PillState
  bars: number[]
  elapsedMs: number
  partial: string
  final: string
  message?: string
}): JSX.Element {
  const isRecording = state === 'recording'
  const bg = isRecording ? CORAL : INK
  const fg = isRecording ? PAPER : PAPER

  return (
    <div
      style={{
        height: 40,
        padding: '0 14px',
        borderRadius: 22,
        background: bg,
        color: fg,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        boxShadow:
          '0 8px 22px -8px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.08)',
        fontSize: 13,
        fontWeight: 500,
        transition: 'background-color 220ms ease',
        minWidth: 180,
        maxWidth: 360
      }}
    >
      {state === 'recording' && (
        <RecordingContent bars={bars} elapsedMs={elapsedMs} partial={partial} />
      )}
      {(state === 'transcribing' || state === 'pasting') && (
        <TranscribingContent partial={partial} />
      )}
      {state === 'pasted' && <PastedContent final={final} />}
      {state === 'error' && <ErrorContent message={message} />}
      {state === 'idle' && <IdleContent />}
    </div>
  )
}

function IdleContent(): JSX.Element {
  return (
    <>
      <MicGlyph color={PAPER} size={18} />
      <span style={{ opacity: 0.85 }}>Hold</span>
      <span
        className="mono"
        style={{
          padding: '2px 7px',
          background: 'rgba(255,255,255,0.12)',
          borderRadius: 5,
          fontSize: 11,
          letterSpacing: '0.05em'
        }}
      >
        fn
      </span>
      <span style={{ opacity: 0.6, marginLeft: 2 }}>to talk</span>
    </>
  )
}

function RecordingContent({
  bars,
  elapsedMs,
  partial
}: {
  bars: number[]
  elapsedMs: number
  partial: string
}): JSX.Element {
  return (
    <>
      <span
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 18,
          height: 18
        }}
      >
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.35)'
          }}
        />
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: PAPER
          }}
        />
      </span>
      <BarsView bars={bars} color={PAPER} />
      <span
        className="mono"
        style={{ fontSize: 11, opacity: 0.9, letterSpacing: '0.05em' }}
      >
        {formatTimer(elapsedMs)}
      </span>
      {partial && <PartialPreview text={partial} />}
    </>
  )
}

function TranscribingContent({ partial }: { partial: string }): JSX.Element {
  return (
    <>
      <SpinnerDots />
      <span>{partial ? trimText(partial, 48) : 'Transcribing'}</span>
    </>
  )
}

function PastedContent({ final }: { final: string }): JSX.Element {
  const words = final.trim().length === 0 ? 0 : final.trim().split(/\s+/).length
  return (
    <>
      <CheckIcon />
      <span>Pasted</span>
      <span style={{ opacity: 0.55, fontSize: 12 }}>
        · {words} word{words === 1 ? '' : 's'}
      </span>
    </>
  )
}

function ErrorContent({ message }: { message?: string }): JSX.Element {
  return (
    <>
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: CORAL
        }}
      />
      <span style={{ opacity: 0.9 }}>{message ?? 'Error'}</span>
    </>
  )
}

function PartialPreview({ text }: { text: string }): JSX.Element {
  return (
    <span
      style={{
        maxWidth: 140,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        opacity: 0.75,
        fontSize: 12,
        marginLeft: 4
      }}
    >
      {text}
    </span>
  )
}

function BarsView({
  bars,
  color
}: {
  bars: number[]
  color: string
}): JSX.Element {
  const width = 108
  const height = 22
  const gap = width / bars.length
  const cap = Math.min(gap * 0.55, 5)
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {bars.map((v, i) => {
        const h = Math.max(2, v * height * 1.25)
        const x = i * gap + gap / 2
        return (
          <line
            key={i}
            x1={x}
            y1={height / 2 - h / 2}
            x2={x}
            y2={height / 2 + h / 2}
            stroke={color}
            strokeWidth={cap}
            strokeLinecap="round"
          />
        )
      })}
    </svg>
  )
}

function SpinnerDots(): JSX.Element {
  return (
    <span
      style={{
        display: 'inline-flex',
        gap: 5,
        alignItems: 'center'
      }}
    >
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: CORAL,
            animation: `pillDot 1.1s ${i * 0.15}s infinite ease-in-out`
          }}
        />
      ))}
      <style>{`@keyframes pillDot{0%,100%{opacity:0.35;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}`}</style>
    </span>
  )
}

function CheckIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke={SAGE_SOFT} strokeWidth="1.4" />
      <path
        d="M5 8l2 2 4-4"
        stroke={SAGE}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MicGlyph({
  size = 18,
  color = '#fff'
}: {
  size?: number
  color?: string
}): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect
        x="9"
        y="3"
        width="6"
        height="11"
        rx="3"
        stroke={color}
        strokeWidth="1.6"
      />
      <path
        d="M5 11a7 7 0 0 0 14 0"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12 18v3"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function formatTimer(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function trimText(text: string, max: number): string {
  if (text.length <= max) return text
  return '…' + text.slice(text.length - max + 1)
}
