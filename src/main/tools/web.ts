// Internet: search (Gemini with Google, Groq's browser or DuckDuckGo), read a page, Wikipedia.
import { getKey, loadSettings } from '../settings'
import { clip, htmlToText, short } from '../lib/text'
import { str, type Tool } from './define'

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36'

export type Hit = { title: string; url: string; snippet: string }

// Keyless search: DuckDuckGo's HTML results (titles, links and snippets).
export async function ddgResults(query: string, max = 8, signal?: AbortSignal): Promise<Hit[]> {
  const res = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST',
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': BROWSER_UA },
    body: new URLSearchParams({ q: query, kl: 'es-es' })
  })
  if (!res.ok) throw new Error(`La búsqueda no ha respondido (HTTP ${res.status})`)
  const html = await res.text()
  const out: Hit[] = []
  const re = /class="result__a" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
  let m
  while ((m = re.exec(html)) && out.length < max) {
    let url = m[1]
    const redirect = url.match(/[?&]uddg=([^&]+)/)
    if (redirect) url = decodeURIComponent(redirect[1])
    if (url.startsWith('//')) url = 'https:' + url
    if (/duckduckgo\.com\/y\.js|ad_domain/.test(url)) continue // ads
    out.push({ title: htmlToText(m[2]), url, snippet: htmlToText(m[3]) })
  }
  return out
}

// The model then opens the most useful ones with read_webpage.
async function ddgSearch(query: string) {
  let hits: Hit[]
  try { hits = await ddgResults(query) } catch (e: any) { return e.message }
  return hits.length
    ? `Resultados para «${query}» (abre con read_webpage los que necesites para dar datos concretos):\n\n` + hits.map((h, i) => `${i + 1}. ${h.title}\n   ${h.url}\n   ${h.snippet}`).join('\n')
    : `Sin resultados para «${query}».`
}

const searchPrompt = (query: string) =>
  `Busca en internet y responde en español con datos concretos y fechas. Al final lista 2-4 fuentes (título y URL). Fecha de hoy: ${new Date().toLocaleDateString('es-ES')}.\n\nConsulta: ${query}`

// Gemini with Grounding with Google Search (only if the user turned it on)
async function geminiSearch(key: string, query: string) {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(40000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'gemini-3.5-flash-lite', reasoning_effort: 'low', messages: [{ role: 'user', content: searchPrompt(query) }], tools: [{ google_search: {} }] })
  })
  if (!res.ok) return null
  const content = (await res.json()).choices?.[0]?.message?.content
  return content ? clip(content) : null
}

// Groq's built-in browser search (gpt-oss models)
async function groqSearch(key: string, query: string) {
  const call = (model: string) => fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(45000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, reasoning_effort: 'low', max_completion_tokens: 1400, tools: [{ type: 'browser_search' }], tool_choice: 'required', messages: [{ role: 'user', content: searchPrompt(query) }] })
  })
  let res = await call('openai/gpt-oss-20b')
  if (res.status === 429) res = await call('openai/gpt-oss-120b') // separate free quota
  if (!res.ok) return null
  const msg = (await res.json()).choices?.[0]?.message || {}
  const sources = (msg.executed_tools || []).flatMap((t: any) => (t.search_results?.results || []).map((r: any) => `- ${r.title}: ${r.url}`)).slice(0, 5)
  return clip((msg.content || 'Sin resultados.') + (sources.length ? '\n\nFuentes:\n' + sources.join('\n') : ''))
}

async function webSearch(query: string) {
  const gemini = loadSettings().geminiSearch ? getKey('Gemini') : ''
  if (gemini) {
    try { const r = await geminiSearch(gemini, query); if (r) return r } catch { /* try the next one */ }
  }
  const groq = getKey('Groq')
  if (groq) {
    try { const r = await groqSearch(groq, query); if (r) return r } catch { /* DuckDuckGo below */ }
  }
  return ddgSearch(query)
}

export async function readWebpage(url: string) {
  let u: URL
  try { u = new URL(url) } catch { return 'URL no válida' }
  if (!['http:', 'https:'].includes(u.protocol)) return 'Solo páginas http(s)'
  const res = await fetch(u, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': BROWSER_UA + ' NEXUS', 'Accept-Language': 'es-ES,es;q=0.9,en;q=0.6' } })
  if (!res.ok) return `No se pudo abrir (HTTP ${res.status})`
  const type = res.headers.get('content-type') || ''
  if (!/text|json|xml/.test(type)) return `No es una página de texto (${type})`
  const body = await res.text()
  const title = body.match(/<title[^>]*>([^<]*)/i)?.[1]?.trim()
  return clip((title ? `# ${title}\n` : '') + (type.includes('html') ? htmlToText(body) : body), 7000)
}

async function wikipedia(topic: string) {
  const s = await fetch(`https://es.wikipedia.org/w/api.php?action=opensearch&limit=1&format=json&search=${encodeURIComponent(topic)}`, { signal: AbortSignal.timeout(8000) }).then(r => r.json())
  const title = s?.[1]?.[0]
  if (!title) return 'No encuentro ese artículo.'
  const j = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'NEXUS desktop assistant' } }).then(r => r.json())
  return `${j.title}: ${j.extract || 'sin resumen'}\n${j.content_urls?.desktop?.page || ''}`
}

export const webTools: Tool[] = [
  {
    name: 'web_search', readOnly: true,
    group: 'web',
    description: 'Busca en internet datos actuales (noticias, precios, resultados…). Devuelve resumen y fuentes.',
    params: { query: str('Consulta concreta') },
    required: ['query'],
    progress: a => 'Buscando · ' + short(a.query),
    run: async a => ({ result: await webSearch(String(a.query || '')), label: 'Búsqueda web · ' + short(a.query, 50) })
  },
  {
    name: 'read_webpage', readOnly: true,
    group: 'web',
    description: 'Lee el texto de una web.',
    params: { url: str('URL') },
    required: ['url'],
    progress: a => { try { return 'Leyendo · ' + new URL(a.url).hostname.replace('www.', '') } catch { return 'Leyendo página' } },
    run: async a => ({ result: await readWebpage(String(a.url || '')), label: 'Página leída' })
  },
  {
    name: 'wikipedia', readOnly: true,
    group: 'web',
    description: 'Resumen de Wikipedia.',
    params: { topic: str('Tema') },
    required: ['topic'],
    progress: a => 'Wikipedia · ' + short(a.topic),
    run: async a => ({ result: await wikipedia(String(a.topic || '')), label: 'Wikipedia · ' + short(a.topic) })
  }
]
