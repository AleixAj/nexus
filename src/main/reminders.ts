// Reminders and alarms: saved to disk, checked every 5 s, announced with a Windows
// notification and by voice. Repeating ones move to their next date after firing.
import { app } from 'electron'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'

export type Reminder = { id: number; at: number; text: string; alarm: boolean; repeat: 'none' | 'daily' | 'weekdays' }

const file = () => join(app.getPath('userData'), 'reminders.json')
let list: Reminder[] | null = null
let timer: NodeJS.Timeout | null = null
let onDue: (r: Reminder, late: boolean) => void = () => {}
let onChange: () => void = () => {}

function load() {
  if (list) return list
  list = []
  try { if (existsSync(file())) list = JSON.parse(readFileSync(file(), 'utf8')) } catch { list = [] }
  return list!
}

function save() {
  const tmp = file() + '.tmp'
  writeFileSync(tmp, JSON.stringify(load(), null, 1))
  renameSync(tmp, file())
  onChange()
}

function nextOf(r: Reminder) {
  const d = new Date(r.at)
  do { d.setDate(d.getDate() + 1) } while (r.repeat === 'weekdays' && (d.getDay() === 0 || d.getDay() === 6))
  return d.getTime()
}

function check() {
  const now = Date.now()
  let changed = false
  for (const r of [...load()]) {
    if (r.at > now) continue
    // fired while the PC was off: still said if it is recent, marked as late
    const late = now - r.at > 90e3
    if (now - r.at < 12 * 3600e3) onDue(r, late)
    if (r.repeat === 'none') list = load().filter(x => x.id !== r.id)
    else { let at = nextOf(r); while (at <= now) at = nextOf({ ...r, at }); r.at = at }
    changed = true
  }
  if (changed) save()
}

export function startReminders(due: typeof onDue, changed: typeof onChange) {
  onDue = due
  onChange = changed
  if (timer) return
  check()
  timer = setInterval(check, 5000)
}

export const listReminders = () => [...load()].sort((a, b) => a.at - b.at)

export function addReminder(text: string, at: number, alarm = false, repeat: Reminder['repeat'] = 'none') {
  const r: Reminder = { id: Date.now() * 10 + Math.floor(Math.random() * 10), at, text: text.trim().slice(0, 200), alarm, repeat }
  list = [...load(), r]
  save()
  return r
}

export function cancelReminder(id: number) {
  list = load().filter(r => r.id !== id)
  save()
}

// ---------- agent tools ----------
const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[]) =>
  ({ type: 'function', function: { name, description, parameters: { type: 'object', properties, required } } })

export const REMINDER_TOOLS = [
  fn('set_reminder', 'Crea un recordatorio o alarma. Usa in_minutes para "dentro de X" o at para una hora concreta.', {
    text: { type: 'string', description: 'Qué recordar, breve' },
    in_minutes: { type: 'number', description: 'Dentro de cuántos minutos' },
    at: { type: 'string', description: 'Fecha y hora local AAAA-MM-DDTHH:MM' },
    alarm: { type: 'boolean', description: 'true si es una alarma (suena)' },
    repeat: { type: 'string', enum: ['none', 'daily', 'weekdays'] }
  }, ['text']),
  fn('list_reminders', 'Lista los recordatorios y alarmas pendientes.', {}, []),
  fn('cancel_reminder', 'Cancela recordatorios cuyo texto o hora (HH:MM) contenga la consulta; "todos" los borra todos.', { query: { type: 'string' } }, ['query'])
]

const hm = (t: number) => new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
export function when(t: number) {
  const d = new Date(t), today = new Date()
  const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(today).setHours(0, 0, 0, 0)) / 864e5)
  const day = days === 0 ? 'hoy' : days === 1 ? 'mañana' : d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  return `${day} a las ${hm(t)}`
}
const REP = { none: '', daily: ' (cada día)', weekdays: ' (de lunes a viernes)' }

export function runReminderTool(name: string, a: any): { result: string; label: string } | null {
  if (name === 'set_reminder') {
    let at = NaN
    if (a.in_minutes != null && Number.isFinite(+a.in_minutes)) at = Date.now() + Math.max(0.25, +a.in_minutes) * 60e3
    else if (a.at) {
      const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})/.exec(String(a.at))
      if (m) at = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime()
    }
    if (!Number.isFinite(at)) return { result: 'Error: falta la hora (in_minutes o at)', label: 'Recordatorio sin hora' }
    if (at < Date.now() - 60e3) return { result: 'Error: esa hora ya ha pasado', label: 'Hora pasada' }
    const repeat = ['daily', 'weekdays'].includes(a.repeat) ? a.repeat : 'none'
    const r = addReminder(String(a.text || 'Recordatorio'), at, !!a.alarm, repeat)
    return { result: `${r.alarm ? 'Alarma' : 'Recordatorio'} creado para ${when(r.at)}${REP[r.repeat]}: ${r.text}`, label: `${r.alarm ? 'Alarma' : 'Recordatorio'} · ${hm(r.at)} · ${r.text.slice(0, 36)}` }
  }
  if (name === 'list_reminders') {
    const l = listReminders()
    return { result: l.length ? l.map(r => `- ${when(r.at)}${REP[r.repeat]}: ${r.text}${r.alarm ? ' (alarma)' : ''}`).join('\n') : 'No hay recordatorios pendientes', label: 'Recordatorios revisados' }
  }
  if (name === 'cancel_reminder') {
    const q = String(a.query || '').toLowerCase().trim()
    const gone = q === 'todos' || q === 'all' ? listReminders() : listReminders().filter(r => q && (r.text.toLowerCase().includes(q) || hm(r.at).includes(q)))
    gone.forEach(r => { list = load().filter(x => x.id !== r.id) })
    if (gone.length) save()
    return { result: gone.length ? 'Cancelado: ' + gone.map(r => r.text).join(' | ') : 'No hay ninguno que coincida', label: gone.length ? `${gone.length} recordatorio${gone.length > 1 ? 's' : ''} cancelado${gone.length > 1 ? 's' : ''}` : 'Nada que cancelar' }
  }
  return null
}
