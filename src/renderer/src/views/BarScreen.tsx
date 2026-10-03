// The floating bar (Ctrl + Alt + A to ask, Ctrl + Alt + S on selected text). A small window of
// its own over any app; the answer streams in and can be copied or pasted back.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { api } from '../app/util'
import { THEMES } from '../app/constants'

const mono = "'JetBrains Mono',monospace"
// what to do with the selected text
const ACTIONS: [string, string][] = [
  ['Resumir', 'Resume este texto en pocas frases claras.'],
  ['Traducir', 'Tradúcelo: al español si está en otro idioma; si ya está en español, al inglés. Solo la traducción.'],
  ['Corregir', 'Corrige la ortografía, la gramática y la puntuación sin cambiar el estilo. Devuelve solo el texto corregido.'],
  ['Explicar', 'Explícalo de forma sencilla, como a alguien que no es experto.'],
  ['Responder', 'Escribe una respuesta breve y natural a este mensaje, en el mismo idioma. Solo la respuesta.'],
]
// asterisks and headings from the model read badly in a small box
const plain = (t: string) => t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#{1,4}\s*/gm, '').replace(/^\s*[-*]\s+/gm, '• ')

let seq = 900000

export default function BarScreen() {
  const [selection, setSelection] = useState('')
  const [input, setInput] = useState('')
  const [answer, setAnswer] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<{ cid: number; title: string; detail: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLInputElement>(null)
  const current = useRef(0)
  // the colours of the user's theme
  const [th, setTh] = useState(THEMES.solar)
  useEffect(() => { api?.getSettings().then((s: any) => setTh((THEMES as any)[s.theme] || THEMES.solar)).catch(() => {}) }, [])

  // the window is as tall as what it shows
  useLayoutEffect(() => {
    const el = root.current; if (!el || !api) return
    const ro = new ResizeObserver(() => api.barResize(Math.ceil(el.getBoundingClientRect().height) + 2))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!api) return
    const offs = [
      api.onBarOpen(({ selection: sel }: { selection: string }) => {
        api.getSettings().then((s: any) => setTh((THEMES as any)[s.theme] || THEMES.solar)).catch(() => {}); setSelection(sel || ''); setInput(''); setAnswer(''); setStatus(''); setConfirm(null); setBusy(false); setCopied(false)
        current.current = 0
        setTimeout(() => field.current?.focus(), 30)
      }),
      api.onDelta((id: number, t: string) => { if (id === current.current) setAnswer(a => a + t) }),
      api.onProgress((id: number, label: string) => { if (id === current.current) setStatus(label) }),
      api.onAction((id: number, label: string) => { if (id === current.current) setStatus(label) }),
      api.onConfirm((id: number, cid: number, req: { title: string; detail: string }) => { if (id === current.current) setConfirm({ cid, ...req }) }),
    ]
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (busy) api.abort(); api.barHide() } }
    addEventListener('keydown', key)
    return () => { offs.forEach((off: any) => off && off()); removeEventListener('keydown', key) }
  }, [busy])

  async function run(prompt: string) {
    if (!api || !prompt.trim()) return
    const id = ++seq
    current.current = id
    setAnswer(''); setStatus('Pensando…'); setBusy(true); setCopied(false); setConfirm(null)
    const res = await api.ask(id, prompt)
    if (current.current !== id) return
    setBusy(false); setStatus('')
    if (!res.ok && res.error !== 'ABORTED') setAnswer(res.error === 'NO_KEY' ? 'Falta la clave de la IA: ponla en Ajustes de NEXUS.' : 'No he podido responder: ' + res.error)
  }
  const ask = (instruction?: string) => {
    const q = instruction || input.trim()
    if (!q) return
    run(selection ? `${q}\n\nTexto seleccionado:\n"""\n${selection.slice(0, 12000)}\n"""\nResponde solo con el resultado, sin explicar lo que has hecho.` : q)
  }
  const reply = (ok: boolean) => { if (confirm && api) { api.confirmReply(confirm.cid, ok); setConfirm(null) } }
  const text = plain(answer)

  return (
    <div ref={root} style={{ ['--acc' as string]: th.acc, ['--acc2' as string]: th.acc2, fontFamily: "'Space Grotesk',system-ui,sans-serif", color: '#F1EAF8', padding: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px', borderRadius: 16, background: 'rgba(10,7,20,.94)', border: `1px solid rgb(${th.acc2} / .3)`, boxShadow: '0 18px 50px rgba(0,0,0,.55), 0 0 0 1px rgba(0,0,0,.4)', backdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ flex: 'none', width: 12, height: 12, borderRadius: '50%', background: busy ? '#F5B971' : th.c2, boxShadow: `0 0 12px ${busy ? '#F5B971' : th.c2}` }} />
          <input ref={field} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') ask() }} spellCheck={false}
            placeholder={selection ? 'Qué hago con el texto seleccionado… (o elige abajo)' : 'Pregúntale a NEXUS…'}
            style={{ flex: 1, minWidth: 0, height: 40, background: 'none', border: 'none', outline: 'none', color: '#FFF6E9', fontSize: 18 }} />
          <span style={{ flex: 'none', fontFamily: mono, fontSize: 11, letterSpacing: '.15em', color: 'rgba(226,218,240,.5)' }}>ESC PARA CERRAR</span>
        </div>
        {selection && (
          <>
            <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'rgba(226,218,240,.65)', padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,.04)', borderLeft: `2px solid rgb(${th.acc2} / .55)`, maxHeight: 64, overflow: 'hidden' }}>
              {selection.length > 260 ? selection.slice(0, 260) + '…' : selection}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ACTIONS.map(([label, instruction]) => (
                <button key={label} onClick={() => ask(instruction)} disabled={busy} style={{ height: 34, padding: '0 14px', borderRadius: 999, border: `1px solid rgb(${th.acc2} / .3)`, background: `rgb(${th.acc} / .18)`, color: '#FFF6E9', fontSize: 14, cursor: 'pointer', opacity: busy ? .5 : 1 }}>{label}</button>
              ))}
            </div>
          </>
        )}
        {!selection && !answer && !busy && (
          <span style={{ fontSize: 13, color: 'rgba(226,218,240,.5)' }}>Consejo: selecciona un texto en cualquier app y pulsa Ctrl + Alt + S para resumirlo, traducirlo o corregirlo.</span>
        )}
        {confirm && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(245,185,113,.1)', border: '1px solid rgba(245,185,113,.35)' }}>
            <span style={{ flex: 1, fontSize: 14.5 }}>¿Permites: {confirm.title}?</span>
            <button onClick={() => reply(true)} style={{ height: 32, padding: '0 14px', borderRadius: 8, border: 'none', background: th.c1, color: '#fff', cursor: 'pointer' }}>Sí</button>
            <button onClick={() => reply(false)} style={{ height: 32, padding: '0 14px', borderRadius: 8, border: '1px solid rgb(var(--acc2) / .3)', background: 'transparent', color: '#FFF6E9', cursor: 'pointer' }}>No</button>
          </div>
        )}
        {(busy || text) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {status && <span style={{ fontFamily: mono, fontSize: 11.5, letterSpacing: '.15em', color: `rgb(${th.acc2} / .8)` }}>{status.toUpperCase()}</span>}
            {text && <div style={{ fontSize: 16, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#FFF6E9', maxHeight: 420, overflow: 'auto' }}>{text}</div>}
            {text && !busy && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { api?.barCopy(text); setCopied(true) }} style={{ height: 34, padding: '0 14px', borderRadius: 8, border: '1px solid rgb(var(--acc2) / .3)', background: 'transparent', color: '#FFF6E9', fontSize: 14, cursor: 'pointer' }}>{copied ? '✓ Copiado' : 'Copiar'}</button>
                {selection && <button onClick={() => api?.barPaste(text)} title="Sustituye el texto seleccionado en la app donde estaba" style={{ height: 34, padding: '0 14px', borderRadius: 8, border: 'none', background: th.c1, color: '#fff', fontSize: 14, cursor: 'pointer' }}>Pegar en su sitio</button>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
