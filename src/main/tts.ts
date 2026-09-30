import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import { getKey } from './settings'

// Voices of the app mapped to Microsoft neural voices (free, no key).
// The "Multilingual" ones are the most natural (the voices of Copilot); they speak
// Spanish with a neutral accent. `gemini` marks the premium voices (Gemini TTS),
// which fall back to the Microsoft voice when there is no Gemini key or its free quota runs out.
type Voice = { es: string; mx: string; en: string; rate: number; pitch: number; gemini?: string }

const VOICES: Record<string, Voice> = {
  lyra: { es: 'es-ES-XimenaNeural', mx: 'es-MX-DaliaNeural', en: 'en-GB-SoniaNeural', rate: 0, pitch: 0 },
  vega: { es: 'en-US-EmmaMultilingualNeural', mx: 'en-US-EmmaMultilingualNeural', en: 'en-US-EmmaMultilingualNeural', rate: 0, pitch: 0 },
  nova: { es: 'es-ES-ElviraNeural', mx: 'es-MX-DaliaNeural', en: 'en-GB-LibbyNeural', rate: 0, pitch: 0 },
  aura: { es: 'en-US-AvaMultilingualNeural', mx: 'en-US-AvaMultilingualNeural', en: 'en-US-AvaMultilingualNeural', rate: 0, pitch: 0, gemini: 'Sulafat' },
  orion: { es: 'es-ES-AlvaroNeural', mx: 'es-MX-JorgeNeural', en: 'en-GB-RyanNeural', rate: -4, pitch: -6 },
  kairo: { es: 'en-US-AndrewMultilingualNeural', mx: 'en-US-AndrewMultilingualNeural', en: 'en-US-AndrewMultilingualNeural', rate: 0, pitch: 0 },
  atlas: { es: 'en-US-BrianMultilingualNeural', mx: 'en-US-BrianMultilingualNeural', en: 'en-US-BrianMultilingualNeural', rate: 0, pitch: 0 },
  zenit: { es: 'en-US-AndrewMultilingualNeural', mx: 'en-US-AndrewMultilingualNeural', en: 'en-US-AndrewMultilingualNeural', rate: 0, pitch: 0, gemini: 'Charon' }
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

function wav(pcm: Buffer, rate = 24000) {
  const h = Buffer.alloc(44)
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12)
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24)
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([h, pcm])
}

async function gemini(key: string, voiceName: string, text: string): Promise<Buffer> {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent', {
    method: 'POST',
    signal: AbortSignal.timeout(20000),
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } }
    })
  })
  if (res.status === 429) {
    // free quota used up: plain voices for a while
    geminiPausedUntil = Date.now() + 60 * 60e3
    throw new Error('Gemini TTS sin cupo')
  }
  if (!res.ok) throw new Error(`Gemini TTS HTTP ${res.status}`)
  const part = (await res.json()).candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)
  if (!part) throw new Error('Gemini TTS sin audio')
  const data = Buffer.from(part.inlineData.data, 'base64')
  const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType || '')?.[1]) || 24000
  return data.subarray(0, 4).toString() === 'RIFF' ? data : wav(data, rate)
}

export async function speak(text: string, o: SpeakOptions): Promise<Buffer> {
  const v = Object.hasOwn(VOICES, o.voice) ? VOICES[o.voice] : VOICES.lyra
  const key = v.gemini ? getKey('Gemini') : ''
  if (v.gemini && key && Date.now() > geminiPausedUntil) {
    try { return await gemini(key, v.gemini, text) } catch { /* fall back to the Microsoft voice */ }
  }
  const name = o.lang.startsWith('en') ? v.en : o.lang === 'es-MX' ? v.mx : v.es
  return edge(name, text, v.rate + (num(o.speed, 1) - 1) * 100, v.pitch + num(o.pitch, 0) * 2)
}
