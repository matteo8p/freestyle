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
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-rule bg-surface">
      <div
        className="h-10 shrink-0"
        style={{ WebkitAppRegion: 'drag' }}
      />
      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        <NavItem
          label="Home"
          active={page === 'home'}
          onClick={() => onNavigate('home')}
          icon={<HomeIcon className="h-4 w-4" />}
        />
        <NavItem
          label="Settings"
          active={page === 'settings'}
          onClick={() => onNavigate('settings')}
          icon={<CogIcon className="h-4 w-4" />}
        />
      </nav>

      <div className="px-5 pb-5">
        <StatusLine state={pillState} message={pillMessage} />
      </div>
    </aside>
  )
}

function NavItem({
  label,
  active,
  onClick,
  icon
}: {
  label: string
  active: boolean
  onClick: () => void
  icon: JSX.Element
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      style={{ WebkitAppRegion: 'no-drag' }}
      className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium transition ${
        active
          ? 'bg-subtle text-ink'
          : 'text-muted hover:bg-subtle/60 hover:text-ink'
      }`}
    >
      <span
        className={`transition ${active ? 'text-ink' : 'text-muted group-hover:text-ink'}`}
      >
        {icon}
      </span>
      <span>{label}</span>
    </button>
  )
}

function StatusLine({
  state,
  message
}: {
  state: PillState
  message?: string
}): JSX.Element {
  const isActive = state !== 'idle'

  const label =
    state === 'recording'
      ? 'Listening'
      : state === 'transcribing'
        ? 'Transcribing'
        : state === 'pasting'
          ? 'Pasting'
          : state === 'error'
            ? message ?? 'Error'
            : 'Ready'

  const dotColor =
    state === 'recording' || state === 'error' ? 'bg-accent' : 'bg-muted/60'

  return (
    <div className="flex items-center gap-2 text-[12px] text-muted">
      <span className="relative flex h-1.5 w-1.5">
        {state === 'recording' && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dotColor}`} />
      </span>
      <span className={isActive && state !== 'error' ? 'text-ink' : ''}>
        {label}
      </span>
    </div>
  )
}

function HomeIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1Z" />
    </svg>
  )
}

function CogIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  )
}
