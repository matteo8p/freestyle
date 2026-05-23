import workletUrl from './pcm-worklet.js?url'

let ctxPromise: Promise<AudioContext> | null = null

export function getAudioContext(): Promise<AudioContext> {
  if (!ctxPromise) {
    ctxPromise = (async (): Promise<AudioContext> => {
      const ctx = new AudioContext()
      await ctx.audioWorklet.addModule(workletUrl)
      return ctx
    })()
  }
  return ctxPromise
}

export function prewarmAudio(): void {
  void getAudioContext().catch(err => {
    console.warn('[freestyle] audio prewarm failed', err)
  })
}
