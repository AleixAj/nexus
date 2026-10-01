// Meaning vectors for searching the memory: local with Ollama (nomic-embed-text) if installed,
// otherwise Gemini's free embeddings if the user turned it on. Neither: null (word search only).
import { getKey, loadSettings } from '../settings'

const DIMS = 256

async function ollamaEmbed(text: string) {
  try {
    const res = await fetch('http://localhost:11434/api/embed', { method: 'POST', signal: AbortSignal.timeout(8000), body: JSON.stringify({ model: 'nomic-embed-text', input: text }) })
    if (!res.ok) return null
    return ((await res.json()).embeddings?.[0] as number[] | undefined)?.slice(0, DIMS) || null
  } catch { return null }
}

async function geminiEmbed(text: string) {
  const key = loadSettings().geminiMemory ? getKey('Gemini') : ''
  if (!key) return null
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent', {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ content: { parts: [{ text: text.slice(0, 6000) }] }, outputDimensionality: DIMS })
  })
  if (!res.ok) return null
  return ((await res.json()).embedding?.values as number[] | undefined) || null
}

export async function embed(text: string): Promise<number[] | null> {
  return (await ollamaEmbed(text)) || (await geminiEmbed(text))
}
