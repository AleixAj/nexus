// Reminders that sound even with NEXUS closed: every reminder also leaves a one-time task in the
// Windows Task Scheduler that opens NEXUS in the background at that time (idea from JARVIS-OS:
// actions/reminder.py). If NEXUS is already running the task does nothing: the second instance
// sees "--background" and quits. The tasks are in the user's own scheduler, no admin needed.
import { app } from 'electron'
import { execFile } from 'child_process'
import { writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export const BACKGROUND_ARG = '--background'
const name = (id: number) => `NEXUS\\Recordatorio-${id}`
const pad = (n: number) => String(n).padStart(2, '0')
const local = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` }
const xmlEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const schtasks = (args: string[]) => new Promise<boolean>(res => execFile('schtasks', args, { windowsHide: true }, err => res(!err)))

/** Only the installed app schedules tasks (a development build has no stable path to start). */
const enabled = () => app.isPackaged && process.platform === 'win32'

export async function scheduleWakeup(id: number, at: number) {
  if (!enabled() || at < Date.now()) return
  // the task starts one minute early: NEXUS needs a moment to open before the reminder is due
  const start = Math.max(Date.now() + 15000, at - 60e3)
  const xml = `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo><Description>NEXUS: abre el asistente para avisarte de un recordatorio.</Description></RegistrationInfo>
  <Triggers><TimeTrigger><StartBoundary>${local(start)}</StartBoundary><EndBoundary>${local(at + 12 * 3600e3)}</EndBoundary><Enabled>true</Enabled></TimeTrigger></Triggers>
  <Principals><Principal id="Author"><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <StartWhenAvailable>true</StartWhenAvailable><WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit><DeleteExpiredTaskAfter>PT1H</DeleteExpiredTaskAfter>
  </Settings>
  <Actions Context="Author"><Exec><Command>${xmlEscape(process.execPath)}</Command><Arguments>${BACKGROUND_ARG}</Arguments></Exec></Actions>
</Task>`
  const file = join(tmpdir(), `nexus-task-${id}.xml`)
  writeFileSync(file, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(xml, 'utf16le')]))
  const ok = await schtasks(['/Create', '/TN', name(id), '/XML', file, '/F'])
  rmSync(file, { force: true })
  if (!ok) console.warn('[wakeup] could not schedule', id)
}

export function cancelWakeup(id: number) {
  if (enabled()) schtasks(['/Delete', '/TN', name(id), '/F'])
}
