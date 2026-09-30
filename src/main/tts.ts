import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'

// Design voices mapped to Microsoft neural voices (free, no key)
const VOICES: Record<string, { es: string; mx: string; en: string; rate: number; pitch: number }> = {
  lyra: { es: 'es-ES-ElviraNeural', mx: 'es-MX-DaliaNeural', en: 'en-GB-SoniaNeural', rate: 0, pitch: 0 },
  vega: { es: 'es-ES-XimenaNeural', mx: 'es-MX-DaliaNeural', en: 'en-GB-LibbyNeural', rate: 6, pitch: 2 },
  orion: { es: 'es-ES-AlvaroNeural', mx: 'es-MX-JorgeNeural', en: 'en-GB-RyanNeural', rate: -4, pitch: -6 },
  atlas: { es: 'es-MX-JorgeNeural', mx: 'es-MX-JorgeNeural', en: 'en-GB-ThomasNeural', rate: -8, pitch: -12 }
}

export type SpeakOptions = { voice: string; lang: string; speed: number; pitch: number }

const TIMEOUT = 15000

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

async function synth(name: string, text: string, rate: number, pitch: number) {
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

export async function speak(text: string, o: SpeakOptions): Promise<Buffer> {
  const v = Object.hasOwn(VOICES, o.voice) ? VOICES[o.voice] : VOICES.lyra
  const name = o.lang.startsWith('en') ? v.en : o.lang === 'es-MX' ? v.mx : v.es
  const rate = v.rate + (num(o.speed, 1) - 1) * 100
  const pitch = v.pitch + num(o.pitch, 0) * 2

  try {
    return await synth(name, text, rate, pitch)
  } catch {
    // the websocket drops after idling; reconnect once
    await drop(name)
    return synth(name, text, rate, pitch)
  }
}
