// Cinematic start-up sequence shown before the core ignites.
// Timeline (ms): scan line 0-900 · rings + logo 300-1400 · boot log and progress 700-2300 ·
// collapse into the core 2450 · flash, then the engine's own ignition takes over.
import { useEffect, useRef, useState } from 'react'

const COLLAPSE = 2450
const END = 3300
const LETTERS = ['N', 'E', 'X', 'U', 'S']
const CX = 960, CY = 480 // core position on the 1920x1080 stage

const mono = "'JetBrains Mono',monospace"

function Ring({ r, width, dash, opacity, delay, spin }: { r: number; width: number; dash?: string; opacity: number; delay: number; spin?: string }) {
  const c = 2 * Math.PI * r
  return (
    <circle cx="300" cy="300" r={r} fill="none" strokeWidth={width} strokeLinecap="round"
      style={{
        stroke: `rgb(var(--acc2) / ${opacity})`,
        strokeDasharray: dash || `${c}`,
        ['--c' as string]: `${c}`,
        animation: `${dash ? '' : `nxi-draw 1100ms cubic-bezier(.16,1,.3,1) ${delay}ms both, `}nxi-fade-in 500ms ${delay}ms both${spin ? `, ${spin}` : ''}`,
        transformOrigin: '300px 300px'
      }} />
  )
}

