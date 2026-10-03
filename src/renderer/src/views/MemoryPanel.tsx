// Memory: past conversations (left) and what Nexus knows about the user (right)
import { Fragment } from 'react'

export default function MemoryPanel({ v }: { v: any }) {
  return (
    <>
    {v.isMemory && (<>
      <div style={{ position: "absolute", right: "calc(24px - var(--ex))", top: "24px", bottom: "112px", width: "1080px", display: "flex", flexDirection: "column", background: "linear-gradient(rgba(7,5,14,.5),rgba(7,5,14,.5)) padding-box, linear-gradient(155deg, rgb(var(--acc) / .55), rgb(var(--acc) / .06) 45%, rgb(var(--acc) / 0)) border-box", border: "1px solid transparent", borderRadius: "14px", backdropFilter: "blur(24px) saturate(1.2)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.07), 0 24px 70px rgba(0,0,0,.35)", animation: "nx-right 600ms cubic-bezier(.16,1,.3,1) both" }} className="dc42 dc43">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "26px 32px 18px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", animation: "nx-in 500ms cubic-bezier(.16,1,.3,1) 80ms both" }}>
            <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .62)" }}>
              MEMORIA · {v.memCount} RECUERDOS · CIFRADA EN ESTE EQUIPO
            </span>
            <span style={{ fontSize: "30px", fontWeight: "400" }}>
              Lo que Nexus recuerda
            </span>
          </div>
          <button onClick={v.closePanel} style={{ width: "40px", height: "40px", borderRadius: "10px", border: "1px solid rgb(var(--acc2) / .14)", background: "rgba(255,255,255,.02)", color: "rgba(226,218,240,.7)", display: "grid", placeItems: "center", cursor: "pointer" }} className="dc44">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0 32px 18px" }}>
          <div style={{ flex: "1", display: "flex", alignItems: "center", gap: "10px", height: "44px", padding: "0 14px", borderRadius: "10px", background: "rgba(0,0,0,.3)", border: "1px solid rgb(var(--acc2) / .16)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--acc2) / .6)" strokeWidth="1.5">
              <path d="M11 5a6 6 0 1 0 0 12a6 6 0 1 0 0-12M20 20l-4.5-4.5" />
            </svg>
            <input value={v.memQuery} onChange={v.onMemQuery} placeholder="Buscar en conversaciones y recuerdos" style={{ flex: "1", background: "none", border: "none", outline: "none", color: "#FFF6E9", fontSize: "14.5px" }} />
          </div>
          {(v.memFilters || []).map((f, fIndex) => (<Fragment key={f?.id ?? fIndex}>
            <button onClick={f.pick} style={{ height: "34px", padding: "0 14px", borderRadius: "999px", cursor: "pointer", fontSize: "13px", border: `1px solid ${f.border}`, background: f.bg, color: "rgba(241,234,248,.9)", transition: "background 250ms, border-color 250ms" }}>
              {f.label}
            </button>
          </Fragment>))}
        </div>
        <div style={{ flex: "1", minHeight: "0", display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: "28px", padding: "0 32px 28px" }}>
          <div style={{ overflow: "auto", display: "flex", flexDirection: "column", gap: "4px", paddingRight: "6px" }}>
            {(v.memItems || []).map((m, mIndex) => (<Fragment key={m?.id ?? mIndex}>
              {m.head && (<>
                <span style={{ margin: "14px 0 6px 64px", fontFamily: "'JetBrains Mono',monospace", fontSize: "10.5px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .6)" }}>
                  {m.group}
                </span>
              </>)}
              <div data-spot="1" style={{ position: "relative", display: "grid", gridTemplateColumns: "52px 12px minmax(0,1fr) 36px", gap: "12px", alignItems: "start", padding: "12px 12px 12px 0", borderRadius: "12px", transition: "background 250ms", animation: "nx-in 500ms cubic-bezier(.16,1,.3,1) both", animationDelay: m.delay }} className="dc45">
                <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", textAlign: "right", paddingTop: "2px", color: "rgba(226,218,240,.5)" }}>
                  {m.time}
                </span>
                <span style={{ width: "7px", height: "7px", marginTop: "6px", borderRadius: "50%", background: "rgb(var(--acc2))", boxShadow: "0 0 8px rgb(var(--acc2))" }}></span>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  <span style={{ fontSize: "15.5px", color: "#FFF6E9" }}>
                    {m.title}
                  </span>
                  <span style={{ fontSize: "13.5px", lineHeight: "1.5", color: "rgba(226,218,240,.6)" }}>
                    {m.sum}
                  </span>
                </div>
                <button onClick={m.del} title="Borrar" style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", background: "transparent", color: "rgba(226,218,240,.4)", display: "grid", placeItems: "center", cursor: "pointer" }} className="dc46">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                  </svg>
                </button>
              </div>
            </Fragment>))}
            {v.memEmpty && (<>
              <span style={{ padding: "40px 64px", fontSize: "15px", color: "rgba(226,218,240,.5)" }}>
                {v.memEmptyText}
              </span>
            </>)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", minHeight: "0" }}>
            <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .62)" }}>
              LO QUE SÉ DE TI
            </span>
            <div style={{ flex: "1", overflow: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
              {(v.factItems || []).map((f, fIndex) => (<Fragment key={f?.id ?? fIndex}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px 14px", borderRadius: "12px", background: "rgba(255,255,255,.025)", border: "1px solid rgb(var(--acc2) / .1)", animation: "nx-in 500ms cubic-bezier(.16,1,.3,1) both", animationDelay: f.delay }}>
                  <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "5px" }}>
                    <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9.5px", letterSpacing: ".2em", color: "rgba(245,185,113,.8)" }}>
                      {f.cat}
                    </span>
                    <span style={{ fontSize: "14px", lineHeight: "1.45", color: "rgba(241,234,248,.9)" }}>
                      {f.t}
                    </span>
                  </div>
                  {f.pending && <button onClick={f.approve} title="Sí, guárdalo" style={{ width: "28px", height: "28px", borderRadius: "8px", border: "1px solid rgba(52,211,153,.4)", background: "rgba(52,211,153,.1)", color: "#34D399", display: "grid", placeItems: "center", cursor: "pointer" }}>✓</button>}
                  <button onClick={f.del} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: "transparent", color: "rgba(226,218,240,.4)", display: "grid", placeItems: "center", cursor: "pointer" }} className="dc47">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
              </Fragment>))}
              {v.factsEmpty && <span style={{ padding: "18px 4px", fontSize: "13.5px", lineHeight: "1.5", color: "rgba(226,218,240,.5)" }}>{v.factsEmptyText}</span>}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input value={v.factInput} onChange={v.onFactInput} onKeyDown={v.onFactKey} placeholder="Añadir algo que deba recordar" style={{ flex: "1", minWidth: "0", height: "40px", padding: "0 12px", borderRadius: "10px", background: "rgba(0,0,0,.3)", border: "1px solid rgb(var(--acc2) / .16)", outline: "none", color: "#FFF6E9", fontSize: "13.5px" }} />
              <button onClick={v.addFact} title="Guardar" style={{ width: "40px", height: "40px", borderRadius: "10px", border: "1px solid rgb(var(--acc2) / .35)", background: "rgb(var(--acc) / .18)", color: "#FFF6E9", display: "grid", placeItems: "center", cursor: "pointer" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 2px", borderTop: "1px solid rgb(var(--acc2) / .08)" }}>
              <span style={{ fontSize: "14px", color: "rgba(241,234,248,.85)" }}>
                Aprender de las conversaciones
              </span>
              <button onClick={v.toggleLearn} style={{ position: "relative", width: "38px", height: "22px", borderRadius: "999px", border: `1px solid ${v.learnT.border}`, background: v.learnT.bg, cursor: "pointer", padding: "0", transition: "background 300ms" }}>
                <span style={{ position: "absolute", top: "2px", left: v.learnT.left, width: "16px", height: "16px", borderRadius: "50%", background: "#FFF6E9", transition: "left 320ms cubic-bezier(.34,1.4,.64,1)" }}></span>
              </button>
            </div>
            <button onClick={v.forgetAll} style={{ height: "42px", borderRadius: "10px", border: "1px solid rgba(251,113,133,.35)", background: "rgba(251,113,133,.06)", color: "#FDA4AF", fontSize: "14px", cursor: "pointer", transition: "background 250ms" }} className="dc48">
              {v.forgetLabel}
            </button>
          </div>
        </div>
      </div>
    </>)}
    </>
  )
}
