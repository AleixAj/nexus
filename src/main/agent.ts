// Agent tools: web search, the user's files and the state of the PC.
// Anything that changes the machine asks the user first (see `needsConfirm`).
import { app, shell } from 'electron'
import { execFile } from 'child_process'
import { promises as fs, type Dirent } from 'fs'
import { basename, dirname, extname, isAbsolute, join, resolve } from 'path'
import os from 'os'
import { getKey, loadSettings } from './settings'

const MAX_READ = 9000
const MAX_OUT = 5000
const clip = (s: string, n = MAX_OUT) => (s.length > n ? s.slice(0, n) + `\n… [recortado, ${s.length - n} caracteres más]` : s)
const size = (b: number) => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : b < 1073741824 ? (b / 1048576).toFixed(1) + ' MB' : (b / 1073741824).toFixed(2) + ' GB'

// ---------- definitions ----------
const fn = (name: string, description: string, properties: Record<string, unknown> = {}, required: string[] = []) =>
  ({ type: 'function', function: { name, description, parameters: { type: 'object', properties, required } } })
const S = (description: string) => ({ type: 'string', description })
const N = (description: string) => ({ type: 'number', description })

// Descriptions are short on purpose: they travel with every request (free-tier tokens)
export const AGENT_TOOLS = {
  web: [
    fn('web_search', 'Busca en internet datos actuales (noticias, precios, resultados…). Devuelve resumen y fuentes.', { query: S('Consulta concreta') }, ['query']),
    fn('read_webpage', 'Lee el texto de una web.', { url: S('URL') }, ['url']),
    fn('wikipedia', 'Resumen de Wikipedia.', { topic: S('Tema') }, ['topic'])
  ],
  files: [
    fn('list_directory', 'Lista una carpeta.', { path: S('Ruta o escritorio/documentos/descargas/imagenes/musica/videos/usuario') }, ['path']),
    fn('find_files', 'Busca archivos por nombre o extensión (recursivo).', { query: S('Texto o .ext'), folder: S('Carpeta; por defecto la del usuario') }, ['query']),
    fn('read_file', 'Lee un archivo de texto.', { path: S('Ruta'), offset: N('Desde el carácter') }, ['path']),
    fn('folder_size', 'Qué ocupa una carpeta y sus elementos más grandes.', { path: S('Carpeta') }, ['path'])
  ],
  write: [
    fn('write_file', 'Crea o sobrescribe un archivo de texto.', { path: S('Ruta'), content: S('Contenido'), append: { type: 'boolean' } }, ['path', 'content']),
    fn('edit_file', 'Reemplaza un texto exacto en un archivo.', { path: S('Ruta'), find: S('Texto actual'), replace: S('Texto nuevo') }, ['path', 'find', 'replace']),
    fn('move_path', 'Mueve o renombra.', { from: S('Ruta'), to: S('Ruta nueva') }, ['from', 'to']),
    fn('delete_path', 'Envía a la papelera (solo si lo piden).', { path: S('Ruta') }, ['path']),
    fn('create_folder', 'Crea una carpeta.', { path: S('Ruta') }, ['path'])
  ],
  system: [
    fn('system_status', 'Estado del PC: CPU, RAM, discos, GPU, batería.'),
    fn('top_processes', 'Procesos que más consumen.', { sort: { type: 'string', enum: ['cpu', 'memory'] }, count: N('Cuántos') })
  ],
  shell: [
    fn('run_powershell', 'Ejecuta PowerShell (estadísticas, configuración, tareas avanzadas).', { command: S('Comando'), reason: S('Para qué, en una frase') }, ['command', 'reason'])
  ]
}

/** Tools that change the machine: the user must approve each call. */
export const needsConfirm = new Set(['write_file', 'edit_file', 'move_path', 'delete_path', 'run_powershell'])

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

export function userFolders() {
  return ['desktop', 'documents', 'downloads', 'pictures', 'music', 'videos', 'home'].map(k => `${k}: ${app.getPath(k as any)}`).join('; ')
}

