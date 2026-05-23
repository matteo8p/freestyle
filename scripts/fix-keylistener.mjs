import { existsSync, chmodSync, statSync } from 'fs'
import { resolve } from 'path'

if (process.platform !== 'darwin') process.exit(0)

const bin = resolve('node_modules/node-global-key-listener/bin/MacKeyServer')
if (!existsSync(bin)) process.exit(0)

try {
  const current = statSync(bin).mode
  chmodSync(bin, current | 0o111)
} catch (err) {
  console.warn('[freestyle] could not chmod MacKeyServer:', err?.message ?? err)
}
