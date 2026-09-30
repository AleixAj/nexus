// Small markdown renderer for chat answers: paragraphs, headings, lists,
// **bold**, *italic*, `code` and links. Builds React elements (no raw HTML).
import { Fragment, type ReactNode } from 'react'

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\)|https?:\/\/[^\s)]+|\*[^*\s][^*]*\*)/g

function open(url: string) {
  return (e: { preventDefault: () => void }) => { e.preventDefault(); window.open(url) }
}

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0, k = 0
  for (const m of text.matchAll(INLINE)) {
    if (m.index! > last) out.push(text.slice(last, m.index))
    const t = m[0]
    if (t.startsWith('**')) out.push(<b key={k++} style={{ color: '#FFF6E9', fontWeight: 600 }}>{t.slice(2, -2)}</b>)
    else if (t.startsWith('`')) out.push(<code key={k++} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.88em', padding: '1px 6px', borderRadius: 5, background: 'rgba(255,255,255,.07)' }}>{t.slice(1, -1)}</code>)
    else if (t.startsWith('[')) {
      const [, label, url] = t.match(/\[([^\]]+)\]\(([^)]+)\)/)!
      out.push(<a key={k++} href={url} onClick={open(url)} style={{ color: 'rgb(var(--acc2))', textDecoration: 'underline', textUnderlineOffset: 3 }}>{label}</a>)
    } else if (t.startsWith('http')) {
      const short = t.replace(/^https?:\/\/(www\.)?/, '').slice(0, 48)
      out.push(<a key={k++} href={t} onClick={open(t)} style={{ color: 'rgb(var(--acc2))', textDecoration: 'underline', textUnderlineOffset: 3 }}>{short}</a>)
    } else out.push(<i key={k++}>{t.slice(1, -1)}</i>)
    last = m.index! + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export default function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  const flush = () => {
    if (!list) return
    const Tag = list.ordered ? 'ol' : 'ul'
    blocks.push(<Tag key={blocks.length} style={{ margin: '2px 0', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 4 }}>{list.items.map((it, i) => <li key={i}>{inline(it)}</li>)}</Tag>)
    list = null
  }
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    const li = line.match(/^\s*(?:[-*•]|(\d+)[.)])\s+(.*)$/)
    if (li) {
      const ordered = !!li[1]
      if (!list || list.ordered !== ordered) { flush(); list = { ordered, items: [] } }
      list.items.push(li[2])
      continue
    }
    flush()
    if (!line.trim()) continue
    const h = line.match(/^#{1,4}\s+(.*)$/)
    if (h) blocks.push(<div key={blocks.length} style={{ marginTop: 6, fontWeight: 600, color: '#FFF6E9' }}>{inline(h[1])}</div>)
    else if (/^\|/.test(line)) blocks.push(<div key={blocks.length} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.85em', whiteSpace: 'pre-wrap', opacity: /^\|[\s|:-]+\|$/.test(line) ? .35 : 1 }}>{line}</div>)
    else blocks.push(<div key={blocks.length}>{inline(line)}</div>)
  }
  flush()
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</div>
}
