// Seeing: a screenshot of the PC or an image file, described by a model that understands images.
// Local first (Ollama with a vision model, if installed), then Gemini if the user allowed it.
// Groq and Cerebras have no free vision models.
import { BrowserWindow, desktopCapturer, nativeImage, screen } from 'electron'
import { readFile } from 'fs/promises'
import { getKey, loadSettings, PROVIDERS } from './settings'

const VISION_OLLAMA = /llava|vision|vl|gemma3|minicpm-v|moondream/i

async function ollamaVisionModel() {
  try {
    const j = await (await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(400) })).json()
    return ((j.models || []) as any[]).map(m => m.name).find(n => VISION_OLLAMA.test(n)) || ''
  } catch { return '' }
}

/** Why seeing is not possible right now ('' if it is). */
export async function visionUnavailable() {
  if (await ollamaVisionModel()) return ''
  if (!getKey('Gemini')) return 'Para ver imágenes o la pantalla necesito la clave gratuita de Gemini (Ajustes) u Ollama con un modelo de visión.'
  if (!loadSettings().geminiVision) return 'Ver imágenes está desactivado en Ajustes → Gemini.'
  return ''
}

/** Asks a vision model about an image (JPEG/PNG as base64). */
export async function describeImage(base64: string, mime: string, question: string) {
  const prompt = `${question || 'Describe qué se ve.'}\n\nResponde en español, concreto y útil. Si hay texto relevante (errores, cifras, nombres), cópialo tal cual.`
  const local = await ollamaVisionModel()
  const target = local
    ? { url: PROVIDERS.Ollama.url, key: '', model: local }
    : { url: PROVIDERS.Gemini.url, key: getKey('Gemini'), model: 'gemini-3.5-flash-lite' }
  const res = await fetch(target.url + '/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(60000),
    headers: { 'Content-Type': 'application/json', ...(target.key ? { Authorization: `Bearer ${target.key}` } : {}) },
    body: JSON.stringify({
      model: target.model,
      ...(local ? {} : { reasoning_effort: 'low' }),
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } }] }]
    })
  })
  if (!res.ok) throw new Error(res.status === 429 ? 'Cupo de Gemini agotado por hoy' : `El modelo de visión no ha respondido (HTTP ${res.status})`)
  return ((await res.json()).choices?.[0]?.message?.content || '').trim() || 'No he podido ver nada claro.'
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Screenshot of the main screen, without the NEXUS window in front (JPEG, base64). */
export async function screenshot() {
  const { width, height } = screen.getPrimaryDisplay().size
  // the NEXUS window would cover what the user wants to show: step aside for a moment
  const win = BrowserWindow.getAllWindows().find(w => w.isVisible() && w.isFocusable() && !w.isMinimized())
  if (win) { win.minimize(); await sleep(450) }
  try {
    const scale = Math.min(1, 1600 / width) // enough to read text, small enough for the free quota
    const [src] = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: Math.round(width * scale), height: Math.round(height * scale) } })
    if (!src) throw new Error('No he podido capturar la pantalla')
    return src.thumbnail.toJPEG(80).toString('base64')
  } finally {
    if (win) win.restore()
  }
}

/** An image file as base64 for the model, shrunk to JPEG when Electron can read it. */
export async function imageFile(path: string) {
  const data = await readFile(path)
  const img = nativeImage.createFromBuffer(data)
  if (!img.isEmpty()) {
    const { width } = img.getSize()
    return { base64: (width > 1600 ? img.resize({ width: 1600 }) : img).toJPEG(85).toString('base64'), mime: 'image/jpeg' }
  }
  // WEBP and GIF go as they are (the vision models read them)
  const mime = /\.webp$/i.test(path) ? 'image/webp' : /\.gif$/i.test(path) ? 'image/gif' : ''
  if (!mime || data.length > 15e6) throw new Error('No es una imagen que pueda abrir (usa JPG, PNG, WEBP o GIF)')
  return { base64: data.toString('base64'), mime }
}
