// Real snapshot of the PC for the System panel. Taken only when the panel opens
// (or on "Actualizar"), never in the background. Everything is measured in parallel
// and the facts that never change are remembered after the first time (~1.5 s per snapshot).
import os from 'os'
import { app } from 'electron'
import { execFile } from 'child_process'
import { readFile, statfs, writeFile } from 'fs/promises'
import { join } from 'path'
import { powershell } from './lib/powershell'

const GiB = 1073741824
const run = (file: string, args: string[], timeout = 8000) => new Promise<string>(res =>
  execFile(file, args, { windowsHide: true, timeout }, (_e, out) => res(String(out || ''))))

// All processes' CPU times in ONE call (NtQuerySystemInformation, what Task Manager uses):
// asking each process one by one takes 2+ seconds on Windows. Compiled once, then reused.
const PROC_CS = `
using System; using System.Runtime.InteropServices; using System.Text;
public static class NxProc {
  [DllImport("ntdll.dll")] static extern int NtQuerySystemInformation(int c, IntPtr b, int l, out int r);
  public static string Snapshot() {
    int len = 1 << 20, ret; IntPtr buf;
    while (true) {
      buf = Marshal.AllocHGlobal(len);
      int st = NtQuerySystemInformation(5, buf, len, out ret);
      if (st == unchecked((int)0xC0000004)) { Marshal.FreeHGlobal(buf); len = Math.Max(len * 2, ret + 65536); continue; }
      if (st != 0) { Marshal.FreeHGlobal(buf); return ""; }
      break;
    }
    var sb = new StringBuilder(); long off = 0;
    while (true) {
      IntPtr p = new IntPtr(buf.ToInt64() + off);
      int next = Marshal.ReadInt32(p, 0);
      long cpu = Marshal.ReadInt64(p, 40) + Marshal.ReadInt64(p, 48);
      int nameLen = Marshal.ReadInt16(p, 56);
      IntPtr namePtr = Marshal.ReadIntPtr(p, 64);
      string name = nameLen > 0 && namePtr != IntPtr.Zero ? Marshal.PtrToStringUni(namePtr, nameLen / 2) : "Idle";
      long pid = Marshal.ReadIntPtr(p, 80).ToInt64();
      long ws = Marshal.ReadIntPtr(p, 144).ToInt64();
      sb.Append(pid).Append('|').Append(name).Append('|').Append(cpu).Append('|').Append(ws).Append('\\n');
      if (next == 0) break;
      off += next;
    }
    Marshal.FreeHGlobal(buf);
    return sb.ToString();
  }
}`

// processes over one measured second, plus small facts PowerShell knows best
const PS = `
$ErrorActionPreference = 'SilentlyContinue'
$dll = Join-Path $env:NX_DIR 'nxproc.dll'
if (-not (Test-Path $dll)) { Add-Type -TypeDefinition $env:NX_CS -OutputAssembly $dll -OutputType Library }
Add-Type -Path $dll
function Snap { $h = @{}; foreach ($l in ([NxProc]::Snapshot() -split "\`n")) { $f = $l.Split('|'); if ($f.Length -eq 4) { $h[$f[0]] = $f } }; $h }
$a = Snap; $sw = [Diagnostics.Stopwatch]::StartNew(); Start-Sleep -Milliseconds 1000; $b = Snap; $secs = $sw.Elapsed.TotalSeconds
$procs = foreach ($k in $b.Keys) { $f = $b[$k]; $c0 = if ($a[$k]) { [double]$a[$k][2] } else { [double]$f[2] }; [pscustomobject]@{ n = ($f[1] -replace '\\.exe$', ''); c = ([double]$f[2] - $c0) / 1e7; m = [double]$f[3] } }
$top = $procs | Where-Object { $_.n -ne 'Idle' } | Group-Object n | ForEach-Object { [pscustomobject]@{ n = $_.Name; c = ($_.Group | Measure-Object c -Sum).Sum; m = ($_.Group | Measure-Object m -Sum).Sum; k = $_.Count } } | Sort-Object c -Descending | Select-Object -First 7
$fixed = $null
if ($env:NX_FIXED -ne '1') {
  $mem = Get-CimInstance Win32_PhysicalMemory | Select-Object -First 1 Speed, SMBIOSMemoryType
  $net = Get-NetAdapter | Where-Object Status -eq 'Up' | Sort-Object LinkSpeed -Descending | Select-Object -First 1 Name, LinkSpeed
  $os = Get-CimInstance Win32_OperatingSystem | Select-Object -First 1 Caption
  $cores = (Get-CimInstance Win32_Processor | Measure-Object NumberOfCores -Sum).Sum
  $fixed = [pscustomobject]@{ mem = $mem; net = $net; os = $os.Caption; cores = $cores }
}
$bat = Get-CimInstance Win32_Battery | Select-Object -First 1 EstimatedChargeRemaining, BatteryStatus
[pscustomobject]@{ top = @($top); secs = $secs; fixed = $fixed; bat = $bat } | ConvertTo-Json -Depth 4 -Compress
`

const DDR: Record<number, string> = { 20: 'DDR', 21: 'DDR2', 24: 'DDR3', 26: 'DDR4', 34: 'DDR5', 35: 'LPDDR5' }
let fixed: { ramType: string; ramSpeed: number | null; netName: string; netLink: string; os: string; cores: number | null } | null = null

