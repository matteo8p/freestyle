import type { CSSProperties, JSX } from 'react'

const INK = '#1B1814'
const CORAL = '#F5511D'
const SAGE = '#6E8A6A'
const SAGE_SOFT = '#BFCFB9'
const PAPER = '#F1EBDD'

export const COLORS = { INK, CORAL, SAGE, SAGE_SOFT, PAPER }

interface BaseProps {
  style?: CSSProperties
  className?: string
}

export function Squiggle({
  width = 320,
  height = 64,
  stroke = INK,
  weight = 3.5,
  style
}: BaseProps & {
  width?: number
  height?: number
  stroke?: string
  weight?: number
}): JSX.Element {
  const pts: [number, number][] = []
  const N = 9
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * (width - 16) + 8
    const y = height / 2 + Math.sin(i * 1.05 + 0.3) * (height / 2 - 8) * 0.85
    pts.push([x, y])
  }
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    d += ` Q ${x1} ${y1} ${(x1 + x2) / 2} ${(y1 + y2) / 2}`
  }
  d += ` T ${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]}`
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={style}
    >
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={weight}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Underwave({
  width = 180,
  height = 14,
  color = CORAL,
  weight = 3.5,
  style
}: BaseProps & {
  width?: number
  height?: number
  color?: string
  weight?: number
}): JSX.Element {
  const pts: [number, number][] = []
  const N = 10
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * (width - 8) + 4
    const y = height / 2 + Math.sin(i * 1.6) * (height * 0.35)
    pts.push([x, y])
  }
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    d += ` Q ${x1} ${y1} ${(x1 + x2) / 2} ${(y1 + y2) / 2}`
  }
  d += ` T ${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]}`
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={style}
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={weight}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ScribbleBadge({
  size = 128,
  bg = PAPER,
  fg = INK,
  accent = CORAL,
  ring = true,
  style
}: BaseProps & {
  size?: number
  bg?: string
  fg?: string
  accent?: string
  ring?: boolean
}): JSX.Element {
  const s = size
  const c = s / 2
  const r = s * 0.46
  const path = (yOffset: number, amp: number): string => {
    const pts: [number, number][] = []
    const N = 6
    const innerW = s * 0.62
    const startX = c - innerW / 2
    for (let i = 0; i <= N; i++) {
      const x = startX + (i / N) * innerW
      const y = c + yOffset + Math.sin(i * 1.1) * amp
      pts.push([x, y])
    }
    let d = `M ${pts[0][0]} ${pts[0][1]}`
    for (let i = 1; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i]
      const [x2, y2] = pts[i + 1]
      d += ` Q ${x1} ${y1} ${(x1 + x2) / 2} ${(y1 + y2) / 2}`
    }
    d += ` T ${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]}`
    return d
  }
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={style}>
      <circle
        cx={c}
        cy={c}
        r={r}
        fill={bg}
        stroke={ring ? fg : 'none'}
        strokeWidth={s * 0.025}
      />
      <path
        d={path(-s * 0.1, s * 0.07)}
        fill="none"
        stroke={fg}
        strokeWidth={s * 0.045}
        strokeLinecap="round"
      />
      <path
        d={path(s * 0.08, s * 0.06)}
        fill="none"
        stroke={accent}
        strokeWidth={s * 0.045}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Wordmark({
  size = 64,
  color = INK,
  accent = CORAL,
  style
}: BaseProps & {
  size?: number
  color?: string
  accent?: string
}): JSX.Element {
  return (
    <span
      className="font-display"
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        fontSize: size,
        fontWeight: 700,
        color,
        letterSpacing: '-0.035em',
        lineHeight: 0.9,
        fontVariationSettings: `'wdth' 88, 'opsz' 72`,
        ...style
      }}
    >
      <span style={{ position: 'relative' }}>
        Freestyle
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '-2%',
            right: '-2%',
            bottom: `-${size * 0.22}px`,
            display: 'block',
            pointerEvents: 'none'
          }}
        >
          <Underwave
            width={size * 4.8}
            height={size * 0.18}
            color={accent}
            weight={size * 0.05}
          />
        </span>
      </span>
    </span>
  )
}

