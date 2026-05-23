import { Hono } from 'hono'
import { deleteKey, keyStatus, setKey } from '../lib/secrets'
import type { ApiKeyStatus } from '../../shared/types'

const route = new Hono()

route.get('/status', async c => {
  const openai = await keyStatus('openai')
  const body: ApiKeyStatus = { openai }
  return c.json(body)
})

route.post('/', async c => {
  const { provider, key } = (await c.req.json()) as { provider: 'openai'; key: string }
  if (provider !== 'openai') return c.json({ error: 'unsupported provider' }, 400)
  if (!key || typeof key !== 'string') return c.json({ error: 'invalid key' }, 400)
  await setKey('openai', key.trim())
  return c.body(null, 204)
})

route.delete('/', async c => {
  const { provider } = (await c.req.json().catch(() => ({ provider: 'openai' }))) as {
    provider?: 'openai'
  }
  await deleteKey(provider ?? 'openai')
  return c.body(null, 204)
})

export default route