// use of every hardware thread over ~1 s, plus the overall figure
async function cpuLoad() {
  const a = os.cpus()
  await new Promise(r => setTimeout(r, 1000))
  const b = os.cpus()
  const per = b.map((c, i) => {
    const t = (x: os.CpuInfo) => Object.values(x.times).reduce((p, q) => p + q, 0)
    const total = t(c) - t(a[i]), idle = c.times.idle - a[i].times.idle
    return Math.max(0, Math.min(100, Math.round(100 * (1 - idle / Math.max(1, total)))))
  })
  return { per, avg: Math.round(per.reduce((x, y) => x + y, 0) / per.length) }
}

// bytes received/sent by all interfaces (netstat answers instantly)
async function netBytes() {
  const out = await run('netstat', ['-e'])
  const line = out.split(/\r?\n/).find(l => /^\s*(Bytes|Bytes recibidos)/i.test(l)) || out.split(/\r?\n/)[4] || ''
  const nums = line.match(/\d+/g)?.map(Number) || []
  return nums.length >= 2 ? { rx: nums[0], tx: nums[1] } : null
}

async function netSpeed() {
  const a = await netBytes()
  const t0 = Date.now()
  await new Promise(r => setTimeout(r, 1000))
  const b = await netBytes()
  const s = (Date.now() - t0) / 1000
  return a && b ? { rx: Math.max(0, (b.rx - a.rx) * 8 / 1e6 / s), tx: Math.max(0, (b.tx - a.tx) * 8 / 1e6 / s) } : null
}

async function gpuInfo() {
  const out = await run('nvidia-smi', ['--query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu,fan.speed,driver_version', '--format=csv,noheader,nounits'])
  const g = out.split(/\r?\n/)[0]?.split(',').map(x => x.trim())
  const n = (v?: string) => { const x = Number(v); return v && Number.isFinite(x) ? x : null }
  if (g && g.length >= 7 && g[0]) return { name: g[0], use: n(g[1]), memUsed: n(g[2]), memTotal: n(g[3]), temp: n(g[4]), fan: n(g[5]), driver: g[6] }
  // not NVIDIA: at least the name
  const name = (await powershell('(Get-CimInstance Win32_VideoController | Select-Object -First 1).Name', 8000)).trim()
  return { name, use: null, memUsed: null, memTotal: null, temp: null, fan: null, driver: '' }
}

function localIp() {
  for (const list of Object.values(os.networkInterfaces())) {
    const ip = list?.find(a => a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254'))
    if (ip) return ip.address
  }
  return ''
}

const fixedFile = () => join(app.getPath('userData'), 'system-fixed.json')

export async function systemSnapshot() {
  if (!fixed) { try { fixed = JSON.parse(await readFile(fixedFile(), 'utf8')) } catch { /* first time on this PC */ } }
  const [raw, cpu, net, gpu, disk] = await Promise.all([
    powershell(fixed ? `$env:NX_FIXED = '1'; ${PS}` : PS, 15000, { NX_DIR: app.getPath('userData'), NX_CS: PROC_CS }),
    cpuLoad(),
    netSpeed(),
    gpuInfo(),
    statfs('C:\\').catch(() => null)
  ])
  let j: any = {}
  try { j = JSON.parse(raw.slice(raw.indexOf('{'))) } catch { /* show what Node measured */ }
  if (j.fixed) {
    fixed = {
      ramType: DDR[j.fixed.mem?.SMBIOSMemoryType] || '',
      ramSpeed: j.fixed.mem?.Speed || null,
      netName: j.fixed.net?.Name || '',
      netLink: j.fixed.net?.LinkSpeed || '',
      os: String(j.fixed.os || '').replace('Microsoft ', ''),
      cores: j.fixed.cores || null
    }
    writeFile(fixedFile(), JSON.stringify(fixed)).catch(() => {})
  }
  const threads = os.cpus().length, secs = j.secs || 1
  const total = os.totalmem(), free = os.freemem()
  const pct = Number(j.bat?.EstimatedChargeRemaining)

  return {
    host: os.hostname(),
    user: os.userInfo().username,
    os: `${fixed?.os || os.version()} · ${os.release().split('.').pop()}`,
    uptimeH: os.uptime() / 3600,
    cpu: {
      name: String(os.cpus()[0]?.model || '').replace(/\(R\)|\(TM\)|CPU|@.*$/g, '').replace(/\s+/g, ' ').trim(),
      ghz: os.cpus()[0]?.speed ? os.cpus()[0].speed / 1000 : null,
      cores: fixed?.cores || null,
      threads,
      use: cpu.avg,
      perThread: cpu.per
    },
    ram: { used: (total - free) / GiB, total: Math.round(total / GiB), type: fixed?.ramType || '', speed: fixed?.ramSpeed || null },
    gpu,
    disk: disk ? { used: (disk.blocks - disk.bfree) * disk.bsize / GiB, total: disk.blocks * disk.bsize / GiB } : null,
    net: { name: fixed?.netName || '', link: fixed?.netLink || '', rxMbps: net?.rx ?? null, txMbps: net?.tx ?? null, ip: localIp() },
    battery: Number.isFinite(pct) ? { pct, charging: j.bat?.BatteryStatus === 2 } : null,
    procs: (j.top || []).map((p: any) => ({ name: p.n, count: p.k, cpu: Math.min(100, Math.round((p.c || 0) / secs / threads * 100)), ramMB: (p.m || 0) / 1048576 }))
  }
}