export function QuoteCurls({
  size = 80,
  stroke = INK,
  weight = 4,
  color2 = CORAL,
  style
}: BaseProps & {
  size?: number
  stroke?: string
  weight?: number
  color2?: string
}): JSX.Element {
  const s = size
  return (
    <svg
      width={s}
      height={s * 0.6}
      viewBox={`0 0 ${s} ${s * 0.6}`}
      style={style}
    >
      <path
        d={`M ${s * 0.1} ${s * 0.42} C ${s * 0.05} ${s * 0.18}, ${s * 0.22} ${s * 0.06}, ${s * 0.3} ${s * 0.18} C ${s * 0.36} ${s * 0.28}, ${s * 0.28} ${s * 0.36}, ${s * 0.18} ${s * 0.32}`}
        fill="none"
        stroke={stroke}
        strokeWidth={weight}
        strokeLinecap="round"
      />
      <path
        d={`M ${s * 0.55} ${s * 0.42} C ${s * 0.5} ${s * 0.18}, ${s * 0.67} ${s * 0.06}, ${s * 0.75} ${s * 0.18} C ${s * 0.81} ${s * 0.28}, ${s * 0.73} ${s * 0.36}, ${s * 0.63} ${s * 0.32}`}
        fill="none"
        stroke={color2}
        strokeWidth={weight}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function VoiceBars({
  count = 14,
  width = 180,
  height = 44,
  color = INK,
  accent = CORAL,
  animated = false,
  seed = 2,
  style
}: BaseProps & {
  count?: number
  width?: number
  height?: number
  color?: string
  accent?: string
  animated?: boolean
  seed?: number
}): JSX.Element {
  const rand = (i: number): number => {
    const x = Math.sin(i * 12.9898 + seed * 7.233) * 43758.5453
    return x - Math.floor(x)
  }
  const gap = width / count
  const cap = Math.min(gap * 0.55, 5)
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={style}
    >
      {Array.from({ length: count }).map((_, i) => {
        const h = (0.18 + rand(i) * 0.82) * height
        const x = i * gap + gap / 2
        const accentBar =
          i === Math.floor(count * 0.45) || i === Math.floor(count * 0.7)
        return (
          <line
            key={i}
            x1={x}
            y1={height / 2 - h / 2}
            x2={x}
            y2={height / 2 + h / 2}
            stroke={accentBar ? accent : color}
            strokeWidth={cap}
            strokeLinecap="round"
          >
            {animated && (
              <animate
                attributeName="y1"
                values={`${height / 2 - h / 2}; ${height / 2 - (h * 0.4) / 2}; ${height / 2 - (h * 1.05) / 2}; ${height / 2 - h / 2}`}
                dur={`${1.2 + rand(i) * 0.8}s`}
                repeatCount="indefinite"
              />
            )}
            {animated && (
              <animate
                attributeName="y2"
                values={`${height / 2 + h / 2}; ${height / 2 + (h * 0.4) / 2}; ${height / 2 + (h * 1.05) / 2}; ${height / 2 + h / 2}`}
                dur={`${1.2 + rand(i) * 0.8}s`}
                repeatCount="indefinite"
              />
            )}
          </line>
        )
      })}
    </svg>
  )
}

export function DotLine({
  count = 7,
  gap = 22,
  dot = 6,
  color = INK,
  accent = CORAL,
  accentIdx = 2,
  style
}: BaseProps & {
  count?: number
  gap?: number
  dot?: number
  color?: string
  accent?: string
  accentIdx?: number
}): JSX.Element {
  const w = (count - 1) * gap + dot
  return (
    <svg width={w} height={dot} viewBox={`0 0 ${w} ${dot}`} style={style}>
      {Array.from({ length: count }).map((_, i) => (
        <circle
          key={i}
          cx={i * gap + dot / 2}
          cy={dot / 2}
          r={dot / 2}
          fill={i === accentIdx ? accent : color}
        />
      ))}
    </svg>
  )
}

export function MicGlyph({
  size = 24,
  color = INK
}: {
  size?: number
  color?: string
}): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect
        x="9"
        y="3"
        width="6"
        height="11"
        rx="3"
        stroke={color}
        strokeWidth="1.6"
      />
      <path
        d="M5 11a7 7 0 0 0 14 0"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12 18v3"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function SidebarHomeIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M2.5 7.5l5.5-5 5.5 5v6a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1v-6z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SidebarHistoryIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 5v3l2 1.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function SidebarBookIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 3.5h6a2 2 0 0 1 2 2V13a1.5 1.5 0 0 0-1.5-1.5H3v-8z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M13 3.5H9a2 2 0 0 0-2 2V13a1.5 1.5 0 0 1 1.5-1.5H13v-8z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SidebarGearIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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

export function CheckIcon({ size = 16 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke={SAGE_SOFT} strokeWidth="1.4" />
      <path
        d="M5 8l2 2 4-4"
        stroke={SAGE}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
