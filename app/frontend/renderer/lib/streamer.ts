import type { StreamServerMessage } from '@shared/types'
import { getAudioContext } from './audio-ctx'

interface StreamerOptions {
  baseUrl: string
  token: string
  deviceId: string | null
  onPartial: (text: string) => void
  onFinal: (text: string) => void
  onError: (message: string) => void
}

export class Streamer {
  private ws: WebSocket | null = null
  private ctx: AudioContext | null = null
  private stream: MediaStream | null = null
  private worklet: AudioWorkletNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private readonly opts: StreamerOptions
  private sessionReadyResolve: (() => void) | null = null
  private sessionReadyReject: ((err: Error) => void) | null = null
  private readonly sessionReady: Promise<void>
  private sessionReadyFlag = false
  private closed = false
  private readonly bufferedPcm: Int16Array[] = []
  private pendingWsChunks: ArrayBuffer[] = []
  private finalResolve: ((text: string) => void) | null = null
  private finalReject: ((err: Error) => void) | null = null
  private finalReceived = false
  private flushedResolvers: Array<() => void> = []

  constructor(opts: StreamerOptions) {
    this.opts = opts
    this.sessionReady = new Promise<void>((resolve, reject) => {
      this.sessionReadyResolve = resolve
      this.sessionReadyReject = reject
    })
  }

  getBufferedPcm(): Int16Array[] {
    return this.bufferedPcm
  }

  getStream(): MediaStream | null {
    return this.stream
  }

  async start(): Promise<void> {
    const wsPromise = this.openWebSocket()
    const micPromise = this.acquireMic()
    const ctxPromise = getAudioContext()

    wsPromise.catch(() => {})

    const [stream, ctx] = await Promise.all([micPromise, ctxPromise])
    this.stream = stream
    this.ctx = ctx

    this.source = ctx.createMediaStreamSource(stream)
    this.worklet = new AudioWorkletNode(ctx, 'pcm-downsampler', {
      numberOfInputs: 1,
      numberOfOutputs: 0
    })
    this.worklet.port.onmessage = e => this.onWorkletMessage(e.data)
    this.source.connect(this.worklet)
  }

  commit(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.finalResolve = resolve
      this.finalReject = reject
      void this.doCommit().catch(err => {
        reject(err instanceof Error ? err : new Error(String(err)))
      })
    })
  }

  private async doCommit(): Promise<void> {
    await this.flushWorklet()
    this.stopCapture()
    try {
      await this.sessionReady
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err))
    }
    if (this.ws?.readyState !== WebSocket.OPEN) throw new Error('WS not open')
    this.flushPendingWsChunks()
    this.ws.send(JSON.stringify({ type: 'commit' }))
  }

  private flushWorklet(): Promise<void> {
    if (!this.worklet) return Promise.resolve()
    return new Promise<void>(resolve => {
      this.flushedResolvers.push(resolve)
      this.worklet!.port.postMessage({ type: 'flush' })
    })
  }

  private onWorkletMessage(data: unknown): void {
    if (data instanceof Int16Array) {
      this.onPcmChunk(data)
      return
    }
    if (data && typeof data === 'object' && (data as { type?: string }).type === 'flushed') {
      const resolvers = this.flushedResolvers
      this.flushedResolvers = []
      for (const r of resolvers) r()
    }
  }

  cancel(): void {
    this.stopCapture()
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'cancel' }))
    }
    this.close()
  }

  close(): void {
    this.closed = true
    this.stopCapture()
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) this.ws.close()
    this.ws = null
  }

  private openWebSocket(): Promise<void> {
    const wsUrl =
      this.opts.baseUrl.replace(/^http/, 'ws') +
      `/stream?token=${encodeURIComponent(this.opts.token)}`
    const ws = new WebSocket(wsUrl)
    ws.binaryType = 'arraybuffer'
    this.ws = ws

    return new Promise<void>((resolve, reject) => {
      let opened = false

      ws.addEventListener('open', () => {
        opened = true
        this.flushPendingWsChunks()
        resolve()
      })
      ws.addEventListener('message', e => this.onMessage(e))
      ws.addEventListener('error', () => {
        const err = new Error('WebSocket error')
        if (!opened) reject(err)
        else if (!this.sessionReadyFlag) this.sessionReadyReject?.(err)
        else this.opts.onError(err.message)
      })
      ws.addEventListener('close', () => {
        if (!opened) reject(new Error('WebSocket closed'))
        if (!this.sessionReadyFlag && !this.closed) {
          this.sessionReadyReject?.(new Error('WebSocket closed before session ready'))
        }
        if (!this.finalReceived && this.finalReject) {
          this.finalReject(new Error('WebSocket closed before final'))
        }
      })
    })
  }

  private async acquireMic(): Promise<MediaStream> {
    const processing = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    }
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: this.opts.deviceId
          ? { deviceId: { exact: this.opts.deviceId }, ...processing }
          : processing
      })
    } catch (e) {
      const name = e instanceof Error ? e.name : ''
      if (
        this.opts.deviceId &&
        (name === 'OverconstrainedError' || name === 'NotFoundError')
      ) {
        return navigator.mediaDevices.getUserMedia({ audio: processing })
      }
      throw e
    }
  }

  private onPcmChunk(chunk: Int16Array): void {
    if (chunk.length === 0) return
    this.bufferedPcm.push(chunk)
    const buf = new ArrayBuffer(chunk.byteLength)
    new Uint8Array(buf).set(
      new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength)
    )
    if (this.ws?.readyState === WebSocket.OPEN && this.sessionReadyFlag) {
      this.ws.send(buf)
    } else {
      this.pendingWsChunks.push(buf)
    }
  }

  private flushPendingWsChunks(): void {
    if (!this.sessionReadyFlag) return
    if (this.ws?.readyState !== WebSocket.OPEN) return
    for (const chunk of this.pendingWsChunks) this.ws.send(chunk)
    this.pendingWsChunks = []
  }

  private stopCapture(): void {
    try {
      this.source?.disconnect()
    } catch {}
    try {
      this.worklet?.disconnect()
    } catch {}
    this.source = null
    this.worklet = null
    this.stream?.getTracks().forEach(t => t.stop())
    this.stream = null
    this.ctx = null
  }

  private onMessage(e: MessageEvent): void {
    if (typeof e.data !== 'string') return
    let msg: StreamServerMessage
    try {
      msg = JSON.parse(e.data) as StreamServerMessage
    } catch {
      return
    }
    switch (msg.type) {
      case 'session.ready':
        this.sessionReadyFlag = true
        this.sessionReadyResolve?.()
        this.flushPendingWsChunks()
        return
      case 'partial':
        this.opts.onPartial(msg.text)
        return
      case 'final':
        this.finalReceived = true
        this.opts.onFinal(msg.text)
        this.finalResolve?.(msg.text)
        this.close()
        return
      case 'error':
        if (!this.sessionReadyFlag)
          this.sessionReadyReject?.(new Error(msg.message))
        else {
          this.opts.onError(msg.message)
          this.finalReject?.(new Error(msg.message))
        }
        return
    }
  }
}
