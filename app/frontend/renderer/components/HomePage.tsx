import { useMemo, type JSX, type ReactNode } from 'react'
import { COLORS, MarkFlourish, ScopeTrace } from './art'
import type { Settings as SettingsType } from '@shared/types'

export type PillState =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'pasting'
  | 'pasted'
  | 'error'

export interface Take {
  id: string
  text: string
  createdAt: number
  wordCount: number
}

interface Props {
  settings: SettingsType
  pillState: PillState
  pillMessage?: string
  takes: Take[]
}

export function HomePage({
  settings,
  pillState,
  pillMessage,
  takes
}: Props): JSX.Element {
  const dateShort = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      }),
    []
  )
  const totalWords = takes.reduce((sum, t) => sum + t.wordCount, 0)

  return (
    <div className="flex h-full flex-col" style={{ background: COLORS.CANVAS }}>
      <main
        style={{
          flex: 1,
          padding: '18px 36px 28px',
          display: 'grid',
          gridTemplateColumns: '1fr 220px',
          gap: 28,
          minHeight: 0,
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            minWidth: 0,
            minHeight: 0
          }}
        >
          <div
            className="mono"
            style={{
              paddingTop: 50,
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: COLORS.MUTE,
              flexShrink: 0
            }}
          >
            {dateShort}
          </div>
          <HeroStage pillState={pillState} />
          <FeedHeader takes={takes.length} />
          <Feed takes={takes} />
        </div>

        <StatsRail
          pillState={pillState}
          pillMessage={pillMessage}
          settings={settings}
          wordCount={totalWords}
        />
      </main>
    </div>
  )
}

function HeroStage({ pillState }: { pillState: PillState }): JSX.Element {
  const isRecording = pillState === 'recording'
  return (
    <div
      style={{
        background: COLORS.ELEVATED,
        border: `1px solid ${COLORS.RULE}`,
        borderRadius: 16,
        padding: '28px 32px 24px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <h1 style={{ margin: 0 }}>
        <span
          className="serif"
          style={{
            fontSize: 62,
            fontWeight: 400,
            color: COLORS.INK,
            letterSpacing: '-0.025em',
            lineHeight: 0.95
          }}
        >
          Hold{' '}
        </span>
        <span
          className="serif-italic"
          style={{
            fontSize: 62,
            color: COLORS.OLIVE,
            lineHeight: 0.95
          }}
        >
          fn
        </span>
        <span
          className="serif"
          style={{
            fontSize: 62,
            color: COLORS.INK,
            lineHeight: 0.95,
            letterSpacing: '-0.025em'
          }}
        >
          , speak,
        </span>
        <br />
        <span
          className="serif-italic"
          style={{
            fontSize: 62,
            color: COLORS.INK_SOFT,
            lineHeight: 0.95
          }}
        >
          release.
        </span>
      </h1>
      <div style={{ marginTop: 18, opacity: isRecording ? 0.85 : 0.45 }}>
        <ScopeTrace
          width={500}
          height={42}
          cycles={4}
          weight={1.4}
          color={isRecording ? COLORS.OLIVE : COLORS.INK}
        />
      </div>
      <div style={{ position: 'absolute', top: 22, right: 26 }}>
        <MarkFlourish size={42} />
      </div>
    </div>
  )
}

function FeedHeader({ takes }: { takes: number }): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginTop: 4
      }}
    >
      <h2
        className="serif"
        style={{ fontSize: 26, color: COLORS.INK, margin: 0, lineHeight: 1 }}
      >
        Today&rsquo;s voice
      </h2>
      <span
        className="mono"
        style={{
          fontSize: 11,
          color: COLORS.MUTE,
          letterSpacing: '0.1em'
        }}
      >
        {takes} {takes === 1 ? 'take' : 'takes'}
      </span>
    </div>
  )
}

function Feed({ takes }: { takes: Take[] }): JSX.Element {
  if (takes.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          overflow: 'hidden',
          minHeight: 0
        }}
      >
        <FeedEmpty />
      </div>
    )
  }
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflow: 'auto',
        minHeight: 0
      }}
    >
      {takes.map(t => (
        <FeedItem
          key={t.id}
          time={formatTime(t.createdAt)}
          words={t.wordCount}
          quote={t.text}
        />
      ))}
    </div>
  )
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  })
}

