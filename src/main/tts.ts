import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import { getKey, loadSettings } from './settings'

// Voices of the app mapped to Microsoft neural voices (free, no key).
// The "Multilingual" ones are the most natural (the voices of Copilot); they speak
// Spanish with a neutral accent. `gemini` marks the premium voices (Gemini TTS),
// which fall back to the Microsoft voice when there is no Gemini key or its free quota runs out.
// `azure` marks voices of Azure Speech (free 500K characters/month): an HD voice when the plan allows it, otherwise its regular version
type Voice = { es: string; mx: string; en: string; rate: number; pitch: number; gemini?: string; azure?: { hd?: string; std: string } }

const VOICES: Record<string, Voice> = {
  lyra: { es: 'es-ES-XimenaNeural', mx: 'es-MX-DaliaNeural', en: 'en-GB-SoniaNeural', rate: 0, pitch: 0 },
  vega: { es: 'en-US-EmmaMultilingualNeural', mx: 'en-US-EmmaMultilingualNeural', en: 'en-US-EmmaMultilingualNeural', rate: 0, pitch: 0 },
  nova: { es: 'es-ES-ElviraNeural', mx: 'es-MX-DaliaNeural', en: 'en-GB-LibbyNeural', rate: 0, pitch: 0 },
  aura: { es: 'en-US-AvaMultilingualNeural', mx: 'en-US-AvaMultilingualNeural', en: 'en-US-AvaMultilingualNeural', rate: 0, pitch: 0, gemini: 'Sulafat' },
  orion: { es: 'es-ES-AlvaroNeural', mx: 'es-MX-JorgeNeural', en: 'en-GB-RyanNeural', rate: -4, pitch: -6 },
  kairo: { es: 'en-US-AndrewMultilingualNeural', mx: 'en-US-AndrewMultilingualNeural', en: 'en-US-AndrewMultilingualNeural', rate: 0, pitch: 0 },
  atlas: { es: 'en-US-BrianMultilingualNeural', mx: 'en-US-BrianMultilingualNeural', en: 'en-US-BrianMultilingualNeural', rate: 0, pitch: 0 },
  zenit: { es: 'en-US-AndrewMultilingualNeural', mx: 'en-US-AndrewMultilingualNeural', en: 'en-US-AndrewMultilingualNeural', rate: 0, pitch: 0, gemini: 'Charon' },
  selene: { es: 'es-ES-XimenaNeural', mx: 'es-MX-DaliaNeural', en: 'en-GB-SoniaNeural', rate: 0, pitch: 0, gemini: 'Despina' },
  draco: { es: 'es-ES-AlvaroNeural', mx: 'es-MX-JorgeNeural', en: 'en-GB-RyanNeural', rate: 0, pitch: 0, gemini: 'Algieba' },
  ximenahd: { es: 'es-ES-XimenaNeural', mx: 'es-MX-DaliaNeural', en: 'en-GB-SoniaNeural', rate: 0, pitch: 0, azure: { hd: 'es-es-Ximena:DragonHDLatestNeural', std: 'es-ES-XimenaMultilingualNeural' } },
  tristan: { es: 'es-ES-AlvaroNeural', mx: 'es-MX-JorgeNeural', en: 'en-GB-RyanNeural', rate: 0, pitch: 0, azure: { hd: 'es-es-Tristan:DragonHDLatestNeural', std: 'es-ES-TristanMultilingualNeural' } },
  isidora: { es: 'es-ES-ElviraNeural', mx: 'es-MX-DaliaNeural', en: 'en-GB-LibbyNeural', rate: 0, pitch: 0, azure: { std: 'es-ES-IsidoraMultilingualNeural' } },
  dario: { es: 'es-ES-AlvaroNeural', mx: 'es-MX-JorgeNeural', en: 'en-GB-RyanNeural', rate: 0, pitch: 0, azure: { std: 'es-ES-DarioNeural' } }
}

export type SpeakOptions = { voice: string; lang: string; speed: number; pitch: number }

const TIMEOUT = 15000

// ---------- Microsoft Edge neural voices ----------
// One connection per voice. The library multiplexes requests on a connection,
// so concurrent sentences can share it; we only make sure it is created once.
const clients = new Map<string, Promise<MsEdgeTTS>>()

function client(name: string) {
  let p = clients.get(name)
  if (!p) {
    p = (async () => {
      const t = new MsEdgeTTS()
      await t.setMetadata(name, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3)
      return t
    })()
    clients.set(name, p)
    p.catch(() => clients.delete(name))
  }
  return p
}

async function drop(name: string) {
  const p = clients.get(name)
  clients.delete(name)
  try { (await p)?.close() } catch { /* already closed */ }
}

const sign = (n: number) => (n >= 0 ? '+' : '') + Math.round(n)
// the library puts the text inside SSML as is
const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)

async function edgeSynth(name: string, text: string, rate: number, pitch: number) {
  const c = await client(name)
  const { audioStream } = c.toStream(escapeXml(text), { rate: sign(rate) + '%', pitch: sign(pitch) + 'Hz' })
  const chunks: Buffer[] = []
  let timedOut = false
  // the stream never ends if the socket dies mid-request; close the client so nothing is left writing to it
  const timer = setTimeout(() => { timedOut = true; audioStream.destroy(new Error('TTS timeout')); drop(name) }, TIMEOUT)
  try {
    for await (const chunk of audioStream) chunks.push(chunk as Buffer)
  } finally {
    clearTimeout(timer)
  }
  if (timedOut || !chunks.length) throw new Error('TTS sin audio')
  return Buffer.concat(chunks)
}

async function edge(name: string, text: string, rate: number, pitch: number) {
  try {
    return await edgeSynth(name, text, rate, pitch)
  } catch {
    // the websocket drops after idling; reconnect once
    await drop(name)
    return edgeSynth(name, text, rate, pitch)
  }
}

