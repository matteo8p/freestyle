import type { CSSProperties, JSX } from 'react'
import markOliveUrl from '@assets/mark-olive.svg'
import markBlackUrl from '@assets/mark-black.svg'
import markInkUrl from '@assets/mark-ink.svg'
import markWhiteUrl from '@assets/mark-white.svg'
import markCanvasUrl from '@assets/mark-canvas.svg'

export const COLORS = {
  CANVAS: '#F4F0E4',
  PAPER: '#ECE7D6',
  ELEVATED: '#FBF8EE',
  RULE: '#D6CDB8',
  RULE_SOFT: '#E3DCC8',
  INK: '#16140F',
  INK_SOFT: '#34302A',
  MUTE: '#7B7461',
  OLIVE: '#6B8F12',
  OLIVE_DEEP: '#4A6309',
  OLIVE_INK: '#2E3F05',
  OLIVE_SOFT: '#E8EFC9',
  BLUSH: '#DD6E4E',
  PLUM: '#5E4E78'
} as const

interface BaseProps {
  style?: CSSProperties
  className?: string
}

// Italic Instrument Serif "freestyle" with an olive period flourish.
export function Wordmark({
  size = 80,
  color = COLORS.INK,
  accent = COLORS.OLIVE,
  style
}: BaseProps & {
  size?: number
  color?: string
  accent?: string
}): JSX.Element {
  return (
    <span
      className="serif-italic"
      style={{
        fontSize: size,
        color,
        lineHeight: 0.9,
        letterSpacing: '-0.015em',
        display: 'inline-flex',
        alignItems: 'baseline',
        ...style
      }}
    >
      freestyle
      <span style={{ color: accent, marginLeft: -size * 0.06 }}>.</span>
    </span>
  )
}

const MARK_BY_VARIANT = {
  olive: markOliveUrl,
  black: markBlackUrl,
  ink: markInkUrl,
  white: markWhiteUrl,
  canvas: markCanvasUrl
} as const

export type MarkVariant = keyof typeof MARK_BY_VARIANT

// The freestyle wave-mark. Renders one of the static SVG variants from /app/assets.
// Map a color to its variant when a caller still passes the legacy `color` prop;
// otherwise pass `variant` directly.
export function MarkFlourish({
  size = 64,
  variant,
  color,
  style
}: BaseProps & {
  size?: number
  variant?: MarkVariant
  color?: string
}): JSX.Element {
  const chosen: MarkVariant = variant ?? variantForColor(color)
  return (
    <img
      src={MARK_BY_VARIANT[chosen]}
      width={size}
      height={size}
      alt="Freestyle"
      style={{ display: 'inline-block', ...style }}
    />
  )
}

function variantForColor(color?: string): MarkVariant {
  switch (color) {
    case COLORS.INK:
    case COLORS.INK_SOFT:
      return 'ink'
    case COLORS.CANVAS:
    case COLORS.PAPER:
    case COLORS.ELEVATED:
      return 'canvas'
    case '#000':
    case '#000000':
      return 'black'
    case '#fff':
    case '#ffffff':
      return 'white'
    default:
      return 'olive'
  }
}

// Continuous oscilloscope trace. Background motif on hero surfaces.
export function ScopeTrace({
  width = 600,
  height = 80,
  color = COLORS.INK,
  weight = 1.6,
  cycles = 3.5,
  phase = 0,
  opacity = 1,
  style
}: BaseProps & {
  width?: number
  height?: number
  color?: string
  weight?: number
  cycles?: number
  phase?: number
  opacity?: number
}): JSX.Element {
  const N = 200
  const pts: string[] = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const x = t * width
    const y =
      height / 2 +
      Math.sin(t * cycles * 2 * Math.PI + phase) * height * 0.34 +
      Math.sin(t * cycles * 4.5 * Math.PI + phase * 1.3) * height * 0.08
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ opacity, overflow: 'visible', ...style }}
    >
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={weight}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Voice levels — rounded bars with a center-peaked envelope.
export function VoiceBars({
  count = 14,
  width = 240,
  height = 36,
  color = COLORS.INK,
  animated = false,
  seed = 0,
  bars,
  style
}: BaseProps & {
  count?: number
  width?: number
  height?: number
  color?: string
  animated?: boolean
  seed?: number
  bars?: number[]
}): JSX.Element {
  const heights = (() => {
    if (bars && bars.length > 0) return bars.slice(0, count)
    const n = count
    const out: number[] = []
    for (let i = 0; i < n; i++) {
      const s = Math.sin((i + 1 + seed) * 12.9898) * 43758.5453
      const r = s - Math.floor(s)
      const envelope = 1 - Math.abs(i / (n - 1) - 0.5) * 1.2
      out.push(Math.max(0.18, Math.min(1, (0.35 + r * 0.65) * envelope)))
    }
    return out
  })()
  const barW = (width - (heights.length - 1) * 3) / heights.length
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 3, width, height, ...style }}
    >
      {heights.map((h, i) => (
        <span
          key={i}
          style={{
            width: barW,
            height: `${Math.max(8, h * 100)}%`,
            background: color,
            borderRadius: 999,
            animation: animated
              ? `v4bar 0.9s ${(i % 7) * 0.08}s infinite ease-in-out alternate`
              : 'none'
          }}
        />
      ))}
      <style>{`@keyframes v4bar { 0%{transform:scaleY(0.45)} 100%{transform:scaleY(1.05)} }`}</style>
    </div>
  )
}

