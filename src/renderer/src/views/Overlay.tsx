// Generated from design/NEXUS.dc.html by scripts/convert-design.mjs
export default function Overlay({ v }: { v: any }) {
  return (
    <>
    {v.overlay && (<>
      <div style={{ position: "absolute", left: "50%", top: "120px", width: "780px", marginLeft: "-390px", display: "flex", flexDirection: "column", background: "linear-gradient(rgba(10,7,20,.62),rgba(10,7,20,.62)) padding-box, linear-gradient(155deg, rgb(var(--acc2) / .7), rgb(var(--acc) / .1) 50%, rgb(var(--acc) / .35)) border-box", border: "1px solid transparent", borderRadius: "18px", backdropFilter: "blur(28px) saturate(1.3)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.1), 0 40px 120px rgba(0,0,0,.6), 0 0 80px rgb(var(--acc) / .18)", animation: "nx-in 500ms cubic-bezier(.16,1,.3,1) both" }} className="dc54 dc55">
        <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 18px 14px 10px" }}>
          <canvas data-nexus-core="1" data-state={v.ovState} data-particles="300" data-r=".22" style={{ width: "72px", height: "72px", flex: "none" }} />
          <input ref={v.ovRef} value={v.ovInput} onChange={v.onOvInput} onKeyDown={v.onOvKey} placeholder="Pregunte a Nexus…" style={{ flex: "1", background: "none", border: "none", outline: "none", color: "#FFF6E9", fontSize: "22px", fontWeight: "300" }} />
          <span style={{ padding: "5px 9px", borderRadius: "6px", border: "1px solid rgba(196,181,253,.25)", fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: "rgba(226,218,240,.6)" }}>
            ESC
          </span>
        </div>
        <div style={{ padding: "16px 24px 18px", borderTop: "1px solid rgba(196,181,253,.1)", display: "flex", flexDirection: "column", gap: "8px" }}>
          <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10.5px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .6)" }}>
            {v.ovLabel}
          </span>
          <span style={{ fontSize: "16px", lineHeight: "1.6", color: "rgba(241,234,248,.9)", textWrap: "pretty" }}>
            {v.ovReply}
          </span>
        </div>
        <div style={{ display: "flex", gap: "18px", padding: "10px 24px", borderTop: "1px solid rgba(196,181,253,.08)", fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", letterSpacing: ".16em", color: "rgba(226,218,240,.4)" }}>
          <span>
            ↵ PREGUNTAR
          </span>
          <span>
            ALT + ↵ POR VOZ
          </span>
          <span>
            TAB ABRIR EN NEXUS
          </span>
          <span style={{ marginLeft: "auto" }}>
            ESC PARA CERRAR
          </span>
        </div>
      </div>
    </>)}
    </>
  )
}
