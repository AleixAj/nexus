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
  lang: string
  mode: string
  trayHinted: boolean
  theme: string
  quality: string
  reduced: boolean
}

export const PROVIDERS: Record<string, { url: string; models: string[]; needsKey: boolean }> = {
  Groq: { url: 'https://api.groq.com/openai/v1', models: ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b'], needsKey: true },
  Ollama: { url: 'http://localhost:11434/v1', models: ['llama3.1:8b', 'qwen2.5:14b'], needsKey: false }
}

const DEFAULTS: Settings = {
  provider: 'Groq',
  model: 'openai/gpt-oss-120b',
  voice: 'lyra',
  userName: 'señor',
  persona: 'butler',
  speed: 1,
  pitch: 0,
  volume: 64,
  warmth: 70,
  formal: 85,
  lang: 'es-ES',
  mode: 'window',
  trayHinted: false,
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
  if (out.provider && !Object.hasOwn(PROVIDERS, out.provider as string)) delete out.provider
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
export function getKey(provider: string): string {
  if (!Object.hasOwn(PROVIDERS, provider)) return ''
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
  if (!Object.hasOwn(PROVIDERS, provider)) throw new Error('Proveedor desconocido')
  if (typeof key !== 'string' || !key.trim() || key.length > 400) throw new Error('Clave no válida')
  if (!safeStorage.isEncryptionAvailable()) throw new Error('El cifrado del sistema no está disponible')
  writeFileSync(keyFile(provider), safeStorage.encryptString(key.trim()))
}
