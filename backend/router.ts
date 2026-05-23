import { Hono } from 'hono'
import { cors } from 'hono/cors'
import transcribe from './routes/transcribe'
import settings from './routes/settings'
import apiKey from './routes/api-key'
import models from './routes/models'
import health from './routes/health'

export function buildRouter(token: string): Hono {
  const app = new Hono()

  app.use(
    '*',
    cors({
      origin: '*',
      allowHeaders: ['x-freestyle-token', 'content-type'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    })
  )

  app.use('*', async (c, next) => {
    if (c.req.method === 'OPTIONS') return next()
    const header = c.req.header('x-freestyle-token')
    if (header !== token) {
      return c.json({ error: 'unauthorized' }, 401)
    }
    await next()
  })

  app.route('/transcribe', transcribe)
  app.route('/settings', settings)
  app.route('/api-key', apiKey)
  app.route('/models', models)
  app.route('/health', health)

  return app
}