export function PulseRing({
  size = 220,
  color = COLORS.INK,
  count = 4
}: {
  size?: number
  color?: string
  count?: number
}): JSX.Element {
  const rings = Array.from({ length: count }, (_, i) => i)
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: 'visible' }}
    >
      {rings.map(i => {
        const t = (i + 1) / (count + 0.5)
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={(size / 2) * t}
            fill="none"
            stroke={color}
            strokeWidth={1 + (1 - t) * 1.4}
            opacity={0.15 + (1 - t) * 0.75}
          />
        )
      })}
      <circle cx={size / 2} cy={size / 2} r={4} fill={color} />
    </svg>
  )
}

export function Eyebrow({
  text,
  accent = COLORS.OLIVE,
  color = COLORS.MUTE
}: {
  text: string
  accent?: string
  color?: string
}): JSX.Element {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <span
        style={{ width: 6, height: 6, borderRadius: '50%', background: accent }}
      />
      <span
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color
        }}
      >
        {text}
      </span>
    </div>
  )
}

export function RecBadge({
  text = 'REC',
  big = false
}: {
  text?: string
  big?: boolean
}): JSX.Element {
  const h = big ? 30 : 22
  return (
    <span
      className="mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        height: h,
        padding: `0 ${big ? 12 : 9}px`,
        borderRadius: 6,
        background: COLORS.OLIVE,
        color: COLORS.CANVAS,
        fontSize: big ? 13 : 10.5,
        fontWeight: 600,
        letterSpacing: '0.14em'
      }}
    >
      <span
        style={{
          width: big ? 8 : 6,
          height: big ? 8 : 6,
          borderRadius: '50%',
          background: COLORS.CANVAS
        }}
      />
      {text}
    </span>
  )
}

export function Crosshair({
  size = 12,
  color = COLORS.RULE
}: {
  size?: number
  color?: string
}): JSX.Element {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <line x1={size / 2} y1={1} x2={size / 2} y2={size - 1} stroke={color} strokeWidth="1" />
      <line x1={1} y1={size / 2} x2={size - 1} y2={size / 2} stroke={color} strokeWidth="1" />
    </svg>
  )
}

export function MicGlyph({
  size = 22,
  color = COLORS.INK
}: {
  size?: number
  color?: string
}): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke={color} strokeWidth="1.5" />
      <path d="M5 11a7 7 0 0 0 14 0" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 18v3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function CheckIcon({
  size = 16,
  color = COLORS.OLIVE
}: {
  size?: number
  color?: string
}): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke={color} strokeWidth="1.4" opacity="0.5" />
      <path
        d="M5 8l2 2 4-4"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function NavToday(): JSX.Element {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <line x1="2.5" y1="6.5" x2="13.5" y2="6.5" stroke="currentColor" strokeWidth="1.4" />
      <line x1="5" y1="2" x2="5" y2="5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="11" y1="2" x2="11" y2="5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function NavClock(): JSX.Element {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 5v3l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function NavBook(): JSX.Element {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 3.5h4.5a1.5 1.5 0 0 1 1.5 1.5V13a1 1 0 0 0-1-1H3v-8.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M13 3.5H8.5A1.5 1.5 0 0 0 7 5V13a1 1 0 0 1 1-1h5v-8.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function NavGear(): JSX.Element {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 1.5v2M8 12.5v2M14.5 8h-2M3.5 8h-2M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4M12.6 12.6l-1.4-1.4M4.8 4.8L3.4 3.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}
