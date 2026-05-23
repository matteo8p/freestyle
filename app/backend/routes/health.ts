import { Hono } from 'hono'

const route = new Hono()
route.get('/', c => c.json({ ok: true }))
export default route
