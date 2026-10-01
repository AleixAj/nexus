// Reminders and alarms by voice: "avísame en 20 minutos", "pon una alarma a las 7".
import { addReminder, cancelReminders, hm, listReminders, when, type Reminder } from '../reminders'
import { bool, num, oneOf, str, type Tool } from './define'

const REPEAT = { none: '', daily: ' (cada día)', weekdays: ' (de lunes a viernes)' }
const kind = (r: Reminder) => (r.alarm ? 'Alarma' : 'Recordatorio')

/** "in_minutes" or a local "AAAA-MM-DDTHH:MM" to a timestamp (NaN if neither works). */
function dueTime(a: any) {
  if (a.in_minutes != null && Number.isFinite(+a.in_minutes)) return Date.now() + Math.max(0.25, +a.in_minutes) * 60e3
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})/.exec(String(a.at || ''))
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : NaN
}

export const reminderTools: Tool[] = [
  {
    name: 'set_reminder',
    description: 'Crea un recordatorio o alarma. Usa in_minutes para "dentro de X" o at para una hora concreta.',
    params: {
      text: str('Qué recordar, breve'),
      in_minutes: num('Dentro de cuántos minutos'),
      at: str('Fecha y hora local AAAA-MM-DDTHH:MM'),
      alarm: bool('true si es una alarma (suena)'),
      repeat: oneOf(['none', 'daily', 'weekdays'])
    },
    required: ['text'],
    run: a => {
      const at = dueTime(a)
      if (!Number.isFinite(at)) return { result: 'Error: falta la hora (in_minutes o at)', label: 'Recordatorio sin hora' }
      if (at < Date.now() - 60e3) return { result: 'Error: esa hora ya ha pasado', label: 'Hora pasada' }
      const r = addReminder(String(a.text || 'Recordatorio'), at, !!a.alarm, Object.hasOwn(REPEAT, a.repeat) ? a.repeat : 'none')
      return { result: `${kind(r)} creado para ${when(r.at)}${REPEAT[r.repeat]}: ${r.text}`, label: `${kind(r)} · ${hm(r.at)} · ${r.text.slice(0, 36)}` }
    }
  },
  {
    name: 'list_reminders',
    description: 'Lista los recordatorios y alarmas pendientes.',
    run: () => {
      const l = listReminders()
      return { result: l.length ? l.map(r => `- ${when(r.at)}${REPEAT[r.repeat]}: ${r.text}${r.alarm ? ' (alarma)' : ''}`).join('\n') : 'No hay recordatorios pendientes', label: 'Recordatorios revisados' }
    }
  },
  {
    name: 'cancel_reminder',
    description: 'Cancela recordatorios cuyo texto o hora (HH:MM) contenga la consulta; "todos" los borra todos.',
    params: { query: str('Texto, hora o "todos"') },
    required: ['query'],
    run: a => {
      const q = String(a.query || '').toLowerCase().trim()
      const gone = ['todos', 'all'].includes(q) ? listReminders() : listReminders().filter(r => q && (r.text.toLowerCase().includes(q) || hm(r.at).includes(q)))
      if (!gone.length) return { result: 'No hay ninguno que coincida', label: 'Nada que cancelar' }
      cancelReminders(gone.map(r => r.id))
      return { result: 'Cancelado: ' + gone.map(r => r.text).join(' | '), label: gone.length > 1 ? `${gone.length} recordatorios cancelados` : 'Recordatorio cancelado' }
    }
  }
]
