// Critically-damped-spring-ish smoothing for the bar heights.
// Render-side smoothing on top of AnalyserNode's smoothing absorbs IPC jitter
// and keeps motion continuous if a frame drops.

const RISE = 0.55
const FALL = 0.22

export function smoothBars(prev: number[], next: number[]): number[] {
  if (prev.length !== next.length) return next.slice()
  const out = new Array<number>(prev.length)
  for (let i = 0; i < prev.length; i++) {
    const p = prev[i]
    const n = next[i]
    const k = n > p ? RISE : FALL
    out[i] = p + (n - p) * k
  }
  return out
}

export function decayBars(prev: number[]): number[] {
  return prev.map(v => v * 0.85)
}
