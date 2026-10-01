// Every tool the agent can use, in one list. To add one: write it in the file of its
// group (or a new file) and add that list here.
import type { Settings } from '../settings'
import type { Group, RunCtx, Tool, ToolResult } from './define'
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

const ALL: Tool[] = [...appTools, ...musicTools, ...gameTools, ...memoryTools, ...reminderTools, ...calendarTools, ...routineTools, ...newsTools, ...briefingTools, ...visionTools, ...pcTools, ...systemTools, ...webTools, ...researchTools, ...slideTools, ...fileTools]
const BY_NAME = new Map(ALL.map(t => [t.name, t]))

/** The switches in Settings → Agent. */
const enabled = (g: Group | undefined, s: Settings) =>
  !g || g === 'base' || (g === 'web' && s.agentWeb) || (g === 'files' && s.agentFiles) || (g === 'write' && s.agentWrite) || (g === 'shell' && s.agentShell)

/** Definitions in OpenAI function-calling format, only for what the user allowed. */
export function toolDefs(s: Settings) {
  return ALL.filter(t => enabled(t.group, s)).map(t => ({
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