function FeedEmpty(): JSX.Element {
  return (
    <div
      style={{
        background: 'transparent',
        border: `1px dashed ${COLORS.RULE}`,
        borderRadius: 12,
        padding: '24px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: COLORS.MUTE
        }}
      >
        No takes yet
      </span>
      <p
        className="serif"
        style={{
          margin: 0,
          fontSize: 20,
          color: COLORS.INK_SOFT,
          lineHeight: 1.35
        }}
      >
        Your first transcript will appear here. Hold the globe key and say
        something.
      </p>
    </div>
  )
}

function FeedItem({
  time,
  words,
  quote
}: {
  time: string
  words: number
  quote: string
}): JSX.Element {
  return (
    <div
      style={{
        background: COLORS.ELEVATED,
        border: `1px solid ${COLORS.RULE}`,
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          className="mono"
          style={{
            fontSize: 11,
            color: COLORS.INK,
            letterSpacing: '0.06em',
            fontWeight: 500
          }}
        >
          {time}
        </span>
        <div style={{ flex: 1 }} />
        <span
          className="mono"
          style={{
            fontSize: 10.5,
            color: COLORS.MUTE,
            letterSpacing: '0.06em'
          }}
        >
          {words} {words === 1 ? 'wd' : 'wds'}
        </span>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 16,
          color: COLORS.INK,
          lineHeight: 1.5,
          textWrap: 'pretty'
        }}
      >
        &ldquo;{quote}&rdquo;
      </p>
    </div>
  )
}

function StatsRail({
  pillState,
  pillMessage,
  settings,
  wordCount
}: {
  pillState: PillState
  pillMessage?: string
  settings: SettingsType
  wordCount: number
}): JSX.Element {
  const liveLabel =
    pillState === 'recording'
      ? 'Listening…'
      : pillState === 'transcribing'
        ? 'Transcribing…'
        : pillState === 'pasting'
          ? 'Pasting…'
          : pillState === 'pasted'
            ? 'Pasted'
            : pillState === 'error'
              ? pillMessage ?? 'Error'
              : 'Mic ready'

  const liveColor =
    pillState === 'error' ? COLORS.BLUSH : COLORS.OLIVE

  return (
    <aside
      style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        paddingTop: 32
      }}
    >
      <RailBlock label="Live">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 6
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: liveColor
            }}
          />
          <span style={{ fontSize: 13, color: COLORS.INK, fontWeight: 500 }}>
            {liveLabel}
          </span>
        </div>
        <div style={{ fontSize: 12, color: COLORS.MUTE, lineHeight: 1.5 }}>
          {settings.inputDeviceId == null
            ? 'System default mic'
            : 'Pinned microphone'}
        </div>
      </RailBlock>

      <RailBlock label="Today">
        <MetricRow n={wordCount.toLocaleString()} l="words" />
        <MetricRow
          n={settings.backend === 'local' ? '100%' : 'Cloud'}
          l={settings.backend === 'local' ? 'local — no cloud' : 'OpenAI · BYOK'}
          accent={settings.backend === 'local'}
        />
      </RailBlock>

      <RailBlock label="Active" last>
        <InlineRow
          label={settings.backend === 'local' ? 'On-device' : 'Cloud'}
          on={true}
        />
        {settings.backend === 'cloud' && settings.cloudModel !== 'whisper-1' && (
          <InlineRow label="Stream live" on={settings.streaming} />
        )}
      </RailBlock>
    </aside>
  )
}

function RailBlock({
  label,
  children,
  last
}: {
  label: string
  children: ReactNode
  last?: boolean
}): JSX.Element {
  return (
    <div
      style={{
        padding: '18px 0',
        borderBottom: last ? 'none' : `1px solid ${COLORS.RULE}`
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: COLORS.MUTE,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: 12
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

function MetricRow({
  n,
  l,
  accent
}: {
  n: string
  l: string
  accent?: boolean
}): JSX.Element {
  return (
    <div
      style={{
        marginBottom: 12,
        display: 'flex',
        alignItems: 'baseline',
        gap: 12
      }}
    >
      <div
        className="serif-italic"
        style={{
          fontSize: 32,
          color: accent ? COLORS.OLIVE : COLORS.INK,
          lineHeight: 1,
          minWidth: 70
        }}
      >
        {n}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: COLORS.MUTE,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          lineHeight: 1.3
        }}
      >
        {l}
      </div>
    </div>
  )
}

function InlineRow({
  label,
  on
}: {
  label: string
  on: boolean
}): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: `1px solid ${COLORS.RULE_SOFT}`
      }}
    >
      <span style={{ fontSize: 12.5, color: COLORS.INK }}>{label}</span>
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.12em',
          color: on ? COLORS.OLIVE : COLORS.MUTE
        }}
      >
        {on ? 'ON' : 'OFF'}
      </span>
    </div>
  )
}
