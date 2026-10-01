// How much of today's free quota each AI has used, counted from the answers themselves.
// The free tiers do not say how much is left for the day, so NEXUS keeps its own count and
// marks a model as spent when the service answers "daily limit reached".
import { readJson, writeJson } from '../lib/store'

/** Free daily budget in tokens (cached prompt tokens do not count on Groq). */
const DAILY: Record<string, number> = {
  'Groq/openai/gpt-oss-120b': 200_000,
  'Groq/qwen/qwen3.8-27b': 200_000,
  'Groq/openai/gpt-oss-20b': 200_000,
  'Cerebras/gpt-oss-120b': 1_000_000,
}
/** Services counted by requests per day instead. */
const DAILY_REQUESTS: Record<string, number> = {
  'Gemini/gemini-3.5-flash-lite': 500,
  'OpenRouter/openrouter/free': 50,
}
const FRIENDLY: Record<string, string> = {
  'Groq/openai/gpt-oss-120b': 'Groq · GPT-OSS 120B',
  'Groq/qwen/qwen3.8-27b': 'Groq · Qwen',
  'Groq/openai/gpt-oss-20b': 'Groq · rápido',
  'Cerebras/gpt-oss-120b': 'Cerebras',
  'Gemini/gemini-3.5-flash-lite': 'Gemini',
  'OpenRouter/openrouter/free': 'OpenRouter',
}

type Day = { date: string; tokens: Record<string, number>; requests: Record<string, number>; spent: Record<string, number> }
const FILE = 'quota.json'
const today = () => new Date().toLocaleDateString('sv') // YYYY-MM-DD, local
let day: Day | null = null

function load(): Day {
  if (!day || day.date !== today()) {
    const saved = readJson<Day | null>(FILE, null)
    day = saved && saved.date === today() && !Array.isArray(saved.spent) ? saved : { date: today(), tokens: {}, requests: {}, spent: {} }
  }
  return day
}
let saveTimer: NodeJS.Timeout | null = null
const save = () => {
  if (saveTimer) return
  saveTimer = setTimeout(() => { saveTimer = null; if (day) writeJson(FILE, day) }, 2000)
}

/** One answered request: tokens that count towards the limit (not the cached ones). */
export function noteUsage(id: string, tokens: number) {
  const d = load()
  d.tokens[id] = (d.tokens[id] || 0) + Math.max(0, Math.round(tokens))
  d.requests[id] = (d.requests[id] || 0) + 1
  save()
}

/** The service said the daily limit is reached. */
export function noteSpent(id: string) {
  load().spent[id] = Date.now()
  save()
}

// Groq's day is a rolling 24 h, so a spent model gets some room back after a few hours
const SPENT_FOR = 3 * 3600e3
export const isSpent = (id: string) => Date.now() - (load().spent[id] || 0) < SPENT_FOR

/** 0…1 of today's free budget used (null = no known daily limit, e.g. Mistral or Ollama). */
export function usedShare(id: string): number | null {
  const d = load()
  if (isSpent(id)) return 1
  if (DAILY[id]) return Math.min(1, (d.tokens[id] || 0) / DAILY[id])
  if (DAILY_REQUESTS[id]) return Math.min(1, (d.requests[id] || 0) / DAILY_REQUESTS[id])
  return null
}

export type QuotaLine = { id: string; label: string; used: number | null; requests: number }

/** Today's use of the given models, for Settings and the self-test. */
export function quotaReport(ids: string[]): QuotaLine[] {
  const d = load()
  return ids.map(id => ({ id, label: FRIENDLY[id] || id.split('/')[0], used: usedShare(id), requests: d.requests[id] || 0 }))
}

/** Share left of everything with a daily limit (1 = all of it). Unlimited services count as full. */
export function leftToday(ids: string[]) {
  if (!ids.length) return 1
  if (ids.some(id => usedShare(id) === null)) return 1 // Mistral / Ollama: no daily wall
  const left = ids.map(id => 1 - (usedShare(id) ?? 0))
  return left.reduce((a, b) => a + b, 0) / ids.length
}
