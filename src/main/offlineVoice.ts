// Voice without internet: the voices Windows already has (Helena in Spanish, Zira in English).
// More robotic than the neural ones, used only when the online voice cannot be reached.
// (Kokoro, the local voice OpenJarvis uses, only speaks English.)
import { readFile, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { powershell } from './lib/powershell'

const SCRIPT = `
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$v = $s.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -like "$env:NX_LANG*" } | Select-Object -First 1
if ($v) { $s.SelectVoice($v.VoiceInfo.Name) }
$s.Rate = [int]$env:NX_RATE
$s.SetOutputToWaveFile($env:NX_OUT)
$s.Speak($env:NX_TEXT)
$s.Dispose()
'ok'`

/** WAV audio of `text` with a Windows voice (throws if Windows has no voice at all). */
export async function windowsSpeak(text: string, lang: string, speed = 1) {
  const out = join(tmpdir(), `nexus-voice-${process.pid}-${Date.now()}.wav`)
  const rate = Math.max(-10, Math.min(10, Math.round((speed - 1) * 10)))
  try {
    // the text goes through an environment variable: no quoting problems, nothing is executed
    const r = await powershell(SCRIPT, 30000, { NX_TEXT: text.slice(0, 3000), NX_LANG: lang.startsWith('en') ? 'en' : 'es', NX_RATE: String(rate), NX_OUT: out })
    if (!r.includes('ok')) throw new Error('Windows no tiene voces: ' + r.slice(0, 120))
    return await readFile(out)
  } finally {
    rm(out, { force: true }).catch(() => {})
  }
}
