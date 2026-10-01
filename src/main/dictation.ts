// Dictation: Ctrl + Alt + D in any app, speak, and the text is typed where the cursor is.
// The window records (it has the microphone); here the text is pasted into the app in front.
import { clipboard } from 'electron'
import { powershell } from './lib/powershell'

export const DICTATE_HOTKEY = 'Control+Alt+D'

/** Pastes `text` into the focused app and gives the clipboard its old text back. */
export async function typeText(text: string) {
  if (!text.trim()) return false
  const before = await clipboard.readText().catch(() => '')
  await clipboard.writeText(text)
  await powershell("(New-Object -ComObject WScript.Shell).SendKeys('^v')", 8000)
  // the target app reads the clipboard right after Ctrl+V: wait before restoring it
  setTimeout(() => { if (before) clipboard.writeText(before).catch(() => {}) }, 800)
  return true
}
