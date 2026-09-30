// Generated from design/NEXUS.dc.html by scripts/convert-design.mjs
import { Fragment } from 'react'

export default function MusicPanel({ v }: { v: any }) {
  return (
    <>
    {v.isMusic && (<>
      <div style={{ position: "absolute", left: "96px", top: "150px", width: "400px", display: "flex", flexDirection: "column", gap: "22px", animation: "nx-left 800ms cubic-bezier(.16,1,.3,1) both" }}>
        <div style={{ width: "400px", height: "400px", borderRadius: "14px", background: "repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 12px), linear-gradient(135deg,#FB923C,#9333EA 58%,#1E1B4B)", display: "flex", alignItems: "flex-end", padding: "18px", boxSizing: "border-box", boxShadow: "0 30px 90px rgba(251,146,60,.18), 0 0 0 1px rgba(255,255,255,.08)" }}>
          <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgba(255,255,255,.75)" }}>
            CARÁTULA DEL ÁLBUM · 1:1
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "#FDBA74" }}>
            SPOTIFY · ÁLBUM «LÍNEAS DE CAMPO»
          </span>
          <span style={{ fontSize: "36px", fontWeight: "400", color: "#FFF6E9", letterSpacing: "-.01em" }}>
            Horizonte de sucesos
          </span>
          <span style={{ fontSize: "17px", color: "rgba(226,218,240,.65)" }}>
            Aurora Lineal
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ height: "3px", borderRadius: "3px", background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: v.musicPct, background: "linear-gradient(90deg,#FB923C,rgb(var(--acc2)))", boxShadow: "0 0 12px rgba(251,146,60,.6)", transition: "width 1000ms linear" }}></div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'JetBrains Mono',monospace", fontSize: "11.5px", color: "rgba(226,218,240,.55)" }}>
            <span>
              {v.musicTime}
            </span>
            <span>
              3:48
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px" }}>
          <button style={{ width: "40px", height: "40px", border: "none", background: "none", color: "rgba(226,218,240,.55)", display: "grid", placeItems: "center", cursor: "pointer" }} className="dc34">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h3l10 10h3M4 17h3l3-3M14 10l3-3h3M18 4l2 3-2 3M18 14l2 3-2 3" />
            </svg>
          </button>
          <button onClick={v.prevTrack} style={{ width: "44px", height: "44px", border: "none", background: "none", color: "rgba(241,234,248,.8)", display: "grid", placeItems: "center", cursor: "pointer" }} className="dc35">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
              <path d="M18 6v12L9 12zM6 6v12" />
            </svg>
          </button>
          <button onClick={v.togglePlay} style={{ width: "68px", height: "68px", borderRadius: "50%", border: "1px solid rgba(255,255,255,.25)", background: "linear-gradient(160deg, rgba(251,146,60,.9), rgb(var(--acc) / .8))", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer", boxShadow: "0 0 36px rgba(251,146,60,.35)", transition: "transform 300ms cubic-bezier(.34,1.3,.64,1)" }} className="dc36 dc37">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
              <path d={v.playIcon} />
            </svg>
          </button>
          <button onClick={v.nextTrack} style={{ width: "44px", height: "44px", border: "none", background: "none", color: "rgba(241,234,248,.8)", display: "grid", placeItems: "center", cursor: "pointer" }} className="dc38">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
              <path d="M6 6v12l9-6zM18 6v12" />
            </svg>
          </button>
          <button style={{ width: "40px", height: "40px", border: "none", background: "none", color: "rgba(226,218,240,.55)", display: "grid", placeItems: "center", cursor: "pointer" }} className="dc39">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12V9a3 3 0 0 1 3-3h13l-3-3M20 12v3a3 3 0 0 1-3 3H4l3 3" />
            </svg>
          </button>
        </div>
      </div>
      <div style={{ position: "absolute", right: "96px", top: "150px", width: "440px", display: "flex", flexDirection: "column", gap: "18px", animation: "nx-right 800ms cubic-bezier(.16,1,.3,1) 100ms both" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .62)" }}>
            LETRA SINCRONIZADA
          </span>
          <button onClick={v.closePanel} style={{ width: "36px", height: "36px", borderRadius: "10px", border: "1px solid rgba(196,181,253,.14)", background: "rgba(7,5,14,.4)", color: "rgba(226,218,240,.7)", display: "grid", placeItems: "center", cursor: "pointer" }} className="dc40">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div style={{ height: "392px", overflow: "hidden", WebkitMask: "linear-gradient(transparent, #000 22%, #000 70%, transparent)", mask: "linear-gradient(transparent, #000 22%, #000 70%, transparent)" }}>
          <div style={{ display: "flex", flexDirection: "column", transform: `translateY(${v.lyricY})`, transition: "transform 900ms cubic-bezier(.16,1,.3,1)" }}>
            {(v.lyrics || []).map((l, lIndex) => (<Fragment key={l?.id ?? lIndex}>
              <span style={{ height: "56px", display: "flex", alignItems: "center", fontSize: l.size, fontWeight: "400", color: l.color, filter: l.blur, textShadow: l.shadow, transition: "color 600ms, font-size 600ms cubic-bezier(.16,1,.3,1), filter 600ms", whiteSpace: "nowrap" }}>
                {l.t}
              </span>
            </Fragment>))}
          </div>
        </div>
        <span style={{ marginTop: "16px", fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .62)" }}>
          A CONTINUACIÓN
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {(v.queue || []).map((q, qIndex) => (<Fragment key={q?.id ?? qIndex}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "8px", borderRadius: "10px", transition: "background 250ms", animation: "nx-in 500ms cubic-bezier(.16,1,.3,1) both", animationDelay: q.delay }} className="dc41">
              <span style={{ width: "40px", height: "40px", flex: "none", borderRadius: "6px", background: `repeating-linear-gradient(135deg, rgba(255,255,255,.08) 0 2px, transparent 2px 7px), ${q.cover}` }}></span>
              <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "3px" }}>
                <span style={{ fontSize: "14.5px", color: "#FFF6E9" }}>
                  {q.t}
                </span>
                <span style={{ fontSize: "12.5px", color: "rgba(226,218,240,.55)" }}>
                  {q.a}
                </span>
              </div>
              <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11.5px", color: "rgba(226,218,240,.45)" }}>
                {q.d}
              </span>
            </div>
          </Fragment>))}
        </div>
      </div>
    </>)}
    </>
  )
}
