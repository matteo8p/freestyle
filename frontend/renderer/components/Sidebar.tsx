import type { JSX } from 'react'
import type { PillState } from './HomePage'
import {
  ScribbleBadge,
  Wordmark,
  SidebarHomeIcon,
  SidebarHistoryIcon,
  SidebarBookIcon,
  SidebarGearIcon,
  COLORS
} from './art'

export type Page = 'home' | 'history' | 'dictionary' | 'settings'

interface Props {
  page: Page
  onNavigate: (p: Page) => void
  pillState: PillState
  pillMessage?: string
}

interface Item {
  id: Page
  label: string
  icon: JSX.Element
  enabled: boolean
}

const ITEMS: Item[] = [
  { id: 'home', label: 'Home', icon: <SidebarHomeIcon />, enabled: true },
  {
    id: 'history',
    label: 'History',
    icon: <SidebarHistoryIcon />,
    enabled: false
  },
  {
    id: 'dictionary',
    label: 'Dictionary',
    icon: <SidebarBookIcon />,
    enabled: false
  },
  { id: 'settings', label: 'Settings', icon: <SidebarGearIcon />, enabled: true }
]

export function Sidebar({ page, onNavigate, pillState }: Props): JSX.Element {
  return (
    <aside
      className="flex h-full w-[220px] shrink-0 flex-col gap-1 border-r border-rule bg-paper-deep"
      style={{ padding: '20px 14px' }}
    >
      <div
        className="h-10 shrink-0"
        style={{ WebkitAppRegion: 'drag' }}
      />

      <div
        style={{
          padding: '4px 8px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}
      >
        <ScribbleBadge size={26} bg={COLORS.PAPER} fg={COLORS.INK} accent={COLORS.CORAL} />
        <Wordmark size={20} color={COLORS.INK} accent={COLORS.CORAL} />
      </div>

      {ITEMS.map(item => (
        <NavItem
          key={item.id}
          item={item}
          active={page === item.id}
          onClick={() => item.enabled && onNavigate(item.id)}
        />
      ))}

      <div className="mt-auto border-t border-rule" style={{ padding: '12px 10px 0' }}>
        <div className="text-[12px] text-mute">
          <StatusBlurb state={pillState} />
        </div>
      </div>
    </aside>
  )
}

function NavItem({
  item,
  active,
  onClick
}: {
  item: Item
  active: boolean
  onClick: () => void
}): JSX.Element {
  const baseColor = active ? 'text-ink' : 'text-ink-soft'
  const iconColor = active ? 'text-coral' : 'text-mute'
  return (
    <button
      onClick={onClick}
      disabled={!item.enabled}
      style={{ WebkitAppRegion: 'no-drag' }}
      className={`flex items-center gap-2.5 rounded-lg border px-[10px] py-2 text-[14px] text-left transition ${
        active
          ? 'border-rule bg-paper font-semibold'
          : 'border-transparent font-medium'
      } ${baseColor} ${item.enabled ? 'cursor-pointer hover:bg-paper/60' : 'cursor-not-allowed opacity-50'}`}
    >
      <span className={`inline-flex ${iconColor}`}>{item.icon}</span>
      {item.label}
    </button>
  )
}

function StatusBlurb({ state }: { state: PillState }): JSX.Element {
  if (state === 'recording') return <span className="text-coral">listening…</span>
  if (state === 'transcribing') return <span>transcribing…</span>
  if (state === 'pasting') return <span>pasting…</span>
  if (state === 'error') return <span className="text-coral">error</span>
  return <span>local · whisper.base.en</span>
}
