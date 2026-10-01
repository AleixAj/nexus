// Reminders and alarms: saved to disk and checked every 5 s. When one is due the
// app shows a Windows notification and says it aloud. Repeating ones move to their next date.
import { readJson, writeJson } from './lib/store'
import { cancelWakeup, scheduleWakeup } from './wakeup'

export type Repeat = 'none' | 'daily' | 'weekdays'
export type Reminder = { id: number; at: number; text: string; alarm: boolean; repeat: Repeat }

const FILE = 'reminders.json'
let list: Reminder[] | null = null
let timer: NodeJS.Timeout | null = null
let onDue: (r: Reminder, late: boolean) => void = () => {}
let onChange: () => void = () => {}

const load = () => (list ??= readJson<Reminder[]>(FILE, []))
function save(next: Reminder[]) {
  list = next
  writeJson(FILE, list)
  onChange()
}

function nextOf(r: Reminder) {
  const d = new Date(r.at)
  do { d.setDate(d.getDate() + 1) } while (r.repeat === 'weekdays' && (d.getDay() === 0 || d.getDay() === 6))
  return d.getTime()
}

function check() {
  const now = Date.now()
  const due = load().filter(r => r.at <= now)
  if (!due.length) return
  for (const r of due) {
    // fired while the PC was off: still said if it is recent, marked as late
    if (now - r.at < 12 * 3600e3) onDue(r, now - r.at > 90e3)
  }
  save(load().flatMap(r => {
    if (r.at > now) return [r]
    if (r.repeat === 'none') return []
    let at = nextOf(r)
    while (at <= now) at = nextOf({ ...r, at })
    scheduleWakeup(r.id, at) // the next time, even if NEXUS is closed by then
    return [{ ...r, at }]
  }))
}

export function startReminders(due: typeof onDue, changed: typeof onChange) {
  onDue = due
  onChange = changed
  if (timer) return
  check()
  timer = setInterval(check, 5000)
}

export const listReminders = () => [...load()].sort((a, b) => a.at - b.at)

export function addReminder(text: string, at: number, alarm = false, repeat: Repeat = 'none') {
  const r: Reminder = { id: Date.now() * 10 + Math.floor(Math.random() * 10), at, text: text.trim().slice(0, 200), alarm, repeat }
  save([...load(), r])
  scheduleWakeup(r.id, r.at)
  return r
}

export function cancelReminders(ids: number[]) {
  ids.forEach(cancelWakeup)
  save(load().filter(r => !ids.includes(r.id)))
}

/** "hoy a las 9:00", "mañana a las 8:30", "lunes, 5 de octubre a las 7:00" */
export function when(t: number) {
  const d = new Date(t)
  const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 864e5)
  const day = days === 0 ? 'hoy' : days === 1 ? 'mañana' : d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  return `${day} a las ${hm(t)}`
}
export const hm = (t: number) => new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
