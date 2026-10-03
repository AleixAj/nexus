// NEXUS speaking first, on its own, but only when it is worth it: a meeting in 10 minutes, the PC
// stuck at full CPU, the battery running out, the disk almost full, and the evening summary.
// Few and bounded: at most a handful a day, nothing at night, and never out loud while you play
// or present. (Ideas from Leon's "bounded proactive pulse" and vierisid/jarvis's suggestions.)
import { Notification, powerMonitor } from 'electron'
import { cpus } from 'os'
import { statfs } from 'fs/promises'
import { loadSettings } from './settings'
import { calendarConnected, events, type CalEvent } from './calendar'
import { powershell } from './lib/powershell'
import { ICON } from './window'

const MAX_A_DAY = 6
const QUIET_FROM = 23, QUIET_TO = 8 // nothing at night (the calendar still warns)

type Out = { notice: (title: string, body: string) => void; evening: () => void }
let out: Out | null = null
let sent = { day: '', n: 0 }
const said = new Set<string>() // each warning once
let calCache: { at: number; list: CalEvent[] } | null = null
let cpuPrev = cpus(), cpuHigh = 0
let eveningDone = ''

const today = () => new Date().toDateString()
const quiet = () => { const h = new Date().getHours(); return h >= QUIET_FROM || h < QUIET_TO }

/** Is the user in a fullscreen game, a presentation, away or with Windows' "do not disturb"? */
export async function userBusy() {
  const r = await powershell(`Add-Type -Namespace Nx -Name Q -MemberDefinition '[DllImport("shell32.dll")] public static extern int SHQueryUserNotificationState(out int s);'; $s = 0; [void][Nx.Q]::SHQueryUserNotificationState([ref]$s); $s`, 8000).catch(() => '5')
  const s = Number(String(r).trim()) // 5 = accepts notifications, 1 = away/locked, 2 = busy, 3 = fullscreen 3D, 4 = presenting, 6 = quiet time, 7 = app fullscreen
  return [1, 2, 3, 4, 7].includes(s)
}

function notice(key: string, title: string, body: string, urgent = false) {
  if (said.has(key)) return
  if (sent.day !== today()) sent = { day: today(), n: 0 }
  if (!urgent && (sent.n >= MAX_A_DAY || quiet())) return
  said.add(key)
  sent.n++
  out?.notice(title, body)
  // Windows hides its own notifications during games and "do not disturb"
  if (Notification.isSupported()) new Notification({ title: 'NEXUS · ' + title, body, icon: ICON, silent: true }).show()
}

function cpuLoad() {
  const now = cpus()
  let idle = 0, total = 0
  now.forEach((c, i) => {
    const p = cpuPrev[i]?.times; if (!p) return
    const t = c.times
    idle += t.idle - p.idle
    total += t.user + t.nice + t.sys + t.irq + t.idle - (p.user + p.nice + p.sys + p.irq + p.idle)
  })
  cpuPrev = now
  return total > 0 ? 1 - idle / total : 0
}

async function tick() {
  const s = loadSettings()
  if (!s.proactive) return
  const now = Date.now()

  // a meeting soon (from the connected calendar)
  if (calendarConnected()) {
    if (!calCache || now - calCache.at > 10 * 60e3) calCache = { at: now, list: await events(1).catch(() => []) }
    for (const e of calCache.list) {
      const mins = (e.start - now) / 60e3
      if (!e.allDay && mins > 0 && mins <= 10) notice('cal' + e.start + e.title, 'Dentro de ' + Math.max(1, Math.round(mins)) + ' min', e.title + (e.place ? ' · ' + e.place : ''), true)
    }
  }

  // the PC stuck at full CPU for 5 minutes
  cpuHigh = cpuLoad() > 0.9 ? cpuHigh + 1 : 0
  if (cpuHigh >= 5) notice('cpu' + Math.floor(now / 7200e3), 'El PC va al límite', 'Lleva 5 minutos con la CPU por encima del 90 %. Pregúntame «¿qué está consumiendo?» y te lo digo.')

  // battery (laptops), checked every 5 minutes only while unplugged
  if (powerMonitor.isOnBatteryPower() && new Date().getMinutes() % 5 === 0) {
    const pct = Number((await powershell('(Get-CimInstance Win32_Battery | Select-Object -First 1).EstimatedChargeRemaining', 8000).catch(() => '')).trim())
    if (pct > 0 && pct <= 15) notice('bat' + today() + (pct <= 7 ? 'b' : 'a'), 'Batería baja', `Queda un ${pct} %. Enchufa el portátil pronto.`, pct <= 7)
  }

  // the main disk almost full, once a day
  if (new Date().getMinutes() === 0) {
    const st = await statfs(process.env.SystemDrive ? process.env.SystemDrive + '\\' : 'C:\\').catch(() => null)
    if (st && st.bavail / st.blocks < 0.05) notice('disk' + today(), 'Disco casi lleno', `Queda menos del 5 % libre en ${process.env.SystemDrive || 'C:'}. Pregúntame qué carpetas ocupan más.`)
  }

  // the evening summary, at its time, as soon as you are not busy (until midnight)
  if (s.eveningReview && eveningDone !== today()) {
    const [h, m] = (s.eveningAt || '21:30').split(':').map(Number)
    const at = new Date(); at.setHours(h, m || 0, 0, 0)
    if (now >= at.getTime()) {
      if (!(await userBusy())) { eveningDone = today(); out?.evening() }
      // playing or presenting: a silent note, and it speaks if you are free before midnight
      else notice('evening' + today(), 'Resumen de la noche', 'Cuando termines, dime «resumen de la noche» y te lo cuento.')
    }
  }
}

export function startPulse(o: Out) {
  out = o
  setInterval(() => { tick().catch(e => console.warn('[pulse]', e?.message || e)) }, 60e3)
}
