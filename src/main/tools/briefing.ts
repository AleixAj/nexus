// The summaries of the day. Morning: weather, today's calendar and reminders, a few interesting
// news (no politics) and the day's priorities. Evening: what got done (priorities and what NEXUS
// did), what is left and what tomorrow brings.
import { getWorld } from '../world'
import { getNews } from '../news'
import { hm, listReminders } from '../reminders'
import { loadSettings } from '../settings'
import { oneOf, str, said, type Tool } from './define'
import { calendarConnected, eventLine, events } from '../calendar'
import { markDone, setPlan, todayPlan } from '../dayplan'
import { listActivity } from '../activity'

const planLines = () => todayPlan().map((p, i) => `${i + 1}. ${p.done ? '[hecho] ' : ''}${p.text}`).join('\n')

async function morning() {
  const s = loadSettings()
  const [world, news, cal] = await Promise.all([getWorld().catch(() => null), getNews(s.newsTopics, s.newsAvoid).catch(() => []), calendarConnected() ? events(1).catch(() => []) : Promise.resolve(null)])
  const endOfDay = new Date().setHours(23, 59, 59, 999)
  const today = listReminders().filter(r => r.at <= endOfDay)
  const plan = todayPlan()
  return [
    `Hoy es ${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}.`,
    world?.temp != null ? `Tiempo en ${world.city}: ${world.temp} °C, ${world.sky.toLowerCase()}, máxima ${world.max} y mínima ${world.min}.` : 'Tiempo: no disponible.',
    cal ? (cal.length ? 'Calendario de hoy:\n' + cal.map(e => '- ' + eventLine(e)).join('\n') : 'Calendario: nada hoy.') : '',
    today.length ? 'Recordatorios de hoy:\n' + today.map(r => `- ${hm(r.at)} ${r.text}`).join('\n') : 'Sin recordatorios para hoy.',
    news.length ? 'Noticias interesantes (elige las 3 mejores):\n' + news.slice(0, 8).map(x => `- ${x.title} (${x.source})`).join('\n') : '',
    plan.length ? 'Prioridades de hoy:\n' + planLines()
      : 'Aún no tiene prioridades para hoy: al final pregúntale cuáles son sus tres cosas importantes de hoy (cuando conteste, guárdalas con day_plan set).',
  ].filter(Boolean).join('\n')
}

async function evening() {
  const tomorrow0 = new Date(); tomorrow0.setHours(24, 0, 0, 0)
  const tomorrow1 = tomorrow0.getTime() + 864e5
  const [cal] = await Promise.all([calendarConnected() ? events(2).catch(() => []) : Promise.resolve(null)])
  const start = new Date().setHours(0, 0, 0, 0)
  const done = listActivity().filter(a => a.at >= start && !a.undone)
  const left = listReminders().filter(r => r.at < tomorrow0.getTime())
  const tomorrow = listReminders().filter(r => r.at >= tomorrow0.getTime() && r.at < tomorrow1)
  const plan = todayPlan()
  return [
    'Resumen de la noche (breve, cálido y en pocas frases):',
    plan.length ? 'Prioridades de hoy:\n' + planLines() + '\nPregunta por las que no están hechas; si dice que sí, márcalas con day_plan done.' : 'Hoy no fijó prioridades.',
    done.length ? `Lo que NEXUS hizo hoy (${done.length}): ` + done.slice(0, 8).map(a => a.label).join('; ') : '',
    left.length ? 'Recordatorios que quedan hoy:\n' + left.map(r => `- ${hm(r.at)} ${r.text}`).join('\n') : '',
    cal ? (cal.filter(e => e.start >= tomorrow0.getTime()).length ? 'Mañana en el calendario:\n' + cal.filter(e => e.start >= tomorrow0.getTime()).map(e => '- ' + eventLine(e)).join('\n') : 'Mañana: nada en el calendario.') : '',
    tomorrow.length ? 'Recordatorios de mañana:\n' + tomorrow.map(r => `- ${hm(r.at)} ${r.text}`).join('\n') : '',
  ].filter(Boolean).join('\n')
}

export const briefingTools: Tool[] = [
  {
    name: 'daily_briefing', readOnly: true,
    description: 'Resumen del día. when=morning: "buenos días", "qué tengo hoy". when=evening: "resumen de la noche", "qué tal el día".',
    params: { when: oneOf(['morning', 'evening']) },
    progress: a => a.when === 'evening' ? 'Preparando el resumen de la noche' : 'Preparando el resumen',
    run: async a => a.when === 'evening'
      ? { result: await evening(), label: 'Resumen de la noche' }
      : { result: await morning(), label: 'Resumen del día' }
  },
  {
    name: 'day_plan', trivial: true,
    description: 'Prioridades de hoy (máx. 3): set las guarda, done marca una como hecha, list las dice.',
    params: { action: oneOf(['set', 'done', 'list']), items: { type: 'array', items: { type: 'string' }, description: 'Para set: las prioridades, frases cortas' }, which: str('Para done: número o palabras de la prioridad') },
    required: ['action'],
    run: async a => {
      if (a.action === 'set') {
        const l = setPlan(Array.isArray(a.items) ? a.items : [])
        return l.length ? { result: 'Guardadas: ' + l.map(x => x.text).join('; '), label: 'Prioridades de hoy · ' + l.length } : said('Faltan las prioridades')
      }
      if (a.action === 'done') {
        const p = markDone(String(a.which || ''))
        return p ? { result: 'Hecha: ' + p.text, label: '✓ ' + p.text.slice(0, 40) } : said('No encuentro esa prioridad')
      }
      return { result: todayPlan().length ? planLines() : 'No hay prioridades para hoy', label: 'Prioridades de hoy' }
    }
  }
]
