// Open installed apps (Start Menu shortcuts and a few system tools) and websites.
import { shell } from 'electron'
import { execFile } from 'child_process'
import { readdirSync, type Dirent } from 'fs'
import { basename, extname, join } from 'path'
import { said, str, type Tool } from './define'

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

export async function openApp(name: string) {
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

export const appTools: Tool[] = [
  {
    name: 'open_app',
    description: 'Abre una app instalada por su nombre.',
    params: { name: str('Nombre de la app') },
    required: ['name'],
    run: async a => said(await openApp(String(a.name || '')))
  },
  {
    name: 'open_url',
    description: 'Abre una web (para buscar: google.com/search?q= o youtube.com/results?search_query=).',
    params: { url: str('URL') },
    required: ['url'],
    run: async a => {
      let url: URL
      try { url = new URL(String(a.url || '')) } catch { return said('URL no válida') }
      if (!['http:', 'https:'].includes(url.protocol)) return { result: 'Solo se pueden abrir webs http(s)', label: 'URL no válida' }
      await shell.openExternal(url.href)
      return { result: 'Abierto en el navegador', label: 'Abierto · ' + url.hostname.replace('www.', '') }
    }
  }
]
