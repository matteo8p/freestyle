import { Hono } from 'hono'
import { loadSettings, updateSettings } from '../lib/settings-store'
import type { Settings } from '../../shared/types'

const route = new Hono()

route.get('/', async c => {
  const settings = await loadSettings()
  return c.json(settings)
})

route.put('/', async c => {
  const patch = (await c.req.json()) as Partial<Settings>
  const next = await updateSettings(patch)
  return c.json(next)
})

export default route
