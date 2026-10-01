// The user's calendar through its secret iCal address (Google Calendar, Outlook, iCloud…):
// no account sign-in and no keys. The address is stored encrypted; events are cached 15 min.
import ICAL from 'ical.js'
import { readSecretJson, writeSecretJson } from './lib/store'

export type CalEvent = { title: string; start: number; end: number; allDay: boolean; place: string }

const FILE = 'calendar.bin'
let url: string = readSecretJson<{ url?: string }>(FILE, {}).url || ''
let cache: { at: number; ics: string } | null = null

export const calendarConnected = () => !!url

export async function setCalendarUrl(next: string) {
  const u = next.trim().replace(/^webcal:/i, 'https:')
  if (u && !/^https:\/\/\S+$/i.test(u)) throw new Error('Pega la dirección que empieza por https:// (o webcal://)')
  if (u) {
    // check it really is a calendar before keeping it
    const text = await download(u)
    if (!text.includes('BEGIN:VCALENDAR')) throw new Error('Esa dirección no devuelve un calendario')
    cache = { at: Date.now(), ics: text }
  } else cache = null
  url = u
  writeSecretJson(FILE, { url })
}

async function download(u: string) {
  const res = await fetch(u, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'NEXUS desktop assistant' } }).catch(() => { throw new Error('No puedo abrir esa dirección; revisa que esté bien copiada') })
  if (!res.ok) throw new Error(`El calendario no responde (HTTP ${res.status})`)
  return res.text()
}

/** Events from now (start of today) to `days` days ahead, recurring ones expanded. */
export async function events(days = 1): Promise<CalEvent[]> {
  if (!url) return []
  if (!cache || Date.now() - cache.at > 15 * 60e3) {
    try { cache = { at: Date.now(), ics: await download(url) } } catch (e) { if (!cache) throw e } // offline: the last copy
  }
  const from = new Date().setHours(0, 0, 0, 0), to = from + days * 864e5
  const out: CalEvent[] = []
  const cal = new ICAL.Component(ICAL.parse(cache.ics))
  for (const v of cal.getAllSubcomponents('vevent')) {
    const ev = new ICAL.Event(v)
    const push = (s: ICAL.Time, e: ICAL.Time | null) => {
      const start = s.toJSDate().getTime(), end = e ? e.toJSDate().getTime() : start
      if (end >= from && start < to) out.push({ title: ev.summary || '(sin título)', start, end, allDay: s.isDate, place: ev.location || '' })
    }
    if (ev.isRecurrenceException()) continue // the series below already covers it
    if (!ev.isRecurring()) { push(ev.startDate, ev.endDate); continue }
    const it = ev.iterator()
    for (let n = 0, next = it.next(); next && n < 500; next = it.next(), n++) {
      if (next.toJSDate().getTime() >= to) break
      const o = ev.getOccurrenceDetails(next)
      push(o.startDate, o.endDate)
    }
  }
  return out.sort((a, b) => a.start - b.start)
}

const hm = (t: number) => new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
export const eventLine = (e: CalEvent) =>
  `${new Date(e.start).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })} ${e.allDay ? 'todo el día' : hm(e.start) + '-' + hm(e.end)}: ${e.title}${e.place ? ` (${e.place})` : ''}`
