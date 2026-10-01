// The agent loop: question → model → tools → model … → answer, streamed to the window.
import { loadSettings } from '../settings'
import { getMemory, logExchange } from '../memory'
import { findTool, runTool, toolDefs, type ToolResult } from '../tools'
import { contextNote, systemPrompt } from './prompt'
import { aborted, callModel, targets } from './providers'
import { readStream } from './stream'
import { LoopGuard } from './guard'
import { isSimple } from './complexity'
import { redact } from '../lib/privacy'
import { noteTool, resetTaint } from '../lib/taint'
import { approvalKey, approve, isApproved } from '../approvals'
import { markRun, routineFor, routinePrompt } from '../routines'

type Msg = { role: string; content?: string | null; tool_calls?: any[]; tool_call_id?: string }

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
  return out.map(m => (m.role === 'tool' ? cut(m, KEEP_TOOL_CHARS) : m.role === 'assistant' ? cut(m, KEEP_ANSWER_CHARS) : m))
}

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
  const loop = guard.check(name, args)
  if (loop) return { result: loop, label: 'Repetición evitada' }
  // serious actions need the user's own words, not just the model's decision
  const wanted = t.intent?.(args)
  if (wanted && !wanted.test(turn.said)) {
    return { result: 'No lo hago: el usuario no lo ha pedido con sus palabras en este mensaje. Si lo quiere, que lo pida él directamente.', label: 'Acción bloqueada · no la has pedido tú' }
  }
  const req = t.confirm?.(args)
  const key = approvalKey(name, args)
  if (req && !isApproved(key)) {
    const ok = await h.confirm({ ...req, always: !t.noAlways })
    if (signal.aborted) throw aborted()
    if (!ok) return { result: 'El usuario ha denegado el permiso para esta acción.', label: 'Acción denegada' }
    if (ok === 'always' && !t.noAlways) approve(key, req.title)
  }
  const label = t.progress?.(args)
  if (label) h.onProgress(label)
  noteTool(name)
  const r = await runTool(t, args, { progress: h.onProgress, signal })
  // keys, passwords or card numbers found in a file, the clipboard or the screen never reach the online AI
  return { ...r, result: redact(r.result) }
}

async function askTurn(text: string, h: Handlers, ctl: AbortController): Promise<string> {
  if (ctl.signal.aborted) throw aborted()
  const s = loadSettings()
  const simple = isSimple(text) && !routineFor(text)
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
  const tools = toolDefs(s)
  let full = ''
  let report = false

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const last = round === MAX_ROUNDS - 1
    const body = (model: string) => JSON.stringify({
      model,
      stream: true,
      temperature: 0.5,
      max_tokens: report ? REPORT_TOKENS : simple ? SIMPLE_ANSWER_TOKENS : MAX_ANSWER_TOKENS,
      // keep thinking short: faster answers and fewer free-tier tokens
      ...(/gpt-oss|gemini/.test(model) ? { reasoning_effort: 'low' } : {}),
      // on the last round force an answer instead of more tool calls
      ...(last ? {} : { tools }),
      messages: [{ role: 'system', content: systemPrompt() }, ...turn]
    })

    const res = await callModel(all, body, ctl.signal, h.onProgress)
    const { content, toolCalls } = await readStream(res.body!, h.onDelta)
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
  history = trim(turn)
  if (full.trim()) logExchange(text, full)
  return full
}
