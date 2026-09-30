import { PROVIDERS, getKey, loadSettings } from './settings'
import { TOOL_DEFS, runTool } from './tools'
import { worldSummary } from './world'

type Msg = { role: string; content?: string | null; tool_calls?: any[]; tool_call_id?: string }

const PERSONAS: Record<string, string> = {
  butler: 'Hablas como un mayordomo británico elegante, al estilo de J.A.R.V.I.S.: educado, sereno, con un toque de ironía fina. Tratas de usted.',
  direct: 'Eres un copiloto directo y eficiente. Frases cortas, sin adornos.',
  sarcastic: 'Eres sarcástico y algo burlón, pero siempre acabas ayudando. Tratas de usted con retintín.'
}

const MAX_ROUNDS = 4
const MAX_HISTORY = 24

function systemPrompt() {
  const s = loadSettings()
  const now = new Date().toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })
  return [
    'Eres NEXUS, el asistente personal de IA que vive en el ordenador del usuario (Windows).',
    PERSONAS[s.persona] || PERSONAS.butler,
    `Llama al usuario «${s.userName}».`,
    ['lyra', 'vega', 'nova'].includes(s.voice) ? 'Tu voz es femenina: habla de ti misma en femenino (encantada, lista…).' : 'Tu voz es masculina: habla de ti mismo en masculino.',
    s.lang.startsWith('en') ? 'Answer in British English, whatever language the user writes in.' : s.lang === 'es-MX' ? 'Responde en español de México.' : 'Responde en español de España.',
    s.formal >= 60 ? 'Registro formal.' : s.formal <= 30 ? 'Registro informal y cercano: tutea al usuario.' : 'Registro neutro.',
    s.warmth >= 60 ? 'Tono cálido y amable.' : s.warmth <= 30 ? 'Tono seco y profesional.' : '',
    'Tus respuestas se leen en voz alta: sé breve (1-3 frases), natural y sin markdown, listas, emojis ni URLs largas.',
    'Si el usuario pide abrir algo, poner música o cambiar el volumen, usa las herramientas en vez de explicar cómo hacerlo.',
    'Tras usar una herramienta, confirma en una frase corta.',
    `Fecha y hora actual: ${now}.`,
    worldSummary()
  ].filter(Boolean).join('\n')
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

// Keep the last turns, always starting at a user message so no tool result is orphaned
function trim(h: Msg[]) {
  let out = h.slice(-MAX_HISTORY)
  const first = out.findIndex(m => m.role === 'user')
  out = first < 0 ? [] : out.slice(first)
  return out
}

const aborted = () => Object.assign(new Error('Aborted'), { name: 'AbortError' })

type Handlers = { onDelta: (t: string) => void; onAction: (label: string) => void }

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
  const name = Object.hasOwn(PROVIDERS, s.provider) ? s.provider : 'Groq'
  const p = PROVIDERS[name]
  const key = getKey(name)
  if (p.needsKey && !key) throw new Error('NO_KEY')

  // work on a copy; history only changes if the whole turn succeeds
  const turn: Msg[] = [...history, { role: 'user', content: text }]
  let full = ''

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const last = round === MAX_ROUNDS - 1
    let res: Response
    try {
      res = await fetch(p.url + '/chat/completions', {
        method: 'POST',
        signal: AbortSignal.any([ctl.signal, AbortSignal.timeout(45000)]),
        headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
        body: JSON.stringify({
          model: s.model,
          stream: true,
          temperature: 0.6,
          // on the last round force a spoken answer instead of more tool calls
          ...(last ? {} : { tools: TOOL_DEFS }),
          messages: [{ role: 'system', content: systemPrompt() }, ...turn]
        })
      })
    } catch (err: any) {
      if (ctl.signal.aborted) throw aborted()
      if (err.name === 'TimeoutError') throw new Error('El modelo tarda demasiado en responder')
      const code = err.cause?.code
      if (code === 'ECONNREFUSED' && name === 'Ollama') throw new Error('Ollama no está arrancado')
      throw new Error(code === 'ENOTFOUND' ? 'Sin conexión a Internet' : 'No se pudo conectar con el modelo')
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
      let args = {}
      try { args = JSON.parse(call.function.arguments || '{}') } catch { /* keep empty */ }
      let r: { result: string; label: string }
      try {
        r = await runTool(call.function.name, args)
      } catch (e: any) {
        r = { result: 'Error: ' + (e?.message || e), label: 'No se pudo completar la acción' }
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

export async function transcribe(audio: ArrayBuffer, lang: string): Promise<string> {
  const key = getKey('Groq')
  if (!key) throw new Error('NO_KEY')
  const form = new FormData()
  form.append('file', new Blob([audio], { type: 'audio/webm' }), 'voz.webm')
  form.append('model', 'whisper-large-v3-turbo')
  form.append('language', lang.slice(0, 2))
  form.append('response_format', 'json')
  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Bearer ${key}` },
    body: form
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const text = ((await res.json()).text || '').trim()
  // Whisper tends to invent these on silence or noise
  return /^(gracias\.?|subtítulos .*|\.+)$/i.test(text) ? '' : text
}
