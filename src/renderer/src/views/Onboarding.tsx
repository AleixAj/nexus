// Generated from design/NEXUS.dc.html by scripts/convert-design.mjs
import { Fragment } from 'react'

export default function Onboarding({ v }: { v: any }) {
  return (
    <>
    {v.onbCard && (<>
      <div style={{ position: "absolute", left: "50%", top: "720px", width: "760px", marginLeft: "-380px", display: "flex", flexDirection: "column", gap: "22px", alignItems: "center", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", animation: "nx-in 600ms cubic-bezier(.16,1,.3,1) both" }}>
          <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".24em", color: "rgb(var(--acc2) / .7)" }}>
            PASO {v.onbStep} DE 3
          </span>
          <div style={{ display: "flex", gap: "6px" }}>
            {(v.onbDots || []).map((d, dIndex) => (<Fragment key={d?.id ?? dIndex}>
              <span style={{ height: "3px", width: d.w, borderRadius: "3px", background: d.c, transition: "width 500ms cubic-bezier(.16,1,.3,1), background 500ms" }}></span>
            </Fragment>))}
          </div>
        </div>
        {v.onb1 && (<>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", alignItems: "center", width: "100%" }}>
            <span style={{ fontSize: "40px", fontWeight: "300", letterSpacing: "-.01em", animation: "nx-in 700ms cubic-bezier(.16,1,.3,1) 60ms both" }}>
              ¿Cómo quiere que le llame?
            </span>
            <input value={v.userName} onChange={v.onNameOnb} style={{ width: "420px", height: "56px", textAlign: "center", borderRadius: "12px", background: "rgba(0,0,0,.35)", border: "1px solid rgb(var(--acc2) / .3)", color: "#FFF6E9", fontSize: "22px", outline: "none", boxShadow: "0 0 30px rgb(var(--acc) / .15)", animation: "nx-in 700ms cubic-bezier(.16,1,.3,1) 120ms both" }} />
            <div style={{ display: "flex", gap: "8px", animation: "nx-in 700ms cubic-bezier(.16,1,.3,1) 180ms both" }}>
              {(v.nameChips || []).map((c, cIndex) => (<Fragment key={c?.id ?? cIndex}>
                <button onClick={c.pick} style={{ height: "32px", padding: "0 14px", borderRadius: "999px", cursor: "pointer", fontSize: "13px", border: `1px solid ${c.border}`, background: c.bg, color: "rgba(241,234,248,.9)" }}>
                  {c.label}
                </button>
              </Fragment>))}
            </div>
          </div>
        </>)}
        {v.onb2 && (<>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", alignItems: "center", width: "100%" }}>
            <span style={{ fontSize: "40px", fontWeight: "300", animation: "nx-in 700ms cubic-bezier(.16,1,.3,1) 60ms both" }}>
              Elija mi voz
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px", width: "100%" }}>
              {(v.voiceCards || []).map((v, vIndex) => (<Fragment key={v?.id ?? vIndex}>
                <button onClick={v.selectSay} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "12px 8px 14px", borderRadius: "12px", cursor: "pointer", background: v.bg, border: `1px solid ${v.border}`, color: "#F1EAF8", transition: "transform 300ms cubic-bezier(.34,1.2,.64,1), border-color 300ms", animation: "nx-in 600ms cubic-bezier(.16,1,.3,1) both", animationDelay: v.delay }} className="dc56">
                  <canvas data-nexus-core="1" data-state={v.state} data-particles="220" data-r=".2" style={{ width: "72px", height: "72px" }} />
                  <span style={{ fontSize: "16px", fontWeight: "500" }}>
                    {v.name}
                  </span>
                  <span style={{ fontSize: "11.5px", color: "rgba(226,218,240,.55)" }}>
                    {v.desc}
                  </span>
                </button>
              </Fragment>))}
            </div>
          </div>
        </>)}
        {v.onb3 && (<>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", alignItems: "center" }}>
            <span style={{ fontSize: "40px", fontWeight: "300", animation: "nx-in 700ms cubic-bezier(.16,1,.3,1) 60ms both" }}>
              Necesito oírle
            </span>
            <span style={{ maxWidth: "520px", fontSize: "16px", lineHeight: "1.55", color: "rgba(226,218,240,.65)", animation: "nx-in 700ms cubic-bezier(.16,1,.3,1) 120ms both" }}>
              Solo escucho después de «{v.wakeWord}». El audio se procesa en este equipo y no se guarda.
            </span>
            <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: v.micPermColor, animation: "nx-in 700ms cubic-bezier(.16,1,.3,1) 180ms both" }}>
              {v.micPermText}
            </span>
          </div>
        </>)}
        <div style={{ display: "flex", gap: "10px", animation: "nx-in 700ms cubic-bezier(.16,1,.3,1) 240ms both" }}>
          {v.onbCanBack && (<>
            <button onClick={v.onbBack} style={{ height: "46px", padding: "0 20px", borderRadius: "10px", border: "1px solid rgba(196,181,253,.2)", background: "rgba(0,0,0,.3)", color: "rgba(241,234,248,.85)", fontSize: "14.5px", cursor: "pointer" }} className="dc57">
              Atrás
            </button>
          </>)}
          {v.onb3 && (<>
            <button onClick={v.askMic} style={{ height: "46px", padding: "0 20px", borderRadius: "10px", border: "1px solid rgba(52,211,153,.4)", background: "rgba(52,211,153,.08)", color: "#6EE7B7", fontSize: "14.5px", cursor: "pointer" }} className="dc58">
              Permitir micrófono
            </button>
          </>)}
          <button onClick={v.onbNext} style={{ height: "46px", padding: "0 24px", borderRadius: "10px", border: "1px solid rgba(255,255,255,.18)", background: "linear-gradient(180deg, rgb(var(--acc) / .95), rgb(var(--acc) / .7))", color: "#fff", fontSize: "14.5px", fontWeight: "500", cursor: "pointer", boxShadow: "0 0 24px rgb(var(--acc) / .4), inset 0 1px 0 rgba(255,255,255,.25)", transition: "transform 250ms cubic-bezier(.34,1.3,.64,1)" }} className="dc59 dc60">
            {v.onbNextLabel}
          </button>
        </div>
      </div>
    </>)}
    </>
  )
}
