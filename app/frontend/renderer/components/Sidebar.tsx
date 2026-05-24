import type { JSX } from 'react'
import {
  COLORS,
  MarkFlourish,
  NavBook,
  NavClock,
  NavGear,
  NavToday,
  Wordmark
} from './art'

export type Page = 'home' | 'history' | 'dictionary' | 'settings'

interface Props {
  page: Page
  onNavigate: (p: Page) => void
}

interface Item {
  id: Page
  label: string
  icon: JSX.Element
  enabled: boolean
}

const ITEMS: Item[] = [
  { id: 'home', label: 'Today', icon: <NavToday />, enabled: true },
  { id: 'history', label: 'History', icon: <NavClock />, enabled: false },
  { id: 'dictionary', label: 'Dictionary', icon: <NavBook />, enabled: false },
  { id: 'settings', label: 'Settings', icon: <NavGear />, enabled: true }
]

export function Sidebar({ page, onNavigate }: Props): JSX.Element {
  return (
    <aside
      className="flex h-full w-[200px] shrink-0 flex-col border-r border-rule bg-paper"
      style={{ padding: '20px 12px', gap: 2 }}
    >
      <div className="h-10 shrink-0" style={{ WebkitAppRegion: 'drag' }} />

      <div
        style={{
          padding: '4px 8px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}
      >
        <MarkFlourish size={28} />
        <Wordmark size={22} color={COLORS.INK} accent={COLORS.OLIVE} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {ITEMS.map(item => (
          <NavItem
            key={item.id}
            item={item}
            active={page === item.id}
            onClick={() => item.enabled && onNavigate(item.id)}
          />
        ))}
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
  return (
    <button
      onClick={onClick}
      disabled={!item.enabled}
      style={{
        WebkitAppRegion: 'no-drag',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 8,
        fontSize: 13.5,
        textAlign: 'left',
        color: active ? COLORS.INK : COLORS.INK_SOFT,
        background: active ? COLORS.ELEVATED : 'transparent',
        border: active ? `1px solid ${COLORS.RULE}` : '1px solid transparent',
        fontWeight: active ? 500 : 400,
        fontFamily: 'inherit',
        cursor: item.enabled ? 'pointer' : 'not-allowed',
        opacity: item.enabled ? 1 : 0.5,
        transition: 'background 120ms ease'
      }}
    >
      <span
        style={{
          color: active ? COLORS.OLIVE : COLORS.MUTE,
          display: 'inline-flex'
        }}
      >
        {item.icon}
      </span>
      {item.label}
    </button>
  )
}

