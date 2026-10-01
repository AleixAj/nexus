// The state of the PC and, with permission, any PowerShell command.
import os from 'os'
import { powershell } from '../lib/powershell'
import { clip, size } from '../lib/text'
import { num, oneOf, str, type Tool } from './define'

function cpuLoad(ms = 400): Promise<number> {
  const snap = () => os.cpus().reduce((a, c) => ({ idle: a.idle + c.times.idle, total: a.total + Object.values(c.times).reduce((x, y) => x + y, 0) }), { idle: 0, total: 0 })
  const a = snap()
  return new Promise(res => setTimeout(() => { const b = snap(); res(Math.round(100 * (1 - (b.idle - a.idle) / (b.total - a.total)))) }, ms))
}

async function systemStatus() {
  const total = os.totalmem(), free = os.freemem()
  const [cpu, extra] = await Promise.all([cpuLoad(), powershell(`
$d = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | ForEach-Object { "$($_.DeviceID) $([math]::Round(($_.Size-$_.FreeSpace)/1GB,1)) de $([math]::Round($_.Size/1GB,1)) GB usados, $([math]::Round($_.FreeSpace/1GB,1)) GB libres" }
$g = (Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name) -join ', '
$b = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1
$o = Get-CimInstance Win32_OperatingSystem
"Discos: " + ($d -join ' | ')
"GPU: $g"
"Batería: " + $(if ($b) { "$($b.EstimatedChargeRemaining) %" } else { "sin batería (sobremesa)" })
"Sistema: $($o.Caption) $($o.Version)"`, 20000)])
  return [
    `Equipo: ${os.hostname()} · usuario ${os.userInfo().username}`,
    `CPU: ${os.cpus()[0]?.model.trim()} · ${os.cpus().length} hilos · uso ${cpu} %`,
    `Memoria: ${size(total - free)} de ${size(total)} (${Math.round((1 - free / total) * 100)} %)`,
    `Encendido desde hace ${(os.uptime() / 3600).toFixed(1)} h`,
    extra
  ].join('\n')
}

function topProcesses(sort = 'cpu', count = 10) {
  const n = Math.max(3, Math.min(25, Math.round(Number(count) || 10)))
  const by = sort === 'memory' ? 'WorkingSet64' : 'CPU'
  return powershell(`Get-Process | Sort-Object ${by} -Descending | Select-Object -First ${n} | ForEach-Object { "{0} · CPU {1:N0} s · RAM {2:N0} MB · PID {3}" -f $_.ProcessName, $_.CPU, ($_.WorkingSet64/1MB), $_.Id }`)
}

export const systemTools: Tool[] = [
  {
    name: 'system_status', readOnly: true,
    description: 'Estado del PC: CPU, RAM, discos, GPU, batería.',
    progress: () => 'Revisando el equipo',
    run: async () => ({ result: await systemStatus(), label: 'Estado del equipo' })
  },
  {
    name: 'top_processes', readOnly: true,
    description: 'Procesos que más consumen.',
    params: { sort: oneOf(['cpu', 'memory']), count: num('Cuántos') },
    progress: () => 'Revisando procesos',
    run: async a => ({ result: await topProcesses(a.sort, a.count), label: 'Procesos revisados' })
  },
  {
    name: 'run_powershell', group: 'shell', noAlways: true,
    description: 'Ejecuta PowerShell (estadísticas, configuración, tareas avanzadas).',
    params: { command: str('Comando'), reason: str('Para qué, en una frase') },
    required: ['command', 'reason'],
    confirm: a => ({ title: String(a.reason || 'Ejecutar un comando'), detail: clip(String(a.command || ''), 1500) }),
    progress: () => 'Ejecutando comando',
    run: async a => ({ result: clip(await powershell(String(a.command || ''))), label: 'Comando ejecutado' })
  }
]
