// Features the user can switch off in Settings → Funciones. A switched-off feature is really
// gone: the AI does not get its tools (so it cannot use them or be told to), its hotkey is
// released and its panel leaves the dock. The list itself (names, explanations) lives in the
// window: renderer/src/app/featureCatalog.js.
import { globalShortcut } from 'electron'
import { loadSettings } from './settings'

/** The tools each feature owns. */
export const FEATURE_TOOLS: Record<string, string[]> = {
  apps: ['open_app', 'open_url'],
  pc: ['pc_control'],
  clipboard: ['read_clipboard', 'write_clipboard'],
  vision: ['look_at_screen', 'look_at_camera', 'look_at_image'],
  system: ['system_status', 'top_processes'],
  reminders: ['set_reminder', 'list_reminders', 'cancel_reminder'],
  calendar: ['calendar_events'],
  routines: ['save_routine', 'list_routines', 'run_routine', 'pause_routine', 'delete_routine'],
  research: ['deep_research'],
  news: ['news'],
  slides: ['create_presentation'],
  music: ['spotify', 'spotify_play', 'spotify_playlists'],
  games: ['steam'],
  priorities: ['day_plan'],
}
const OWNER = new Map(Object.entries(FEATURE_TOOLS).flatMap(([f, tools]) => tools.map(t => [t, f] as const)))

export const isOff = (feature: string) => (loadSettings().disabled || []).includes(feature)

/** The feature that owns a tool, if the user switched it off. */
export function toolOff(tool: string) {
  const f = OWNER.get(tool)
  return f && isOff(f) ? f : null
}

// ---------- hotkeys that belong to a feature ----------
type Hotkey = { feature: string; accel: string; run: () => void }
let hotkeys: Hotkey[] = []

/** Registers the hotkeys of the features that are on (and frees the others). Call again after a change. */
export function applyHotkeys(list?: Hotkey[]) {
  if (list) hotkeys = list
  for (const h of hotkeys) {
    const on = !isOff(h.feature)
    if (on && !globalShortcut.isRegistered(h.accel)) {
      if (!globalShortcut.register(h.accel, h.run)) console.warn(`[hotkey] ${h.accel} está ocupado por otra aplicación`)
    } else if (!on && globalShortcut.isRegistered(h.accel)) globalShortcut.unregister(h.accel)
  }
}
