// Long-term memory: facts about the user and the log of past conversations.
// Stored in one file, encrypted with the OS keychain (DPAPI on Windows) when available.
import { app, safeStorage } from 'electron'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'

export const CATEGORIES = ['Preferencias', 'Personas', 'Lugares', 'Trabajo', 'Otros']
export type Fact = { id: number; cat: string; text: string; at: number }
export type Exchange = { id: number; at: number; q: string; a: string }
type Store = { facts: Fact[]; chats: Exchange[] }

const MAX_FACTS = 80
const MAX_CHATS = 400
const MAX_FACT_CHARS = 200

const file = () => join(app.getPath('userData'), 'memory.bin')
let store: Store | null = null

function load(): Store {
  if (store) return store
  store = { facts: [], chats: [] }
  try {
    if (existsSync(file())) {
      const raw = readFileSync(file())
      // "{" means plain JSON (no keychain on this machine)
      const json = raw[0] === 0x7b ? raw.toString('utf8') : safeStorage.decryptString(raw)
      const s = JSON.parse(json)
      store = { facts: Array.isArray(s.facts) ? s.facts : [], chats: Array.isArray(s.chats) ? s.chats : [] }
    }
  } catch (e) { console.warn('[memory] unreadable, starting empty', e) }
  return store
}

function save() {
  const json = JSON.stringify(load())
  const data = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(json) : Buffer.from(json, 'utf8')
  const tmp = file() + '.tmp'
  writeFileSync(tmp, data)
  renameSync(tmp, file())
}

let seq = 0
const newId = () => Date.now() * 10 + (seq++ % 10)

export const getMemory = () => load()

export function addFact(text: string, cat = 'Otros') {
  const t = text.replace(/\s+/g, ' ').trim().slice(0, MAX_FACT_CHARS)
  if (!t) return null
  const s = load()
  const c = CATEGORIES.find(x => x.toLowerCase() === cat.toLowerCase()) || 'Otros'
  // the same thing said twice is kept once
  const same = s.facts.find(f => f.text.toLowerCase() === t.toLowerCase())
  if (same) return same
  const f = { id: newId(), cat: c, text: t, at: Date.now() }
  s.facts = [...s.facts, f].slice(-MAX_FACTS)
  save()
  return f
}

export function deleteFact(id: number) {
  const s = load()
  s.facts = s.facts.filter(f => f.id !== id)
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
  const s = load()
  s.chats = s.chats.filter(c => c.id !== id)
  save()
}

export function clearMemory(what: 'all' | 'chats' = 'all') {
  const s = load()
  s.chats = []
  if (what === 'all') s.facts = []
  save()
}

/** What the model must know about the user (goes in the system prompt). */
export function factsForPrompt() {
  const f = load().facts
  return f.length ? f.map(x => `- (${x.cat}) ${x.text}`).join('\n') : ''
}

// ---------- agent tools ----------
const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[]) =>
  ({ type: 'function', function: { name, description, parameters: { type: 'object', properties, required } } })

export const MEMORY_TOOLS = [
  fn('remember', 'Guarda un dato duradero del usuario (gustos, personas, lugares, trabajo).', {
    text: { type: 'string', description: 'El dato, en tercera persona y en una frase' },
    category: { type: 'string', enum: CATEGORIES }
  }, ['text', 'category']),
  fn('forget', 'Olvida los datos guardados que contengan ese texto.', { query: { type: 'string', description: 'Palabra o frase' } }, ['query'])
]

export function runMemoryTool(name: string, a: any): { result: string; label: string } | null {
  if (name === 'remember') {
    const f = addFact(String(a.text || ''), String(a.category || 'Otros'))
    return f ? { result: 'Guardado en memoria: ' + f.text, label: 'Memoria · ' + f.text.slice(0, 48) } : { result: 'Nada que guardar', label: 'Memoria sin cambios' }
  }
  if (name === 'forget') {
    const gone = forgetFacts(String(a.query || ''))
    return { result: gone.length ? 'Olvidado: ' + gone.map(f => f.text).join(' | ') : 'No había nada guardado con eso', label: gone.length ? `Memoria · ${gone.length} dato${gone.length > 1 ? 's' : ''} olvidado${gone.length > 1 ? 's' : ''}` : 'Memoria sin cambios' }
  }
  return null
}