export default function BootIntro({ v }: { v: any }) {
  const [out, setOut] = useState(false)
  const pct = useRef<HTMLSpanElement>(null)
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t0 = performance.now()
    let raf = 0, collapsed = false, endT = 0
    const setProgress = (p: number) => {
      if (pct.current) pct.current.textContent = String(Math.round(p * 100)).padStart(3, '0')
      if (bar.current) bar.current.style.transform = `scaleX(${p})`
    }
    const collapse = () => {
      if (collapsed) return
      collapsed = true
      cancelAnimationFrame(raf)
      setProgress(1)
      setOut(true)
      v.onIntroCollapse()
      endT = window.setTimeout(() => v.onIntroDone(), END - COLLAPSE)
    }
    const tick = () => {
      const e = performance.now() - t0
      const p = Math.min(1, Math.max(0, (e - 700) / 1600))
      setProgress(1 - Math.pow(1 - p, 3))
      if (e >= COLLAPSE) collapse(); else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    // timers keep going even if animation frames are throttled
    const safety = window.setTimeout(collapse, COLLAPSE + 300)
    // any click or key skips straight to the ignition
    addEventListener('pointerdown', collapse)
    addEventListener('keydown', collapse)
    return () => {
      cancelAnimationFrame(raf); clearTimeout(safety); clearTimeout(endT)
      removeEventListener('pointerdown', collapse)
      removeEventListener('keydown', collapse)
    }
  }, [])

  const leave = out ? 'nxi-fade-out 320ms ease-in forwards' : undefined

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, cursor: 'none', ['--acc' as string]: v.acc, ['--acc2' as string]: v.acc2 }}>
      {/* black curtain: lifts after the collapse to reveal the igniting core */}
      <div style={{ position: 'absolute', inset: 0, background: '#05030A', animation: out ? 'nxi-fade-out 650ms cubic-bezier(.4,0,.2,1) 200ms forwards' : undefined }} />
      <div style={{
        position: 'absolute', inset: 0, animation: out ? 'nxi-fade-out 300ms forwards' : 'nxi-fade-in 1200ms both',
        background: 'radial-gradient(rgb(var(--acc2) / .16) 1px, transparent 1.6px) 0 0 / 30px 30px',
        WebkitMaskImage: 'radial-gradient(ellipse 55% 60% at 50% 44%, #000 0%, transparent 75%)'
      }} />

      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 1920, height: 1080, marginLeft: -960, marginTop: -540, transform: `scale(${v.k})`, color: '#F1EAF8', fontFamily: "'Space Grotesk',system-ui,sans-serif" }}>
        {/* opening scan line and the two lines it splits into */}
        <div style={{ position: 'absolute', left: CX - 800, top: CY, width: 1600, height: 1, background: 'linear-gradient(90deg, transparent, rgb(var(--acc2)), #fff, rgb(var(--acc2)), transparent)', boxShadow: '0 0 18px rgb(var(--acc) / .9)', animation: 'nxi-scan 900ms cubic-bezier(.16,1,.3,1) both' }} />
        <div style={{ position: 'absolute', left: CX - 700, top: CY, width: 1400, height: 1, background: 'linear-gradient(90deg, transparent, rgb(var(--acc2) / .7), transparent)', animation: 'nxi-split-up 1000ms cubic-bezier(.16,1,.3,1) 350ms both' }} />
        <div style={{ position: 'absolute', left: CX - 700, top: CY, width: 1400, height: 1, background: 'linear-gradient(90deg, transparent, rgb(var(--acc2) / .7), transparent)', animation: 'nxi-split-down 1000ms cubic-bezier(.16,1,.3,1) 350ms both' }} />

        {/* everything that collapses into the core */}
        <div style={{ position: 'absolute', left: CX, top: CY, width: 0, height: 0, animation: out ? 'nxi-collapse 480ms cubic-bezier(.7,0,.84,0) forwards' : undefined }}>
          <svg width="600" height="600" viewBox="0 0 600 600" style={{ position: 'absolute', left: -300, top: -300, overflow: 'visible' }}>
            <Ring r={282} width={1} opacity={.35} delay={300} />
            <Ring r={262} width={1} dash="2 7" opacity={.55} delay={420} spin="nx-spin 40s linear infinite" />
            <Ring r={240} width={1.4} opacity={.8} delay={520} />
            <Ring r={252} width={2.2} dash="90 1500" opacity={.95} delay={700} spin="nx-spin 2.4s linear infinite" />
            <Ring r={218} width={1} dash="1 5" opacity={.45} delay={640} spin="nx-spinr 26s linear infinite" />
            {/* tick marks */}
            <g style={{ transformOrigin: '300px 300px', animation: 'nxi-fade-in 600ms 600ms both, nx-spinr 60s linear infinite' }}>
              {Array.from({ length: 72 }, (_, i) => (
                <line key={i} x1="300" y1={i % 6 ? 6 : 0} x2="300" y2={i % 6 ? 12 : 18} strokeWidth={i % 6 ? 1 : 1.5}
                  style={{ stroke: `rgb(var(--acc2) / ${i % 6 ? .3 : .7})` }} transform={`rotate(${i * 5} 300 300)`} />
              ))}
            </g>
          </svg>
          <div style={{ position: 'absolute', left: -300, top: -300, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgb(var(--acc) / .22), transparent 62%)', animation: 'nxi-fade-in 1400ms 500ms both' }} />

          {/* logotype */}
          <div style={{ position: 'absolute', left: 0, top: -46, transform: 'translateX(-50%)', display: 'flex', fontSize: 82, fontWeight: 300, lineHeight: 1, letterSpacing: '.34em', paddingLeft: '.34em', color: '#FFF6E9', whiteSpace: 'nowrap' }}>
            {LETTERS.map((l, i) => (
              <span key={i} data-scramble="1" style={{ display: 'inline-block', animation: `nxi-letter 900ms cubic-bezier(.16,1,.3,1) ${520 + i * 80}ms both` }}>{l}</span>
            ))}
          </div>
          <div style={{ position: 'absolute', left: 0, top: 56, transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontFamily: mono, fontSize: 10.5, letterSpacing: '.32em', color: 'rgb(var(--acc2) / .75)', animation: 'nxi-rise 800ms cubic-bezier(.16,1,.3,1) 950ms both' }}>
            <span data-scramble="1">SISTEMA DE ASISTENCIA PERSONAL · NX-OS 2.4</span>
          </div>

          {/* progress */}
          <div style={{ position: 'absolute', left: -165, top: 104, width: 330, animation: 'nxi-rise 700ms cubic-bezier(.16,1,.3,1) 700ms both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 10.5, letterSpacing: '.24em', color: 'rgba(226,218,240,.55)', marginBottom: 10 }}>
              <span data-scramble="1">INICIALIZANDO NÚCLEO</span>
              <span style={{ color: 'rgb(var(--acc2))' }}><span ref={pct}>000</span> %</span>
            </div>
            <div style={{ position: 'relative', height: 2, background: 'rgb(var(--acc2) / .14)' }}>
              <div ref={bar} style={{ position: 'absolute', inset: 0, transformOrigin: 'left', transform: 'scaleX(0)', background: 'linear-gradient(90deg, rgb(var(--acc)), rgb(var(--acc2)), #fff)', boxShadow: '0 0 12px rgb(var(--acc2) / .9)' }} />
            </div>
          </div>
        </div>

        {/* ignition flash */}
        {out && <div style={{ position: 'absolute', left: CX - 320, top: CY - 320, width: 640, height: 640, borderRadius: '50%', background: 'radial-gradient(circle, #fff 0%, rgb(var(--acc2) / .8) 10%, rgb(var(--acc) / .3) 28%, transparent 62%)', animation: 'nxi-flash 750ms cubic-bezier(.16,1,.3,1) 330ms both' }} />}

        {/* boot log */}
        <div style={{ position: 'absolute', left: 64, bottom: 64, width: 640, display: 'flex', flexDirection: 'column', gap: 9, fontFamily: mono, fontSize: 11.5, letterSpacing: '.14em', animation: leave }}>
          {(v.introLines || []).map((l: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 12, animation: `nxi-line-in 420ms cubic-bezier(.16,1,.3,1) ${700 + i * 260}ms both` }}>
              <span style={{ color: 'rgb(var(--acc2) / .45)' }}>{String(i + 1).padStart(2, '0')}</span>
              <span data-scramble="1" style={{ color: 'rgba(241,234,248,.85)', whiteSpace: 'nowrap' }}>{l.label}</span>
              <span style={{ flex: 1, borderBottom: '1px dotted rgb(var(--acc2) / .22)', transform: 'translateY(-3px)' }} />
              <span data-scramble="1" style={{ color: 'rgba(226,218,240,.55)', whiteSpace: 'nowrap' }}>{l.detail}</span>
              <span style={{ width: 86, textAlign: 'right', color: l.color, textShadow: `0 0 10px ${l.color}`, animation: `nxi-status 500ms steps(1) ${880 + i * 260}ms both` }}>{l.status}</span>
            </div>
          ))}
        </div>

        {/* side readouts */}
        <div style={{ position: 'absolute', right: 64, bottom: 64, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 8, fontFamily: mono, fontSize: 10.5, letterSpacing: '.22em', color: 'rgba(226,218,240,.4)', animation: out ? leave : 'nxi-fade-in 800ms 900ms both' }}>
          <span data-scramble="1">ARRANQUE SEGURO · VERIFICADO</span>
          <span data-scramble="1">CANAL DE AUDIO · 48 KHZ · ESTÉREO</span>
          <span style={{ color: 'rgb(var(--acc2) / .7)' }} data-scramble="1">{v.introStamp}</span>
        </div>
        <div style={{ position: 'absolute', left: 64, top: 52, fontFamily: mono, fontSize: 10.5, letterSpacing: '.24em', color: 'rgb(var(--acc2) / .5)', animation: out ? leave : 'nxi-fade-in 800ms 300ms both' }}>
          <span data-scramble="1">NX-OS 2.4.0 · SECUENCIA DE ARRANQUE</span>
        </div>

        {/* corner brackets */}
        {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], i) => (
          <div key={i} style={{
            position: 'absolute', width: 34, height: 34, [x ? 'right' : 'left']: 32, [y ? 'bottom' : 'top']: 32,
            [x ? 'borderRight' : 'borderLeft']: '1px solid rgb(var(--acc2) / .6)', [y ? 'borderBottom' : 'borderTop']: '1px solid rgb(var(--acc2) / .6)',
            animation: out ? leave : `nxi-corner-${i} 900ms cubic-bezier(.16,1,.3,1) 150ms both`
          }} />
        ))}
      </div>
    </div>
  )
}
