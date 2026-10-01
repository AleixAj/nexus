import { shell } from 'electron'
import { execFile } from 'child_process'
import { readdirSync, type Dirent } from 'fs'
import { join, basename, extname } from 'path'
import os from 'os'
import { currentMedia, mediaControl } from './media'

// Tools the assistant can call (OpenAI function-calling format)
export const TOOL_DEFS = [
  {
    type: 'function',
    function: {
      name: 'open_app',
      description: 'Abre una app instalada por su nombre.',
      parameters: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'open_url',
      description: 'Abre una web (para buscar: google.com/search?q= o youtube.com/results?search_query=).',
      parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'spotify',
      description: 'Spotify de escritorio: abrir, Me gusta, buscar canción/artista/lista, qué suena, reproducir/pausar, siguiente, anterior.',
      parameters: {
        type: 'object',
        properties: { action: { type: 'string', enum: ['open', 'liked', 'search', 'now_playing', 'play_pause', 'next', 'previous'] }, query: { type: 'string' } },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'media',
      description: 'Volumen del sistema.',
      parameters: {
        type: 'object',
        properties: { action: { type: 'string', enum: ['volume_up', 'volume_down', 'mute', 'play_pause', 'next', 'previous'] }, times: { type: 'number', description: 'Pasos de 2 %' } },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'system_status',
      description: 'CPU, RAM y tiempo encendido.',
      parameters: { type: 'object', properties: {} }
    }
  }
]

// ---------- Spotify (desktop app, never the web player) ----------
function spotifyExe() {
  const p = join(process.env.APPDATA || '', 'Spotify', 'Spotify.exe')
  try { readdirSync(join(process.env.APPDATA || '', 'Spotify')); return p } catch { return '' }
}

async function openSpotify(uri?: string) {
  const exe = spotifyExe()
  if (exe) {
    // the installed app takes a URI on the command line and opens it inside the app
    execFile(exe, uri ? [`--uri=${uri}`] : [], () => {})
    return true
  }
  try { await shell.openExternal(uri || 'spotify:'); return true } catch { return false } // Microsoft Store version
}

export async function spotify(action: string, query: string) {
  switch (action) {
    case 'open': return (await openSpotify()) ? 'Spotify abierto' : 'No encuentro Spotify instalado'
    case 'liked': return (await openSpotify('spotify:collection:tracks')) ? 'Abiertas tus canciones que te gustan en Spotify' : 'No encuentro Spotify instalado'
    case 'search': {
      if (!query.trim()) return 'Falta qué buscar'
      return (await openSpotify('spotify:search:' + encodeURIComponent(query.trim()))) ? `Buscando «${query}» en Spotify` : 'No encuentro Spotify instalado'
    }
    case 'now_playing': {
      const m = currentMedia()
      return m && m.title ? `${m.playing ? 'Suena' : 'En pausa'}: «${m.title}» de ${m.artist || 'artista desconocido'} (${m.app.replace('.exe', '')})` : 'No suena nada ahora mismo'
    }
    case 'play_pause': case 'next': case 'previous':
      // the media session of Spotify first; the media keys if that fails
      if (!(await mediaControl(action))) await sendKey(KEYS[action])
      return { play_pause: 'Reproducir / pausar', next: 'Siguiente canción', previous: 'Canción anterior' }[action]
    default: return 'Acción desconocida'
  }
}

// ---------- apps ----------
type AppEntry = { name: string; path: string }
let apps: AppEntry[] | null = null

function scanStartMenu(): AppEntry[] {
  const roots = [
    join(process.env.ProgramData || 'C:\\ProgramData', 'Microsoft\\Windows\\Start Menu\\Programs'),
    join(process.env.APPDATA || '', 'Microsoft\\Windows\\Start Menu\\Programs')
  ]
  const out: AppEntry[] = []
  const walk = (dir: string, depth: number) => {
    let items: Dirent[] = []
    try { items = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const item of items) {
      const p = join(dir, item.name)
      if (item.isDirectory()) { if (depth < 3) walk(p, depth + 1); continue }
      const ext = extname(item.name).toLowerCase()
      const name = basename(item.name, ext)
      // never launch uninstallers by accident
      if (['.lnk', '.url'].includes(ext) && !/uninstall|desinstal/i.test(name)) out.push({ name, path: p })
    }
  }
  roots.forEach(r => walk(r, 0))
  return out
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
const ALIASES: Record<string, string> = { vscode: 'visualstudiocode', code: 'visualstudiocode', navegador: 'chrome', google: 'chrome', word: 'microsoftword', excel: 'microsoftexcel' }

// Apps that are not Start Menu shortcuts: system tools and Store apps.
// Launched directly (no cmd.exe), so a model-provided name can never run a command.
const BUILTIN: Record<string, { exe?: string; uri?: string; label: string }> = {
  calculadora: { exe: 'calc.exe', label: 'Calculadora' }, calculator: { exe: 'calc.exe', label: 'Calculadora' },
  blocdenotas: { exe: 'notepad.exe', label: 'Bloc de notas' }, notepad: { exe: 'notepad.exe', label: 'Bloc de notas' },
  explorador: { exe: 'explorer.exe', label: 'Explorador de archivos' }, explorer: { exe: 'explorer.exe', label: 'Explorador de archivos' },
  administradordetareas: { exe: 'taskmgr.exe', label: 'Administrador de tareas' },
  paint: { exe: 'mspaint.exe', label: 'Paint' },
  configuracion: { uri: 'ms-settings:', label: 'Configuración' }, ajustes: { uri: 'ms-settings:', label: 'Configuración' },
  spotify: { uri: 'spotify:', label: 'Spotify' }
}

function findApp(q: string) {
  const list = apps ?? []
  return list.find(a => norm(a.name) === q)
    || list.find(a => norm(a.name).startsWith(q))
    || (q.length >= 4 ? list.find(a => norm(a.name).includes(q)) : undefined)
}

async function openApp(name: string) {
  const raw = norm(name)
  if (raw.length < 2) return 'No entiendo qué aplicación quiere abrir.'
  const q = ALIASES[raw] || raw

  apps ??= scanStartMenu()
  let hit = findApp(q)
  if (!hit && !BUILTIN[q]) { apps = scanStartMenu(); hit = findApp(q) } // maybe installed after start
  if (hit) {
    const err = await shell.openPath(hit.path)
    return err ? `Error al abrir ${hit.name}: ${err}` : `Abierto: ${hit.name}`
  }
  const b = Object.hasOwn(BUILTIN, q) ? BUILTIN[q] : null
  if (b?.exe) {
    const exe = b.exe
    return new Promise<string>(res => execFile(exe, [], () => {}).once('spawn', () => res(`Abierto: ${b.label}`)).once('error', () => res(`No he podido abrir ${b.label}.`)))
  }
  if (b?.uri) {
    try { await shell.openExternal(b.uri); return `Abierto: ${b.label}` } catch { return `No he podido abrir ${b.label}.` }
  }
  return `No encuentro la aplicación «${name}» en el menú Inicio.`
}

// ---------- media keys ----------
const KEYS: Record<string, number> = { play_pause: 179, next: 176, previous: 177, volume_up: 175, volume_down: 174, mute: 173 }

function sendKey(code: number, times = 1) {
  const ps = `$w = New-Object -ComObject WScript.Shell; 1..${times} | % { $w.SendKeys([char]${code}) }`
  return new Promise<void>(res => execFile('powershell', ['-NoProfile', '-Command', ps], { windowsHide: true }, () => res()))
}

// ---------- system ----------
function cpuLoad(): Promise<number> {
  const snap = () => os.cpus().reduce((a, c) => {
    const t = Object.values(c.times).reduce((x, y) => x + y, 0)
    return { idle: a.idle + c.times.idle, total: a.total + t }
  }, { idle: 0, total: 0 })
  const a = snap()
  return new Promise(res => setTimeout(() => {
    const b = snap()
    res(Math.round(100 * (1 - (b.idle - a.idle) / (b.total - a.total))))
  }, 300))
}

export async function systemStatus() {
  const total = os.totalmem(), free = os.freemem()
  return {
    cpu: await cpuLoad(),
    cpuModel: os.cpus()[0]?.model.trim(),
    ramUsedGB: +((total - free) / 1e9).toFixed(1),
    ramTotalGB: +(total / 1e9).toFixed(1),
    ram: Math.round((1 - free / total) * 100),
    uptimeH: +(os.uptime() / 3600).toFixed(1),
    host: os.hostname()
  }
}

// ---------- dispatcher ----------
export async function runTool(name: string, args: any): Promise<{ result: string; label: string }> {
  switch (name) {
    case 'open_app': {
      const r = await openApp(String(args.name || ''))
      return { result: r, label: r }
    }
    case 'open_url': {
      let url: URL
      try { url = new URL(String(args.url || '')) } catch { return { result: 'URL no válida', label: 'URL no válida' } }
      if (!['http:', 'https:'].includes(url.protocol)) return { result: 'Solo se pueden abrir webs http(s)', label: 'URL no válida' }
      await shell.openExternal(url.href)
      return { result: 'Abierto en el navegador', label: 'Abierto · ' + url.hostname.replace('www.', '') }
    }
    case 'media': {
      const action = String(args.action || '')
      const code = Object.hasOwn(KEYS, action) ? KEYS[action] : 0
      if (!code) return { result: 'Acción desconocida', label: 'Acción desconocida' }
      const times = action.startsWith('volume_') ? Math.max(1, Math.min(50, Math.round(Number(args.times) || 5))) : 1
      await sendKey(code, times)
      const L: Record<string, string> = { play_pause: 'Reproducir / pausar', next: 'Siguiente canción', previous: 'Canción anterior', volume_up: 'Volumen subido', volume_down: 'Volumen bajado', mute: 'Silencio' }
      return { result: 'Hecho', label: L[action] }
    }
    case 'spotify': {
      const r = await spotify(String(args.action || ''), String(args.query || ''))
      return { result: r, label: r }
    }
    case 'system_status': {
      const s = await systemStatus()
      return { result: JSON.stringify(s), label: `Estado del equipo · CPU ${s.cpu} %` }
    }
    default:
      return { result: 'Herramienta desconocida', label: name }
  }
}