function toPath(p: unknown) {
  const raw = String(p || '').trim().replace(/^["']|["']$/g, '')
  if (!raw) throw new Error('Falta la ruta')
  const known = KNOWN[raw.toLowerCase()]
  if (known) return known()
  const expanded = raw.replace(/^~(?=[\\/]|$)/, app.getPath('home')).replace(/%([^%]+)%/g, (_, v) => process.env[v] || '')
  return isAbsolute(expanded) ? resolve(expanded) : resolve(app.getPath('home'), expanded)
}

// never touch the system or other programs' files
const PROTECTED = [process.env.SystemRoot || 'C:\\Windows', process.env.ProgramFiles || 'C:\\Program Files', process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', process.env.ProgramData || 'C:\\ProgramData']
function assertWritable(p: string) {
  const low = p.toLowerCase()
  if (PROTECTED.some(d => low.startsWith(d.toLowerCase()))) throw new Error('No modifico carpetas del sistema ni de programas instalados')
  if (/^[a-z]:\\?$/i.test(p)) throw new Error('No modifico la raíz de un disco')
}

const TEXT = /\.(txt|md|csv|tsv|json|jsonc|xml|html?|css|scss|js|jsx|ts|tsx|mjs|cjs|py|java|c|cpp|h|hpp|cs|go|rs|rb|php|sh|ps1|bat|cmd|ini|cfg|conf|toml|ya?ml|log|sql|env|gitignore|srt|vtt|tex|rtf|svg)$/i

// ---------- web ----------
// Keyless search: DuckDuckGo's HTML results (titles, links and snippets).
// The model then opens the most useful ones with read_webpage.
async function ddgSearch(query: string) {
  const res = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST',
    signal: AbortSignal.timeout(12000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36' },
    body: new URLSearchParams({ q: query, kl: 'es-es' })
  })
  if (!res.ok) return `La búsqueda no ha respondido (HTTP ${res.status}).`
  const html = await res.text()
  const results: string[] = []
  const re = /class="result__a" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
  let m
  while ((m = re.exec(html)) && results.length < 8) {
    let url = m[1]
    const redirect = url.match(/[?&]uddg=([^&]+)/)
    if (redirect) url = decodeURIComponent(redirect[1])
    if (url.startsWith('//')) url = 'https:' + url
    if (/duckduckgo\.com\/y\.js|ad_domain/.test(url)) continue // ads
    results.push(`${results.length + 1}. ${htmlToText(m[2])}\n   ${url}\n   ${htmlToText(m[3])}`)
  }
  return results.length
    ? `Resultados para «${query}» (abre con read_webpage los que necesites para dar datos concretos):\n\n` + results.join('\n')
    : `Sin resultados para «${query}».`
}

const searchPrompt = (query: string) =>
  `Busca en internet y responde en español con datos concretos y fechas. Al final lista 2-4 fuentes (título y URL). Fecha de hoy: ${new Date().toLocaleDateString('es-ES')}.\n\nConsulta: ${query}`

// Gemini with Grounding with Google Search
async function geminiSearch(key: string, query: string) {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(40000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'gemini-3.5-flash-lite',
      reasoning_effort: 'low',
      messages: [{ role: 'user', content: searchPrompt(query) }],
      tools: [{ google_search: {} }]
    })
  })
  if (!res.ok) return null
  const content = (await res.json()).choices?.[0]?.message?.content
  return content ? clip(content) : null
}

