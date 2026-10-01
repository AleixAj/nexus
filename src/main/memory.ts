// Long-term memory: facts about the user and the log of past conversations,
// in one file encrypted with the user's Windows account.
import { readSecretJson, writeSecretJson } from './lib/store'

export const CATEGORIES = ['Preferencias', 'Personas', 'Lugares', 'Trabajo', 'Otros']
export type Fact = { id: number; cat: string; text: string; at: number }
export type Exchange = { id: number; at: number; q: string; a: string }
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

export const getMemory = () => load()

export function addFact(text: string, cat = 'Otros') {
  const t = text.replace(/\s+/g, ' ').trim().slice(0, MAX_FACT_CHARS)
  if (!t) return null
  const s = load()
  // the same thing said twice is kept once
  const same = s.facts.find(f => f.text.toLowerCase() === t.toLowerCase())
  if (same) return same
  const f = { id: newId(), cat: CATEGORIES.find(x => x.toLowerCase() === cat.toLowerCase()) || 'Otros', text: t, at: Date.now() }
  s.facts = [...s.facts, f].slice(-MAX_FACTS)
  save()
  return f
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
  s.chats = [...s.chats, { id: newId(), at: Date.now(), q: q.slice(0, 2000), a: a.slice(0, 6000) }].slice(-MAX_CHATS)
  save()
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

/** What the model must know about the user (goes in the system prompt). */
export const factsForPrompt = () => load().facts.map(x => `- (${x.cat}) ${x.text}`).join('\n')
