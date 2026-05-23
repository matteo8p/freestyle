import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { createRequire } from 'module'
import { ensureModel, getModelName } from '../lib/model-manager'
import type { STTAdapter, TranscribeResult } from './adapter'

const require = createRequire(import.meta.url)

export const localWhisperAdapter: STTAdapter = {
  backend: 'local',
  async transcribe(wav: Buffer): Promise<TranscribeResult> {
    await ensureModel()
    const tmpFile = path.join(
      os.tmpdir(),
      `freestyle-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`
    )
    await fs.writeFile(tmpFile, wav)

    const { nodewhisper } = require('nodejs-whisper') as {
      nodewhisper: (
        filePath: string,
        options: Record<string, unknown>
      ) => Promise<string>
    }

    try {
      const modelName = getModelName()
      const raw = await nodewhisper(tmpFile, {
        modelName,
        autoDownloadModelName: modelName,
        removeWavFileAfterTranscription: false,
        withCuda: false,
        logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
        whisperOptions: {
          outputInText: true,
          outputInVtt: false,
          outputInSrt: false,
          outputInCsv: false,
          translateToEnglish: false,
          wordTimestamps: false,
          timestamps_length: 0,
          splitOnWord: false
        }
      })
      const text = stripTimestamps(raw).trim()
      return { text, model: modelName, backend: 'local' }
    } finally {
      fs.unlink(tmpFile).catch(() => {})
    }
  }
}

function stripTimestamps(s: string): string {
  return s
    .split('\n')
    .map(line => line.replace(/^\[[^\]]+\]\s*/, ''))
    .join('\n')
}
