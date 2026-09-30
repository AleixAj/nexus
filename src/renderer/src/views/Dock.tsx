// Generated from design/NEXUS.dc.html by scripts/convert-design.mjs
import { Fragment } from 'react'

export default function Dock({ v }: { v: any }) {
  return (
    <>
    {v.showDock && (<>
      {v.hasHover && (<>
        <span style={{ position: "absolute", right: "24px", bottom: "104px", padding: "6px 12px", borderRadius: "8px", background: "rgba(7,5,14,.75)", border: "1px solid rgb(var(--acc) / .3)", fontFamily: "'JetBrains Mono',monospace", fontSize: "10.5px", letterSpacing: ".2em", color: "#FFF6E9", animation: "nx-in 220ms cubic-bezier(.16,1,.3,1) both" }}>
          {v.hoverLabel}
        </span>
      </>)}
      {v.volOpen && (<>
        <div style={{ position: "absolute", right: "24px", bottom: "104px", width: "260px", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px", background: "linear-gradient(rgba(7,5,14,.6),rgba(7,5,14,.6)) padding-box, linear-gradient(155deg, rgb(var(--acc) / .55), rgb(var(--acc) / 0) 60%) border-box", border: "1px solid transparent", borderRadius: "14px", backdropFilter: "blur(24px)", animation: "nx-up 320ms cubic-bezier(.16,1,.3,1) both" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'JetBrains Mono',monospace", fontSize: "10.5px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .7)" }}>
            <span>
              VOLUMEN
            </span>
            <span style={{ color: "#FFF6E9" }}>
              {v.volSlider.val}
            </span>
          </div>
          <div data-key="volume" onPointerDown={v.onSlider} style={{ position: "relative", height: "20px", cursor: "pointer", touchAction: "none" }}>
            <div style={{ position: "absolute", left: "0", right: "0", top: "9px", height: "2px", borderRadius: "2px", background: "rgba(196,181,253,.14)" }}></div>
            <div style={{ position: "absolute", left: "0", top: "9px", height: "2px", width: v.volSlider.pct, background: "linear-gradient(90deg, rgb(var(--acc) / .6), rgb(var(--acc2)))", boxShadow: "0 0 10px rgb(var(--acc) / .6)" }}></div>
            <div style={{ position: "absolute", top: "3px", left: v.volSlider.pct, width: "14px", height: "14px", marginLeft: "-7px", borderRadius: "50%", background: "#FFF6E9", boxShadow: "0 0 0 4px rgb(var(--acc) / .25), 0 0 14px rgb(var(--acc2) / .8)" }}></div>
          </div>
        </div>
      </>)}
      <div data-spot="1" style={{ position: "absolute", right: "24px", bottom: "28px", display: "flex", alignItems: "center", gap: "2px", padding: "8px", borderRadius: "18px", background: "linear-gradient(rgba(7,5,14,.5),rgba(7,5,14,.5)) padding-box, linear-gradient(155deg, rgb(var(--acc) / .55), rgb(var(--acc) / .05) 60%) border-box", border: "1px solid transparent", backdropFilter: "blur(24px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.07), 0 20px 60px rgba(0,0,0,.4)", animation: "nx-up 800ms cubic-bezier(.16,1,.3,1) 350ms both" }} className="dc61">
        {(v.dock || []).map((it, itIndex) => (<Fragment key={it?.id ?? itIndex}>
          {it.sep && (<>
            <span style={{ width: "1px", height: "26px", margin: "0 6px", background: "rgba(196,181,253,.16)" }}></span>
          </>)}
          <button id={it.domId} onClick={it.click} onMouseEnter={it.enter} onMouseLeave={it.leave} style={{ position: "relative", width: "46px", height: "46px", borderRadius: "12px", border: "none", display: "grid", placeItems: "center", cursor: "pointer", background: it.bg, color: it.color, transition: "background 250ms, color 250ms, transform 300ms cubic-bezier(.34,1.3,.64,1), filter 250ms" }} className="dc62">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={it.d} />
            </svg>
            <span style={{ position: "absolute", bottom: "3px", left: "50%", width: "4px", height: "4px", marginLeft: "-2px", borderRadius: "50%", background: "#FFF6E9", boxShadow: "0 0 6px #FFF6E9", opacity: it.dot, transition: "opacity 250ms" }}></span>
          </button>
        </Fragment>))}
      </div>
    </>)}
    </>
  )
}
