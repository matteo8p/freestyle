import { WebSocketServer, WebSocket } from 'ws'
import { getKey } from './lib/secrets'
import { loadSettings } from './lib/settings-store'
import { openOpenAIStream } from './stt/openai-streaming'
import type {
  StreamClientMessage,
  StreamServerMessage
} from '../shared/types'

interface UpgradableServer {
  on(event: 'upgrade', listener: (req: import('http').IncomingMessage, socket: import('stream').Duplex, head: Buffer) => void): unknown
}

export function attachStreamServer(httpServer: UpgradableServer, token: string): void {
  const wss = new WebSocketServer({ noServer: true })

  httpServer.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '', 'http://localhost')
    if (url.pathname !== '/stream') return
    if (url.searchParams.get('token') !== token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }
    wss.handleUpgrade(req, socket, head, ws => {
      wss.emit('connection', ws, req)
    })
  })

  wss.on('connection', ws => handleConnection(ws))
}

function send(ws: WebSocket, msg: StreamServerMessage): void {
  if (ws.readyState !== WebSocket.OPEN) return
  ws.send(JSON.stringify(msg))
}

async function handleConnection(client: WebSocket): Promise<void> {
  let upstream: ReturnType<typeof openOpenAIStream> | null = null
  let upstreamReady = false
  let closed = false

  try {
    const apiKey = await getKey('openai')
    if (!apiKey) {
      send(client, { type: 'error', message: 'OpenAI API key not set' })
      client.close()
      return
    }
    const settings = await loadSettings()
    if (settings.cloudModel === 'whisper-1') {
      send(client, {
        type: 'error',
        message: 'whisper-1 does not support streaming'
      })
      client.close()
      return
    }

    upstream = openOpenAIStream({
      apiKey,
      model: settings.cloudModel,
      callbacks: {
        onReady: model => {
          upstreamReady = true
          send(client, { type: 'session.ready', model })
        },
        onPartial: text => send(client, { type: 'partial', text }),
        onFinal: text => {
          send(client, { type: 'final', text })
          cleanup()
        },
        onError: message => {
          send(client, { type: 'error', message })
          cleanup()
        },
        onClose: () => {
          if (!closed) cleanup()
        }
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    send(client, { type: 'error', message })
    client.close()
    return
  }

  client.on('message', (data, isBinary) => {
    if (!upstream || !upstreamReady) return
    if (isBinary) {
      const buf = data as Buffer
      const slice = new ArrayBuffer(buf.byteLength)
      new Uint8Array(slice).set(buf)
      upstream.sendAudio(slice)
      return
    }
    let msg: StreamClientMessage
    try {
      msg = JSON.parse(data.toString()) as StreamClientMessage
    } catch {
      return
    }
    if (msg.type === 'commit') {
      upstream.commit()
    } else if (msg.type === 'cancel') {
      cleanup()
    }
  })

  client.on('close', () => cleanup())
  client.on('error', () => cleanup())

  function cleanup(): void {
    if (closed) return
    closed = true
    try {
      upstream?.close()
    } catch {}
    try {
      if (client.readyState <= WebSocket.OPEN) client.close()
    } catch {}
  }
}
