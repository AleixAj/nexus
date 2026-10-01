// The user's files: look (list, find, read, sizes) and, with permission, change them.
import { app, shell } from 'electron'
import { promises as fs, type Dirent } from 'fs'
import { basename, dirname, extname, isAbsolute, join, resolve } from 'path'
import { clip, short, size } from '../lib/text'
import { bool, num, str, type Tool } from './define'

const MAX_READ = 9000

// ---------- paths ----------
const KNOWN: Record<string, () => string> = {
  escritorio: () => app.getPath('desktop'), desktop: () => app.getPath('desktop'),
  documentos: () => app.getPath('documents'), documents: () => app.getPath('documents'),
  descargas: () => app.getPath('downloads'), downloads: () => app.getPath('downloads'),
  imagenes: () => app.getPath('pictures'), 'imágenes': () => app.getPath('pictures'), pictures: () => app.getPath('pictures'),
  musica: () => app.getPath('music'), 'música': () => app.getPath('music'), music: () => app.getPath('music'),
  videos: () => app.getPath('videos'), 'vídeos': () => app.getPath('videos'),
  usuario: () => app.getPath('home'), home: () => app.getPath('home'), '~': () => app.getPath('home')
}

/** The user's main folders, for the system prompt. */
export function userFolders() {
  return ['desktop', 'documents', 'downloads', 'pictures', 'music', 'videos', 'home'].map(k => `${k}: ${app.getPath(k as any)}`).join('; ')
}

