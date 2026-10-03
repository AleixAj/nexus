// Routines: a list of steps in plain words ("abre VS Code", "pon mi lista Focus") that the
// agent carries out with its tools. Started by a phrase, at a time of day, or by hand.
import { readJson, writeJson } from './lib/store'

export type Routine = {
  id: number; name: string; steps: string[]
  phrase: string // "modo trabajo" — saying it runs the routine ('' = none)
  time: string // "07:30" ('' = no schedule)
  days: number[] // 0 = Sunday … 6 = Saturday; empty = every day
  enabled: boolean; lastRun: number
}

const FILE = 'routines.json'
let list: Routine[] | null = null
let timer: NodeJS.Timeout | null = null
let onDue: (r: Routine) => void = () => {}
let onChange: () => void = () => {}

const load = () => (list ??= readJson<Routine[]>(FILE, []))
function save(next: Routine[]) {
  list = next
  writeJson(FILE, list)
  onChange()
}

export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
export const listRoutines = () => load()
export const findRoutine = (name: string) => load().find(r => norm(r.name) === norm(name)) || load().find(r => norm(r.name).includes(norm(name)) && norm(name).length > 2)

export function saveRoutine(r: Omit<Routine, 'id' | 'lastRun' | 'enabled'> & { enabled?: boolean }) {
  const old = findRoutine(r.name)
  const next: Routine = { id: old?.id ?? Date.now(), lastRun: old?.lastRun ?? 0, enabled: r.enabled ?? old?.enabled ?? true, ...r, steps: r.steps.map(s => s.trim()).filter(Boolean).slice(0, 20) }
  save([...load().filter(x => x.id !== next.id), next])
  return next
}

export function deleteRoutine(id: number) { save(load().filter(r => r.id !== id)) }
export function setRoutineEnabled(id: number, enabled: boolean) { save(load().map(r => (r.id === id ? { ...r, enabled } : r))) }
export function markRun(id: number) { save(load().map(r => (r.id === id ? { ...r, lastRun: Date.now() } : r))) }

/** The routine a phrase or "/rutina nombre" asks for, if any. */
export function routineFor(text: string) {
  const t = norm(text)
  const cmd = /^\/?rutina (.+)$/.exec(t)
  if (cmd) return findRoutine(cmd[1]) || null
  // the phrase alone, or with a couple of words around it ("oye, modo trabajo"); a sentence that
  // talks about routines ("cambia la rutina modo trabajo…") is a request, not the trigger
  if (/\brutinas?\b/.test(t)) return null
  const words = (x: string) => x.split(' ').filter(Boolean).length
  return load().find(r => r.enabled && r.phrase && (t === norm(r.phrase) || (t.includes(norm(r.phrase)) && words(t) - words(norm(r.phrase)) <= 2))) || null
}

/** What the agent is told to do when a routine runs. */
export const routinePrompt = (r: Routine) =>
  `Ejecuta ahora la rutina «${r.name}», paso a paso y en orden, con tus herramientas:\n${r.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\nNo preguntes nada que no haga falta. Al acabar, dime en una frase qué has hecho.`

const DAYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
export function triggerText(r: Routine) {
  const parts: string[] = []
  if (r.phrase) parts.push(`«${r.phrase}»`)
  if (r.time) {
    const d = r.days.length === 0 || r.days.length === 7 ? 'cada día' : r.days.join() === '1,2,3,4,5' ? 'L-V' : r.days.join() === '0,6' ? 'fines de semana' : r.days.map(x => DAYS[x]).join(' ')
    parts.push(`${r.time} · ${d}`)
  }
  return parts.join(' · ') || 'manual'
}

function check() {
  const now = new Date()
  const hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
  for (const r of load()) {
    if (!r.enabled || r.time !== hhmm) continue
    if (r.days.length && !r.days.includes(now.getDay())) continue
    if (Date.now() - r.lastRun < 120e3) continue // already ran this minute
    markRun(r.id)
    onDue(r)
  }
}

export function startRoutines(due: typeof onDue, changed: typeof onChange) {
  onDue = due
  onChange = changed
  if (!timer) timer = setInterval(check, 20000)
}
