import { PROVIDERS, getKey, loadSettings } from './settings'
import { TOOL_DEFS, runTool } from './tools'
import { AGENT_TOOLS, describe, needsConfirm, progressLabel, runAgentTool, userFolders } from './agent'
import { worldSummary } from './world'

type Msg = { role: string; content?: string | null; tool_calls?: any[]; tool_call_id?: string }

const PERSONAS: Record<string, string> = {
  butler: 'Hablas como un mayordomo británico elegante, al estilo de J.A.R.V.I.S.: educado, sereno, con un toque de ironía fina.',
  direct: 'Eres un copiloto directo y eficiente. Frases cortas, sin adornos.',
  sarcastic: 'Eres sarcástico y algo burlón, pero siempre acabas ayudando.'
}

const MAX_ROUNDS = 8
const MAX_HISTORY = 16
// tool results kept in the conversation after the turn ends (the free tier counts every token)
const KEEP_TOOL_CHARS = 600

function systemPrompt() {
  const s = loadSettings()
  const now = new Date().toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })
  return [
    'Eres NEXUS, un agente de IA que vive en el ordenador Windows del usuario y le ayuda con lo que necesite.',
    PERSONAS[s.persona] || PERSONAS.butler,
    `Llama al usuario «${s.userName}».`,
    ['lyra', 'vega', 'nova', 'aura'].includes(s.voice) ? 'Tu voz es femenina: habla de ti misma en femenino (encantada, lista…).' : 'Tu voz es masculina: habla de ti mismo en masculino.',
    s.lang.startsWith('en') ? 'Answer in British English, whatever language the user writes in.' : s.lang === 'es-MX' ? 'Responde en español de México.' : 'Responde en español de España.',
    s.formal >= 50 ? 'Trata al usuario de usted.' : 'Tutea al usuario, con un registro cercano.',
    s.warmth >= 60 ? 'Tono cálido y amable.' : s.warmth <= 30 ? 'Tono seco y profesional.' : '',
    '',
    'CÓMO TRABAJAS',
    '- Usa las herramientas en vez de explicar cómo hacer las cosas. Encadena varias si hace falta (buscar, leer, analizar) antes de responder.',
    s.agentWeb ? '- Para actualidad, precios, resultados, noticias o cualquier dato que pueda haber cambiado o que no sepas con seguridad, usa web_search. No inventes datos: si no lo encuentras, dilo.' : '- No tienes acceso a internet: si te preguntan por actualidad, avisa de que tu información puede estar desfasada.',
    s.agentFiles ? `- Carpetas del usuario: ${userFolders()}. Antes de modificar un archivo, léelo.` : '- No tienes permiso para mirar los archivos del usuario.',
    s.agentWrite || s.agentShell ? '- Las acciones que modifican el equipo piden confirmación al usuario; si la deniega, no insistas y ofrece otra opción. Nunca borres nada que no te hayan pedido borrar.' : '',
    '',
    'CÓMO RESPONDES',
    '- Tus respuestas se leen en voz alta y se muestran en un chat.',
    '- Para charla y respuestas simples: 1-3 frases naturales, sin formato.',
    '- Para respuestas con datos (listas, análisis, resultados de búsqueda): empieza con 1-2 frases que resuman lo importante (eso es lo que se lee en voz alta), deja una línea en blanco y después el detalle en markdown sencillo (listas con "-", **negritas**). Si buscaste en internet, termina con las fuentes.',
    '- Sin emojis. No leas URLs largas en la parte hablada.',
    '',
    `Fecha y hora actual: ${now}.`,
    worldSummary()
  ].filter(s => s !== undefined).join('\n').replace(/\n{3,}/g, '\n\n')
}

function toolsFor() {
  const s = loadSettings()
  return [
    ...TOOL_DEFS.filter(t => t.function.name !== 'system_status'),
    ...AGENT_TOOLS.system,
    ...(s.agentWeb ? AGENT_TOOLS.web : []),
    ...(s.agentFiles ? AGENT_TOOLS.files : []),
    ...(s.agentWrite ? AGENT_TOOLS.write : []),
    ...(s.agentShell ? AGENT_TOOLS.shell : [])
  ]
}

