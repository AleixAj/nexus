// One-off converter: turns the Claude Design export (design/NEXUS.dc.html)
// into React views + global CSS. Run: node scripts/convert-design.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { parse, NodeType } from 'node-html-parser'

const SRC = 'design/NEXUS.dc.html'
const OUT = 'src/renderer/src/views'
const html = readFileSync(SRC, 'utf8')

const helmet = html.slice(html.indexOf('<helmet>') + 8, html.indexOf('</helmet>'))
const cssBody = helmet.match(/<style>([\s\S]*?)<\/style>/)[1]
const template = html.slice(html.indexOf('</helmet>') + 9, html.lastIndexOf('</x-dc>'))
const script = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]

const root = parse(template, { comment: true, lowerCaseTagName: false })

// ---------- helpers ----------
const pseudoCss = []
let cls = 0
const BIND = /\{\{\s*([^}]+?)\s*\}\}/g

function expr(raw, scope) {
  const e = raw.trim()
  if (e === 'true' || e === 'false') return e
  const head = e.split('.')[0]
  return scope.has(head) ? e : 'v.' + e
}

function textToJsx(text, scope) {
  if (!text.includes('{{')) return escapeText(text)
  let out = '', last = 0
  for (const m of text.matchAll(BIND)) {
    out += escapeText(text.slice(last, m.index)) + '{' + expr(m[1], scope) + '}'
    last = m.index + m[0].length
  }
  return out + escapeText(text.slice(last))
}

function escapeText(t) {
  return t.replace(/[{}]/g, c => `{'${c}'}`).replace(/&nbsp;/g, ' ')
}

