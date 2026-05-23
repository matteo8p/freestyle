import type { JSX } from 'react'

export type PillState =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'pasting'
  | 'error'

interface Props {
  pillState: PillState
  pillMessage?: string
  lastTranscript: string
}

const STATUS_COPY: Record<PillState, { label: string; sub: string }> = {
  idle: {
    label: 'Ready',
    sub: 'Hold the hotkey to start dictating.'
  },
  recording: {
    label: 'Listening',
    sub: 'Speak naturally — release the hotkey when done.'
  },
  transcribing: {
    label: 'Transcribing',
    sub: 'Turning your speech into text.'
  },
  pasting: {
    label: 'Pasting',
    sub: 'Inserting at your cursor.'
  },
  error: {
    label: 'Error',
    sub: 'Something went wrong on the last run.'
  }
}

export function HomePage({
  pillState,
  pillMessage,
  lastTranscript
}: Props): JSX.Element {
  const status = STATUS_COPY[pillState]
  const isRecording = pillState === 'recording'
  const dotColor =
    pillState === 'recording' || pillState === 'error'
      ? 'bg-accent'
      : 'bg-muted'

  return (
    <div className="max-w-xl space-y-12">
      <Section label="Hotkey">
        <div className="flex items-baseline gap-3">
          <span className="text-2xl leading-none">🌐</span>
          <div>
            <div className="text-[17px] text-ink">Fn / globe key</div>
            <div className="text-[13px] italic text-muted">
              Hold to record, release to transcribe and paste.
            </div>
          </div>
        </div>
      </Section>

      <Section label="Status">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2 w-2">
            {isRecording && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${dotColor}`}
            />
          </span>
          <div>
            <div className="text-[17px] text-ink">{status.label}</div>
            <div className="text-[13px] italic text-muted">
              {pillState === 'error' && pillMessage ? pillMessage : status.sub}
            </div>
          </div>
        </div>
      </Section>

      <Section label="Last transcript">
        {lastTranscript ? (
          <p className="whitespace-pre-wrap text-[17px] leading-relaxed text-ink">
            &ldquo;{lastTranscript}&rdquo;
          </p>
        ) : (
          <p className="text-[15px] italic text-muted">
            No transcript yet. Hold the hotkey and say something.
          </p>
        )}
      </Section>
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
