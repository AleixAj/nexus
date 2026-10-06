// The agent loop: question → model → tools → model … → answer, streamed to the window.
import { getKey, loadSettings } from '../settings'
import { getMemory, logExchange } from '../memory'
import { findTool, hasTopic, pickTools, runTool, toolDefs, type ToolResult } from '../tools'
import { contextNote, systemPrompt } from './prompt'
import { aborted, callModel, targetId, targets, type Target } from './providers'
import { leftToday, noteUsage } from './quota'
import { quickCommand, type Quick } from './quick'
import { callName } from './prompt'
import { readStream } from './stream'
import { LoopGuard } from './guard'
import { isSimple } from './complexity'
import { redact } from '../lib/privacy'
import { noteTool, resetTaint } from '../lib/taint'
import { approvalKey, approve, isApproved } from '../approvals'
import { markRun, routineFor, routinePrompt } from '../routines'
import { isPaused, recordAction } from '../activity'
import { toolOff } from '../features'

type Msg = { role: string; content?: string | null; tool_calls?: any[]; tool_call_id?: string; name?: string }

export type Handlers = {
  onDelta: (t: string) => void
  onAction: (label: string) => void
  onProgress: (label: string) => void
  /** true = yes this time, 'always' = yes and do not ask again for this kind of action */
  confirm: (req: { title: string; detail: string; always: boolean }) => Promise<boolean | 'always'>
}

const MAX_ROUNDS = 8
// The free tiers count tokens per minute and per day, so every request is kept small:
// a short history, trimmed old results and a prompt prefix that never changes (cached = free on Groq)
const MAX_HISTORY = 10
const KEEP_TOOL_CHARS = 400
const KEEP_ANSWER_CHARS = 900
const KEEP_QUESTION_CHARS = 1500
const MAX_ANSWER_TOKENS = 1200
const SIMPLE_ANSWER_TOKENS = 700
const REPORT_TOKENS = 2600 // a deep research report

let history: Msg[] = []
let restored = false
let current: AbortController | null = null
let chain: Promise<unknown> = Promise.resolve()

export function resetHistory() {
  history = []
  restored = true
}

export const abort = () => current?.abort()

// Keep the last turns, always starting at a user message so no tool result is orphaned,
// and shorten old tool results so they do not eat the free token budget.
function trim(h: Msg[]) {
  let out = h.slice(-MAX_HISTORY)
  const first = out.findIndex(m => m.role === 'user')
  out = first < 0 ? [] : out.slice(first)
  const cut = (m: Msg, n: number) => (m.content && m.content.length > n ? { ...m, content: m.content.slice(0, n) + ' …' } : m)
  // a long question (a selected text, a pasted document) is not sent again whole on every turn
  return out.map(m => (m.role === 'tool' ? cut(m, KEEP_TOOL_CHARS) : m.role === 'assistant' ? cut(m, KEEP_ANSWER_CHARS) : cut(m, KEEP_QUESTION_CHARS)))
}

/** What is kept of a question in the saved conversations: a selected text is not stored, only what was asked. */
const forLog = (text: string) => text.includes('\n\nTexto seleccionado:') ? text.split('\n\nTexto seleccionado:')[0] + ' [sobre un texto seleccionado]' : text

// After a restart, the last exchanges of a recent conversation come back as context
function restoreHistory() {
  if (restored) return
  restored = true
  const chats = getMemory().chats.slice(-3)
  if (!chats.length || Date.now() - chats[chats.length - 1].at > 12 * 3600e3) return
  history = trim(chats.flatMap(c => [{ role: 'user', content: c.q }, { role: 'assistant', content: c.a }]))
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

// ---------- the file the user is working with ----------
// A file dropped in the chat stays "the current file" for a while: "resúmelo", "tradúcelo" or
// "haz una presentación con esto" work without saying which one.
const ATTACHED = /\[Adjuntos: ([^\]]+)\]\s*$/
let currentFiles: { paths: string[]; at: number } | null = null
export const getCurrentFiles = () => (currentFiles && Date.now() - currentFiles.at < 60 * 60e3 ? currentFiles.paths : [])
export const clearCurrentFiles = () => { currentFiles = null }

type Turn = { said: string; h: Handlers; signal: AbortSignal; guard: LoopGuard }