async function webSearch(query: string) {
  const gemini = loadSettings().geminiSearch ? getKey('Gemini') : ''
  if (gemini) {
    try { const r = await geminiSearch(gemini, query); if (r) return r } catch { /* try the next one */ }
  }
  const key = getKey('Groq')
  if (!key) return ddgSearch(query)
  const call = async (model: string) => fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(45000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      reasoning_effort: 'low',
      max_completion_tokens: 1400,
      tools: [{ type: 'browser_search' }],
      tool_choice: 'required',
      messages: [{
        role: 'user',
        content: searchPrompt(query)
      }]
    })
  })
  let res = await call('openai/gpt-oss-20b')
  if (res.status === 429) res = await call('openai/gpt-oss-120b') // separate free quota
  if (!res.ok) return ddgSearch(query) // Groq search unavailable or out of quota
  const j = await res.json()
  const msg = j.choices?.[0]?.message || {}
  const sources = (msg.executed_tools || []).flatMap((t: any) => (t.search_results?.results || []).map((r: any) => `- ${r.title}: ${r.url}`)).slice(0, 5)
  return clip((msg.content || 'Sin resultados.') + (sources.length ? '\n\nFuentes:\n' + sources.join('\n') : ''))
}

function htmlToText(html: string) {
  return html
    .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/?(b|strong|em|i|u|span|a|small|mark|abbr)(\s[^>]*)?>/gi, '') // inline tags: no extra spaces
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()
}

async function readWebpage(url: string) {
  let u: URL
  try { u = new URL(url) } catch { return 'URL no válida' }
  if (!['http:', 'https:'].includes(u.protocol)) return 'Solo páginas http(s)'
  const res = await fetch(u, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NEXUS', 'Accept-Language': 'es-ES,es;q=0.9,en;q=0.6' } })
  if (!res.ok) return `No se pudo abrir (HTTP ${res.status})`
  const type = res.headers.get('content-type') || ''
  if (!/text|json|xml/.test(type)) return `No es una página de texto (${type})`
  const body = await res.text()
  const title = body.match(/<title[^>]*>([^<]*)/i)?.[1]?.trim()
  return clip((title ? `# ${title}\n` : '') + (type.includes('html') ? htmlToText(body) : body), 7000)
}

async function wikipedia(topic: string) {
  const q = encodeURIComponent(topic)
  const s = await fetch(`https://es.wikipedia.org/w/api.php?action=opensearch&limit=1&format=json&search=${q}`, { signal: AbortSignal.timeout(8000) }).then(r => r.json())
  const title = s?.[1]?.[0]
  if (!title) return 'No encuentro ese artículo.'
  const j = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'NEXUS desktop assistant' } }).then(r => r.json())
  return `${j.title}: ${j.extract || 'sin resumen'}\n${j.content_urls?.desktop?.page || ''}`
}

// ---------- files ----------
async function listDirectory(p: string) {
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

const SKIP = /^(node_modules|\.git|\$recycle\.bin|appdata|windows|program files.*|programdata|system volume information|\.cache|\.vscode|\.idea|dist|out|build)$/i

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

async function readFile(p: string, offset = 0) {
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

async function folderSize(p: string) {
  const root = toPath(p)
  const files: { path: string; size: number }[] = []
  const bySub = new Map<string, number>()
  let count = 0
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
        count++
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
  return `${root}: ${size(total)} en ${count} archivos${Date.now() - started > 20000 ? ' (análisis parcial por tiempo)' : ''}\n\nSubcarpetas más grandes:\n${subs.join('\n')}\n\nArchivos más grandes:\n${big.join('\n')}`
}

async function writeFile(p: string, content: string, append: boolean) {
  const file = toPath(p); assertWritable(file)
  await fs.mkdir(dirname(file), { recursive: true })
  if (append) await fs.appendFile(file, content, 'utf8'); else await fs.writeFile(file, content, 'utf8')
  return `${append ? 'Añadido a' : 'Guardado'} ${file} (${size(Buffer.byteLength(content))})`
}

async function editFile(p: string, find: string, replace: string) {
  const file = toPath(p); assertWritable(file)
  const text = await fs.readFile(file, 'utf8')
  const n = text.split(find).length - 1
  if (!n) return 'No he encontrado ese texto exacto en el archivo; léelo primero.'
  await fs.writeFile(file, text.split(find).join(replace), 'utf8')
  return `Editado ${file}: ${n} ${n === 1 ? 'coincidencia' : 'coincidencias'} reemplazadas.`
}

async function movePath(from: string, to: string) {
  const a = toPath(from), b = toPath(to); assertWritable(a); assertWritable(b)
  await fs.mkdir(dirname(b), { recursive: true })
  await fs.rename(a, b)
  return `Movido: ${a} → ${b}`
}

async function deletePath(p: string) {
  const file = toPath(p); assertWritable(file)
  await fs.stat(file)
  await shell.trashItem(file)
  return `Enviado a la papelera: ${file}`
}

async function createFolder(p: string) {
  const dir = toPath(p); assertWritable(dir)
  await fs.mkdir(dir, { recursive: true })
  return `Carpeta lista: ${dir}`
}

// ---------- system ----------
export function powershell(command: string, timeout = 30000, env?: Record<string, string>): Promise<string> {
  return new Promise(res => {
    // UTF-8 output so accents survive
    const cmd = `[Console]::OutputEncoding = [Text.Encoding]::UTF8; $ProgressPreference = 'SilentlyContinue'; ${command}`
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', cmd], { windowsHide: true, timeout, maxBuffer: 4e6, ...(env ? { env: { ...process.env, ...env } } : {}) }, (err, out, errOut) => {
      const text = (out || '').trim() + (errOut?.trim() ? `\n[errores]\n${errOut.trim()}` : '')
      res(err && (err as any).killed ? 'El comando tardó demasiado y se ha cancelado.' : text || (err ? `Error: ${err.message}` : '(sin salida)'))
    })
  })
}

