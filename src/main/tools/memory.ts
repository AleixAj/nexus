// The agent saves and forgets facts about the user (Memory panel).
import { CATEGORIES, addFact, forgetFacts, searchChats } from '../memory'
import { isTainted } from '../lib/taint'
import { oneOf, str, type Tool } from './define'

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

export const memoryTools: Tool[] = [
  {
    name: 'remember',
    description: 'Guarda un dato duradero del usuario (gustos, personas, lugares, trabajo).',
    params: { text: str('El dato, en tercera persona y en una frase'), category: oneOf(CATEGORIES) },
    required: ['text', 'category'],
    run: a => {
      // learnt next to a web page, a file or the screen: it could come from there and not from
      // the user, so it waits for the user's OK in the Memory panel
      const pending = isTainted()
      const f = addFact(String(a.text || ''), String(a.category || 'Otros'), pending)
      if (!f) return { result: 'Nada que guardar', label: 'Memoria sin cambios' }
      return pending
        ? { result: 'Anotado como pendiente: el usuario lo confirmará en el panel Memoria. ' + f.text, label: 'Memoria · pendiente de tu OK' }
        : { result: 'Guardado en memoria: ' + f.text, label: 'Memoria · ' + f.text.slice(0, 48) }
    }
  },
  {
    name: 'search_memory',
    description: 'Busca en conversaciones pasadas con el usuario (lo que hablasteis otros días).',
    params: { query: str('Qué buscar') },
    required: ['query'],
    progress: () => 'Buscando en mi memoria',
    run: async a => {
      const hits = await searchChats(String(a.query || ''))
      if (!hits.length) return { result: 'No encuentro nada de eso en conversaciones pasadas.', label: 'Memoria · sin resultados' }
      const day = (t: number) => new Date(t).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
      return { result: hits.map(c => `[${day(c.at)}] Usuario: ${c.q.slice(0, 300)}\nNEXUS: ${c.a.slice(0, 500)}`).join('\n\n'), label: `Memoria · ${hits.length} conversaciones` }
    }
  },
  {
    name: 'forget',
    description: 'Olvida los datos guardados que contengan ese texto.',
    params: { query: str('Palabra o frase') },
    required: ['query'],
    run: a => {
      const gone = forgetFacts(String(a.query || ''))
      return gone.length
        ? { result: 'Olvidado: ' + gone.map(f => f.text).join(' | '), label: `Memoria · ${plural(gone.length, 'dato')} ${gone.length > 1 ? 'olvidados' : 'olvidado'}` }
        : { result: 'No había nada guardado con eso', label: 'Memoria sin cambios' }
    }
  }
]
