// User settings (settings.json) and the API keys (one encrypted file per service).
import { safeStorage } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dataPath, readJson, writeAtomic } from './lib/store'

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
  geminiVision: boolean
  geminiMemory: boolean
  azureRegion: string
  subtitles: boolean
  newsTopics: string
  briefing: boolean
  wakeListen: boolean
  bgMotion: string
  // wallpaper mode: show the bottom bar, and answer clicks on the desktop
  wallDock: boolean
  wallClicks: boolean
  // wallpaper mode: the galaxy (without the core) also on the other monitors
  wallExtend: boolean
  /** always start as the wallpaper (at login too), whatever the last mode was */
  bootWall: boolean
  /** the monitor (Electron display id) that shows the core as the wallpaper; '' = the primary */
  wallDisplay: string
  wakeWord: string
  // how the recogniser writes the phrase in the user's own voice (training), and the loudness
  // from which the microphone sound is worth recognising (0 = automatic)
  wakeLearnt: string[]
  wakeGate: number
  spotifyClientId: string
  lastBriefing: string
  newsAvoid: string
  memoryLearn: boolean
  // private mode: nothing is learnt or saved, and NEXUS does not look at the screen or the camera
  privateMode: boolean
  // NEXUS warns on its own (meetings, CPU, battery, disk) and gives the evening summary
  proactive: boolean
  // features switched off in Settings → Funciones (see features.ts)
  disabled: string[]
  eveningReview: boolean
  eveningAt: string
  theme: string
  quality: string
  reduced: boolean
}

export const PROVIDERS: Record<string, { url: string; models: string[]; needsKey: boolean }> = {
  // best free tier (Google AI Studio key, no card): smart, generous and it also understands audio
  Gemini: { url: 'https://generativelanguage.googleapis.com/v1beta/openai', models: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'], needsKey: true },
  // very fast; each model has its own 200K tokens a day with the same key
  Groq: { url: 'https://api.groq.com/openai/v1', models: ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'], needsKey: true },
  // big pool, but since 2026 Mistral's free plan gives no API keys: only for paid or older keys
  Mistral: { url: 'https://api.mistral.ai/v1', models: ['mistral-medium-latest', 'mistral-small-latest'], needsKey: true },
  // free models chosen by OpenRouter itself (50 requests a day): the last net
  OpenRouter: { url: 'https://openrouter.ai/api/v1', models: ['openrouter/free'], needsKey: true },
  // new accounts now need a card for trial credits; old free keys keep working
  Cerebras: { url: 'https://api.cerebras.ai/v1', models: ['gpt-oss-120b'], needsKey: true },
  // local, no key: runs on the PC with Ollama installed
  Ollama: { url: 'http://localhost:11434/v1', models: ['qwen2.5:7b', 'llama3.1:8b', 'qwen2.5:14b'], needsKey: false }
}

const DEFAULTS: Settings = {
  // Auto: every free service with a key (Groq, Mistral, Cerebras, OpenRouter, Gemini/Ollama if allowed), switching when one hits a limit
  provider: 'Auto',
  model: 'openai/gpt-oss-120b',
  voice: 'lyra',
  userName: 'señor',
  persona: 'butler',
  speed: 1,
  pitch: 0,
  volume: 64,
  warmth: 70,
  formal: 20,
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
  // seeing the screen or an image: only when the user asks (no free alternative to Gemini)
  geminiVision: true,
  // search the memory by meaning (Gemini embeddings: their own free quota, not the answers' one)
  geminiMemory: true,
  azureRegion: 'westeurope',
  // text of what Nexus says under the core: off by default
  subtitles: false,
  // News panel: topic ids (news.ts) and words to leave out ("política" = a whole list)
  newsTopics: 'tech,science,curious',
  // spoken summary the first time NEXUS starts each day
  briefing: true,
  // "Oye Nexus" always listening (on the PC, nothing is sent): off until the user turns it on
  wakeListen: false,
  // the wallpaper animates only while you look at the desktop ('desktop'), always, or never
  bgMotion: 'desktop',
  wallDock: true,
  wallClicks: true,
  wallExtend: false,
  bootWall: false,
  wallDisplay: '',
  // the phrase that wakes it: whatever the user likes ("Oye Jarvis", "Hola Viernes"…)
  wakeWord: 'Oye Nexus',
  wakeLearnt: [],
  wakeGate: 0,
  // the user's own app at developer.spotify.com (for playlists by name)
  spotifyClientId: '',
  lastBriefing: '',
  newsAvoid: 'política',
  // the agent saves what it learns about the user (Memory panel)
  memoryLearn: true,
  privateMode: false,
  proactive: true,
  disabled: [],
  eveningReview: true,
  eveningAt: '21:30',
  theme: 'solar',
  quality: 'ultra',
  reduced: false
}

const FILE = 'settings.json'
const keyFile = (provider: string) => dataPath(`key-${provider.toLowerCase()}.bin`)

export function loadSettings(): Settings {
  const s = { ...DEFAULTS, ...readJson<Partial<Settings>>(FILE, {}) }
  // a model a service no longer gives for free (e.g. Llama on Groq) falls back to its first one
  const p = PROVIDERS[s.provider]
  if (p && s.provider !== 'Ollama' && !p.models.includes(s.model)) s.model = p.models[0]
  return s
}

// Only known keys with the right type are stored
function clean(patch: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch || {})) {
    if (!Object.hasOwn(DEFAULTS, k)) continue
    const d = (DEFAULTS as Record<string, unknown>)[k]
    if (typeof v !== typeof d || (typeof v === 'number' && !Number.isFinite(v))) continue
    if (Array.isArray(d) !== Array.isArray(v)) continue
    out[k] = typeof v === 'string' ? v.slice(0, 80) : Array.isArray(v) ? v.filter(x => typeof x === 'string').map(x => x.slice(0, 40)).slice(0, 60) : v
  }
  if (out.provider && out.provider !== 'Auto' && !Object.hasOwn(PROVIDERS, out.provider as string)) delete out.provider
  if (out.mode && !['window', 'wallpaper'].includes(out.mode as string)) delete out.mode
  return out
}

export function saveSettings(patch: Partial<Settings>): Settings {
  writeAtomic(FILE, JSON.stringify({ ...readJson(FILE, {}), ...clean(patch) }, null, 2))
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

/** True if the service accepts the key (lists its models). Offline counts as yes, so saving is never blocked. */
export async function testKey(provider: string, key: string, region = '') {
  if (!key) return false
  if (provider === 'Azure') {
    if (!/^[a-z0-9]+$/.test(region)) return false
    try {
      const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`, { signal: AbortSignal.timeout(10000), headers: { 'Ocp-Apim-Subscription-Key': key } })
      return res.ok
    } catch { return true }
  }
  const url = provider === 'Gemini' ? 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1'
    : provider === 'Groq' ? 'https://api.groq.com/openai/v1/models'
    : provider === 'Cerebras' ? 'https://api.cerebras.ai/v1/models'
    : provider === 'Mistral' ? 'https://api.mistral.ai/v1/models'
    : provider === 'OpenRouter' ? 'https://openrouter.ai/api/v1/key' : ''
  if (!url) return true
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000), headers: provider === 'Gemini' ? { 'x-goog-api-key': key } : { Authorization: `Bearer ${key}` } })
    return res.ok
  } catch { return true }
}