async function systemStatus() {
  const total = os.totalmem(), free = os.freemem()
  const cpu = await new Promise<number>(r => {
    const snap = () => os.cpus().reduce((a, c) => ({ idle: a.idle + c.times.idle, total: a.total + Object.values(c.times).reduce((x, y) => x + y, 0) }), { idle: 0, total: 0 })
    const a = snap(); setTimeout(() => { const b = snap(); r(Math.round(100 * (1 - (b.idle - a.idle) / (b.total - a.total)))) }, 400)
  })
  const extra = await powershell(`
$d = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | ForEach-Object { "$($_.DeviceID) $([math]::Round(($_.Size-$_.FreeSpace)/1GB,1)) de $([math]::Round($_.Size/1GB,1)) GB usados, $([math]::Round($_.FreeSpace/1GB,1)) GB libres" }
$g = (Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name) -join ', '
$b = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1
$o = Get-CimInstance Win32_OperatingSystem
"Discos: " + ($d -join ' | ')
"GPU: $g"
"Batería: " + $(if ($b) { "$($b.EstimatedChargeRemaining) %" } else { "sin batería (sobremesa)" })
"Sistema: $($o.Caption) $($o.Version)"`, 20000)
  return [
    `Equipo: ${os.hostname()} · usuario ${os.userInfo().username}`,
    `CPU: ${os.cpus()[0]?.model.trim()} · ${os.cpus().length} hilos · uso ${cpu} %`,
    `Memoria: ${size(total - free)} de ${size(total)} (${Math.round((1 - free / total) * 100)} %)`,
    `Encendido desde hace ${(os.uptime() / 3600).toFixed(1)} h`,
    extra
  ].join('\n')
}

async function topProcesses(sort = 'cpu', count = 10) {
  const n = Math.max(3, Math.min(25, Math.round(Number(count) || 10)))
  const by = sort === 'memory' ? 'WorkingSet64' : 'CPU'
  return powershell(`Get-Process | Sort-Object ${by} -Descending | Select-Object -First ${n} | ForEach-Object { "{0} · CPU {1:N0} s · RAM {2:N0} MB · PID {3}" -f $_.ProcessName, $_.CPU, ($_.WorkingSet64/1MB), $_.Id }`)
}

