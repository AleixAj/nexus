// Long-term memory: facts about the user and the log of past conversations,
// in one file encrypted with the user's Windows account.
// A fact learnt while outside content was on the table (a web page, a file) waits for the
// user's OK before the agent uses it (idea from OpenJarvis' memory trust levels).
import { readSecretJson, writeSecretJson } from './lib/store'
import { embed } from './lib/embeddings'

export const CATEGORIES = ['Preferencias', 'Personas', 'Lugares', 'Trabajo', 'Otros']
export type Fact = { id: number; cat: string; text: string; at: number; pending?: boolean }
export type Exchange = { id: number; at: number; q: string; a: string; vec?: number[] }
type Store = { facts: Fact[]; chats: Exchange[] }

const FILE = 'memory.bin'
const MAX_FACTS = 80
const MAX_CHATS = 400
const MAX_FACT_CHARS = 200

let store: Store | null = null
let seq = 0
const newId = () => Date.now() * 10 + (seq++ % 10)

function load(): Store {
  if (!store) {
    const s = readSecretJson<Partial<Store>>(FILE, {})
    store = { facts: Array.isArray(s.facts) ? s.facts : [], chats: Array.isArray(s.chats) ? s.chats : [] }
  }
  return store
}
const save = () => writeSecretJson(FILE, load())

/** For the window: without the search vectors (they are big and only used here). */
export const getMemory = () => ({ facts: load().facts, chats: load().chats.map(({ vec, ...c }) => c) })

export function addFact(text: string, cat = 'Otros', pending = false) {
  const t = text.replace(/\s+/g, ' ').trim().slice(0, MAX_FACT_CHARS)
  if (!t) return null
  const s = load()
  // the same thing said twice is kept once
  const same = s.facts.find(f => f.text.toLowerCase() === t.toLowerCase())
  if (same) return same
  const f: Fact = { id: newId(), cat: CATEGORIES.find(x => x.toLowerCase() === cat.toLowerCase()) || 'Otros', text: t, at: Date.now(), ...(pending ? { pending: true } : {}) }
  s.facts = [...s.facts, f].slice(-MAX_FACTS)
  save()
  return f
}

export function approveFact(id: number) {
  load().facts = load().facts.map(f => (f.id === id ? { ...f, pending: undefined } : f))
  save()
}

export function deleteFact(id: number) {
  load().facts = load().facts.filter(f => f.id !== id)
  save()
}

/** Forgets the facts that contain `query`; returns what was removed. */
export function forgetFacts(query: string) {
  const q = query.toLowerCase().trim()
  const s = load()
  const gone = q ? s.facts.filter(f => f.text.toLowerCase().includes(q)) : []
  if (gone.length) { s.facts = s.facts.filter(f => !gone.includes(f)); save() }
  return gone
}

export function logExchange(q: string, a: string) {
  const s = load()
  const x: Exchange = { id: newId(), at: Date.now(), q: q.slice(0, 2000), a: a.slice(0, 6000) }
  s.chats = [...s.chats, x].slice(-MAX_CHATS)
  save()
  // the meaning vector comes later, in the background (only if a free embedding service is on)
  embed(x.q + '\n' + x.a.slice(0, 1500)).then(v => { if (v) { x.vec = v; save() } }).catch(() => {})
}

export function deleteExchange(id: number) {
  load().chats = load().chats.filter(c => c.id !== id)
  save()
}

export function clearMemory(what: 'all' | 'chats' = 'all') {
  const s = load()
  s.chats = []
  if (what === 'all') s.facts = []
  save()
}

/** What the model must know about the user (goes in the system prompt). Pending facts are left out. */
export const factsForPrompt = () => load().facts.filter(f => !f.pending).map(x => `- (${x.cat}) ${x.text}`).join('\n')

// ---------- searching past conversations ----------
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const STOP = new Set('el la los las un una unos unas de del al a en y o que qué es por para con como cómo me mi mis tu te se lo le les su sus ya no si sí hay muy más pero this the and'.split(' '))
const words = (s: string) => norm(s).split(/[^a-z0-9ñ]+/).filter(w => w.length > 2 && !STOP.has(w))
const cosine = (a: number[], b: number[]) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] ** 2; y += b[i] ** 2 } return d / (Math.sqrt(x * y) || 1) }

/**
 * Past conversations about `query`: words (BM25-like) mixed with meaning (embeddings, when on)
 * by reciprocal rank fusion. Idea from OpenJarvis (connectors/hybrid_search.py, Apache-2.0).
 */
export async function searchChats(query: string, limit = 5) {
  const chats = load().chats
  if (!chats.length) return []
  const qw = words(query)
  const docs = chats.map(c => words(c.q + ' ' + c.a))
  const avg = docs.reduce((n, d) => n + d.length, 0) / docs.length || 1
  const df = new Map<string, number>()
  docs.forEach(d => new Set(d).forEach(w => df.set(w, (df.get(w) || 0) + 1)))
  const bm25 = docs.map(d => qw.reduce((s, w) => {
    const tf = d.filter(x => x === w).length
    if (!tf) return s
    const idf = Math.log(1 + (docs.length - (df.get(w) || 0) + .5) / ((df.get(w) || 0) + .5))
    return s + idf * (tf * 2.2) / (tf + 1.2 * (.25 + .75 * d.length / avg))
  }, 0))
  const rank = (scores: number[]) => {
    const order = scores.map((s, i) => [s, i]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]).map(([, i]) => i)
    return new Map(order.map((i, r) => [i, r]))
  }
  const byWords = rank(bm25)
  const qv = chats.some(c => c.vec) ? await embed(query).catch(() => null) : null
  const byMeaning = qv ? rank(chats.map(c => (c.vec && c.vec.length === qv.length ? Math.max(0, cosine(qv, c.vec) - .3) : 0))) : new Map<number, number>()
  const fused = chats.map((_, i) => (byWords.has(i) ? 1 / (60 + byWords.get(i)!) : 0) + (byMeaning.has(i) ? 1 / (60 + byMeaning.get(i)!) : 0))
  return fused.map((s, i) => [s, i]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]).slice(0, limit).map(([, i]) => chats[i])
}
