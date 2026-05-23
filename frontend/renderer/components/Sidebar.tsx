import type { JSX } from 'react'
import type { PillState } from './HomePage'
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
  { id: 'home', label: 'Today', icon: <NavToday />, enabled: true },
  { id: 'history', label: 'History', icon: <NavClock />, enabled: false },
  { id: 'dictionary', label: 'Dictionary', icon: <NavBook />, enabled: false },
  { id: 'settings', label: 'Settings', icon: <NavGear />, enabled: true }
]

export function Sidebar({ page, onNavigate, pillState }: Props): JSX.Element {
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
        <MarkFlourish size={28} color={COLORS.OLIVE} />
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

      <FooterStatus pillState={pillState} />
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

function FooterStatus({ pillState }: { pillState: PillState }): JSX.Element {
  const isLive = pillState === 'recording'
  const isWorking =
    pillState === 'transcribing' || pillState === 'pasting'
  const isError = pillState === 'error'

  const dotColor = isError
    ? COLORS.BLUSH
    : isWorking
      ? COLORS.MUTE
      : COLORS.OLIVE
  const statusText = isError
    ? 'ERROR'
    : isLive
      ? 'LIVE'
      : isWorking
        ? 'WORKING'
        : 'READY'
  const statusColor = isError
    ? COLORS.BLUSH
    : isWorking
      ? COLORS.MUTE
      : COLORS.OLIVE

  return (
    <div
      style={{
        marginTop: 'auto',
        padding: '12px 10px 0',
        borderTop: `1px solid ${COLORS.RULE}`
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: COLORS.MUTE,
          letterSpacing: '0.12em',
          textTransform: 'uppercase'
        }}
      >
        v0.1 · alpha
      </div>
      <div style={{ fontSize: 12, color: COLORS.INK_SOFT, marginTop: 4 }}>
        local · whisper.base.en
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 8
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: dotColor
          }}
        />
        <span
          className="mono"
          style={{
            fontSize: 10,
            color: statusColor,
            letterSpacing: '0.12em'
          }}
        >
          {statusText}
        </span>
      </div>
    </div>
  )
}