let history: Msg[] = []
let current: AbortController | null = null
let chain: Promise<unknown> = Promise.resolve()

export function resetHistory() {
  history = []
}

export function abort() {
  current?.abort()
}

// Keep the last turns, always starting at a user message so no tool result is orphaned,
// and shorten old tool results so they do not eat the free token budget.
function trim(h: Msg[]) {
  let out = h.slice(-MAX_HISTORY)
  const first = out.findIndex(m => m.role === 'user')
  out = first < 0 ? [] : out.slice(first)
  return out.map(m => m.role === 'tool' && m.content && m.content.length > KEEP_TOOL_CHARS ? { ...m, content: m.content.slice(0, KEEP_TOOL_CHARS) + ' …' } : m)
}

const aborted = () => Object.assign(new Error('Aborted'), { name: 'AbortError' })
const sleep = (ms: number, signal: AbortSignal) => new Promise<void>((res, rej) => {
  const t = setTimeout(res, ms)
  signal.addEventListener('abort', () => { clearTimeout(t); rej(aborted()) }, { once: true })
})

export type Handlers = {
  onDelta: (t: string) => void
  onAction: (label: string) => void
  onProgress: (label: string) => void
  confirm: (req: { title: string; detail: string }) => Promise<boolean>
}

/** Asks one question at a time: a new question cancels the previous one first. */
export function ask(text: string, h: Handlers): Promise<string> {
  current?.abort()
  const ctl = new AbortController()
  current = ctl
  const run = chain.then(() => askTurn(text, h, ctl))
  chain = run.catch(() => {})
  return run
}

