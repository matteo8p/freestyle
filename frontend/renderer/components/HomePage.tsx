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
      : 'bg-muted/60'

  return (
    <div className="mx-auto w-full max-w-2xl space-y-10">
      <Section label="Hotkey">
        <div className="flex items-center gap-4">
          <Kbd>Fn</Kbd>
          <div>
            <div className="text-[14px] font-medium text-ink">
              Globe key
            </div>
            <div className="text-[13px] text-muted">
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
            <div className="text-[14px] font-medium text-ink">
              {status.label}
            </div>
            <div className="text-[13px] text-muted">
              {pillState === 'error' && pillMessage ? pillMessage : status.sub}
            </div>
          </div>
        </div>
      </Section>

      <Section label="Last transcript">
        {lastTranscript ? (
          <p className="whitespace-pre-wrap font-serif text-[20px] leading-[1.55] italic text-ink">
            &ldquo;{lastTranscript}&rdquo;
          </p>
        ) : (
          <p className="text-[13px] text-muted">
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
      <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
        {label}
      </h2>
      <div>{children}</div>
    </section>
  )
}

function Kbd({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <span className="inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-lg border border-rule bg-surface px-3 font-mono text-[14px] text-ink shadow-[inset_0_-1px_0_0_rgb(0_0_0/0.04)]">
      {children}
    </span>
  )
}
