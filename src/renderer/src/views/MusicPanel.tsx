// What Spotify (desktop app) is playing: real cover, progress, controls and synced lyrics.
import { useLayoutEffect, useRef, useState } from 'react'

const mono = "'JetBrains Mono',monospace"
const ease = 'cubic-bezier(.16,1,.3,1)'

function Icon({ d, size = 20, fill = 'none' }: { d: string; size?: number; fill?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
}

export default function MusicPanel({ v }: { v: any }) {
  // keep the current lyric line at ~30% of the box, whatever its height
  const list = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  useLayoutEffect(() => {
    const el = list.current?.children[Math.max(0, v.lyricCur)] as HTMLElement | undefined
    setOffset(el ? 168 - el.offsetTop - el.offsetHeight / 2 + 28 : 0)
  }, [v.lyricCur, v.lyricLines?.length, v.isMusic])
  if (!v.isMusic) return null
  const m = v.musicNow
  const close = (
    <button onClick={v.closePanel} style={{ position: 'absolute', right: 'calc(64px - var(--ex))', top: 56, width: 40, height: 40, borderRadius: 10, border: '1px solid rgba(196,181,253,.14)', background: 'rgba(7,5,14,.4)', color: 'rgba(226,218,240,.7)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
      <Icon d="M6 6l12 12M18 6L6 18" size={16} />
    </button>
  )

  if (!m) {
    return (
      <>
        {close}
        <div style={{ position: 'absolute', left: 96, top: 180, width: 420, display: 'flex', flexDirection: 'column', gap: 18, animation: `nx-left 800ms ${ease} both` }}>
          <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: '.2em', color: 'rgb(var(--acc2) / .62)' }}>SPOTIFY</span>
          <span style={{ fontSize: 36, fontWeight: 300, color: '#FFF6E9' }}>{v.spotifyHint.title}</span>
          <span style={{ fontSize: 15.5, lineHeight: 1.55, color: 'rgba(226,218,240,.6)' }}>{v.spotifyHint.text}</span>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={v.spotifyOpen} style={{ height: 44, padding: '0 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,.18)', background: 'linear-gradient(180deg, rgb(var(--acc) / .95), rgb(var(--acc) / .7))', color: '#fff', fontSize: 14.5, cursor: 'pointer' }}>Abrir Spotify</button>
            <button onClick={v.spotifyLiked} style={{ height: 44, padding: '0 18px', borderRadius: 10, border: '1px solid rgba(196,181,253,.2)', background: 'rgba(0,0,0,.3)', color: 'rgba(241,234,248,.85)', fontSize: 14.5, cursor: 'pointer' }}>Mis Me gusta</button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {close}
      <div style={{ position: 'absolute', left: 96, top: 140, width: 400, display: 'flex', flexDirection: 'column', gap: 20, animation: `nx-left 800ms ${ease} both` }}>
        <div style={{ width: 400, height: 400, borderRadius: 14, overflow: 'hidden', position: 'relative', boxShadow: `0 30px 90px ${v.musicGlow}, 0 0 0 1px rgba(255,255,255,.08)`, background: 'repeating-linear-gradient(135deg, rgba(255,255,255,.06) 0 2px, transparent 2px 12px), linear-gradient(135deg, rgb(var(--acc)), #1E1B4B)' }}>
          {m.cover && <img src={m.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', animation: `nx-in 600ms ${ease} both` }} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: '.2em', color: '#FDBA74', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.source}</span>
          <span style={{ fontSize: 34, fontWeight: 400, color: '#FFF6E9', letterSpacing: '-.01em', lineHeight: 1.15 }}>{m.title}</span>
          <span style={{ fontSize: 17, color: 'rgba(226,218,240,.65)' }}>{m.artist}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ height: 3, borderRadius: 3, background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: m.pct, background: 'linear-gradient(90deg, #FB923C, rgb(var(--acc2)))', boxShadow: '0 0 12px rgba(251,146,60,.6)', transition: 'width 1000ms linear' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 11.5, color: 'rgba(226,218,240,.55)' }}>
            <span>{m.time}</span><span>{m.duration}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
          <button onClick={v.musicShuffle} title="Aleatorio" style={{ width: 40, height: 40, border: 'none', background: 'none', color: m.shuffle ? '#FDBA74' : 'rgba(226,218,240,.45)', display: 'grid', placeItems: 'center', cursor: 'pointer', filter: m.shuffle ? 'drop-shadow(0 0 6px #FB923C)' : 'none' }}>
            <Icon d="M4 7h3l10 10h3M4 17h3l3-3M14 10l3-3h3M18 4l2 3-2 3M18 14l2 3-2 3" size={18} />
          </button>
          <button onClick={v.prevTrack} title="Anterior" style={{ width: 44, height: 44, border: 'none', background: 'none', color: 'rgba(241,234,248,.85)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <Icon d="M18 6v12L9 12zM6 6v12" />
          </button>
          <button onClick={v.togglePlay} title={m.playing ? 'Pausar' : 'Reproducir'} style={{ width: 68, height: 68, borderRadius: '50%', border: '1px solid rgba(255,255,255,.25)', background: 'linear-gradient(160deg, rgba(251,146,60,.9), rgb(var(--acc) / .8))', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: '0 0 36px rgba(251,146,60,.35)' }}>
            <Icon d={v.playIcon} size={22} fill="currentColor" />
          </button>
          <button onClick={v.nextTrack} title="Siguiente" style={{ width: 44, height: 44, border: 'none', background: 'none', color: 'rgba(241,234,248,.85)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <Icon d="M6 6v12l9-6zM18 6v12" />
          </button>
          <button onClick={v.musicRepeat} title={m.repeatLabel} style={{ position: 'relative', width: 40, height: 40, border: 'none', background: 'none', color: m.repeat !== 'None' ? '#FDBA74' : 'rgba(226,218,240,.45)', display: 'grid', placeItems: 'center', cursor: 'pointer', filter: m.repeat !== 'None' ? 'drop-shadow(0 0 6px #FB923C)' : 'none' }}>
            <Icon d="M4 12V9a3 3 0 0 1 3-3h13l-3-3M20 12v3a3 3 0 0 1-3 3H4l3 3" size={18} />
            {m.repeat === 'Track' && <span style={{ position: 'absolute', right: 6, top: 6, fontFamily: mono, fontSize: 9, color: '#FDBA74' }}>1</span>}
          </button>
        </div>
      </div>

      <div style={{ position: 'absolute', right: 96, top: 140, width: 480, display: 'flex', flexDirection: 'column', gap: 18, animation: `nx-right 800ms ${ease} 100ms both` }}>
        <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: '.2em', color: 'rgb(var(--acc2) / .62)' }}>LETRA SINCRONIZADA</span>
        {v.lyricLines ? (
          <div style={{ height: 560, overflow: 'hidden', WebkitMask: 'linear-gradient(transparent, #000 22%, #000 70%, transparent)', mask: 'linear-gradient(transparent, #000 22%, #000 70%, transparent)' }}>
            <div ref={list} style={{ display: 'flex', flexDirection: 'column', transform: `translateY(${offset}px)`, transition: `transform 900ms ${ease}` }}>
              {v.lyricLines.map((l: any, i: number) => (
                <span key={i} style={{ padding: '10px 0', fontSize: l.cur ? 28 : 21, fontWeight: 400, lineHeight: 1.2, color: l.cur ? '#FFF6E9' : l.past ? 'rgba(226,218,240,.3)' : 'rgba(226,218,240,.5)', filter: l.far ? 'blur(1px)' : 'none', textShadow: l.cur ? `0 0 24px ${v.musicGlow}` : 'none', transition: `color 500ms, font-size 500ms ${ease}, filter 500ms` }}>{l.text}</span>
              ))}
            </div>
          </div>
        ) : (
          <span style={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(226,218,240,.5)' }}>{v.lyricsNote}</span>
        )}
      </div>
    </>
  )
}
