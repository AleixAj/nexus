// Generated from design/NEXUS.dc.html by scripts/convert-design.mjs
import { Fragment } from 'react'

export default function Director({ v }: { v: any }) {
  return (
    <>
    {v.showDirector && (<>
      <div style={{ position: "absolute", left: "24px", bottom: "28px", display: "flex", flexDirection: "column", gap: "10px", padding: "12px 14px", borderRadius: "14px", background: "rgba(7,5,14,.55)", border: "1px solid rgba(196,181,253,.14)", backdropFilter: "blur(20px)", maxWidth: "600px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={v.toggleDir} style={{ display: "flex", alignItems: "center", gap: "8px", border: "none", background: "none", padding: "0", cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", letterSpacing: ".24em", color: "#F5B971" }}>
            ◇ DIRECTOR DE ESCENA
          </button>
          {v.dirOpen && (<>
            <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", letterSpacing: ".12em", color: "rgba(226,218,240,.4)" }}>
              CTRL+SHIFT+D OCULTAR
            </span>
            <a href="Sistema de diseño.dc.html" style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", letterSpacing: ".16em" }}>
              SISTEMA DE DISEÑO →
            </a>
          </>)}
        </div>
        {v.dirOpen && (<>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {(v.dirStates || []).map((d, dIndex) => (<Fragment key={d?.id ?? dIndex}>
              <button onClick={d.click} style={{ height: "28px", padding: "0 11px", borderRadius: "999px", cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", fontSize: "10.5px", letterSpacing: ".1em", border: `1px solid ${d.border}`, background: d.bg, color: d.color, transition: "all 250ms" }}>
                {d.label}
              </button>
            </Fragment>))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {(v.dirActions || []).map((d, dIndex) => (<Fragment key={d?.id ?? dIndex}>
              <button onClick={d.click} style={{ height: "28px", padding: "0 11px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap", border: "1px solid rgba(245,185,113,.25)", background: "rgba(245,185,113,.05)", color: "#F5D2A6" }} className="dc63">
                {d.label}
              </button>
            </Fragment>))}
          </div>
        </>)}
      </div>
    </>)}
    </>
  )
}
