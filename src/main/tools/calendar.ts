// "¿Qué tengo mañana?", "¿cuándo es la reunión con…?": the user's calendar (read only).
import { calendarConnected, eventLine, events } from '../calendar'
import { num, said, type Tool } from './define'

export const calendarTools: Tool[] = [
  {
    name: 'calendar_events', readOnly: true,
    description: 'Eventos del calendario del usuario desde hoy hasta dentro de N días.',
    params: { days: num('Cuántos días mirar (1 = hoy, 7 = la semana)') },
    progress: () => 'Mirando tu calendario',
    run: async a => {
      if (!calendarConnected()) return said('El calendario no está conectado: se conecta en Ajustes → Calendario con la dirección secreta iCal.')
      const days = Math.max(1, Math.min(31, Math.round(Number(a.days) || 1)))
      const l = await events(days)
      return { result: l.length ? l.map(eventLine).join('\n') : 'No hay eventos en esos días.', label: `Calendario · ${l.length} eventos` }
    }
  }
]
