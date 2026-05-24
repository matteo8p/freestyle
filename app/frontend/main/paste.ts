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
    if (process.platform === 'darwin') {
      await execAsync(
        `osascript -e 'tell application "System Events" to keystroke "v" using {command down}'`
      )
    } else if (process.platform === 'win32') {
      await execAsync(
        `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')"`
      )
    }
    await new Promise(r => setTimeout(r, 200))
  } finally {
    clipboard.writeText(prior)
  }
}
