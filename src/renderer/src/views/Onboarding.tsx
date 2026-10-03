// First-run setup: a glass modal under the core with five steps.
// Every choice is applied (and saved) the moment it is made.
import { Fragment, type CSSProperties, type ReactNode } from 'react'

const mono = "'JetBrains Mono',monospace"
const ease = 'cubic-bezier(.16,1,.3,1)'
const enter = (d: number) => `nx-in 600ms ${ease} ${d}ms both`

const label: CSSProperties = { fontFamily: mono, fontSize: 10.5, letterSpacing: '.22em', color: 'rgb(var(--acc2) / .62)' }
const title: CSSProperties = { fontSize: 32, fontWeight: 300, letterSpacing: '-.01em', color: '#FFF6E9' }
const text: CSSProperties = { fontSize: 14.5, lineHeight: 1.55, color: 'rgba(226,218,240,.62)' }

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="nx-onb-chip" style={{
      height: 34, padding: '0 16px', borderRadius: 999, cursor: 'pointer', fontSize: 13.5,
      border: `1px solid ${on ? 'rgb(var(--acc2) / .6)' : 'rgb(var(--acc2) / .18)'}`,
      background: on ? 'rgb(var(--acc) / .26)' : 'rgba(255,255,255,.03)', color: on ? '#FFF6E9' : 'rgba(241,234,248,.8)',
      transition: 'background 200ms, border-color 200ms'
    }}>{children}</button>
  )
}

function Toggle({ on, onClick, name, note }: { on: boolean; onClick: () => void; name: string; note: string }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 16, width: '100%', padding: '16px 18px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
      background: on ? 'rgb(var(--acc) / .1)' : 'rgba(255,255,255,.025)', border: `1px solid ${on ? 'rgb(var(--acc2) / .45)' : 'rgb(var(--acc2) / .12)'}`, color: '#F1EAF8'
    }}>
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 16 }}>{name}</span>
        <span style={{ fontSize: 13, color: 'rgba(226,218,240,.55)' }}>{note}</span>
      </span>
      <span style={{ position: 'relative', flex: 'none', width: 40, height: 22, borderRadius: 999, background: on ? 'rgb(var(--acc) / .85)' : 'rgba(255,255,255,.06)', border: `1px solid ${on ? 'rgb(var(--acc2) / .5)' : 'rgb(var(--acc2) / .2)'}`, transition: 'background 250ms' }}>
        <span style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 16, height: 16, borderRadius: '50%', background: '#FFF6E9', transition: `left 300ms ${ease}` }} />
      </span>
    </button>
  )
}

