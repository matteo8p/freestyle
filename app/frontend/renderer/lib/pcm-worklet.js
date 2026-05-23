const TARGET_RATE = 16000
const CHUNK_SAMPLES = 1280

class PcmDownsamplerProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.ratio = sampleRate / TARGET_RATE
    this.cursor = 0
    this.buffer = new Int16Array(CHUNK_SAMPLES)
    this.fillIndex = 0
    this.flushPending = false
    this.port.onmessage = e => {
      if (e.data && e.data.type === 'flush') this.flushPending = true
    }
  }

  emit() {
    if (this.fillIndex === 0) return
    const copy = new Int16Array(this.fillIndex)
    copy.set(this.buffer.subarray(0, this.fillIndex))
    this.port.postMessage(copy, [copy.buffer])
    this.buffer = new Int16Array(CHUNK_SAMPLES)
    this.fillIndex = 0
  }

  doFlush() {
    this.emit()
    this.port.postMessage({ type: 'flushed' })
  }

  process(inputs) {
    const input = inputs[0]
    if (!input || input.length === 0) {
      if (this.flushPending) {
        this.flushPending = false
        this.doFlush()
      }
      return true
    }
    const channel = input[0]
    if (!channel) return true

    while (this.cursor < channel.length) {
      const i = Math.floor(this.cursor)
      const frac = this.cursor - i
      const a = channel[i] ?? 0
      const b = channel[i + 1] ?? a
      const sample = a + (b - a) * frac
      const s = Math.max(-1, Math.min(1, sample))
      this.buffer[this.fillIndex++] = s < 0 ? s * 0x8000 : s * 0x7fff

      if (this.fillIndex === CHUNK_SAMPLES) this.emit()
      this.cursor += this.ratio
    }
    this.cursor -= channel.length

    if (this.flushPending) {
      this.flushPending = false
      this.doFlush()
    }
    return true
  }
}

registerProcessor('pcm-downsampler', PcmDownsamplerProcessor)
