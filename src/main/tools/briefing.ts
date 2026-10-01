// The summary of the day: weather, today's reminders and a few interesting news (no politics).
import { getWorld } from '../world'
import { getNews } from '../news'
import { hm, listReminders } from '../reminders'
import { loadSettings } from '../settings'
import type { Tool } from './define'
import { calendarConnected, eventLine, events } from '../calendar'

async function briefing() {
  const s = loadSettings()
  const [world, news, cal] = await Promise.all([getWorld().catch(() => null), getNews(s.newsTopics, s.newsAvoid).catch(() => []), calendarConnected() ? events(1).catch(() => []) : Promise.resolve(null)])
  const endOfDay = new Date().setHours(23, 59, 59, 999)
  const today = listReminders().filter(r => r.at <= endOfDay)
  return [
    `Hoy es ${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}.`,
    world?.temp != null ? `Tiempo en ${world.city}: ${world.temp} °C, ${world.sky.toLowerCase()}, máxima ${world.max} y mínima ${world.min}.` : 'Tiempo: no disponible.',
    cal ? (cal.length ? 'Calendario de hoy:\n' + cal.map(e => '- ' + eventLine(e)).join('\n') : 'Calendario: nada hoy.') : '',
    today.length ? 'Recordatorios de hoy:\n' + today.map(r => `- ${hm(r.at)} ${r.text}`).join('\n') : 'Sin recordatorios para hoy.',
    news.length ? 'Noticias interesantes (elige las 3 mejores):\n' + news.slice(0, 8).map(x => `- ${x.title} (${x.source})`).join('\n') : '',
  ].filter(Boolean).join('\n')
}

export const briefingTools: Tool[] = [
  {
    name: 'daily_briefing', readOnly: true,
    description: 'Resumen del día: fecha, tiempo, recordatorios de hoy y noticias. Para "buenos días", "resumen del día" o "qué tengo hoy".',
    progress: () => 'Preparando el resumen',
    run: async () => ({ result: await briefing(), label: 'Resumen del día' })
  }
]
