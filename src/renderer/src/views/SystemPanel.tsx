// Generated from design/NEXUS.dc.html by scripts/convert-design.mjs
import { Fragment } from 'react'

export default function SystemPanel({ v }: { v: any }) {
  return (
    <>
    {v.isSystem && (<>
      <div style={{ position: "absolute", left: "64px", top: "48px", display: "flex", flexDirection: "column", gap: "8px", animation: "nx-left 700ms cubic-bezier(.16,1,.3,1) both" }}>
        <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .62)" }}>
          SISTEMA · NEXUS-PC · WINDOWS 11
        </span>
        <span style={{ fontSize: "34px", fontWeight: "400" }}>
          Estado del equipo
        </span>
      </div>
      <button onClick={v.closePanel} style={{ position: "absolute", right: "64px", top: "56px", width: "40px", height: "40px", borderRadius: "10px", border: "1px solid rgba(196,181,253,.14)", background: "rgba(7,5,14,.4)", color: "rgba(226,218,240,.7)", display: "grid", placeItems: "center", cursor: "pointer" }} className="dc31">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <svg width="1920" height="1080" style={{ position: "absolute", inset: "0", pointerEvents: "none", animation: "nx-in 1000ms cubic-bezier(.16,1,.3,1) both" }}>
        <ellipse cx="960" cy="520" rx="300" ry="262" fill="none" style={{ stroke: "rgb(var(--acc2) / .16)" }} strokeWidth="1" strokeDasharray="2 6" />
        <ellipse cx="960" cy="520" rx="220" ry="190" fill="none" style={{ stroke: "rgb(var(--acc) / .1)" }} strokeWidth="1" />
      </svg>
      {(v.gauges || []).map((g, gIndex) => (<Fragment key={g?.id ?? gIndex}>
        <div style={{ position: "absolute", left: g.left, top: g.top, width: "170px", height: "170px", display: "grid", placeItems: "center", animation: "nx-in 800ms cubic-bezier(.16,1,.3,1) both", animationDelay: g.delay }}>
          <svg width="170" height="170" viewBox="0 0 170 170" style={{ position: "absolute", inset: "0" }}>
            <circle cx="85" cy="85" r="78" fill="rgba(7,5,14,.35)" style={{ stroke: "rgb(var(--acc2) / .2)" }} strokeWidth="1" strokeDasharray="1 5" />
            <circle cx="85" cy="85" r="66" fill="none" style={{ stroke: "rgb(var(--acc2) / .1)" }} strokeWidth="2" />
            <circle cx="85" cy="85" r="66" fill="none" strokeWidth="2.5" strokeLinecap="round" transform="rotate(-90 85 85)" strokeDasharray={g.dash} style={{ stroke: g.color, filter: `drop-shadow(0 0 5px ${g.color})`, transition: "stroke-dasharray 1000ms cubic-bezier(.16,1,.3,1)" }} />
          </svg>
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
            <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", letterSpacing: ".24em", color: "rgb(var(--acc2) / .7)" }}>
              {g.label}
            </span>
            <span style={{ fontSize: "36px", fontWeight: "300", lineHeight: "1.1", color: "#FFF6E9", fontVariantNumeric: "tabular-nums" }}>
              {g.val}
              <span style={{ fontSize: "15px", color: "rgba(226,218,240,.6)" }}>
                {g.unit}
              </span>
            </span>
            <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9.5px", letterSpacing: ".06em", color: "rgba(226,218,240,.5)" }}>
              {g.detail}
            </span>
          </div>
        </div>
      </Fragment>))}
      <div style={{ position: "absolute", left: "64px", top: "190px", width: "400px", padding: "22px", display: "flex", flexDirection: "column", gap: "14px", background: "linear-gradient(rgba(7,5,14,.5),rgba(7,5,14,.5)) padding-box, linear-gradient(155deg, rgb(var(--acc) / .5), rgb(var(--acc) / 0) 55%) border-box", border: "1px solid transparent", borderRadius: "14px", backdropFilter: "blur(24px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.07)", animation: "nx-left 700ms cubic-bezier(.16,1,.3,1) 120ms both" }} className="dc32">
        <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .62)" }}>
          PROCESOS QUE MÁS CONSUMEN
        </span>
        {(v.procs || []).map((p, pIndex) => (<Fragment key={p?.id ?? pIndex}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 56px 80px", alignItems: "center", gap: "10px", animation: "nx-in 500ms cubic-bezier(.16,1,.3,1) both", animationDelay: p.delay }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <span style={{ fontSize: "14px", color: "rgba(241,234,248,.9)" }}>
                {p.name}
              </span>
              <div style={{ height: "2px", background: "rgba(196,181,253,.1)", borderRadius: "2px" }}>
                <div style={{ height: "100%", width: p.pct, background: "rgb(var(--acc2) / .8)", borderRadius: "2px", transition: "width 900ms cubic-bezier(.16,1,.3,1)" }}></div>
              </div>
            </div>
            <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", textAlign: "right", color: "#FFF6E9" }}>
              {p.cpu}
            </span>
            <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", textAlign: "right", color: "rgba(226,218,240,.55)" }}>
              {p.ram}
            </span>
          </div>
        </Fragment>))}
        <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10.5px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .62)" }}>
              CPU · ÚLTIMOS 60 S
            </span>
            <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10.5px", color: "rgba(226,218,240,.5)" }}>
              MÁX {v.cpuMax} %
            </span>
          </div>
          <svg width="356" height="70" viewBox="0 0 356 70">
            <line x1="0" y1="35" x2="356" y2="35" stroke="rgba(196,181,253,.08)" strokeDasharray="2 4" />
            <polyline points={v.cpuPoly} fill="none" style={{ stroke: "rgb(var(--acc2))" }} strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <div style={{ position: "absolute", right: "64px", top: "190px", width: "380px", padding: "22px", display: "flex", flexDirection: "column", gap: "4px", background: "linear-gradient(rgba(7,5,14,.5),rgba(7,5,14,.5)) padding-box, linear-gradient(205deg, rgb(var(--acc) / .5), rgb(var(--acc) / 0) 55%) border-box", border: "1px solid transparent", borderRadius: "14px", backdropFilter: "blur(24px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.07)", animation: "nx-right 700ms cubic-bezier(.16,1,.3,1) 120ms both" }} className="dc33">
        <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .62)", marginBottom: "10px" }}>
          HOY · {v.dateShort}
        </span>
        {(v.agenda || []).map((a, aIndex) => (<Fragment key={a?.id ?? aIndex}>
          <div style={{ display: "grid", gridTemplateColumns: "56px 12px minmax(0,1fr)", gap: "12px", alignItems: "stretch", animation: "nx-in 500ms cubic-bezier(.16,1,.3,1) both", animationDelay: a.delay }}>
            <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "12.5px", paddingTop: "2px", color: a.timeColor }}>
              {a.time}
            </span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ width: "8px", height: "8px", marginTop: "5px", borderRadius: "50%", background: a.dot, boxShadow: `0 0 10px ${a.dot}` }}></span>
              <span style={{ flex: "1", width: "1px", background: "rgba(196,181,253,.12)" }}></span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px", paddingBottom: "18px", opacity: a.op }}>
              <span style={{ fontSize: "15px", color: "#FFF6E9" }}>
                {a.title}
              </span>
              <span style={{ fontSize: "12.5px", color: "rgba(226,218,240,.55)" }}>
                {a.sub}
              </span>
            </div>
          </div>
        </Fragment>))}
      </div>
    </>)}
    </>
  )
}
