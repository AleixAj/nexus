// "¿Qué noticias hay hoy?": the same news as the News panel, with the user's topics and filters.
import { loadSettings } from '../settings'
import { TOPICS, getNews } from '../news'
import { oneOf, type Tool } from './define'

export const newsTools: Tool[] = [
  {
    name: 'news', readOnly: true,
    description: 'Noticias de hoy según los temas que le gustan al usuario (sin política). Para resúmenes del día o "qué hay de nuevo".',
    params: { topic: oneOf(['mine', ...Object.keys(TOPICS)], 'mine = sus temas guardados') },
    progress: () => 'Leyendo las noticias',
    run: async a => {
      const s = loadSettings()
      const topic = Object.hasOwn(TOPICS, a.topic) ? a.topic : s.newsTopics
      const items = (await getNews(topic, s.newsAvoid)).slice(0, 12)
      if (!items.length) return { result: 'No hay noticias nuevas de esos temas ahora mismo.', label: 'Sin noticias nuevas' }
      return {
        result: items.map((x, i) => `${i + 1}. ${x.title} (${x.source})\n   ${x.summary}`).join('\n'),
        label: `Noticias leídas · ${items.length}`
      }
    }
  }
]