// ---------- Gemini TTS (premium voices) ----------
let geminiPausedUntil = 0
let onQuota: () => void = () => {}

/** Called when the premium voices run out of free quota (the app tells the user). */
export function onGeminiQuota(fn: () => void) { onQuota = fn }

export const geminiVoicesPaused = () => Date.now() < geminiPausedUntil

function wav(pcm: Buffer, rate = 24000) {
  const h = Buffer.alloc(44)
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12)
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24)
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([h, pcm])
}

// Accent and tone go in the system instruction: anything placed in the text itself gets read aloud
const ACCENT: Record<string, string> = {
  'es-ES': 'Habla en español de España, con acento castellano natural y un tono cálido y conversacional.',
  'es-MX': 'Habla en español de México, con un tono natural, cálido y conversacional.',
  en: 'Speak British English with a natural, warm and conversational tone.'
}
let noSystemInstruction = false

async function gemini(key: string, voiceName: string, text: string, lang: string): Promise<Buffer> {
  const direction = ACCENT[lang] || ACCENT[lang.slice(0, 2)] || ACCENT['es-ES']
  const call = (withStyle: boolean) => fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent', {
    method: 'POST',
    signal: AbortSignal.timeout(20000),
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      ...(withStyle ? { systemInstruction: { parts: [{ text: direction }] } } : {}),
      contents: [{ parts: [{ text }] }],
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } }
    })
  })
  let res = await call(!noSystemInstruction)
  // if the model does not take a system instruction, the plain text still sounds right
  if (res.status === 400 && !noSystemInstruction) { noSystemInstruction = true; res = await call(false) }
  if (res.status === 429) {
    // free quota used up: plain voices for a while
    geminiPausedUntil = Date.now() + 60 * 60e3
    onQuota()
    throw new Error('Gemini TTS sin cupo')
  }
  if (!res.ok) throw new Error(`Gemini TTS HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const part = (await res.json()).candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)
  if (!part) throw new Error('Gemini TTS sin audio')
  const data = Buffer.from(part.inlineData.data, 'base64')
  const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType || '')?.[1]) || 24000
  return data.subarray(0, 4).toString() === 'RIFF' ? data : wav(data, rate)
}

export const isPremium = (voice: string) => !!(Object.hasOwn(VOICES, voice) && (VOICES[voice].gemini || VOICES[voice].azure))

/** Opens the Microsoft connection of every voice ahead of time (first samples play fast). */
export function warmVoices(lang: string) {
  const names = new Set(Object.values(VOICES).map(v => lang.startsWith('en') ? v.en : lang === 'es-MX' ? v.mx : v.es))
  names.forEach(n => client(n).catch(() => {}))
}

// ---------- Azure Speech ----------
let azurePausedUntil = 0
let onAzureQuota: () => void = () => {}
export function onAzureQuotaOut(fn: () => void) { onAzureQuota = fn }
export const azureVoicesPaused = () => Date.now() < azurePausedUntil
let hdBlocked = false // the free plan may not include HD voices: then the regular version is used

async function azure(key: string, region: string, voice: string, text: string, lang: string, rate: number) {
  const r = (rate >= 0 ? '+' : '') + Math.round(rate) + '%'
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}"><voice name="${voice}">${voice.includes('DragonHD') ? escapeXml(text) : `<prosody rate="${r}">${escapeXml(text)}</prosody>`}</voice></speak>`
  return fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
    headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3', 'User-Agent': 'NEXUS' },
    body: ssml
  })
}

async function azureSpeak(v: NonNullable<Voice['azure']>, text: string, o: SpeakOptions) {
  const key = getKey('Azure'), region = loadSettings().azureRegion || 'westeurope'
  const lang = o.lang.startsWith('en') ? 'en-GB' : o.lang
  const rate = (num(o.speed, 1) - 1) * 100
  let res = v.hd && !hdBlocked ? await azure(key, region, v.hd, text, lang, rate) : null
  if (res && !res.ok && res.status !== 429 && res.status !== 401) { hdBlocked = true; res = null }
  if (!res) res = await azure(key, region, v.std, text, lang, rate)
  if (res.status === 429 || res.status === 403) {
    azurePausedUntil = Date.now() + 60 * 60e3
    onAzureQuota()
    throw new Error('Azure sin cupo')
  }
  if (!res.ok) throw new Error(`Azure HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

export async function speak(text: string, o: SpeakOptions): Promise<Buffer> {
  return (await speakDetailed(text, o)).audio
}

/** Also tells whether the premium engine (Gemini/Azure) produced the audio or a fallback did. */
export async function speakDetailed(text: string, o: SpeakOptions): Promise<{ audio: Buffer; premium: boolean }> {
  const v = Object.hasOwn(VOICES, o.voice) ? VOICES[o.voice] : VOICES.lyra
  if (v.azure && getKey('Azure') && Date.now() > azurePausedUntil) {
    try { return { audio: await azureSpeak(v.azure, text, o), premium: true } } catch (e: any) { console.warn('[tts] Azure:', e?.message) }
  }
  const key = v.gemini && loadSettings().geminiTts ? getKey('Gemini') : ''
  if (v.gemini && key && Date.now() > geminiPausedUntil) {
    try { return { audio: await gemini(key, v.gemini, text, o.lang), premium: true } } catch (e: any) { console.warn('[tts] Gemini:', e?.message) /* fall back to the Microsoft voice */ }
  }
  const name = o.lang.startsWith('en') ? v.en : o.lang === 'es-MX' ? v.mx : v.es
  return { audio: await edge(name, text, v.rate + (num(o.speed, 1) - 1) * 100, v.pitch + num(o.pitch, 0) * 2), premium: false }
}
