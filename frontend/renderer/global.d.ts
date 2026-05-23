import type { FreestyleBridge } from '../main/preload'

declare global {
  interface Window {
    freestyle: FreestyleBridge
  }
}

export {}
