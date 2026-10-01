import { PROVIDERS, getKey, loadSettings } from './settings'
import { TOOL_DEFS, runTool } from './tools'
import { AGENT_TOOLS, describe, needsConfirm, progressLabel, runAgentTool, userFolders } from './agent'
import { worldSummary } from './world'
import { REMINDER_TOOLS, runReminderTool } from './reminders'
import { MEMORY_TOOLS, factsForPrompt, getMemory, logExchange, runMemoryTool } from './memory'

type Msg = { role: string; content?: string | null; tool_calls?: any[]; tool_call_id?: string }

const PERSONAS: Record<string, string> = {
  butler: 'Hablas como un mayordomo británico elegante, al estilo de J.A.R.V.I.S.: educado, sereno, con un toque de ironía fina.',
  direct: 'Eres un copiloto directo y eficiente. Frases cortas, sin adornos.',
  sarcastic: 'Eres sarcástico y algo burlón, pero siempre acabas ayudando.'
}

const MAX_ROUNDS = 8
// The free tiers count tokens per minute and per day, so every request is kept small:
// a short history, trimmed old results and a prompt prefix that never changes (cached = free on Groq)
const MAX_HISTORY = 10
const KEEP_TOOL_CHARS = 400
const KEEP_ANSWER_CHARS = 900
const MAX_ANSWER_TOKENS = 1200

function systemPrompt() {
  const s = loadSettings()
  return [
    'Eres NEXUS, un agente de IA que vive en el ordenador Windows del usuario y le ayuda con lo que necesite.',
    PERSONAS[s.persona] || PERSONAS.butler,
    `Llama al usuario «${s.userName}».`,
    ['lyra', 'vega', 'nova', 'aura', 'selene', 'ximenahd', 'isidora'].includes(s.voice) ? 'Tu voz es femenina: habla de ti misma en femenino (encantada, lista…).' : 'Tu voz es masculina: habla de ti mismo en masculino.',
    s.lang.startsWith('en') ? 'Answer in British English, whatever language the user writes in.' : s.lang === 'es-MX' ? 'Responde en español de México.' : 'Responde en español de España.',
    s.formal >= 50 ? 'Trata al usuario de usted.' : 'Tutea al usuario, con un registro cercano.',
    s.warmth >= 60 ? 'Tono cálido y amable.' : s.warmth <= 30 ? 'Tono seco y profesional.' : '',
    '',
    'CÓMO TRABAJAS',
    '- Usa herramientas en vez de explicar cómo hacer las cosas; encadénalas si hace falta. Solo úsalas si aportan algo: para charla, responde directamente.',
    s.agentWeb ? '- Actualidad, precios, resultados o datos que puedan haber cambiado: web_search. No inventes datos.' : '- Sin internet: avisa de que tu información puede estar desfasada.',
    s.agentFiles ? `- Carpetas del usuario: ${userFolders()}. Lee un archivo antes de modificarlo.` : '- No puedes ver los archivos del usuario.',
    s.agentWrite || s.agentShell ? '- Lo que modifica el equipo pide permiso al usuario; si lo deniega, no insistas. Nunca borres nada que no te pidan.' : '',
    '- Música: usa la herramienta spotify (app de escritorio), nunca la web de Spotify.',
    '- Recordatorios y alarmas: set_reminder (la hora actual está en el contexto). Confirma la hora en una frase.',
    s.memoryLearn
      ? '- Memoria: si el usuario cuenta algo duradero de sí mismo (gustos, personas, lugares, trabajo, rutinas), guárdalo con remember sin anunciarlo; si pide olvidar algo, forget.'
      : '- Memoria: guarda con remember solo lo que el usuario te pida recordar expresamente; si pide olvidar algo, forget.',
    ...(factsForPrompt() ? ['', 'LO QUE SABES DEL USUARIO (úsalo con naturalidad, no lo recites)', factsForPrompt()] : []),
    '',
    'CÓMO RESPONDES',
    '- Se lee en voz alta y se muestra en un chat. Charla: 1-3 frases, sin formato.',
    '- Respuestas con datos: 1-2 frases de resumen (se leen), línea en blanco y el detalle en markdown sencillo. Si buscaste en internet, termina con las fuentes.',
    '- Sin emojis ni URLs en la parte hablada.'
  ].filter(s => s !== undefined).join('\n').replace(/\n{3,}/g, '\n\n')
}

