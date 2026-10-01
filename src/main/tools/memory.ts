// The agent saves and forgets facts about the user (Memory panel).
import { CATEGORIES, addFact, forgetFacts } from '../memory'
import { oneOf, str, type Tool } from './define'

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

export const memoryTools: Tool[] = [
  {
    name: 'remember',
    description: 'Guarda un dato duradero del usuario (gustos, personas, lugares, trabajo).',
    params: { text: str('El dato, en tercera persona y en una frase'), category: oneOf(CATEGORIES) },
    required: ['text', 'category'],
    run: a => {
      const f = addFact(String(a.text || ''), String(a.category || 'Otros'))
      return f ? { result: 'Guardado en memoria: ' + f.text, label: 'Memoria · ' + f.text.slice(0, 48) } : { result: 'Nada que guardar', label: 'Memoria sin cambios' }
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
