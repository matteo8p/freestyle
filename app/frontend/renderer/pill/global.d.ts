import type { FreestylePillBridge } from '../../main/preload-pill'

declare global {
  interface Window {
    freestylePill: FreestylePillBridge
  }
}

declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag'
  }
}

export {}