// value that may contain bindings -> JS expression string
function valueExpr(val, scope) {
  const parts = [...val.matchAll(BIND)]
  if (!parts.length) return JSON.stringify(val)
  if (parts.length === 1 && parts[0][0] === val.trim()) return expr(parts[0][1], scope)
  let out = '`', last = 0
  for (const m of parts) {
    out += val.slice(last, m.index).replace(/`/g, '\\`') + '${' + expr(m[1], scope) + '}'
    last = m.index + m[0].length
  }
  return out + val.slice(last).replace(/`/g, '\\`') + '`'
}

function splitDecls(css) {
  const out = []
  let depth = 0, cur = ''
  for (const ch of css) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ';' && depth === 0) { out.push(cur); cur = '' } else cur += ch
  }
  out.push(cur)
  return out.map(s => s.trim()).filter(Boolean)
}

function camel(prop) {
  if (prop.startsWith('--')) return JSON.stringify(prop)
  if (prop.startsWith('-webkit-')) prop = 'Webkit-' + prop.slice(8)
  return prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}

function styleObj(css, scope) {
  const decls = splitDecls(css).map(d => {
    const i = d.indexOf(':')
    return camel(d.slice(0, i).trim()) + ': ' + valueExpr(d.slice(i + 1).trim(), scope)
  })
  return '{{ ' + decls.join(', ') + ' }}'
}

function important(css) {
  return splitDecls(css).map(d => d + ' !important').join('; ')
}

const PSEUDO = { 'style-hover': ':hover', 'style-active': ':active', 'style-focus': ':focus-within', 'style-before': '::before', 'style-after': '::after' }
const ATTR = { 'stroke-width': 'strokeWidth', 'stroke-linecap': 'strokeLinecap', 'stroke-linejoin': 'strokeLinejoin', 'stroke-dasharray': 'strokeDasharray', viewbox: 'viewBox', class: 'className' }
const VOID = new Set(['input', 'canvas', 'path', 'circle', 'ellipse', 'line', 'polyline'])

function attrs(el, scope) {
  const out = []
  const classes = []
  for (const [name, val] of Object.entries(el.rawAttributes)) {
    if (name.startsWith('hint-')) continue
    if (PSEUDO[name]) {
      const c = 'dc' + (++cls)
      classes.push(c)
      const hoverish = name === 'style-before' || name === 'style-after'
      pseudoCss.push(`.${c}${PSEUDO[name]}{${hoverish ? val : important(val)}}`)
      continue
    }
    if (name === 'style') { out.push('style=' + styleObj(val, scope)); continue }
    const jsName = ATTR[name] || name
    const ve = valueExpr(val, scope)
    out.push(jsName + '=' + (ve.startsWith('"') ? ve : '{' + ve + '}'))
  }
  if (classes.length) out.push(`className="${classes.join(' ')}"`)
  return out.length ? ' ' + out.join(' ') : ''
}

function children(el, scope, ind) {
  return el.childNodes.map(n => node(n, scope, ind)).filter(Boolean).join('\n')
}

function node(n, scope, ind) {
  const pad = '  '.repeat(ind)
  if (n.nodeType === NodeType.COMMENT_NODE) return pad + '{/*' + n.rawText + '*/}'
  if (n.nodeType === NodeType.TEXT_NODE) {
    const t = n.rawText
    if (!t.trim()) return ''
    return pad + textToJsx(t.replace(/\s+/g, ' ').trim(), scope)
  }
  const tag = n.rawTagName
  if (tag === 'sc-if') {
    const cond = valueExpr(n.rawAttributes.value, scope)
    return `${pad}{${cond} && (<>\n${children(n, scope, ind + 1)}\n${pad}</>)}`
  }
  if (tag === 'sc-for') {
    const list = valueExpr(n.rawAttributes.list, scope)
    const as = n.rawAttributes.as
    const inner = new Set(scope); inner.add(as)
    return `${pad}{(${list} || []).map((${as}, ${as}Index) => (<Fragment key={${as}?.id ?? ${as}Index}>\n${children(n, inner, ind + 1)}\n${pad}</Fragment>))}`
  }
  const a = attrs(n, scope)
  const kids = children(n, scope, ind + 1)
  if (!kids && VOID.has(tag)) return `${pad}<${tag}${a} />`
  if (!kids) return `${pad}<${tag}${a}></${tag}>`
  return `${pad}<${tag}${a}>\n${kids}\n${pad}</${tag}>`
}

// ---------- split into sections ----------
// root > div(fixed) > div(stage) > sections
const stage = root.querySelector('div').querySelector('div')
const sections = []
let current = { name: 'Background', nodes: [] }
const SECTION = /=+\s*(.+?)\s*=+/
for (const n of stage.childNodes) {
  if (n.nodeType === NodeType.COMMENT_NODE && SECTION.test(n.rawText)) {
    sections.push(current)
    current = { name: n.rawText.match(SECTION)[1], nodes: [] }
    continue
  }
  if (n.nodeType === NodeType.COMMENT_NODE && /^\s*dock\s*$/.test(n.rawText)) {
    sections.push(current)
    current = { name: 'Dock', nodes: [] }
    continue
  }
  if (n.nodeType === NodeType.COMMENT_NODE && /^\s*director\s*$/.test(n.rawText)) {
    sections.push(current)
    current = { name: 'Director', nodes: [] }
    continue
  }
  current.nodes.push(n)
}
sections.push(current)

const NAMES = { 'CHAT': 'ChatPanel', 'VOZ Y PERSONALIDAD': 'VoicePanel', 'RUTINAS': 'RoutinesPanel', 'SISTEMA': 'SystemPanel', 'MÚSICA': 'MusicPanel', 'MEMORIA': 'MemoryPanel', 'AJUSTES': 'SettingsPanel', 'OVERLAY': 'Overlay', 'ONBOARDING': 'Onboarding', 'Background': 'Desktop', 'Dock': 'Dock', 'Director': 'Director' }

mkdirSync(OUT, { recursive: true })
const made = []
for (const s of sections) {
  const comp = NAMES[s.name]
  if (!comp) throw new Error('Unknown section ' + s.name)
  const body = s.nodes.map(n => node(n, new Set(), 2)).filter(Boolean).join('\n')
  const needsFragment = body.includes('<Fragment')
  const src = `// Generated from design/NEXUS.dc.html by scripts/convert-design.mjs\n` +
    `import ${needsFragment ? '{ Fragment }' : ''}${needsFragment ? ' from' : ''}${needsFragment ? " 'react'" : "'react'"}\n\n` +
    `export default function ${comp}({ v }: { v: any }) {\n  return (\n    <>\n${body}\n    </>\n  )\n}\n`
  writeFileSync(`${OUT}/${comp}.tsx`, src.replace("import 'react'\n\n", ''))
  made.push(comp)
}

// stage wrapper
const stageAttrs = attrs(stage, new Set())
writeFileSync(`${OUT}/Stage.tsx`,
  `// Generated from design/NEXUS.dc.html by scripts/convert-design.mjs\n` +
  made.map(c => `import ${c} from './${c}'`).join('\n') +
  `\n\nexport default function Stage({ v }: { v: any }) {\n  return (\n    <div style={{ position: 'fixed', inset: 0, background: '#05030A', overflow: 'hidden' }}>\n      <div${stageAttrs}>\n` +
  made.map(c => `        <${c} v={v} />`).join('\n') +
  `\n      </div>\n    </div>\n  )\n}\n`)

writeFileSync('src/renderer/src/styles/design.css', cssBody.trim() + '\n\n/* pseudo-state rules from style-hover / style-before etc. */\n' + pseudoCss.join('\n') + '\n')
writeFileSync('scripts/design-logic.txt', script)
console.log('views:', made.join(', '), '| pseudo rules:', pseudoCss.length)