async function askTurn(text: string, h: Handlers, ctl: AbortController): Promise<string> {
  if (ctl.signal.aborted) throw aborted()
  const s = loadSettings()
  let name = Object.hasOwn(PROVIDERS, s.provider) ? s.provider : 'Gemini'
  let p = PROVIDERS[name]
  let key = getKey(name)
  const tried = new Set([name])
  if (p.needsKey && !key) throw new Error('NO_KEY')

  // work on a copy; history only changes if the whole turn succeeds
  const turn: Msg[] = [...history, { role: 'user', content: text }]
  let full = ''
  let model = s.model

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const last = round === MAX_ROUNDS - 1
    const body = () => JSON.stringify({
      model,
      stream: true,
      temperature: 0.5,
      max_tokens: 2000,
      // keep thinking short: faster answers and fewer free-tier tokens
      ...(/gpt-oss|gemini/.test(model) ? { reasoning_effort: 'low' } : {}),
      // on the last round force an answer instead of more tool calls
      ...(last ? {} : { tools: toolsFor() }),
      messages: [{ role: 'system', content: systemPrompt() }, ...turn]
    })

    let res: Response | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        res = await fetch(p.url + '/chat/completions', {
          method: 'POST',
          signal: AbortSignal.any([ctl.signal, AbortSignal.timeout(60000)]),
          headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
          body: body()
        })
      } catch (err: any) {
        if (ctl.signal.aborted) throw aborted()
        if (err.name === 'TimeoutError') throw new Error('El modelo tarda demasiado en responder')
        const code = err.cause?.code
        if (code === 'ECONNREFUSED' && name === 'Ollama') throw new Error('Ollama no está arrancado')
        throw new Error(code === 'ENOTFOUND' ? 'Sin conexión a Internet' : 'No se pudo conectar con el modelo')
      }
      if (res.status !== 429) break
      // free tier: wait if it is short, otherwise switch to the smaller model (separate quota)
      const wait = Math.min(30, Number(res.headers.get('retry-after')) || 8)
      const fallback = PROVIDERS[name].models.find(m => m !== model && /20b|8b|mini|lite/i.test(m))
      if (fallback && (wait > 12 || attempt > 0)) {
        model = fallback
        h.onProgress('Límite gratuito · uso el modelo rápido')
      } else {
        h.onProgress(`Límite gratuito · espero ${wait} s`)
        await sleep(wait * 1000, ctl.signal)
      }
    }
    if (!res) throw new Error('No se pudo conectar con el modelo')
    if (res.status === 429) {
      // this free tier is used up: continue with another service the user has a key for
      const alt = ['Gemini', 'Groq', 'Cerebras'].find(n => !tried.has(n) && getKey(n))
      if (!alt) throw new Error('Se ha agotado el límite gratuito por ahora; pruebe en un rato')
      tried.add(alt)
      name = alt; p = PROVIDERS[alt]; key = getKey(alt); model = p.models[0]
      h.onProgress('Cupo agotado · sigo con ' + alt)
      round--
      continue
    }
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)

    const { content, toolCalls } = await readStream(res.body, h.onDelta)
    full += content
    if (!toolCalls.length) {
      turn.push({ role: 'assistant', content })
      break
    }
    turn.push({ role: 'assistant', content: content || null, tool_calls: toolCalls })

    for (const call of toolCalls) {
      if (ctl.signal.aborted) throw aborted()
      let args: any = {}
      try { args = JSON.parse(call.function.arguments || '{}') } catch { /* keep empty */ }
      const tool = call.function.name
      let r: { result: string; label: string } | null = null
      try {
        if (needsConfirm.has(tool)) {
          const ok = await h.confirm(describe(tool, args))
          if (ctl.signal.aborted) throw aborted()
          if (!ok) r = { result: 'El usuario ha denegado el permiso para esta acción.', label: 'Acción denegada' }
        }
        if (!r) {
          const label = progressLabel(tool, args)
          if (label) h.onProgress(label)
          r = (await runAgentTool(tool, args)) || (await runTool(tool, args))
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') throw e
        const msg = e?.code === 'ENOENT' ? 'No existe esa ruta' : e?.code === 'EPERM' || e?.code === 'EACCES' ? 'Sin permiso de Windows para esa ruta' : e?.message || String(e)
        r = { result: 'Error: ' + msg, label: 'No se pudo completar · ' + msg.slice(0, 40) }
      }
      h.onAction(r.label)
      turn.push({ role: 'tool', tool_call_id: call.id, content: r.result })
    }
  }

  if (ctl.signal.aborted) throw aborted()
  history = trim(turn)
  return full
}

// Parses an OpenAI-style SSE stream, forwarding text and collecting tool calls
async function readStream(body: ReadableStream<Uint8Array>, onDelta: (t: string) => void) {
  const reader = body.getReader()
  const dec = new TextDecoder()
  let buf = '', content = ''
  const calls: any[] = []

  const handle = (line: string) => {
    if (!line.startsWith('data:')) return
    const data = line.slice(5).trim()
    if (!data || data === '[DONE]') return
    let json
    try { json = JSON.parse(data) } catch { return }
    if (json.error) throw new Error(json.error.message || 'Error del modelo')
    const delta = json.choices?.[0]?.delta
    if (!delta) return
    if (delta.content) { content += delta.content; onDelta(delta.content) }
    for (const tc of delta.tool_calls || []) {
      const i = tc.index ?? calls.length
      const c = (calls[i] ??= { id: '', type: 'function', function: { name: '', arguments: '' } })
      if (tc.id) c.id = tc.id
      if (tc.function?.name) c.function.name += tc.function.name
      if (tc.function?.arguments) c.function.arguments += tc.function.arguments
    }
  }

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() || ''
    lines.forEach(handle)
  }
  buf += dec.decode()
  if (buf) handle(buf)

  const toolCalls = calls.filter(Boolean).map((c, i) => ({ ...c, id: c.id || `call_${i}` }))
  return { content, toolCalls }
}

/** Speech to text. `audio` is a 16 kHz mono WAV. Groq Whisper if there is a Groq key, otherwise Gemini. */
export async function transcribe(audio: ArrayBuffer, lang: string): Promise<string> {
  const groq = getKey('Groq'), gemini = getKey('Gemini')
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
