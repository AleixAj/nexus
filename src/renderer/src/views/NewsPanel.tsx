// News of the day: a featured story and a grid of the rest, filtered by the user's topics.
import { useState } from 'react'

const mono = "'JetBrains Mono',monospace"
const ease = 'cubic-bezier(.16,1,.3,1)'

// a broken or blocked image leaves the gradient placeholder instead of an empty frame
function Thumb({ src, style }: { src: string; style: React.CSSProperties }) {
  const [ok, setOk] = useState(true)
  return (
    <div style={{ ...style, overflow: 'hidden', background: 'repeating-linear-gradient(135deg, rgba(255,255,255,.04) 0 2px, transparent 2px 10px), linear-gradient(135deg, rgb(var(--acc) / .5), #120c24)' }}>
      {src && ok && <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setOk(false)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
    </div>
  )
}

function Chip({ c, children, title }: { c: any; children: React.ReactNode; title?: string }) {
  return (
    <button onClick={c.pick} title={title} style={{ height: 32, padding: '0 13px', borderRadius: 999, cursor: 'pointer', fontSize: 13, border: `1px solid ${c.border}`, background: c.bg, color: 'rgba(241,234,248,.9)', transition: 'background 250ms, border-color 250ms', whiteSpace: 'nowrap' }}>
      {children}
    </button>
  )
}

export default function NewsPanel({ v }: { v: any }) {
  if (!v.isNews) return null
  const top = v.newsTop
  return (
    <div style={{ position: 'absolute', right: 'calc(24px - var(--ex))', top: 24, bottom: 112, width: 1080, display: 'flex', flexDirection: 'column', background: 'linear-gradient(rgba(7,5,14,.55),rgba(7,5,14,.55)) padding-box, linear-gradient(155deg, rgb(var(--acc) / .55), rgb(var(--acc) / .06) 45%, rgb(var(--acc) / 0)) border-box', border: '1px solid transparent', borderRadius: 14, backdropFilter: 'blur(24px) saturate(1.2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.07), 0 24px 70px rgba(0,0,0,.35)', animation: `nx-right 600ms ${ease} both` }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '26px 32px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: '.2em', color: 'rgb(var(--acc2) / .62)' }}>{v.newsHeader}</span>
          <span style={{ fontSize: 30, fontWeight: 400 }}>Lo interesante de hoy</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={v.readNews} style={{ height: 40, padding: '0 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,.18)', background: 'linear-gradient(180deg, rgb(var(--acc) / .95), rgb(var(--acc) / .7))', color: '#fff', fontSize: 14, cursor: 'pointer' }}>▶ Resumen en voz</button>
          <button onClick={v.refreshNews} title="Actualizar" style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid rgb(var(--acc2) / .14)', background: 'rgba(255,255,255,.02)', color: 'rgba(226,218,240,.75)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" style={{ animation: v.newsLoading ? 'nx-spin 1s linear infinite' : 'none' }}><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5" /></svg>
          </button>
          <button onClick={v.closePanel} style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid rgb(var(--acc2) / .14)', background: 'rgba(255,255,255,.02)', color: 'rgba(226,218,240,.7)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </div>

      {/* filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 32px 16px', flexWrap: 'wrap' }}>
        {v.newsTopics.map((t: any) => <Chip key={t.id} c={t} title={t.title}>{t.on ? '✓ ' : ''}{t.label}</Chip>)}
        <span style={{ width: 1, height: 22, background: 'rgb(var(--acc2) / .16)', margin: '0 4px' }} />
        <Chip c={v.noPolitics}>{v.noPolitics.on ? '⊘ Sin política' : 'Con política'}</Chip>
        <input value={v.newsAvoidInput} onChange={v.onNewsAvoid} placeholder="Evitar también… (fútbol, famosos)" style={{ flex: '1 1 180px', minWidth: 160, height: 32, padding: '0 12px', borderRadius: 999, background: 'rgba(0,0,0,.3)', border: '1px solid rgb(var(--acc2) / .16)', outline: 'none', color: '#FFF6E9', fontSize: 13 }} />
      </div>

      {/* stories */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0 32px 28px' }}>
        {v.newsFact && (
          <div style={{ display: 'flex', gap: 18, alignItems: 'baseline', padding: '14px 18px', margin: '0 0 18px', borderRadius: 12, background: 'rgb(var(--acc) / .08)', border: '1px solid rgb(var(--acc2) / .16)', animation: 'nx-in 500ms both' }}>
            <span style={{ flex: 'none', fontFamily: mono, fontSize: 11, letterSpacing: '.2em', color: 'rgb(var(--acc2) / .75)' }}>EN UN DÍA COMO HOY · {v.newsFact.year}</span>
            <span style={{ fontSize: 15, lineHeight: 1.5, color: 'rgba(241,234,248,.85)', textWrap: 'pretty' } as any}>{v.newsFact.text}</span>
          </div>
        )}
        {!top && <span style={{ display: 'block', padding: '60px 0', textAlign: 'center', fontSize: 15, color: 'rgba(226,218,240,.5)' }}>{v.newsLoading ? 'Leyendo las noticias…' : v.newsEmpty ? 'No hay noticias nuevas de estos temas ahora mismo.' : ''}</span>}
        {top && (
          <div onClick={top.open} data-spot="1" style={{ display: 'grid', gridTemplateColumns: '440px minmax(0,1fr)', gap: 24, padding: 14, margin: '0 -14px 18px', borderRadius: 14, cursor: 'pointer', animation: `nx-in 500ms ${ease} 80ms both` }} className="nx-news">
            <Thumb src={top.image} style={{ height: 248, borderRadius: 12, boxShadow: '0 18px 50px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.06)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center', minWidth: 0 }}>
              <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: '.2em', color: '#F5B971' }}>DESTACADA · {top.meta}</span>
              <span style={{ fontSize: 25, lineHeight: 1.25, color: '#FFF6E9', textWrap: 'pretty' as any }}>{top.title}</span>
              <span style={{ fontSize: 14.5, lineHeight: 1.55, color: 'rgba(226,218,240,.62)', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{top.summary}</span>
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 22px' }}>
          {v.newsRest.map((x: any) => (
            <div key={x.id} onClick={x.open} title={x.summary} data-spot="1" style={{ display: 'grid', gridTemplateColumns: '132px minmax(0,1fr)', gap: 14, alignItems: 'center', padding: 10, margin: '0 -10px', borderRadius: 12, cursor: 'pointer', animation: `nx-in 500ms ${ease} both`, animationDelay: x.delay }} className="nx-news">
              <Thumb src={x.image} style={{ height: 80, borderRadius: 9 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 14.5, lineHeight: 1.35, color: 'rgba(255,246,233,.92)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{x.title}</span>
                <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: '.16em', color: 'rgb(var(--acc2) / .6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.meta}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
