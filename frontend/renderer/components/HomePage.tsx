import { useMemo, type JSX, type ReactNode } from 'react'
import { Squiggle, Underwave, QuoteCurls, MicGlyph, COLORS } from './art'

export type PillState =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'pasting'
  | 'pasted'
  | 'error'

interface Props {
  pillState: PillState
  pillMessage?: string
  lastTranscript: string
}

export function HomePage({
  pillState,
  pillMessage,
  lastTranscript
}: Props): JSX.Element {
  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      }),
    []
  )

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden"
      style={{ padding: '56px 64px', gap: 36 }}
    >
      <div
        style={{ position: 'absolute', top: 28, right: -20, opacity: 0.55 }}
      >
        <Squiggle width={260} height={42} stroke={COLORS.INK} weight={2.5} />
      </div>

      <div className="flex flex-col" style={{ gap: 8 }}>
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
          {dateLabel}
        </div>
        <h1
          className="font-display m-0 text-ink"
          style={{
            fontSize: 84,
            fontWeight: 700,
            lineHeight: 0.9,
            letterSpacing: '-0.035em',
            fontVariationSettings: `'wdth' 85, 'opsz' 96`
          }}
        >
          Hold{' '}
          <span
            style={{
              position: 'relative',
              fontStyle: 'italic',
              fontWeight: 500,
              color: COLORS.INK,
              fontVariationSettings: `'wdth' 100`
            }}
          >
            fn
            <span
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: -10
              }}
            >
              <Underwave width={130} height={14} color={COLORS.CORAL} weight={3.5} />
            </span>
          </span>
          , speak,
          <br />
          release.
        </h1>
      </div>

      <ListeningCard pillState={pillState} pillMessage={pillMessage} />

      <TranscriptSection text={lastTranscript} />

      <FooterStats />
    </div>
  )
}

function ListeningCard({
  pillState,
  pillMessage
}: {
  pillState: PillState
  pillMessage?: string
}): JSX.Element {
  const isRecording = pillState === 'recording'
  const isError = pillState === 'error'

  const headline =
    pillState === 'recording'
      ? 'Listening…'
      : pillState === 'transcribing'
        ? 'Transcribing…'
        : pillState === 'pasting'
          ? 'Pasting at your cursor.'
          : pillState === 'pasted'
            ? 'Pasted.'
            : pillState === 'error'
              ? pillMessage ?? 'Something went wrong'
              : 'Ready when you are'

  const sub = (
    <>
      Hold <Kbd>fn</Kbd> anywhere — the cursor doesn&rsquo;t have to be here.
    </>
  )

  return (
    <div
      className="flex items-center rounded-2xl border border-rule bg-white"
      style={{ padding: 22, gap: 22 }}
    >
      <div
        className="flex shrink-0 items-center justify-center rounded-full border border-rule bg-paper-deep"
        style={{ width: 56, height: 56 }}
      >
        <MicGlyph color={COLORS.INK} size={24} />
      </div>
      <div className="flex-1">
        <div className="text-[15px] font-semibold text-ink" style={{ marginBottom: 4 }}>
          {headline}
        </div>
        <div className="text-[13px] text-mute">{sub}</div>
      </div>
      <MicBadge isRecording={isRecording} isError={isError} />
    </div>
  )
}

function MicBadge({
  isRecording,
  isError
}: {
  isRecording: boolean
  isError: boolean
}): JSX.Element {
  if (isError) {
    return (
      <div className="flex items-center gap-2.5 text-[12px] font-semibold text-coral">
        <span className="h-2 w-2 rounded-full bg-coral" />
        Error
      </div>
    )
  }
  if (isRecording) {
    return (
      <div className="flex items-center gap-2.5 text-[12px] font-semibold text-coral">
        <span className="relative inline-flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-coral" />
        </span>
        Live
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2.5 text-[12px] font-semibold text-sage">
      <span className="h-2 w-2 rounded-full bg-sage" />
      Mic OK
    </div>
  )
}

function TranscriptSection({ text }: { text: string }): JSX.Element {
  const wordCount = text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <div className="flex items-center" style={{ gap: 10 }}>
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
          Last transcript
        </div>
        <div className="h-px flex-1 bg-rule" />
        <div className="font-mono text-[11px] text-mute">
          {text ? `${wordCount} word${wordCount === 1 ? '' : 's'}` : 'no transcripts yet'}
        </div>
      </div>
      <div className="flex items-start" style={{ gap: 18 }}>
        <QuoteCurls
          size={56}
          stroke={COLORS.INK}
          color2={COLORS.CORAL}
          weight={3.5}
          style={{ marginTop: 6, flexShrink: 0 }}
        />
        <p
          className="font-display m-0 italic"
          style={{
            fontSize: 26,
            fontWeight: 450,
            lineHeight: 1.35,
            color: '#2B2620',
            fontVariationSettings: `'wdth' 95, 'opsz' 36`,
            maxWidth: 760,
            textWrap: 'pretty'
          }}
        >
          {text ? text : 'Your latest transcript will land here. Hold the hotkey and say something.'}
        </p>
      </div>
    </div>
  )
}

function FooterStats(): JSX.Element {
  return (
    <div
      className="mt-auto grid grid-cols-3 border-t border-rule"
      style={{ gap: 20, paddingTop: 20 }}
    >
      <Stat n="Fn" l="hold to talk" />
      <Stat n="0.5s" l="typical latency" />
      <Stat n="100%" l="local — no cloud" accent={COLORS.SAGE} />
    </div>
  )
}

function Stat({
  n,
  l,
  accent
}: {
  n: string
  l: string
  accent?: string
}): JSX.Element {
  return (
    <div>
      <div
        className="font-display"
        style={{
          fontSize: 38,
          fontWeight: 600,
          color: accent || COLORS.INK,
          fontVariationSettings: `'wdth' 85, 'opsz' 48`,
          letterSpacing: '-0.02em',
          lineHeight: 1
        }}
      >
        {n}
      </div>
      <div
        className="text-mute"
        style={{ fontSize: 12, marginTop: 6, letterSpacing: '0.02em' }}
      >
        {l}
      </div>
    </div>
  )
}

function Kbd({ children }: { children: ReactNode }): JSX.Element {
  return (
    <span
      className="font-mono inline-flex items-center rounded-md border border-rule bg-paper-deep text-[11px] font-medium text-ink"
      style={{ padding: '2px 7px' }}
    >
      {children}
    </span>
  )
}
