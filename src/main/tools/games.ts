// Steam by voice: "abre Elden Ring", "instala Hades", "actualiza Cyberpunk", "¿qué juegos tengo?".
// Installed games come from Steam's own library files; others from the public store search.
// Everything goes through steam:// links, so Steam itself shows what it is doing.
// (Idea from JARVIS-OS: actions/game_updater.py.)
import { shell } from 'electron'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { powershell } from '../lib/powershell'
import { oneOf, said, str, type Tool } from './define'

type Game = { id: string; name: string }
let steamDir: string | null = null

async function steamPath() {
  if (steamDir !== null) return steamDir
  const p = (await powershell("(Get-ItemProperty 'HKCU:\\Software\\Valve\\Steam' -ErrorAction SilentlyContinue).SteamPath", 8000)).trim()
  steamDir = p && existsSync(p) ? p : ''
  return steamDir
}

/** The games installed in every Steam library on this PC. */
async function installedGames(): Promise<Game[]> {
  const root = await steamPath()
  if (!root) return []
  const vdf = join(root, 'steamapps', 'libraryfolders.vdf')
  const libs = existsSync(vdf) ? [...readFileSync(vdf, 'utf8').matchAll(/"path"\s+"([^"]+)"/g)].map(m => m[1].replace(/\\\\/g, '\\')) : [root]
  const out: Game[] = []
  for (const lib of libs) {
    const apps = join(lib, 'steamapps')
    let files: string[] = []
    try { files = readdirSync(apps).filter(f => /^appmanifest_\d+\.acf$/.test(f)) } catch { continue }
    for (const f of files) {
      const t = readFileSync(join(apps, f), 'utf8')
      const id = /"appid"\s+"(\d+)"/.exec(t)?.[1], name = /"name"\s+"([^"]+)"/.exec(t)?.[1]
      // Steam's own tools (runtimes, redistributables) are not games
      if (id && name && !/steamworks|redistributable|proton|runtime/i.test(name)) out.push({ id, name })
    }
  }
  return out
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const find = (list: Game[], q: string) => { const n = norm(q); return list.find(g => norm(g.name) === n) || list.find(g => norm(g.name).includes(n)) || list.find(g => n.split(' ').every(w => norm(g.name).includes(w))) }

async function storeSearch(q: string): Promise<Game | null> {
  const r = await fetch('https://store.steampowered.com/api/storesearch/?' + new URLSearchParams({ term: q, l: 'spanish', cc: 'ES' }), { signal: AbortSignal.timeout(10000) })
  const j: any = r.ok ? await r.json() : null
  const it = j?.items?.[0]
  return it ? { id: String(it.id), name: it.name } : null
}

export const gameTools: Tool[] = [
  {
    name: 'steam',
    description: 'Juegos de Steam: jugar (abrir uno instalado), instalar, actualizar, ver en la tienda o listar los instalados.',
    params: { action: oneOf(['play', 'install', 'update', 'store', 'list']), game: str('Nombre del juego') },
    required: ['action'],
    progress: a => 'Steam · ' + (a.game || 'tus juegos'),
    run: async a => {
      if (!(await steamPath())) return said('No encuentro Steam instalado en este PC')
      const installed = await installedGames()
      if (a.action === 'list') return { result: installed.length ? 'Instalados: ' + installed.map(g => g.name).join(', ') : 'No hay juegos instalados', label: `Steam · ${installed.length} juegos` }
      const q = String(a.game || '').trim()
      if (!q) return said('Falta el nombre del juego')
      const mine = find(installed, q)
      if (a.action === 'play') {
        if (!mine) return { result: `«${q}» no está instalado. Puedes pedirme que lo instale.`, label: 'Juego no instalado' }
        await shell.openExternal(`steam://rungameid/${mine.id}`)
        return said(`Abriendo ${mine.name}`)
      }
      const g = mine || (await storeSearch(q))
      if (!g) return said(`No encuentro «${q}» en Steam`)
      const url = a.action === 'install' ? `steam://install/${g.id}` : a.action === 'update' ? `steam://validate/${g.id}` : `steam://store/${g.id}`
      await shell.openExternal(url)
      const done = { install: mine ? `${g.name} ya está instalado; te abro Steam` : `Steam te pedirá confirmar la instalación de ${g.name}`, update: `Steam comprueba y actualiza ${g.name}`, store: `Abierta la página de ${g.name}` } as Record<string, string>
      return said(done[a.action] || 'Hecho')
    }
  }
]
