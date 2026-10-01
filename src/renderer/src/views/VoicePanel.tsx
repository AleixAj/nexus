// Generated from design/NEXUS.dc.html by scripts/convert-design.mjs
import { Fragment } from 'react'

export default function VoicePanel({ v }: { v: any }) {
  return (
    <>
    {v.isVoice && (<>
      <div style={{ position: "absolute", right: "24px", top: "24px", bottom: "112px", width: "1080px", display: "flex", flexDirection: "column", background: "linear-gradient(rgba(7,5,14,.5),rgba(7,5,14,.5)) padding-box, linear-gradient(155deg, rgb(var(--acc) / .55), rgb(var(--acc) / .06) 45%, rgb(var(--acc) / 0)) border-box", border: "1px solid transparent", borderRadius: "14px", backdropFilter: "blur(24px) saturate(1.2)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.07), 0 24px 70px rgba(0,0,0,.35)", animation: "nx-right 600ms cubic-bezier(.16,1,.3,1) both" }} className="dc15 dc16">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "26px 32px 18px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", animation: "nx-in 500ms cubic-bezier(.16,1,.3,1) 80ms both" }}>
            <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .62)" }}>
              VOZ Y PERSONALIDAD
            </span>
            <span style={{ fontSize: "30px", fontWeight: "400" }}>
              Cómo habla Nexus
            </span>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={v.testVoice} style={{ display: "flex", alignItems: "center", gap: "10px", height: "40px", padding: "0 18px", borderRadius: "10px", border: "1px solid rgba(255,255,255,.18)", background: "linear-gradient(180deg, rgb(var(--acc) / .95), rgb(var(--acc) / .7))", color: "#fff", fontSize: "14px", fontWeight: "500", whiteSpace: "nowrap", cursor: "pointer", boxShadow: "0 0 24px rgb(var(--acc) / .4), inset 0 1px 0 rgba(255,255,255,.25)", transition: "transform 250ms cubic-bezier(.34,1.3,.64,1)" }} className="dc17 dc18">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Probar en el núcleo
            </button>
            <button onClick={v.closePanel} style={{ width: "40px", height: "40px", borderRadius: "10px", border: "1px solid rgba(196,181,253,.14)", background: "rgba(255,255,255,.02)", color: "rgba(226,218,240,.7)", display: "grid", placeItems: "center", cursor: "pointer" }} className="dc19">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>
        <div style={{ flex: "1", minHeight: "0", display: "grid", gridTemplateColumns: "minmax(0,1.35fr) minmax(0,1fr)", gap: "32px", padding: "4px 32px 28px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", minHeight: "0" }}>
            <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .62)", animation: "nx-in 500ms cubic-bezier(.16,1,.3,1) 120ms both" }}>
              VOCES
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", maxHeight: "580px", overflowY: "auto", paddingRight: "6px" }}>
              {(v.voiceCards || []).map((v, vIndex) => (<Fragment key={v?.id ?? vIndex}>
                <div data-spot="1" onClick={v.select} style={{ position: "relative", padding: "12px 14px", display: "flex", gap: "12px", alignItems: "center", cursor: "pointer", borderRadius: "12px", background: v.bg, border: `1px solid ${v.border}`, transition: "transform 300ms cubic-bezier(.34,1.2,.64,1), border-color 300ms, background 300ms", animation: "nx-in 600ms cubic-bezier(.16,1,.3,1) both", animationDelay: v.delay }} className="dc20 dc21">
                  <canvas data-nexus-core="1" data-state={v.state} data-particles="220" data-r=".22" style={{ width: "72px", height: "72px", flex: "none" }} />
                  <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "19px", fontWeight: "500", color: "#FFF6E9" }}>
                        {v.name}
                      </span>
                      {v.selected && (<>
                        <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9.5px", letterSpacing: ".2em", color: "#34D399" }}>
                          ● ACTIVA
                        </span>
                      </>)}
                    </div>
                    <span style={{ fontSize: "13px", color: "rgba(226,218,240,.6)" }}>
                      {v.desc}
                    </span>
                    <button onClick={v.preview} style={{ alignSelf: "flex-start", marginTop: "4px", display: "flex", alignItems: "center", gap: "8px", height: "28px", padding: "0 12px", borderRadius: "999px", border: "1px solid rgba(196,181,253,.2)", background: "rgba(255,255,255,.03)", color: "rgba(241,234,248,.85)", fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", letterSpacing: ".16em", whiteSpace: "nowrap", cursor: "pointer" }} className="dc22">
                      {v.previewLabel}
                    </button>
                  </div>
                </div>
              </Fragment>))}
            </div>
            <span style={{ marginTop: "12px", fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .62)", animation: "nx-in 500ms cubic-bezier(.16,1,.3,1) 300ms both" }}>
              PERSONALIDAD
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
              {(v.personaCards || []).map((p, pIndex) => (<Fragment key={p?.id ?? pIndex}>
                <button onClick={p.select} style={{ textAlign: "left", padding: "16px", display: "flex", flexDirection: "column", gap: "10px", borderRadius: "12px", cursor: "pointer", background: p.bg, border: `1px solid ${p.border}`, color: "#F1EAF8", transition: "transform 300ms cubic-bezier(.34,1.2,.64,1), border-color 300ms", animation: "nx-in 600ms cubic-bezier(.16,1,.3,1) both", animationDelay: p.delay }} className="dc23">
                  <span style={{ fontSize: "15.5px", fontWeight: "500" }}>
                    {p.name}
                  </span>
                  <span style={{ fontSize: "13px", lineHeight: "1.45", color: "rgba(226,218,240,.6)", textWrap: "pretty" }}>
                    {p.line}
                  </span>
                </button>
              </Fragment>))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .62)", animation: "nx-in 500ms cubic-bezier(.16,1,.3,1) 160ms both" }}>
              AJUSTE FINO
            </span>
            {(v.voiceSliders || []).map((s, sIndex) => (<Fragment key={s?.id ?? sIndex}>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", animation: "nx-in 600ms cubic-bezier(.16,1,.3,1) both", animationDelay: s.delay }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14.5px", color: "rgba(241,234,248,.85)" }}>
                  <span>
                    {s.label}
                  </span>
                  <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "12.5px", color: "rgb(var(--acc2))" }}>
                    {s.val}
                  </span>
                </div>
                <div data-key={s.key} onPointerDown={v.onSlider} style={{ position: "relative", height: "20px", cursor: "pointer", touchAction: "none" }}>
                  <div style={{ position: "absolute", left: "0", right: "0", top: "9px", height: "2px", borderRadius: "2px", background: "rgba(196,181,253,.14)" }}></div>
                  <div style={{ position: "absolute", left: "0", top: "9px", height: "2px", width: s.pct, borderRadius: "2px", background: "linear-gradient(90deg, rgb(var(--acc) / .6), rgb(var(--acc2)))", boxShadow: "0 0 10px rgb(var(--acc) / .6)" }}></div>
                  <div style={{ position: "absolute", top: "3px", left: s.pct, width: "14px", height: "14px", marginLeft: "-7px", borderRadius: "50%", background: "#FFF6E9", boxShadow: "0 0 0 4px rgb(var(--acc) / .25), 0 0 14px rgb(var(--acc2) / .8)" }}></div>
                </div>
              </div>
            </Fragment>))}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ fontSize: "14.5px", color: "rgba(241,234,248,.85)" }}>
                Idioma
              </span>
              <div style={{ display: "flex", padding: "3px", borderRadius: "10px", background: "rgba(0,0,0,.3)", border: "1px solid rgba(196,181,253,.12)" }}>
                {(v.langOpts || []).map((o, oIndex) => (<Fragment key={o?.id ?? oIndex}>
                  <button onClick={o.pick} style={{ flex: "1", height: "32px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", background: o.bg, color: o.color, transition: "background 250ms, color 250ms" }}>
                    {o.label}
                  </button>
                </Fragment>))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <span style={{ fontSize: "14.5px", color: "rgba(241,234,248,.85)" }}>
                  Palabra de activación
                </span>
                <input value={v.wakeWord} readOnly title="Fija: se activa en Ajustes → Escuchar «Hey Nexus» siempre" style={{ height: "40px", padding: "0 14px", borderRadius: "10px", background: "rgba(0,0,0,.3)", border: "1px solid rgba(196,181,253,.16)", color: "#FFF6E9", fontSize: "14px", outline: "none" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <span style={{ fontSize: "14.5px", color: "rgba(241,234,248,.85)" }}>
                  Cómo le llamo
                </span>
                <input value={v.userName} onChange={v.onName} style={{ height: "40px", padding: "0 14px", borderRadius: "10px", background: "rgba(0,0,0,.3)", border: "1px solid rgba(196,181,253,.16)", color: "#FFF6E9", fontSize: "14px", outline: "none" }} />
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {(v.nameChips || []).map((c, cIndex) => (<Fragment key={c?.id ?? cIndex}>
                <button onClick={c.pick} style={{ height: "30px", padding: "0 14px", borderRadius: "999px", cursor: "pointer", fontSize: "13px", border: `1px solid ${c.border}`, background: c.bg, color: "rgba(241,234,248,.9)" }}>
                  {c.label}
                </button>
              </Fragment>))}
            </div>
          </div>
        </div>
      </div>
    </>)}
    </>
  )
}
