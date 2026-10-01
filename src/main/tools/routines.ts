// The agent creates, changes, runs and removes routines when the user asks in words.
import { deleteRoutine, findRoutine, listRoutines, markRun, saveRoutine, setRoutineEnabled, triggerText } from '../routines'
import { bool, said, str, type Tool } from './define'

const DAY_NAMES: Record<string, number> = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, miércoles: 3, jueves: 4, viernes: 5, sabado: 6, sábado: 6 }
function parseDays(v: unknown): number[] {
  const t = String(v || '').toLowerCase()
  if (!t || /cada d[ií]a|todos|diario/.test(t)) return []
  if (/laborables|lunes a viernes|entre semana/.test(t)) return [1, 2, 3, 4, 5]
  if (/fin(es)? de semana/.test(t)) return [0, 6]
  return [...new Set(Object.entries(DAY_NAMES).filter(([n]) => t.includes(n)).map(([, d]) => d))].sort()
}
const notFound = (name: string) => said(`No tengo ninguna rutina llamada «${name}»`)

export const routineTools: Tool[] = [
  {
    name: 'save_routine',
    description: 'Crea o cambia una rutina: pasos en frases sencillas que harás tú con tus herramientas. Se lanza con una frase, a una hora o a mano.',
    params: {
      name: str('Nombre corto'),
      steps: { type: 'array', items: { type: 'string' }, description: 'Pasos en orden, una acción por paso ("Abre VS Code", "Pon mi lista Focus en Spotify")' },
      phrase: str('Frase que la lanza, si la hay ("modo trabajo")'),
      time: str('Hora HH:MM si se lanza sola'),
      days: str('Días: "cada día", "lunes a viernes", "fines de semana" o nombres de días')
    },
    required: ['name', 'steps'],
    run: a => {
      const time = /^\d{1,2}:\d{2}$/.test(String(a.time || '')) ? String(a.time).padStart(5, '0') : ''
      const r = saveRoutine({ name: String(a.name || 'Rutina').slice(0, 40), steps: Array.isArray(a.steps) ? a.steps.map(String) : [String(a.steps || '')], phrase: String(a.phrase || '').slice(0, 60), time, days: parseDays(a.days) })
      return { result: `Rutina «${r.name}» guardada (${triggerText(r)}) con ${r.steps.length} pasos.`, label: `Rutina guardada · ${r.name}` }
    }
  },
  {
    name: 'list_routines', readOnly: true,
    description: 'Lista las rutinas del usuario.',
    run: () => {
      const l = listRoutines()
      return { result: l.length ? l.map(r => `- ${r.name} (${triggerText(r)}${r.enabled ? '' : ', pausada'}): ${r.steps.join('; ')}`).join('\n') : 'No hay rutinas.', label: 'Rutinas revisadas' }
    }
  },
  {
    name: 'run_routine',
    description: 'Ejecuta ahora una rutina: devuelve sus pasos para que los hagas en orden.',
    params: { name: str('Nombre de la rutina') },
    required: ['name'],
    run: a => {
      const r = findRoutine(String(a.name || ''))
      if (!r) return notFound(String(a.name || ''))
      markRun(r.id)
      return { result: `Haz ahora estos pasos en orden:\n${r.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`, label: `Rutina · ${r.name}` }
    }
  },
  {
    name: 'pause_routine',
    description: 'Pausa o reanuda una rutina.',
    params: { name: str('Nombre'), enabled: bool('true = activa, false = pausada') },
    required: ['name', 'enabled'],
    run: a => {
      const r = findRoutine(String(a.name || ''))
      if (!r) return notFound(String(a.name || ''))
      setRoutineEnabled(r.id, !!a.enabled)
      return said(`Rutina «${r.name}» ${a.enabled ? 'activada' : 'pausada'}`)
    }
  },
  {
    name: 'delete_routine',
    description: 'Borra una rutina.',
    params: { name: str('Nombre') },
    required: ['name'],
    run: a => {
      const r = findRoutine(String(a.name || ''))
      if (!r) return notFound(String(a.name || ''))
      deleteRoutine(r.id)
      return said(`Rutina «${r.name}» borrada`)
    }
  }
]
