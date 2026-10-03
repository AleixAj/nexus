// Every tool the agent can use, in one list. To add one: write it in the file of its
// group (or a new file) and add that list here.
import type { Settings } from '../settings'
import type { Group, RunCtx, Tool, ToolResult } from './define'
import { activityTools } from './activity'
import { appTools } from './apps'
import { briefingTools } from './briefing'
import { calendarTools } from './calendar'
import { fileTools } from './files'
import { gameTools } from './games'
import { memoryTools } from './memory'
import { musicTools } from './music'
import { newsTools } from './news'
import { pcTools } from './pc'
import { reminderTools } from './reminders'
import { researchTools } from './research'
import { routineTools } from './routines'
import { slideTools } from './slides'
import { systemTools } from './system'
import { visionTools } from './vision'
import { webTools } from './web'

const ALL: Tool[] = [...activityTools, ...appTools, ...musicTools, ...gameTools, ...memoryTools, ...reminderTools, ...calendarTools, ...routineTools, ...newsTools, ...briefingTools, ...visionTools, ...pcTools, ...systemTools, ...webTools, ...researchTools, ...slideTools, ...fileTools]
const BY_NAME = new Map(ALL.map(t => [t.name, t]))

/** The switches in Settings → Agent. */
const enabled = (g: Group | undefined, s: Settings) =>
  !g || g === 'base' || (g === 'web' && s.agentWeb) || (g === 'files' && s.agentFiles) || (g === 'write' && s.agentWrite) || (g === 'shell' && s.agentShell)

// Every tool definition is paid in free tokens on every request (44 of them are ~4,000 tokens),
// so a question only gets the tools of its topic plus a few basic ones. A question that fits
// no topic ("explícame la relatividad") gets the basic ones and the web.
const CORE = new Set(['open_app', 'open_url', 'remember', 'search_memory', 'web_search'])
const TOPICS: [Tool[], RegExp][] = [
  [musicTools, /musica|cancion|spotify|playlist|lista|volumen|suena|sonando|\bpon\b|ponme|pausa|reanuda|siguiente|anterior|artista|album|disco|me gusta|aleatori|escuch|\btema\b|sube|baja|silenci|mute/],
  [gameTools, /juego|steam|jugar|juega|partida|instala|actualiza/],
  [memoryTools, /olvida|que sabes de mi|recuerdas|sobre mi|me conoces/],
  [reminderTools, /avis|recuerda|recordatorio|alarma|temporizador|despiert|cronometro|en \d+ (min|hora|seg)|a las \d/],
  [calendarTools, /calendario|agenda|evento|reunion|cita|que tengo|planes|semana|manana|\bhoy\b|lunes|martes|miercoles|jueves|viernes|sabado|domingo/],
  [routineTools, /rutina|\bmodo\b|cuando (te )?diga|automatiza|cada (dia|manana|noche)/],
  [[...newsTools, ...briefingTools], /noticia|titular|actualidad|periodico|que pasa|resumen|buenos dias|buenas noches|briefing|novedad|prioridad|objetivo|que tal el dia|hecho hoy|plan/],
  [visionTools, /pantalla|captura|imagen|foto|camara|webcam|\bmira|\bves\b|esto|este error|adjuntos|archivo actual|\.(pdf|png|jpe?g|webp)\b/],
  [pcTools, /bloque|apaga|suspend|reinici|brillo|pantalla|portapapeles|copiad|copia|pega|traduc|corrige|ordenador|\bpc\b|equipo/],
  [systemTools, /cierra|mata|termina|cpu|\bram\b|memoria|gpu|grafica|proceso|rendimiento|temperatura|disco|lento|consum|powershell|comando|terminal|estado|ventilador|\bred\b/],
  [[...webTools, ...researchTools], /busca|internet|\bweb|google|wikipedia|investiga|quien|que es|cuando|donde|precio|cuanto|ultim|actual|enlace|url|pagina|http|noticia|informa|averigua|compara/],
  [activityTools, /deshaz|deshacer|deshazlo|como estaba|revierte|vuelve atras/],
  [slideTools, /presentacion|diapositiva|powerpoint|pptx|slides/],
  [fileTools, /archivo|carpeta|fichero|documento|escritorio|descarga|guarda|crea|borra|elimina|mueve|renombra|\blee|leer|\btxt\b|docx|pdf|ruta|[a-z]:\\|adjuntos|escribe en|nota/],
]
const plain = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** True if what the user said touches something NEXUS has tools for (then it is not small talk). */
export const hasTopic = (said: string) => TOPICS.some(([, re]) => re.test(plain(said)))

/** The tools worth sending for what the user said (chat = small talk: only the memory ones). */
export function pickTools(said: string, chat = false): Set<string> | null {
  if (chat) return new Set(['remember', 'search_memory'])
  const text = plain(said)
  const hit = TOPICS.filter(([, re]) => re.test(text))
  const lists = hit.length ? hit.map(([list]) => list) : [webTools, researchTools, memoryTools]
  return new Set([...CORE, ...lists.flat().map(t => t.name)])
}

/** Definitions in OpenAI function-calling format, only for what the user allowed (and, if given, picked). */
export function toolDefs(s: Settings, only: Set<string> | null = null) {
  return ALL.filter(t => enabled(t.group, s) && (!only || only.has(t.name))).map(t => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: { type: 'object', properties: t.params || {}, required: t.required || [] } }
  }))
}

export const findTool = (name: string) => BY_NAME.get(name)

/** Runs a tool; errors come back as text for the model, never thrown (except an abort). */
export async function runTool(t: Tool, args: any, ctx: RunCtx): Promise<ToolResult> {
  try {
    return await t.run(args, ctx)
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e
    const msg = e?.code === 'ENOENT' ? 'No existe esa ruta' : e?.code === 'EPERM' || e?.code === 'EACCES' ? 'Sin permiso de Windows para esa ruta' : e?.message || String(e)
    return { result: 'Error: ' + msg, label: 'No se pudo completar · ' + msg.slice(0, 40) }
  }
}

export { userFolders } from './files'
export { spotify } from './music'
export type { RunCtx, Tool, ToolResult } from './define'