// ---------- confirmation texts ----------
/** What the user sees in the approval dialog. */
export function describe(name: string, a: any): { title: string; detail: string } {
  const p = (x: unknown) => { try { return toPath(x) } catch { return String(x) } }
  switch (name) {
    case 'write_file': return { title: a.append ? 'Añadir texto a un archivo' : 'Guardar un archivo', detail: `${p(a.path)}\n\n${clip(String(a.content || ''), 1500)}` }
    case 'edit_file': return { title: 'Modificar un archivo', detail: `${p(a.path)}\n\n− ${clip(String(a.find || ''), 700)}\n+ ${clip(String(a.replace || ''), 700)}` }
    case 'move_path': return { title: 'Mover o renombrar', detail: `${p(a.from)}\n→ ${p(a.to)}` }
    case 'delete_path': return { title: 'Enviar a la papelera', detail: p(a.path) }
    case 'run_powershell': return { title: String(a.reason || 'Ejecutar un comando'), detail: clip(String(a.command || ''), 1500) }
    default: return { title: name, detail: JSON.stringify(a).slice(0, 800) }
  }
}

/** Short label for the core while a tool runs. */
export function progressLabel(name: string, a: any) {
  const short = (s: unknown, n = 40) => { const t = String(s || ''); return t.length > n ? t.slice(0, n) + '…' : t }
  switch (name) {
    case 'web_search': return 'Buscando · ' + short(a.query)
    case 'read_webpage': try { return 'Leyendo · ' + new URL(a.url).hostname.replace('www.', '') } catch { return 'Leyendo página' }
    case 'wikipedia': return 'Wikipedia · ' + short(a.topic)
    case 'list_directory': return 'Mirando · ' + short(basename(String(a.path || '')) || a.path)
    case 'find_files': return 'Buscando archivos · ' + short(a.query)
    case 'read_file': return 'Leyendo · ' + short(basename(String(a.path || '')))
    case 'folder_size': return 'Analizando espacio · ' + short(basename(String(a.path || '')) || a.path)
    case 'system_status': return 'Revisando el equipo'
    case 'top_processes': return 'Revisando procesos'
    case 'run_powershell': return 'Ejecutando comando'
    default: return ''
  }
}

// ---------- dispatcher ----------
export async function runAgentTool(name: string, a: any): Promise<{ result: string; label: string } | null> {
  switch (name) {
    case 'web_search': return { result: await webSearch(String(a.query || '')), label: 'Búsqueda web · ' + String(a.query || '').slice(0, 50) }
    case 'read_webpage': return { result: await readWebpage(String(a.url || '')), label: 'Página leída' }
    case 'wikipedia': return { result: await wikipedia(String(a.topic || '')), label: 'Wikipedia · ' + String(a.topic || '').slice(0, 40) }
    case 'list_directory': return { result: await listDirectory(a.path), label: 'Carpeta revisada' }
    case 'find_files': return { result: await findFiles(String(a.query || ''), a.folder), label: 'Archivos buscados · ' + String(a.query || '').slice(0, 30) }
    case 'read_file': return { result: await readFile(a.path, a.offset), label: 'Leído · ' + basename(String(a.path || '')) }
    case 'folder_size': return { result: await folderSize(a.path), label: 'Espacio analizado' }
    case 'write_file': return { result: await writeFile(a.path, String(a.content ?? ''), !!a.append), label: 'Archivo guardado · ' + basename(String(a.path || '')) }
    case 'edit_file': return { result: await editFile(a.path, String(a.find ?? ''), String(a.replace ?? '')), label: 'Archivo editado · ' + basename(String(a.path || '')) }
    case 'move_path': return { result: await movePath(a.from, a.to), label: 'Movido · ' + basename(String(a.to || '')) }
    case 'delete_path': return { result: await deletePath(a.path), label: 'A la papelera · ' + basename(String(a.path || '')) }
    case 'create_folder': return { result: await createFolder(a.path), label: 'Carpeta creada · ' + basename(String(a.path || '')) }
    case 'system_status': return { result: await systemStatus(), label: 'Estado del equipo' }
    case 'top_processes': return { result: await topProcesses(a.sort, a.count), label: 'Procesos revisados' }
    case 'run_powershell': return { result: clip(await powershell(String(a.command || ''))), label: 'Comando ejecutado' }
    default: return null
  }
}
