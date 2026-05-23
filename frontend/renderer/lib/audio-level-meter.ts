import { getAudioContext } from './audio-ctx'

export interface AudioFrame {
  bars: number[]
  rms: number
  t: number
}

const BARS = 14
const FFT_SIZE = 256
const SMOOTHING = 0.6

export class AudioLevelMeter {
  private analyser: AnalyserNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private bins: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(0))
  private bucketMap: number[][] = []
  private rafId: number | null = null
  private running = false
  private readonly stream: MediaStream
  private readonly onFrame: (frame: AudioFrame) => void

  constructor(stream: MediaStream, onFrame: (frame: AudioFrame) => void) {
    this.stream = stream
    this.onFrame = onFrame
  }

  async start(): Promise<void> {
    const ctx = await getAudioContext()
    this.source = ctx.createMediaStreamSource(this.stream)
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = FFT_SIZE
    this.analyser.smoothingTimeConstant = SMOOTHING
    this.source.connect(this.analyser)
    this.bins = new Uint8Array(this.analyser.frequencyBinCount)
    this.bucketMap = buildLogBuckets(
      this.analyser.frequencyBinCount,
      BARS,
      ctx.sampleRate
    )
    this.running = true
    this.tick()
  }

  stop(): void {
    this.running = false
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    try {
      this.source?.disconnect()
    } catch {}
    try {
      this.analyser?.disconnect()
    } catch {}
    this.source = null
    this.analyser = null
  }

  private tick = (): void => {
    if (!this.running || !this.analyser) return
    this.analyser.getByteFrequencyData(this.bins)
    const bars: number[] = new Array(BARS)
    let rmsSum = 0
    for (let b = 0; b < BARS; b++) {
      const idxs = this.bucketMap[b]
      let sum = 0
      for (const i of idxs) sum += this.bins[i]
      const avg = idxs.length > 0 ? sum / idxs.length / 255 : 0
      bars[b] = avg
      rmsSum += avg * avg
    }
    const rms = Math.sqrt(rmsSum / BARS)
    this.onFrame({ bars, rms, t: performance.now() })
    this.rafId = requestAnimationFrame(this.tick)
  }
}

function buildLogBuckets(
  binCount: number,
  bars: number,
  sampleRate: number
): number[][] {
  // Speech sits in ~80–8000 Hz. Build log-spaced buckets over that range,
  // mapped to AnalyserNode bin indices (0..binCount-1 covers 0..nyquist).
  const minHz = 80
  const maxHz = Math.min(8000, sampleRate / 2)
  const nyquist = sampleRate / 2
  const edges: number[] = []
  for (let i = 0; i <= bars; i++) {
    const t = i / bars
    const hz = minHz * Math.pow(maxHz / minHz, t)
    const bin = Math.round((hz / nyquist) * binCount)
    edges.push(Math.max(0, Math.min(binCount - 1, bin)))
  }
  const buckets: number[][] = []
  for (let i = 0; i < bars; i++) {
    const lo = edges[i]
    const hi = Math.max(edges[i + 1], lo + 1)
    const idxs: number[] = []
    for (let j = lo; j < hi; j++) idxs.push(j)
    buckets.push(idxs)
  }
  return buckets
}
