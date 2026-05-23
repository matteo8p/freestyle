import type { JSX } from 'react'
import type { PillState } from './HomePage'

export type Page = 'home' | 'settings'

interface Props {
  page: Page
  onNavigate: (p: Page) => void
  pillState: PillState
  pillMessage?: string
}

export function Sidebar({
  page,
  onNavigate,
  pillState,
  pillMessage
}: Props): JSX.Element {
  return (
    <aside className="flex h-full w-52 shrink-0 flex-col border-r border-rule">
      <nav className="flex flex-1 flex-col gap-1 px-8 pt-16">
        <NavItem
          label="Home"
          active={page === 'home'}
          onClick={() => onNavigate('home')}
        />
        <NavItem
          label="Settings"
          active={page === 'settings'}
          onClick={() => onNavigate('settings')}
        />
      </nav>

      <div className="px-8 pb-6 text-[13px] italic text-muted">
        <StatusLine state={pillState} message={pillMessage} />
      </div>
    </aside>
  )
}

function NavItem({
  label,
  active,
  onClick
}: {
  label: string
  active: boolean
  onClick: () => void
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`text-left text-[17px] transition ${
        active
          ? 'font-normal text-ink'
          : 'italic text-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}

function StatusLine({
  state,
  message
}: {
  state: PillState
  message?: string
}): JSX.Element | null {
  if (state === 'idle') return null

  const label =
    state === 'recording'
      ? 'Listening…'
      : state === 'transcribing'
        ? 'Transcribing…'
        : state === 'pasting'
          ? 'Pasting…'
          : message ?? 'Error'

  const dot =
    state === 'recording'
      ? 'bg-accent'
      : state === 'error'
        ? 'bg-accent'
        : 'bg-muted'

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-1.5 w-1.5">
        {state === 'recording' && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dot}`} />
      </span>
      <span>{label}</span>
    </div>
  )
}
