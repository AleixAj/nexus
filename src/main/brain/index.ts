// The agent loop: question → model → tools → model … → answer, streamed to the window.
import { loadSettings } from '../settings'
import { getMemory, logExchange } from '../memory'
import { findTool, runTool, toolDefs, type ToolResult } from '../tools'
import { contextNote, systemPrompt } from './prompt'
import { aborted, callModel, targets } from './providers'
import { readStream } from './stream'

type Msg = { role: string; content?: string | null; tool_calls?: any[]; tool_call_id?: string }

export type Handlers = {
  onDelta: (t: string) => void
  onAction: (label: string) => void
  onProgress: (label: string) => void
  confirm: (req: { title: string; detail: string }) => Promise<boolean>
}

const MAX_ROUNDS = 8
// The free tiers count tokens per minute and per day, so every request is kept small:
// a short history, trimmed old results and a prompt prefix that never changes (cached = free on Groq)
const MAX_HISTORY = 10
const KEEP_TOOL_CHARS = 400
const KEEP_ANSWER_CHARS = 900
const MAX_ANSWER_TOKENS = 1200

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

async function useTool(name: string, args: any, h: Handlers, signal: AbortSignal): Promise<ToolResult> {
  const t = findTool(name)
  if (!t) return { result: 'Herramienta desconocida', label: name }
  if (t.confirm) {
    const ok = await h.confirm(t.confirm(args))
    if (signal.aborted) throw aborted()
    if (!ok) return { result: 'El usuario ha denegado el permiso para esta acción.', label: 'Acción denegada' }
  }
  const label = t.progress?.(args)
  if (label) h.onProgress(label)
  return runTool(t, args)
}

async function askTurn(text: string, h: Handlers, ctl: AbortController): Promise<string> {
  if (ctl.signal.aborted) throw aborted()
  const s = loadSettings()
  const all = await targets(s)
  if (!all.length) throw new Error('NO_KEY')

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
      max_tokens: MAX_ANSWER_TOKENS,
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
      const r = await useTool(call.function.name, args, h, ctl.signal)
      h.onAction(r.label)
      turn.push({ role: 'tool', tool_call_id: call.id, content: r.result })
    }
  }

  if (ctl.signal.aborted) throw aborted()
  history = trim(turn)
  if (full.trim()) logExchange(text, full)
  return full
}
