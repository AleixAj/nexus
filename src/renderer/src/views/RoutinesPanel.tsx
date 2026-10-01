// Routines: the list (with a pause switch), the steps of the selected one and the actions
// Nexus may do without asking. Routines are created and changed by talking to Nexus.
import { Fragment } from 'react'

export default function RoutinesPanel({ v }: { v: any }) {
  return (
    <>
    {v.isRoutines && (<>
      <div style={{ position: "absolute", right: "24px", top: "24px", bottom: "112px", width: "1080px", display: "flex", flexDirection: "column", background: "linear-gradient(rgba(7,5,14,.5),rgba(7,5,14,.5)) padding-box, linear-gradient(155deg, rgb(var(--acc) / .55), rgb(var(--acc) / .06) 45%, rgb(var(--acc) / 0)) border-box", border: "1px solid transparent", borderRadius: "14px", backdropFilter: "blur(24px) saturate(1.2)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.07), 0 24px 70px rgba(0,0,0,.35)", animation: "nx-right 600ms cubic-bezier(.16,1,.3,1) both" }} className="dc24 dc25">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "26px 32px 18px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", animation: "nx-in 500ms cubic-bezier(.16,1,.3,1) 80ms both" }}>
            <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .62)" }}>
              RUTINAS · FRASE, HORA O BOTÓN
            </span>
            <span style={{ fontSize: "30px", fontWeight: "400" }}>
              Automatizaciones
            </span>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={v.newRoutine} style={{ height: "40px", padding: "0 16px", borderRadius: "10px", border: "1px solid rgb(var(--acc2) / .35)", background: "rgb(var(--acc) / .18)", color: "#FFF6E9", fontSize: "14px", cursor: "pointer" }}>+ Nueva rutina</button>
          <button onClick={v.closePanel} style={{ width: "40px", height: "40px", borderRadius: "10px", border: "1px solid rgba(196,181,253,.14)", background: "rgba(255,255,255,.02)", color: "rgba(226,218,240,.7)", display: "grid", placeItems: "center", cursor: "pointer" }} className="dc26">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          </div>
        </div>
        <div style={{ flex: "1", minHeight: "0", display: "grid", gridTemplateColumns: "400px minmax(0,1fr)", gap: "28px", padding: "4px 32px 28px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", minHeight: "0", overflow: "auto" }}>
            {v.routinesEmpty && <span style={{ padding: "18px 4px", fontSize: "14px", lineHeight: "1.6", color: "rgba(226,218,240,.55)" }}>Aún no tienes rutinas. Pídeselas a Nexus, por ejemplo: «crea una rutina Modo trabajo que abra VS Code y ponga mi lista Focus, cuando diga modo trabajo» o «cada día a las 8 dime el resumen del día».</span>}
            {(v.routineCards || []).map((r, rIndex) => (<Fragment key={r?.id ?? rIndex}>
              <div data-spot="1" onClick={r.select} style={{ position: "relative", padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", borderRadius: "12px", background: r.bg, border: `1px solid ${r.border}`, transition: "transform 300ms cubic-bezier(.34,1.2,.64,1), border-color 300ms, background 300ms", animation: "nx-in 600ms cubic-bezier(.16,1,.3,1) both", animationDelay: r.delay }} className="dc27 dc28">
                <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "5px" }}>
                  <span style={{ fontSize: "17px", fontWeight: "500", color: "#FFF6E9" }}>
                    {r.name}
                  </span>
                  <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10.5px", letterSpacing: ".12em", color: "rgba(226,218,240,.52)" }}>
                    {r.trigger} · {r.count} PASOS
                  </span>
                </div>
                <button onClick={r.toggle} style={{ flex: "none", position: "relative", width: "38px", height: "22px", borderRadius: "999px", border: `1px solid ${r.tBorder}`, background: r.tBg, cursor: "pointer", padding: "0", transition: "background 300ms" }}>
                  <span style={{ position: "absolute", top: "2px", left: r.tLeft, width: "16px", height: "16px", borderRadius: "50%", background: "#FFF6E9", boxShadow: "0 0 10px rgba(255,246,233,.5)", transition: "left 320ms cubic-bezier(.34,1.4,.64,1)" }}></span>
                </button>
              </div>
            </Fragment>))}
            <span style={{ marginTop: "14px", fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .62)" }}>
              PERMISOS · LO QUE HACE SIN PREGUNTAR
            </span>
            {v.approvalsEmpty && <span style={{ padding: "8px 2px", fontSize: "12.5px", lineHeight: "1.5", color: "rgba(226,218,240,.45)" }}>Nada todavía. Lo que permitas con «Permitir siempre» aparecerá aquí, y puedes quitarlo con el interruptor.</span>}
            {(v.approvalRows || []).map((p, pIndex) => (<Fragment key={p?.id ?? pIndex}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "9px 2px", borderBottom: "1px solid rgba(196,181,253,.07)" }}>
                <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "3px" }}>
                  <span style={{ fontSize: "14px", color: "rgba(241,234,248,.88)" }}>
                    {p.label}
                  </span>
                  <span style={{ fontSize: "12px", color: "rgba(226,218,240,.45)" }}>
                    {p.note}
                  </span>
                </div>
                <button onClick={p.toggle} style={{ flex: "none", position: "relative", width: "38px", height: "22px", borderRadius: "999px", border: `1px solid ${p.tBorder}`, background: p.tBg, cursor: "pointer", padding: "0", transition: "background 300ms" }}>
                  <span style={{ position: "absolute", top: "2px", left: p.tLeft, width: "16px", height: "16px", borderRadius: "50%", background: "#FFF6E9", transition: "left 320ms cubic-bezier(.34,1.4,.64,1)" }}></span>
                </button>
              </div>
            </Fragment>))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", minHeight: "0", borderRadius: "12px", border: "1px solid rgba(196,181,253,.1)", background: "radial-gradient(circle at 1px 1px, rgba(196,181,253,.09) 1px, transparent 0) 0 0 / 22px 22px, rgba(0,0,0,.22)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10.5px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .62)" }}>
                  PASOS · {v.selRoutine.trigger.toUpperCase()}
                </span>
                <span style={{ fontSize: "22px", fontWeight: "400", color: "#FFF6E9" }}>
                  {v.selRoutine.name}
                </span>
              </div>
              {v.hasRoutine && <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={v.deleteRoutine} style={{ height: "40px", padding: "0 14px", borderRadius: "10px", border: "1px solid rgba(251,113,133,.35)", background: "rgba(251,113,133,.06)", color: "#FDA4AF", fontSize: "13.5px", cursor: "pointer" }}>{v.deleteLabel}</button>
              <button onClick={v.runRoutine} style={{ display: "flex", alignItems: "center", gap: "10px", height: "40px", padding: "0 18px", borderRadius: "10px", border: "1px solid rgba(255,255,255,.18)", background: "linear-gradient(180deg, rgb(var(--acc) / .95), rgb(var(--acc) / .7))", color: "#fff", fontSize: "14px", fontWeight: "500", whiteSpace: "nowrap", cursor: "pointer", boxShadow: "0 0 24px rgb(var(--acc) / .4), inset 0 1px 0 rgba(255,255,255,.25)" }} className="dc29">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Ejecutar ahora
              </button>
              </div>}
            </div>
            <div style={{ flex: "1", overflow: "auto", padding: "6px 24px 24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              {(v.routineSteps || []).map((st, stIndex) => (<Fragment key={st?.id ?? stIndex}>
                {st.notFirst && (<>
                  <div style={{ width: "2px", height: "26px", background: "linear-gradient(180deg, transparent, rgb(var(--acc2) / .95), transparent) 0 0 / 2px 60px repeat-y, rgb(var(--acc) / .3)", boxShadow: "0 0 8px rgb(var(--acc) / .6)", animation: "nx-flow 1400ms linear infinite" }}></div>
                </>)}
                <div style={{ width: "100%", maxWidth: "520px", display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px", borderRadius: "12px", background: st.bg, border: `1px solid ${st.border}`, boxShadow: st.glow, transition: "background 300ms, border-color 300ms, box-shadow 300ms", animation: "nx-in 500ms cubic-bezier(.16,1,.3,1) both", animationDelay: st.delay }}>
                  <span style={{ width: "32px", height: "32px", flex: "none", borderRadius: "9px", display: "grid", placeItems: "center", background: "rgb(var(--acc) / .12)", border: "1px solid rgb(var(--acc) / .3)", color: st.iconColor }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d={st.icon} />
                    </svg>
                  </span>
                  <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "3px" }}>
                    <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9.5px", letterSpacing: ".2em", color: "rgba(226,218,240,.45)" }}>
                      {st.kind}
                    </span>
                    <span style={{ fontSize: "15px", color: "#FFF6E9" }}>
                      {st.title}
                    </span>
                  </div>
                  <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11.5px", whiteSpace: "nowrap", color: "rgba(226,218,240,.55)" }}>
                    {st.detail}
                  </span>
                </div>
              </Fragment>))}
              <div style={{ width: "2px", height: "22px", background: "rgba(196,181,253,.15)" }}></div>
              {v.hasRoutine && <button onClick={v.editRoutine} style={{ display: "flex", alignItems: "center", gap: "8px", height: "36px", padding: "0 16px", borderRadius: "999px", border: "1px dashed rgba(196,181,253,.3)", background: "transparent", color: "rgba(226,218,240,.7)", fontSize: "13px", cursor: "pointer" }} className="dc30">
                Cambiar pasos con Nexus
              </button>}
            </div>
          </div>
        </div>
      </div>
    </>)}
    </>
  )
}
