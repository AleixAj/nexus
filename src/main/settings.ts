import { app, safeStorage } from 'electron'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'

export type Settings = {
  provider: string
  model: string
  voice: string
  userName: string
  persona: string
  speed: number
  pitch: number
  volume: number
  warmth: number
  formal: number
  fx: number
  lang: string
  mode: string
  trayHinted: boolean
  onboarded: boolean
  agentWeb: boolean
  agentFiles: boolean
  agentWrite: boolean
  agentShell: boolean
  micId: string
  geminiTts: boolean
  geminiSearch: boolean
  geminiStt: boolean
  geminiFallback: boolean
  azureRegion: string
  subtitles: boolean
  theme: string
  quality: string
  reduced: boolean
}

export const PROVIDERS: Record<string, { url: string; models: string[]; needsKey: boolean }> = {
  // best free tier (Google AI Studio key, no card): smart, generous and it also understands audio
  Gemini: { url: 'https://generativelanguage.googleapis.com/v1beta/openai', models: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'], needsKey: true },
  Groq: { url: 'https://api.groq.com/openai/v1', models: ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b'], needsKey: true },
  // free tier with a bigger per-minute budget than Groq (5 requests/min, 30K tokens/min)
  Cerebras: { url: 'https://api.cerebras.ai/v1', models: ['gpt-oss-120b'], needsKey: true },
  // local, no key: runs on the PC with Ollama installed
  Ollama: { url: 'http://localhost:11434/v1', models: ['qwen2.5:7b', 'llama3.1:8b', 'qwen2.5:14b'], needsKey: false }
}

const DEFAULTS: Settings = {
  // Auto: Cerebras + Groq (+ Gemini/Ollama if allowed), switching when one hits a limit
  provider: 'Auto',
  model: 'openai/gpt-oss-120b',
  voice: 'lyra',
  userName: 'señor',
  persona: 'butler',
  speed: 1,
  pitch: 0,
  volume: 64,
  warmth: 70,
  formal: 85,
  fx: 35,
  lang: 'es-ES',
  mode: 'window',
  trayHinted: false,
  onboarded: false,
  agentWeb: true,
  agentFiles: true,
  agentWrite: true,
  agentShell: true,
  micId: '',
  // Gemini's free quota is limited: each use is opt-in (the key alone turns nothing on)
  geminiTts: false,
  geminiSearch: false,
  geminiStt: false,
  geminiFallback: false,
  azureRegion: 'westeurope',
  // text of what Nexus says under the core: off by default
  subtitles: false,
  theme: 'nexus',
  quality: 'ultra',
  reduced: false
}

const file = () => join(app.getPath('userData'), 'settings.json')
const keyFile = (provider: string) => join(app.getPath('userData'), `key-${provider.toLowerCase()}.bin`)

export function loadSettings(): Settings {
  if (!existsSync(file())) return { ...DEFAULTS }
  try {
    return { ...DEFAULTS, ...JSON.parse(readFileSync(file(), 'utf8')) }
  } catch {
    return { ...DEFAULTS }
  }
}

// Only known keys with the right type are stored
function clean(patch: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch || {})) {
    if (!Object.hasOwn(DEFAULTS, k)) continue
    const d = (DEFAULTS as Record<string, unknown>)[k]
    if (typeof v !== typeof d || (typeof v === 'number' && !Number.isFinite(v))) continue
    out[k] = typeof v === 'string' ? v.slice(0, 80) : v
  }
  if (out.provider && out.provider !== 'Auto' && !Object.hasOwn(PROVIDERS, out.provider as string)) delete out.provider
  if (out.mode && !['window', 'wallpaper'].includes(out.mode as string)) delete out.mode
  return out
}

export function saveSettings(patch: Partial<Settings>): Settings {
  let saved = {}
  try { saved = JSON.parse(readFileSync(file(), 'utf8')) } catch { /* first save */ }
  // write to a temp file and rename, so a crash never leaves half a JSON
  const tmp = file() + '.tmp'
  writeFileSync(tmp, JSON.stringify({ ...saved, ...clean(patch) }, null, 2))
  renameSync(tmp, file())
  return loadSettings()
}

// API keys are encrypted with the OS keychain (DPAPI on Windows)
// services with a key: the AI providers plus Azure (voices only)
const KEYED = (name: string) => Object.hasOwn(PROVIDERS, name) || name === 'Azure'

export function getKey(provider: string): string {
  if (!KEYED(provider)) return ''
  const f = keyFile(provider)
  if (!existsSync(f)) return process.env[`${provider.toUpperCase()}_API_KEY`] || ''
  try {
    return safeStorage.decryptString(readFileSync(f))
  } catch {
    // copied from another PC/user or corrupted: behave as if there were no key
    return ''
  }
}

export function setKey(provider: string, key: string) {
  if (!KEYED(provider)) throw new Error('Proveedor desconocido')
  if (typeof key !== 'string' || !key.trim() || key.length > 400) throw new Error('Clave no válida')
  if (!safeStorage.isEncryptionAvailable()) throw new Error('El cifrado del sistema no está disponible')
  writeFileSync(keyFile(provider), safeStorage.encryptString(key.trim()))
}