export default function Onboarding({ v }: { v: any }) {
  if (!v.onbCard) return null
  const step = v.onbStep

  return (
    // centred in the free space under the core; scrolls inside if a step is taller than that
    <div style={{ position: 'absolute', left: 0, right: 0, top: 400, bottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
    <div style={{
      position: 'relative', width: 880, maxHeight: '100%', overflowY: 'auto', pointerEvents: 'auto', padding: '26px 32px 28px', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', gap: 22,
      background: 'linear-gradient(rgba(7,5,14,.62),rgba(7,5,14,.62)) padding-box, linear-gradient(155deg, rgb(var(--acc) / .6), rgb(var(--acc) / .06) 45%, rgb(var(--acc) / .25)) border-box',
      border: '1px solid transparent', borderRadius: 16, backdropFilter: 'blur(26px) saturate(1.2)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 30px 90px rgba(0,0,0,.5)', animation: `nx-up 800ms ${ease} both`
    }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span data-scramble="1" style={label}>CONFIGURACIÓN INICIAL</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span data-scramble="1" style={label}>PASO {step} DE {v.onbTotal}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(v.onbDots || []).map((d: any, i: number) => (
              <span key={i} style={{ height: 3, width: d.w, borderRadius: 3, background: d.c, transition: `width 500ms ${ease}, background 500ms` }} />
            ))}
          </div>
        </div>
      </div>

      {/* 1 · name */}
      {step === 1 && (
        <div key="s1" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span style={{ ...title, animation: enter(40) }}>¿Cómo quieres que te llame?</span>
          <input value={v.userName} onChange={v.onNameOnb} autoFocus maxLength={40} placeholder="Tu nombre o un tratamiento"
            style={{ height: 56, padding: '0 20px', borderRadius: 12, background: 'rgba(0,0,0,.35)', border: '1px solid rgb(var(--acc2) / .3)', color: '#FFF6E9', fontSize: 22, outline: 'none', animation: enter(100) }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', animation: enter(160) }}>
            {(v.nameChips || []).map((c: any) => <Chip key={c.label} on={c.on} onClick={c.pick}>{c.label}</Chip>)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, animation: enter(220) }}>
            <span style={{ ...text, marginRight: 4 }}>Quiero que me hables de</span>
            {(v.formalOpts || []).map((o: any) => <Chip key={o.label} on={o.on} onClick={o.pick}>{o.label}</Chip>)}
          </div>
        </div>
      )}

      {/* 2 · voice and personality */}
      {step === 2 && (
        <div key="s2" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span style={{ ...title, animation: enter(40) }}>Elige mi voz</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {(v.voiceCards || []).map((c: any, i: number) => (
              <button key={c.id} onClick={c.selectSay} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 6px 10px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                background: c.bg, border: `1px solid ${c.border}`, color: '#F1EAF8', animation: enter(80 + i * 30)
              }}>
                <canvas data-nexus-core="1" data-state={c.state} data-particles="160" data-r=".24" style={{ width: 46, height: 46 }} />
                <span style={{ fontSize: 14.5, fontWeight: 500 }}>{c.selected && <span style={{ color: '#34D399', marginRight: 5 }}>●</span>}{c.name}</span>
                <span style={{ fontSize: 10.5, lineHeight: 1.35, color: 'rgba(226,218,240,.55)' }}>{c.desc}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, animation: enter(340) }}>
            <span style={{ ...text, marginRight: 4 }}>Personalidad</span>
            {(v.personaCards || []).map((p: any) => <Chip key={p.id} on={p.sel} onClick={p.select}>{p.name}</Chip>)}
          </div>
        </div>
      )}

      {/* 3 · look */}
      {step === 3 && (
        <div key="s3" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span style={{ ...title, animation: enter(40) }}>Elige mi color</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            {(v.themeCards || []).map((t: any, i: number) => (
              <button key={t.name} onClick={t.pick} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '16px 8px 14px', borderRadius: 12, cursor: 'pointer',
                background: t.bg, border: `1px solid ${t.border}`, color: '#F1EAF8', animation: enter(80 + i * 40)
              }}>
                <span style={{ width: 44, height: 44, borderRadius: '50%', background: `radial-gradient(circle at 50% 40%, #fff 0 6%, ${t.c2} 18%, ${t.c1} 48%, transparent 72%)`, boxShadow: `0 0 0 1.5px ${t.c2}, 0 0 22px ${t.c1}` }} />
                <span style={{ fontSize: 14 }}>{t.name}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, animation: enter(300) }}>
            <span style={{ ...text, marginRight: 4 }}>Calidad gráfica</span>
            {(v.qualityChips || []).map((q: any) => <Chip key={q.label} on={q.on} onClick={q.pick}>{q.label}</Chip>)}
            <span style={{ ...label, marginLeft: 'auto', color: 'rgba(226,218,240,.45)' }}>{v.qualityNote}</span>
          </div>
        </div>
      )}

      {/* 4 · brain and ears */}
      {step === 4 && (
        <div key="s4" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ ...title, animation: enter(40) }}>Mi cerebro y mis oídos</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', animation: enter(90) }}>
            <span style={{ ...text, marginRight: 4 }}>Inteligencia</span>
            {(v.providerChips || []).map((p: any) => <Chip key={p.label} on={p.on} onClick={p.pick}>{p.label}</Chip>)}
          </div>
          <span style={{ ...text, fontSize: 13, marginTop: -4, animation: enter(120) }}>{v.providerNote}</span>
          {v.keyNeeded ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, animation: enter(150) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 15 }}>{v.keyTitle} <span style={{ ...text, fontSize: 12.5 }}>· gratuita, sin tarjeta</span></span>
                <span style={{ ...label, color: v.keyColor }}>● {v.keyStatus}</span>
              </div>
{v.keyTargets && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  {v.keyTargets.map(o => (
                    <button key={o.label} onClick={o.pick} style={{ height: '28px', padding: '0 12px', borderRadius: '999px', cursor: 'pointer', fontSize: '12.5px', border: `1px solid ${o.on ? 'rgb(var(--acc2) / .6)' : 'rgb(var(--acc2) / .18)'}`, background: o.on ? 'rgb(var(--acc) / .26)' : 'rgba(255,255,255,.03)', color: 'rgba(241,234,248,.9)' }}>{o.label}</button>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <input type={v.keyType} value={v.keyInput} onChange={v.onKeyInput} onKeyDown={v.onKeyEnter} placeholder={v.keyPlaceholder} spellCheck={false}
                  style={{ flex: 1, minWidth: 0, height: 44, padding: '0 16px', borderRadius: 10, background: 'rgba(0,0,0,.35)', border: '1px solid rgb(var(--acc2) / .2)', color: '#FFF6E9', fontFamily: mono, fontSize: 13, outline: 'none' }} />
                <button onClick={v.saveKey} style={{ height: 44, padding: '0 18px', borderRadius: 10, border: '1px solid rgb(var(--acc2) / .4)', background: 'rgb(var(--acc) / .35)', color: '#FFF6E9', fontSize: 14, cursor: 'pointer' }}>Guardar</button>
                <button onClick={v.openGroq} style={{ height: 44, padding: '0 16px', borderRadius: 10, border: '1px solid rgb(var(--acc2) / .2)', background: 'transparent', color: 'rgba(226,218,240,.8)', fontSize: 14, cursor: 'pointer' }}>Conseguir una ↗</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', animation: enter(150) }}>
              <span style={{ ...text, fontSize: 13, flex: 1 }}>{v.keyHelp}</span>
              <button onClick={v.openGroq} style={{ height: 40, padding: '0 16px', borderRadius: 10, border: '1px solid rgb(var(--acc2) / .2)', background: 'transparent', color: 'rgba(226,218,240,.8)', fontSize: 14, cursor: 'pointer' }}>Descargar Ollama ↗</button>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,.025)', border: '1px solid rgb(var(--acc2) / .12)', animation: enter(210) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 15 }}>Micrófono</span>
                <span data-scramble="1" style={{ ...label, color: v.micPermColor }}>{v.micPermText}</span>
              </span>
              <button onClick={v.askMic} disabled={v.micTesting} style={{ height: 38, padding: '0 16px', borderRadius: 10, border: '1px solid rgba(52,211,153,.4)', background: 'rgba(52,211,153,.08)', color: '#6EE7B7', fontSize: 14, cursor: 'pointer', opacity: v.micTesting ? .5 : 1 }}>{v.micTesting ? 'Escuchando…' : 'Probar'}</button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Chip on={!v.micOpts.some((m: any) => m.on)} onClick={v.micDefault}>Predeterminado de Windows</Chip>
              {(v.micOpts || []).filter((m: any) => m.id).map((m: any) => <Chip key={m.id} on={m.on} onClick={m.pick}>{m.label}</Chip>)}
            </div>
          </div>
        </div>
      )}

      {/* 5 · how to keep me */}
      {step === 5 && (
        <div key="s5" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ ...title, animation: enter(40), marginBottom: 4 }}>¿Cómo quieres tenerme?</span>
          {(v.onbToggles || []).map((t: any, i: number) => (
            <Fragment key={t.name}><div style={{ animation: enter(100 + i * 60) }}><Toggle {...t} /></div></Fragment>
          ))}
          <span style={{ ...text, fontSize: 13, animation: enter(260) }}>Háblame en cualquier momento con <b style={{ color: '#FFF6E9', fontWeight: 500 }}>{v.hotkeyText}</b>.</span>
        </div>
      )}

      {/* footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        {step > 1 && <button onClick={v.onbBack} style={{ height: 46, padding: '0 20px', borderRadius: 10, border: '1px solid rgb(var(--acc2) / .2)', background: 'rgba(0,0,0,.3)', color: 'rgba(241,234,248,.85)', fontSize: 14.5, cursor: 'pointer' }}>Atrás</button>}
        <button onClick={v.onbNext} style={{ height: 46, padding: '0 26px', borderRadius: 10, border: '1px solid rgba(255,255,255,.18)', background: 'linear-gradient(180deg, rgb(var(--acc) / .95), rgb(var(--acc) / .7))', color: '#fff', fontSize: 14.5, fontWeight: 500, cursor: 'pointer', boxShadow: '0 0 24px rgb(var(--acc) / .45)' }}>{v.onbNextLabel}</button>
      </div>
    </div>
    </div>
  )
}
