// Speech to text: Groq Whisper if there is a Groq key, otherwise Gemini (if the user allowed it).
import { PROVIDERS, getKey, loadSettings } from './settings'

/** `audio` is a 16 kHz mono WAV. */
export async function transcribe(audio: ArrayBuffer, lang: string): Promise<string> {
  const groq = getKey('Groq'), gemini = loadSettings().geminiStt ? getKey('Gemini') : ''
  let text = ''
  if (groq) {
    const form = new FormData()
    form.append('file', new Blob([audio], { type: 'audio/wav' }), 'voz.wav')
    form.append('model', 'whisper-large-v3-turbo')
    form.append('language', lang.slice(0, 2))
    form.append('response_format', 'json')
    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${groq}` },
      body: form
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
    text = ((await res.json()).text || '').trim()
  } else if (gemini) {
    const res = await fetch(PROVIDERS.Gemini.url + '/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(25000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${gemini}` },
      body: JSON.stringify({
        model: 'gemini-3.5-flash-lite',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: `Transcribe literalmente lo que se dice en este audio (idioma: ${lang}). Devuelve solo el texto, sin comillas ni comentarios. Si no se entiende nada, devuelve una cadena vacía.` },
            { type: 'input_audio', input_audio: { data: Buffer.from(audio).toString('base64'), format: 'wav' } }
          ]
        }]
      })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
    text = ((await res.json()).choices?.[0]?.message?.content || '').trim().replace(/^["«]|["»]$/g, '')
  } else {
    throw new Error('NO_KEY')
  }
  // Whisper tends to invent these on silence or noise
  return /^(gracias\.?|subtítulos .*|\.+)$/i.test(text) ? '' : text
}