async function useTool(name: string, args: any, turn: Turn): Promise<ToolResult> {
  const { h, signal, guard } = turn
  const t = findTool(name)
  if (!t) return { result: 'Herramienta desconocida', label: name }
  // switched off by the user (Settings → Funciones)
  if (toolOff(name)) return { result: 'Esa función está desactivada por el usuario en Ajustes → Funciones. No la uses; díselo por si quiere activarla.', label: 'Función desactivada' }
  const loop = guard.check(name, args)
  if (loop) return { result: loop, label: 'Repetición evitada' }
  // serious actions need the user's own words, not just the model's decision
  const wanted = t.intent?.(args)
  if (wanted && !wanted.test(turn.said)) {
    return { result: 'No lo hago: el usuario no lo ha pedido con sus palabras en este mensaje. Si lo quiere, que lo pida él directamente.', label: 'Acción bloqueada · no la has pedido tú' }
  }
  // the emergency pause: answers and reads, but changes nothing
  if (isPaused() && !t.readOnly && !t.trivial) {
    return { result: 'NO SE HA HECHO NADA: NEXUS está en pausa total. No digas que lo has hecho; dile al usuario que no lo he hecho porque está la pausa, y que la quite en el panel Actividad si quiere.', label: 'En pausa · no hago cambios' }
  }
  const req = t.confirm?.(args)
  const key = approvalKey(name, args)
  // "always" never covers what must be asked every time (commands, deleting, files that run code),
  // even if approvals.json says otherwise
  const everyTime = !!t.noAlways || !!t.alwaysAsk?.(args)
  if (req && (everyTime || !isApproved(key))) {
    const ok = await h.confirm({ ...req, detail: req.detail + (t.alwaysAsk?.(args) ? '\n\n⚠ Este archivo puede ejecutar programas al abrirlo.' : ''), always: !everyTime })
    if (signal.aborted) throw aborted()
    if (!ok) return { result: 'El usuario ha denegado el permiso para esta acción.', label: 'Acción denegada' }
    if (ok === 'always' && !everyTime) approve(key, req.title)
  }
  const label = t.progress?.(args)
  if (label) h.onProgress(label)
  noteTool(name)
  // how to undo it (a copy of the file…), taken just before the change
  const undo = t.prepare ? await t.prepare(args).catch(() => null) : null
  const r = await runTool(t, args, { progress: h.onProgress, signal })
  if (!t.readOnly && !t.trivial && !r.result.startsWith('Error')) recordAction(name, r.label, undo || undefined)
  // keys, passwords or card numbers found in a file, the clipboard or the screen never reach the online AI
  return { ...r, result: redact(r.result) }
}

// ---------- orders answered without the AI ----------
async function runQuick(q: Quick, text: string, h: Handlers, ctl: AbortController): Promise<string | null> {
  let reply: string
  if ('answer' in q) reply = q.answer
  else {
    const r = await useTool(q.tool, q.args, { said: text, h, signal: ctl.signal, guard: new LoopGuard() })
    if (r.label === 'En pausa · no hago cambios') reply = 'Estoy en pausa total: no hago cambios en tu PC. Quítala en el panel Actividad.'
    else if (r.label === 'Función desactivada') reply = 'Esa función está desactivada. Puedes activarla en Ajustes → Funciones.'
    else if (q.ok && !q.ok(r.result)) return null // not something it can do alone: the AI tries
    else reply = r.label === 'Acción denegada' ? 'De acuerdo, no lo hago.' : q.reply(r.result)
    if (r.label !== reply.replace(/\.$/, '')) h.onAction(r.label)
  }
  if (ctl.signal.aborted) throw aborted()
  h.onDelta(reply)
  restoreHistory()
  history = trim([...history, { role: 'user', content: text }, { role: 'assistant', content: reply }])
  if (!loadSettings().privateMode) logExchange(forLog(text), reply)
  return reply
}

// Each AI gets the tool calls the way it accepts them (a turn may move from one AI to another)
function forTarget(t: Target, msgs: Msg[]): Msg[] {
  if (t.name === 'Mistral') return forMistral(msgs.map(stripSignature))
  if (t.name !== 'Gemini') return msgs.map(stripSignature)
  // Gemini 3 rejects calls without their thought signature; calls made by another AI get the
  // placeholder Google documents for that case
  return msgs.map(m => m.tool_calls ? { ...m, tool_calls: m.tool_calls.map(c => c.extra_content?.google?.thought_signature ? c : { ...c, extra_content: { google: { thought_signature: 'skip_thought_signature_validator' } } }) } : m)
}
const stripSignature = (m: Msg): Msg => m.tool_calls ? { ...m, tool_calls: m.tool_calls.map(({ extra_content, ...c }) => c) } : m

// Mistral only takes tool call ids of 9 letters/digits; a turn may have started on another AI
function forMistral(msgs: Msg[]): Msg[] {
  const ids = new Map<string, string>()
  const id = (x = '') => { if (!ids.has(x)) ids.set(x, 'c' + String(ids.size).padStart(8, '0')); return ids.get(x)! }
  const names = new Map<string, string>()
  return msgs.map(m => {
    if (m.tool_calls) return { ...m, tool_calls: m.tool_calls.map(c => { names.set(c.id, c.function.name); return { ...c, id: id(c.id) } }) }
    if (m.role === 'tool') return { ...m, name: names.get(m.tool_call_id || ''), tool_call_id: id(m.tool_call_id) }
    return m
  })
}

let warnedDay = ''

