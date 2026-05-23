import { Hono } from 'hono'
import { ensureModel, getModelState } from '../lib/model-manager'
import type { CloudModel, ModelsStatus } from '../../shared/types'

const route = new Hono()

const cloudOptions: CloudModel[] = [
  'gpt-4o-mini-transcribe',
  'gpt-4o-transcribe',
  'whisper-1'
]

route.get('/', c => {
  const body: ModelsStatus = {
    local: getModelState(),
    cloudOptions
  }
  return c.json(body)
})

route.post('/local/download', async c => {
  ensureModel().catch(err => {
    console.error('[freestyle] model download error', err)
  })
  return c.body(null, 202)
})

export default route