// Clock and place travel with the user's message, after the cached prefix
function contextNote() {
  const now = new Date().toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })
  return `[Contexto: ${now}. ${worldSummary()}]`
}

function toolsFor() {
  const s = loadSettings()
  return [
    ...TOOL_DEFS.filter(t => t.function.name !== 'system_status'),
    ...MEMORY_TOOLS,
    ...REMINDER_TOOLS,
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

let restored = false

export function resetHistory() {
  history = []
  restored = true
}

// After a restart, the last exchanges of a recent conversation come back as context
function restoreHistory() {
  if (restored) return
  restored = true
  const chats = getMemory().chats.slice(-3)
  if (!chats.length || Date.now() - chats[chats.length - 1].at > 12 * 3600e3) return
  history = trim(chats.flatMap(c => [{ role: 'user', content: c.q }, { role: 'assistant', content: c.a }]))
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
  return out.map(m =>
    m.role === 'tool' && m.content && m.content.length > KEEP_TOOL_CHARS ? { ...m, content: m.content.slice(0, KEEP_TOOL_CHARS) + ' …' }
    : m.role === 'assistant' && m.content && m.content.length > KEEP_ANSWER_CHARS ? { ...m, content: m.content.slice(0, KEEP_ANSWER_CHARS) + ' …' }
    : m)
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

// ---------- which AI answers ----------
// "Auto" spreads the questions over every free service the user has a key for: when one hits a
// limit (even the per-minute one) the next takes over at once, and the tired one rests for a while.
type Target = { name: string; url: string; key: string; model: string }

const resting = new Map<string, number>() // "provider/model" -> rest until (ms)
const restKey = (t: Target) => t.name + '/' + t.model

let ollamaUp = { at: 0, up: false, model: '' }
async function ollama(): Promise<Target | null> {
  if (Date.now() - ollamaUp.at > 60e3) {
    ollamaUp = { at: Date.now(), up: false, model: '' }
    try {
      const j = await (await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(400) })).json()
      const names: string[] = (j.models || []).map((m: any) => m.name)
      const pick = PROVIDERS.Ollama.models.find(m => names.includes(m)) || names[0] || ''
      ollamaUp = { at: Date.now(), up: !!pick, model: pick }
    } catch { /* not installed or not running */ }
  }
  return ollamaUp.up ? { name: 'Ollama', url: PROVIDERS.Ollama.url, key: '', model: ollamaUp.model } : null
}

async function targets(s: ReturnType<typeof loadSettings>): Promise<Target[]> {
  const t = (name: string, model: string): Target | null => {
    const key = getKey(name)
    return key ? { name, url: PROVIDERS[name].url, key, model } : null
  }
  let list: (Target | null)[]
  if (s.provider === 'Auto') {
    list = [
      t('Cerebras', 'gpt-oss-120b'), // 1M tokens/day free
      t('Groq', 'openai/gpt-oss-120b'), // 200K/day
      t('Groq', 'openai/gpt-oss-20b'), // another 200K/day
      s.geminiFallback ? t('Gemini', 'gemini-3.5-flash-lite') : null,
      await ollama() // local: no limits at all
    ]
  } else if (s.provider === 'Ollama') {
    list = [{ name: 'Ollama', url: PROVIDERS.Ollama.url, key: '', model: s.model }]
  } else {
    const name = Object.hasOwn(PROVIDERS, s.provider) ? s.provider : 'Groq'
    const small = PROVIDERS[name].models.find(m => m !== s.model && /20b|8b|mini|lite/i.test(m))
    list = [t(name, s.model), small ? t(name, small) : null, s.geminiFallback && name !== 'Gemini' ? t('Gemini', 'gemini-3.5-flash-lite') : null]
  }
  return list.filter((x): x is Target => !!x)
}

async function askTurn(text: string, h: Handlers, ctl: AbortController): Promise<string> {
  if (ctl.signal.aborted) throw aborted()
  const s = loadSettings()
  const all = await targets(s)
  if (!all.length) throw new Error('NO_KEY')

  restoreHistory()
  // work on a copy; history only changes if the whole turn succeeds
  const turn: Msg[] = [...history, { role: 'user', content: `${text}\n\n${contextNote()}` }]
  let full = ''

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const last = round === MAX_ROUNDS - 1
    const body = (model: string) => JSON.stringify({
      model,
      stream: true,
      temperature: 0.5,
      max_tokens: MAX_ANSWER_TOKENS,
      // keep thinking short: faster answers and fewer free-tier tokens
      ...(/gpt-oss|gemini/.test(model) ? { reasoning_effort: 'low' } : {}),
      // on the last round force an answer instead of more tool calls
      ...(last ? {} : { tools: toolsFor() }),
      messages: [{ role: 'system', content: systemPrompt() }, ...turn]
    })

    let res: Response | null = null
    let lastLimit = { daily: false, wait: 0 }
    for (let pass = 0; pass < 3 && !res?.ok; pass++) {
      const ready = all.filter(t => (resting.get(restKey(t)) || 0) <= Date.now())
      if (!ready.length) {
        // everyone is resting: wait for the first one to come back if it is soon
        const soonest = Math.min(...all.map(t => resting.get(restKey(t)) || 0)) - Date.now()
        if (soonest > 45e3) break
        h.onProgress(`Límite por minuto · espero ${Math.ceil(soonest / 1000)} s`)
        await sleep(soonest + 300, ctl.signal)
        continue
      }
      for (const t of ready) {
        try {
          res = await fetch(t.url + '/chat/completions', {
            method: 'POST',
            signal: AbortSignal.any([ctl.signal, AbortSignal.timeout(60000)]),
            headers: { 'Content-Type': 'application/json', ...(t.key ? { Authorization: `Bearer ${t.key}` } : {}) },
            body: body(t.model)
          })
        } catch (err: any) {
          if (ctl.signal.aborted) throw aborted()
          if (all.length === 1) {
            if (err.name === 'TimeoutError') throw new Error('El modelo tarda demasiado en responder')
            const code = err.cause?.code
            if (code === 'ECONNREFUSED' && t.name === 'Ollama') throw new Error('Ollama no está arrancado')
            throw new Error(code === 'ENOTFOUND' ? 'Sin conexión a Internet' : 'No se pudo conectar con el modelo')
          }
          resting.set(restKey(t), Date.now() + 60e3) // unreachable: try the others
          res = null
          continue
        }
        if (res.ok) break
        if (res.status === 429 || res.status >= 500) {
          const limit = res.status === 429 ? await rateLimit(res) : { daily: false, wait: 30 }
          lastLimit = limit
          resting.set(restKey(t), Date.now() + (limit.daily ? 3 * 3600e3 : limit.wait * 1000 + 300))
          if (ready.length > 1 || all.length > 1) h.onProgress(limit.daily ? `Cupo de ${t.name} agotado · cambio de IA` : `${t.name} ocupada · cambio de IA`)
          continue
        }
        // any other error: with more services available, skip this one for a while
        if (all.length > 1) { resting.set(restKey(t), Date.now() + 10 * 60e3); console.warn('[brain]', t.name, res.status, (await res.text()).slice(0, 200)); res = null; continue }
        break // reported below
      }
    }
    if (!res) throw new Error('No se pudo conectar con ninguna IA; revise las claves en Ajustes')
    if (res.status === 429 || (!res.ok && res.status >= 500)) {
      throw new Error(lastLimit.daily
        ? 'Se ha agotado el cupo gratuito de hoy de sus IA. Añada otra clave gratuita en Ajustes (Cerebras da 1 millón de tokens al día) o pruebe más tarde'
        : 'Las IA gratuitas están saturadas ahora mismo; pruebe en un minuto')
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
          r = runMemoryTool(tool, args) || runReminderTool(tool, args) || (await runAgentTool(tool, args)) || (await runTool(tool, args))
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
  if (full.trim()) logExchange(text, full)
  return full
}

// Reads a 429: is it the daily quota, and how long to wait (Groq: "Please try again in 1m2.5s")
async function rateLimit(res: Response) {
  let msg = ''
  try { msg = JSON.stringify(await res.json()) } catch { /* no body */ }
  const daily = /per day|\(TPD\)|\(RPD\)|PerDay|daily/i.test(msg)
  const m = /try again in (?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?/i.exec(msg)
  const fromBody = m ? (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0)) : 0
  const retryDelay = /"retryDelay":"([\d.]+)s"/.exec(msg) // Gemini
  const wait = fromBody || (retryDelay ? +retryDelay[1] : 0) || Number(res.headers.get('retry-after')) || 10
  return { daily: daily || wait > 600, wait }
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
