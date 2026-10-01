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

async function useTool(name: string, args: any, h: Handlers, signal: AbortSignal, guard: LoopGuard): Promise<ToolResult> {
  const t = findTool(name)
  if (!t) return { result: 'Herramienta desconocida', label: name }
  const loop = guard.check(name, args)
  if (loop) return { result: loop, label: 'Repetición evitada' }
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
  const r = await runTool(t, args)
  // keys, passwords or card numbers found in a file, the clipboard or the screen never reach the online AI
  return { ...r, result: redact(r.result) }
}

async function askTurn(text: string, h: Handlers, ctl: AbortController): Promise<string> {
  if (ctl.signal.aborted) throw aborted()
  const s = loadSettings()
  const simple = isSimple(text)
  const all = await targets(s, simple)
  if (!all.length) throw new Error('NO_KEY')
  const guard = new LoopGuard()
  resetTaint()

  restoreHistory()
  // work on a copy; history only changes if the whole turn succeeds
  const turn: Msg[] = [...history, { role: 'user', content: `${text}\n\n${contextNote()}` }]
  const tools = toolDefs(s)
  let full = ''

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const last = round === MAX_ROUNDS - 1
    const body = (model: string) => JSON.stringify({
      model,
      stream: true,
      temperature: 0.5,
      max_tokens: simple ? SIMPLE_ANSWER_TOKENS : MAX_ANSWER_TOKENS,
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

    for (const call of toolCalls) {
      if (ctl.signal.aborted) throw aborted()
      let args: any = {}
      try { args = JSON.parse(call.function.arguments || '{}') } catch { /* keep empty */ }
      const r = await useTool(call.function.name, args, h, ctl.signal, guard)
      h.onAction(r.label)
      turn.push({ role: 'tool', tool_call_id: call.id, content: r.result })
    }
  }

  if (ctl.signal.aborted) throw aborted()
  history = trim(turn)
  if (full.trim()) logExchange(text, full)
  return full
}
