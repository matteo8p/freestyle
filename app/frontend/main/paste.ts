import { exec } from 'child_process'
import { clipboard } from 'electron'

function execAsync(cmd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(cmd, err => (err ? reject(err) : resolve()))
  })
}

export async function pasteIntoFocusedApp(text: string): Promise<void> {
  if (!text) return
  const prior = clipboard.readText()
  clipboard.writeText(text)
  try {
    await new Promise(r => setTimeout(r, 50))
    await execAsync(
      `osascript -e 'tell application "System Events" to keystroke "v" using {command down}'`
    )
    await new Promise(r => setTimeout(r, 200))
  } finally {
    clipboard.writeText(prior)
  }
}
