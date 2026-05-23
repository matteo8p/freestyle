import { serve } from '@hono/node-server'
import { randomBytes } from 'crypto'
import { buildRouter } from './router'
import { probeModel } from './lib/model-manager'
import { attachStreamServer } from './stream'
import type { ServerBootstrap } from '../shared/types'

export async function startBackend(): Promise<ServerBootstrap> {
  const token = randomBytes(24).toString('hex')
  const app = buildRouter(token)

  await probeModel()

  return new Promise((resolve, reject) => {
    const server = serve(
      { fetch: app.fetch, port: 0, hostname: '127.0.0.1' },
      info => {
        const baseUrl = `http://127.0.0.1:${info.port}`
        console.log(`[freestyle] backend listening on ${baseUrl}`)
        resolve({ baseUrl, token })
      }
    )
    attachStreamServer(server, token)
    server.on('error', reject)
  })
}