async function askTurn(text: string, h: Handlers, ctl: AbortController): Promise<string> {
  if (ctl.signal.aborted) throw aborted()
  const s = loadSettings()
  if (!routineFor(text)) {
    const q = await quickCommand(text, callName(s.wakeWord))
    const done = q && (await runQuick(q, text, h, ctl))
    if (done) return done
  }
  const simple = isSimple(text) && !routineFor(text) && !hasTopic(text)
  const all = await targets(s, simple)
  if (!all.length) throw new Error('NO_KEY')
  const guard = new LoopGuard()
  resetTaint()

  restoreHistory()
  // a routine's phrase (or "/rutina nombre") becomes the routine's steps
  const routine = routineFor(text)
  if (routine) markRun(routine.id)
  const asked = routine ? routinePrompt(routine) : text
  const files = ATTACHED.exec(text)
  if (files) currentFiles = { paths: files[1].split(' | '), at: Date.now() }
  else if (getCurrentFiles().length) currentFiles!.at = Date.now()
  const working = !files && getCurrentFiles().length ? `\n[Archivo actual (lo último que el usuario arrastró; «esto», «el archivo»…): ${getCurrentFiles().join(' | ')}]` : ''
  // work on a copy; history only changes if the whole turn succeeds
  const turn: Msg[] = [...history, { role: 'user', content: `${asked}${working}\n\n${contextNote()}` }]
  const ctx: Turn = { said: asked, h, signal: ctl.signal, guard }
  // only the tools this question can need (the previous question counts too: "y ahora más alto")
  const before = [...history].reverse().find(m => m.role === 'user')?.content?.split('\n\n[Contexto')[0] || ''
  const only = routine ? null : pickTools(`${asked} ${before}${working || files ? ' archivo actual adjuntos' : ''}`, simple)
  const tools = toolDefs(s, only)
  let full = ''
  let report = false
  let usedTools = false

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const last = round === MAX_ROUNDS - 1
    const body = (t: Target) => JSON.stringify({
      model: t.model,
      stream: true,
      temperature: 0.5,
      max_tokens: report ? REPORT_TOKENS : simple ? SIMPLE_ANSWER_TOKENS : MAX_ANSWER_TOKENS,
      // keep thinking short: faster answers and fewer free-tier tokens
      ...(/gpt-oss|gemini/.test(t.model) ? { reasoning_effort: 'low' } : /qwen/.test(t.model) ? { reasoning_effort: 'none' } : {}),
      // on the last round force an answer instead of more tool calls
      ...(last || !tools.length ? {} : { tools }),
      messages: [{ role: 'system', content: systemPrompt() }, ...forTarget(t, turn)]
    })

    const { res, target } = await callModel(all, body, ctl.signal, h.onProgress)
    const { content, toolCalls, usage } = await readStream(res.body!, h.onDelta)
    // the service's own count; if it gives none, a rough one (4 characters ≈ 1 token)
    noteUsage(targetId(target), usage ?? (body(target).length + content.length) / 4)
    full += content
    if (!toolCalls.length) {
      turn.push({ role: 'assistant', content })
      break
    }
    turn.push({ role: 'assistant', content: content || null, tool_calls: toolCalls })

    const calls = toolCalls.map(call => {
      let args: any = {}
      try { args = JSON.parse(call.function.arguments || '{}') } catch { /* keep empty */ }
      return { call, args }
    })
    // tools that only read (search, look, list…) run at the same time; anything that changes the
    // PC runs one by one, in order (idea from JARVIS-OS: _execute_tool_batch)
    usedTools = true
    if (calls.some(c => c.call.function.name === 'deep_research')) report = true
    const parallel = calls.length > 1 && calls.every(({ call }) => findTool(call.function.name)?.readOnly)
    const results = parallel
      ? await Promise.all(calls.map(({ call, args }) => useTool(call.function.name, args, ctx)))
      : []
    for (let i = 0; i < calls.length; i++) {
      if (ctl.signal.aborted) throw aborted()
      const r = parallel ? results[i] : await useTool(calls[i].call.function.name, calls[i].args, ctx)
      h.onAction(r.label)
      turn.push({ role: 'tool', tool_call_id: calls[i].call.id, content: r.result })
    }
  }

  if (ctl.signal.aborted) throw aborted()
  // the model ended without a word (it happens with free models under load): say so, never silence
  if (!full.trim()) {
    full = usedTools ? 'Hecho.' : 'No me ha llegado respuesta de la IA. ¿Me lo repites?'
    h.onDelta(full)
  }
  // one warning a day when the free quota is nearly gone
  const ids = all.filter(t => t.name !== 'Ollama').map(targetId)
  if (warnedDay !== new Date().toDateString() && ids.length && leftToday(ids) < 0.2) {
    warnedDay = new Date().toDateString()
    h.onAction(!s.geminiFallback && getKey('Gemini') ? 'Queda poco cupo gratis hoy · activa «Respaldo» (Gemini) en Ajustes' : 'Queda poco cupo gratis hoy · añade otra clave gratuita en Ajustes')
  }
  history = trim(turn)
  if (!loadSettings().privateMode) logExchange(forLog(text), full)
  return full
}
