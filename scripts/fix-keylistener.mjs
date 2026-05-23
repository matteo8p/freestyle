// Ensures node-global-key-listener's bundled MacKeyServer binary is executable.
// npm doesn't always preserve the +x bit when unpacking, and the library's
// own startup chmod (via sudo-prompt) fails on macOS Sequoia because the
// kernel-enforced com.apple.provenance xattr blocks the sudo path.
// We do it here as the file owner, where the chmod is allowed.
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
