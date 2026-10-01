// Deep research: several searches planned without any AI call, sources deduplicated and
// numbered, the best pages read in parallel; the agent then writes the report with [n] citations
// and a "confianza y lagunas" section. Idea from JARVIS-OS (actions/deep_research.py, MIT),
// written for NEXUS. Uses DuckDuckGo (no key) so it does not spend the AI's search quota.
import { ddgResults, readWebpage, type Hit } from './web'
import { short } from '../lib/text'
import { str, oneOf, type Tool } from './define'

/** Search angles for a topic: different sides of it, with no AI call. */
function plan(topic: string, depth: string) {
  const year = new Date().getFullYear()
  const angles = [
    topic,
    `${topic} ${year}`,
    `${topic} explicación datos`,
    `${topic} ventajas inconvenientes`,
    `${topic} fuentes oficiales estudio`,
    `${topic} críticas problemas`,
    `${topic} últimas noticias`,
    `${topic} comparativa alternativas`,
  ]
  return angles.slice(0, depth === 'rapida' ? 3 : depth === 'completa' ? 8 : 5)
}

const key = (u: string) => { try { const x = new URL(u); return x.hostname.replace(/^www\./, '') + x.pathname.replace(/\/$/, '') } catch { return u } }

export const researchTools: Tool[] = [
  {
    name: 'deep_research', group: 'web', readOnly: true,
    description: 'Investigación a fondo de un tema (varias búsquedas, fuentes leídas y numeradas). Para preguntas complejas o "investiga", "hazme un informe". Después escribe un informe con citas [n] y una sección «Confianza y lagunas».',
    params: { topic: str('El tema, concreto'), depth: oneOf(['rapida', 'normal', 'completa']) },
    required: ['topic'],
    progress: a => 'Investigando · ' + short(a.topic, 36),
    run: async (a, ctx) => {
      const topic = String(a.topic || '').trim()
      if (!topic) return { result: 'Falta el tema', label: 'Sin tema' }
      const queries = plan(topic, String(a.depth || 'normal'))
      // 1 · the searches, at the same time
      ctx.progress(`Investigando · ${queries.length} búsquedas`)
      const lists = await Promise.all(queries.map(q => ddgResults(q, 6, ctx.signal).catch(() => [] as Hit[])))
      // 2 · one catalogue of sources, no repeats, mixing the angles
      const seen = new Set<string>(), sources: Hit[] = []
      for (let i = 0; i < 6; i++) for (const l of lists) {
        const h = l[i]
        if (h && !seen.has(key(h.url))) { seen.add(key(h.url)); sources.push(h) }
      }
      if (!sources.length) return { result: 'No he encontrado fuentes (puede que el buscador no responda ahora). Responde con lo que sepas y dilo.', label: 'Investigación sin fuentes' }
      // 3 · read the best ones
      const toRead = sources.slice(0, a.depth === 'completa' ? 8 : a.depth === 'rapida' ? 3 : 6)
      ctx.progress(`Leyendo ${toRead.length} fuentes`)
      const pages = await Promise.all(toRead.map(s => readWebpage(s.url).then(t => t.replace(/^# .*\n/, '').slice(0, 2200)).catch(() => '')))
      const catalogue = sources.slice(0, 14).map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`).join('\n')
      const evidence = toRead.map((s, i) => `[${i + 1}] ${s.title}\n${pages[i] || s.snippet}`).join('\n\n')
      const more = sources.slice(toRead.length, 14).map((s, i) => `[${toRead.length + i + 1}] ${s.snippet}`).join('\n')
      return {
        result: `Fuentes (cítalas como [n]):\n${catalogue}\n\nCONTENIDO LEÍDO:\n${evidence}${more ? '\n\nOTROS RESÚMENES:\n' + more : ''}\n\nEscribe ahora el informe: resumen de 2 frases (se lee en voz alta), línea en blanco, desarrollo con citas [n], y al final «Confianza y lagunas» (qué está claro, qué no y dónde discrepan las fuentes). No inventes nada que no esté en las fuentes.`,
        label: `Investigación · ${sources.length} fuentes, ${toRead.length} leídas`,
      }
    }
  }
]