export function toPath(p: unknown) {
  const raw = String(p || '').trim().replace(/^["']|["']$/g, '')
  if (!raw) throw new Error('Falta la ruta')
  const known = KNOWN[raw.toLowerCase()]
  if (known) return known()
  const expanded = raw.replace(/^~(?=[\\/]|$)/, app.getPath('home')).replace(/%([^%]+)%/g, (_, v) => process.env[v] || '')
  return isAbsolute(expanded) ? resolve(expanded) : resolve(app.getPath('home'), expanded)
}
const showPath = (x: unknown) => { try { return toPath(x) } catch { return String(x) } }
const nameOf = (p: unknown) => basename(String(p || ''))

// never touch the system or other programs' files
const PROTECTED = [process.env.SystemRoot || 'C:\\Windows', process.env.ProgramFiles || 'C:\\Program Files', process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', process.env.ProgramData || 'C:\\ProgramData']
function writable(p: unknown) {
  const path = toPath(p), low = path.toLowerCase()
  if (PROTECTED.some(d => low.startsWith(d.toLowerCase()))) throw new Error('No modifico carpetas del sistema ni de programas instalados')
  if (/^[a-z]:\\?$/i.test(path)) throw new Error('No modifico la raíz de un disco')
  return path
}

const TEXT = /\.(txt|md|csv|tsv|json|jsonc|xml|html?|css|scss|js|jsx|ts|tsx|mjs|cjs|py|java|c|cpp|h|hpp|cs|go|rs|rb|php|sh|ps1|bat|cmd|ini|cfg|conf|toml|ya?ml|log|sql|env|gitignore|srt|vtt|tex|rtf|svg)$/i
const SKIP = /^(node_modules|\.git|\$recycle\.bin|appdata|windows|program files.*|programdata|system volume information|\.cache|\.vscode|\.idea|dist|out|build)$/i

// ---------- reading ----------
async function listDirectory(p: unknown) {
  const dir = toPath(p)
  const items = await fs.readdir(dir, { withFileTypes: true })
  const rows = await Promise.all(items.slice(0, 300).map(async d => {
    try {
      const st = await fs.stat(join(dir, d.name))
      return `${d.isDirectory() ? '[carpeta]' : '[archivo]'} ${d.name}${d.isDirectory() ? '' : ' · ' + size(st.size)} · ${st.mtime.toLocaleDateString('es-ES')}`
    } catch { return `[?] ${d.name}` }
  }))
  return clip(`${dir} (${items.length} elementos)\n` + rows.join('\n'))
}

async function findFiles(query: string, folder?: string) {
  const root = toPath(folder || 'usuario'), q = query.toLowerCase().replace(/^\*/, '')
  const hits: string[] = []
  let seen = 0
  const started = Date.now()
  const walk = async (dir: string, depth: number) => {
    if (hits.length >= 60 || depth > 7 || Date.now() - started > 12000) return
    let items: Dirent[] = []
    try { items = await fs.readdir(dir, { withFileTypes: true }) } catch { return }
    for (const d of items) {
      seen++
      const full = join(dir, d.name)
      if (d.name.toLowerCase().includes(q)) hits.push((d.isDirectory() ? '[carpeta] ' : '') + full)
      if (d.isDirectory() && !SKIP.test(d.name) && !d.name.startsWith('.')) await walk(full, depth + 1)
      if (hits.length >= 60) return
    }
  }
  await walk(root, 0)
  return hits.length ? clip(`${hits.length} resultados en ${root} (revisados ${seen}):\n` + hits.join('\n')) : `Nada con «${query}» en ${root} (revisados ${seen} elementos).`
}

async function readFile(p: unknown, offset = 0) {
  const file = toPath(p)
  const st = await fs.stat(file)
  if (st.isDirectory()) return listDirectory(file)
  if (!TEXT.test(file) && st.size > 200000) return `${basename(file)} es un archivo binario de ${size(st.size)}; no se puede leer como texto.`
  const text = await fs.readFile(file, 'utf8')
  if (text.includes('\u0000')) return `${basename(file)} es un archivo binario (${extname(file) || 'sin extensión'}, ${size(st.size)}).`
  const start = Math.max(0, Math.floor(offset || 0))
  const part = text.slice(start, start + MAX_READ)
  const rest = text.length - start - part.length
  return `${file} · ${size(st.size)} · ${text.length} caracteres${start ? ` · desde ${start}` : ''}\n---\n${part}${rest > 0 ? `\n--- [quedan ${rest} caracteres: usa offset ${start + part.length}]` : ''}`
}

async function folderSize(p: unknown) {
  const root = toPath(p)
  const files: { path: string; size: number }[] = []
  const bySub = new Map<string, number>()
  const started = Date.now()
  const walk = async (dir: string, top: string | null) => {
    if (Date.now() - started > 20000) return
    let items: Dirent[] = []
    try { items = await fs.readdir(dir, { withFileTypes: true }) } catch { return }
    for (const d of items) {
      const full = join(dir, d.name)
      if (d.isDirectory()) { await walk(full, top ?? d.name); continue }
      try {
        const s = (await fs.stat(full)).size
        files.push({ path: full, size: s })
        const k = top ?? '(archivos sueltos)'
        bySub.set(k, (bySub.get(k) || 0) + s)
      } catch { /* locked */ }
    }
  }
  await walk(root, null)
  const total = files.reduce((a, f) => a + f.size, 0)
  const subs = [...bySub].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `- ${k}: ${size(v)}`)
  const big = files.sort((a, b) => b.size - a.size).slice(0, 12).map(f => `- ${f.path}: ${size(f.size)}`)
  return `${root}: ${size(total)} en ${files.length} archivos${Date.now() - started > 20000 ? ' (análisis parcial por tiempo)' : ''}\n\nSubcarpetas más grandes:\n${subs.join('\n')}\n\nArchivos más grandes:\n${big.join('\n')}`
}

const PATH = { path: str('Ruta o escritorio/documentos/descargas/imagenes/musica/videos/usuario') }

export const fileTools: Tool[] = [
  {
    name: 'list_directory', group: 'files',
    description: 'Lista una carpeta.',
    params: PATH, required: ['path'],
    progress: a => 'Mirando · ' + short(nameOf(a.path) || a.path),
    run: async a => ({ result: await listDirectory(a.path), label: 'Carpeta revisada' })
  },
  {
    name: 'find_files', group: 'files',
    description: 'Busca archivos por nombre o extensión (recursivo).',
    params: { query: str('Texto o .ext'), folder: str('Carpeta; por defecto la del usuario') }, required: ['query'],
    progress: a => 'Buscando archivos · ' + short(a.query),
    run: async a => ({ result: await findFiles(String(a.query || ''), a.folder), label: 'Archivos buscados · ' + short(a.query, 30) })
  },
  {
    name: 'read_file', group: 'files',
    description: 'Lee un archivo de texto.',
    params: { path: str('Ruta'), offset: num('Desde el carácter') }, required: ['path'],
    progress: a => 'Leyendo · ' + short(nameOf(a.path)),
    run: async a => ({ result: await readFile(a.path, a.offset), label: 'Leído · ' + nameOf(a.path) })
  },
  {
    name: 'folder_size', group: 'files',
    description: 'Qué ocupa una carpeta y sus elementos más grandes.',
    params: { path: str('Carpeta') }, required: ['path'],
    progress: a => 'Analizando espacio · ' + short(nameOf(a.path) || a.path),
    run: async a => ({ result: await folderSize(a.path), label: 'Espacio analizado' })
  },

  // ---------- changes (each one asks the user first) ----------
  {
    name: 'write_file', group: 'write',
    description: 'Crea o sobrescribe un archivo de texto.',
    params: { path: str('Ruta'), content: str('Contenido'), append: bool('Añadir al final') }, required: ['path', 'content'],
    confirm: a => ({ title: a.append ? 'Añadir texto a un archivo' : 'Guardar un archivo', detail: `${showPath(a.path)}\n\n${clip(String(a.content || ''), 1500)}` }),
    run: async a => {
      const file = writable(a.path), content = String(a.content ?? '')
      await fs.mkdir(dirname(file), { recursive: true })
      if (a.append) await fs.appendFile(file, content, 'utf8'); else await fs.writeFile(file, content, 'utf8')
      return { result: `${a.append ? 'Añadido a' : 'Guardado'} ${file} (${size(Buffer.byteLength(content))})`, label: 'Archivo guardado · ' + nameOf(a.path) }
    }
  },
  {
    name: 'edit_file', group: 'write',
    description: 'Reemplaza un texto exacto en un archivo.',
    params: { path: str('Ruta'), find: str('Texto actual'), replace: str('Texto nuevo') }, required: ['path', 'find', 'replace'],
    confirm: a => ({ title: 'Modificar un archivo', detail: `${showPath(a.path)}\n\n− ${clip(String(a.find || ''), 700)}\n+ ${clip(String(a.replace || ''), 700)}` }),
    run: async a => {
      const file = writable(a.path), find = String(a.find ?? '')
      const text = await fs.readFile(file, 'utf8')
      const n = text.split(find).length - 1
      if (!n) return { result: 'No he encontrado ese texto exacto en el archivo; léelo primero.', label: 'Texto no encontrado' }
      await fs.writeFile(file, text.split(find).join(String(a.replace ?? '')), 'utf8')
      return { result: `Editado ${file}: ${n} ${n === 1 ? 'coincidencia' : 'coincidencias'} reemplazadas.`, label: 'Archivo editado · ' + nameOf(a.path) }
    }
  },
  {
    name: 'move_path', group: 'write',
    description: 'Mueve o renombra.',
    params: { from: str('Ruta'), to: str('Ruta nueva') }, required: ['from', 'to'],
    confirm: a => ({ title: 'Mover o renombrar', detail: `${showPath(a.from)}\n→ ${showPath(a.to)}` }),
    run: async a => {
      const from = writable(a.from), to = writable(a.to)
      await fs.mkdir(dirname(to), { recursive: true })
      await fs.rename(from, to)
      return { result: `Movido: ${from} → ${to}`, label: 'Movido · ' + nameOf(a.to) }
    }
  },
  {
    name: 'delete_path', group: 'write',
    description: 'Envía a la papelera (solo si lo piden).',
    params: { path: str('Ruta') }, required: ['path'],
    confirm: a => ({ title: 'Enviar a la papelera', detail: showPath(a.path) }),
    run: async a => {
      const file = writable(a.path)
      await fs.stat(file)
      await shell.trashItem(file)
      return { result: `Enviado a la papelera: ${file}`, label: 'A la papelera · ' + nameOf(a.path) }
    }
  },
  {
    name: 'create_folder', group: 'write',
    description: 'Crea una carpeta.',
    params: { path: str('Ruta') }, required: ['path'],
    run: async a => {
      const dir = writable(a.path)
      await fs.mkdir(dir, { recursive: true })
      return { result: `Carpeta lista: ${dir}`, label: 'Carpeta creada · ' + nameOf(a.path) }
    }
  }
]
