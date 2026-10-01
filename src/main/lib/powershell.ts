// Running PowerShell and pressing media keys. Every call to Windows goes through here.
import { execFile } from 'child_process'

/** Runs a PowerShell command and returns its output (errors included as text, never thrown). */
export function powershell(command: string, timeout = 30000, env?: Record<string, string>): Promise<string> {
  return new Promise(res => {
    // UTF-8 output so accents survive
    const cmd = `[Console]::OutputEncoding = [Text.Encoding]::UTF8; $ProgressPreference = 'SilentlyContinue'; ${command}`
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', cmd], { windowsHide: true, timeout, maxBuffer: 4e6, ...(env ? { env: { ...process.env, ...env } } : {}) }, (err, out, errOut) => {
      const text = (out || '').trim() + (errOut?.trim() ? `\n[errores]\n${errOut.trim()}` : '')
      res(err && (err as any).killed ? 'El comando tardó demasiado y se ha cancelado.' : text || (err ? `Error: ${err.message}` : '(sin salida)'))
    })
  })
}

/** Virtual-key codes of the media keys. */
export const KEYS: Record<string, number> = { play_pause: 179, next: 176, previous: 177, volume_up: 175, volume_down: 174, mute: 173 }

export function sendKey(code: number, times = 1) {
  return powershell(`$w = New-Object -ComObject WScript.Shell; 1..${times} | % { $w.SendKeys([char]${code}) }`, 10000)
}
