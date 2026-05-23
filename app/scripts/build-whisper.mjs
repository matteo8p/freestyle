import { existsSync } from 'fs'
import { spawnSync } from 'child_process'
import { resolve } from 'path'

if (process.platform !== 'darwin') process.exit(0)

const whisperDir = resolve('node_modules/nodejs-whisper/cpp/whisper.cpp')
if (!existsSync(whisperDir)) process.exit(0)

const built = existsSync(resolve(whisperDir, 'build/bin/whisper-cli'))
if (built) process.exit(0)

const cmakeCheck = spawnSync('which', ['cmake'])
if (cmakeCheck.status !== 0) {
  console.warn('')
  console.warn('[freestyle] cmake not found. Local whisper.cpp transcription will fail until you install it:')
  console.warn('  brew install cmake')
  console.warn('')
  process.exit(0)
}

console.log('[freestyle] building whisper.cpp (one-time, ~30-60s)...')

const cfg = spawnSync('cmake', ['-B', 'build'], { cwd: whisperDir, stdio: 'inherit' })
if (cfg.status !== 0) {
  console.warn('[freestyle] cmake configure failed; local transcription will fail.')
  process.exit(0)
}

const build = spawnSync('cmake', ['--build', 'build', '--config', 'Release'], {
  cwd: whisperDir,
  stdio: 'inherit'
})
if (build.status !== 0) {
  console.warn('[freestyle] whisper.cpp build failed; local transcription will fail.')
  process.exit(0)
}

console.log('[freestyle] whisper.cpp built.')
