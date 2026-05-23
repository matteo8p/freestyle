import type { FreestyleBridge } from '../main/preload'

declare global {
  interface Window {
    freestyle: FreestyleBridge
  }
}

declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag'
  }
}

export {}
