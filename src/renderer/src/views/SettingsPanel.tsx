// Generated from design/NEXUS.dc.html by scripts/convert-design.mjs
import { Fragment } from 'react'

export default function SettingsPanel({ v }: { v: any }) {
  return (
    <>
    {v.isSettings && (<>
      <div style={{ position: "absolute", right: "24px", top: "24px", bottom: "112px", width: "1080px", display: "flex", flexDirection: "column", background: "linear-gradient(rgba(7,5,14,.5),rgba(7,5,14,.5)) padding-box, linear-gradient(155deg, rgb(var(--acc) / .55), rgb(var(--acc) / .06) 45%, rgb(var(--acc) / 0)) border-box", border: "1px solid transparent", borderRadius: "14px", backdropFilter: "blur(24px) saturate(1.2)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.07), 0 24px 70px rgba(0,0,0,.35)", animation: "nx-right 600ms cubic-bezier(.16,1,.3,1) both" }} className="dc49 dc50">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "26px 32px 18px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", animation: "nx-in 500ms cubic-bezier(.16,1,.3,1) 80ms both" }}>
            <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .62)" }}>
              AJUSTES · NEXUS 2.4.0
            </span>
            <span style={{ fontSize: "30px", fontWeight: "400" }}>
              Configuración
            </span>
          </div>
          <button onClick={v.closePanel} style={{ width: "40px", height: "40px", borderRadius: "10px", border: "1px solid rgba(196,181,253,.14)", background: "rgba(255,255,255,.02)", color: "rgba(226,218,240,.7)", display: "grid", placeItems: "center", cursor: "pointer" }} className="dc51">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div style={{ flex: "1", minHeight: "0", overflow: "auto", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "40px", padding: "4px 32px 28px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "18px", animation: "nx-in 600ms cubic-bezier(.16,1,.3,1) 120ms both" }}>
            <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .62)" }}>
              MODELO DE IA
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ fontSize: "14.5px", color: "rgba(241,234,248,.85)" }}>
                Proveedor
              </span>
              <div style={{ display: "flex", padding: "3px", borderRadius: "10px", background: "rgba(0,0,0,.3)", border: "1px solid rgba(196,181,253,.12)" }}>
                {(v.providerOpts || []).map((o, oIndex) => (<Fragment key={o?.id ?? oIndex}>
                  <button onClick={o.pick} style={{ flex: "1", height: "34px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", background: o.bg, color: o.color, transition: "background 250ms, color 250ms" }}>
                    {o.label}
                  </button>
                </Fragment>))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ fontSize: "14.5px", color: "rgba(241,234,248,.85)" }}>
                Modelo
              </span>
              <button onClick={v.cycleModel} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "44px", padding: "0 14px", borderRadius: "10px", background: "rgba(0,0,0,.3)", border: "1px solid rgba(196,181,253,.16)", color: "#FFF6E9", fontSize: "14px", cursor: "pointer" }} className="dc52">
                <span>
                  {v.modelName}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(196,181,253,.7)" strokeWidth="1.5">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "14.5px", color: "rgba(241,234,248,.85)" }}>
                  Clave API
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", letterSpacing: ".2em", color: v.keyColor }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: v.keyColor, boxShadow: `0 0 8px ${v.keyColor}` }}></span>
                  {v.keyStatus}
                </span>
              </div>
              {v.keyTargets && (
                <div style={{ display: "flex", gap: "6px" }}>
                  {v.keyTargets.map(o => (
                    <button key={o.label} onClick={o.pick} style={{ height: "28px", padding: "0 12px", borderRadius: "999px", cursor: "pointer", fontSize: "12.5px", border: `1px solid ${o.on ? "rgb(var(--acc2) / .6)" : "rgba(196,181,253,.18)"}`, background: o.on ? "rgb(var(--acc) / .26)" : "rgba(255,255,255,.03)", color: "rgba(241,234,248,.9)" }}>{o.label}</button>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", height: "44px", padding: "0 6px 0 14px", borderRadius: "10px", background: "rgba(0,0,0,.3)", border: "1px solid rgba(196,181,253,.16)" }}>
                <input type={v.keyType} value={v.keyInput} onChange={v.onKeyInput} onKeyDown={v.onKeyEnter} disabled={v.keyDisabled} placeholder={v.keyPlaceholder} spellCheck={false} style={{ flex: "1", minWidth: 0, background: "none", border: "none", outline: "none", fontFamily: "'JetBrains Mono',monospace", fontSize: "13px", color: "rgba(241,234,248,.9)" }} />
                <button onClick={v.toggleKey} style={{ height: "32px", padding: "0 12px", borderRadius: "8px", border: "1px solid rgba(196,181,253,.2)", background: "transparent", color: "rgba(226,218,240,.75)", fontSize: "12.5px", cursor: "pointer" }}>
                  {v.keyBtn}
                </button>
                <button onClick={v.saveKey} style={{ height: "32px", padding: "0 12px", borderRadius: "8px", border: "1px solid rgb(var(--acc2) / .4)", background: "rgb(var(--acc) / .35)", color: "#FFF6E9", fontSize: "12.5px", cursor: "pointer" }}>
                  Guardar
                </button>
              </div>
              <span style={{ fontSize: "12.5px", color: "rgba(226,218,240,.5)" }}>
                {v.keyHelp}
              </span>
            </div>
            <span style={{ marginTop: "10px", fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .62)" }}>
              SISTEMA
            </span>
            {(v.sysToggles || []).map((t, tIndex) => (<Fragment key={t?.id ?? tIndex}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "4px 0" }}>
                <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "3px" }}>
                  <span style={{ fontSize: "14.5px", color: "rgba(241,234,248,.88)" }}>
                    {t.label}
                  </span>
                  <span style={{ fontSize: "12.5px", color: "rgba(226,218,240,.45)" }}>
                    {t.note}
                  </span>
                </div>
                <button onClick={t.toggle} style={{ flex: "none", position: "relative", width: "38px", height: "22px", borderRadius: "999px", border: `1px solid ${t.tBorder}`, background: t.tBg, cursor: "pointer", padding: "0", transition: "background 300ms" }}>
                  <span style={{ position: "absolute", top: "2px", left: t.tLeft, width: "16px", height: "16px", borderRadius: "50%", background: "#FFF6E9", transition: "left 320ms cubic-bezier(.34,1.4,.64,1)" }}></span>
                </button>
              </div>
            </Fragment>))}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "3px" }}>
                <span style={{ fontSize: "14.5px", color: "rgba(241,234,248,.88)" }}>
                  Atajo global
                </span>
                <span style={{ fontSize: "12.5px", color: "rgba(226,218,240,.45)" }}>
                  Hable con Nexus desde cualquier aplicación
                </span>
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                <span style={{ padding: "5px 9px", borderRadius: "6px", border: "1px solid rgba(196,181,253,.25)", borderBottomWidth: "2px", fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", color: "#FFF6E9" }}>
                  Ctrl
                </span>
                <span style={{ padding: "5px 9px", borderRadius: "6px", border: "1px solid rgba(196,181,253,.25)", borderBottomWidth: "2px", fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", color: "rgba(241,234,248,.85)" }}>
                  Alt
                </span>
                <span style={{ padding: "5px 9px", borderRadius: "6px", border: "1px solid rgba(196,181,253,.25)", borderBottomWidth: "2px", fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", color: "#FFF6E9" }}>
                  Espacio
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "18px", animation: "nx-in 600ms cubic-bezier(.16,1,.3,1) 200ms both" }}>
            <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .62)" }}>
              APARIENCIA
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "10px" }}>
              {(v.themeCards || []).map((t, tIndex) => (<Fragment key={t?.id ?? tIndex}>
                <button onClick={t.pick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "14px 6px", borderRadius: "12px", cursor: "pointer", background: t.bg, border: `1px solid ${t.border}`, color: "#F1EAF8", transition: "transform 300ms cubic-bezier(.34,1.2,.64,1), border-color 300ms" }} className="dc53">
                  <span style={{ width: "40px", height: "40px", borderRadius: "50%", background: `radial-gradient(circle at 50% 50%, #FFF6E9 0 12%, ${t.c2} 24%, ${t.c1} 48%, #05030A 72%)`, boxShadow: `0 0 0 1.5px ${t.c2}, 0 0 18px ${t.c1}` }}></span>
                  <span style={{ fontSize: "12.5px" }}>
                    {t.name}
                  </span>
                </button>
              </Fragment>))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "14.5px", color: "rgba(241,234,248,.85)" }}>
                  Calidad gráfica
                </span>
                <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", color: "rgba(226,218,240,.5)" }}>
                  {v.qualityNote}
                </span>
              </div>
              <div style={{ display: "flex", padding: "3px", borderRadius: "10px", background: "rgba(0,0,0,.3)", border: "1px solid rgba(196,181,253,.12)" }}>
                {(v.qualityOpts || []).map((o, oIndex) => (<Fragment key={o?.id ?? oIndex}>
                  <button onClick={o.pick} style={{ flex: "1", height: "34px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", background: o.bg, color: o.color, transition: "background 250ms, color 250ms" }}>
                    {o.label}
                  </button>
                </Fragment>))}
              </div>
            </div>
            <span style={{ marginTop: "10px", fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .62)" }}>
              AUDIO
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ fontSize: "14.5px", color: "rgba(241,234,248,.85)" }}>
                Micrófono
              </span>
              <button onClick={v.cycleMic} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "44px", padding: "0 14px", borderRadius: "10px", background: "rgba(0,0,0,.3)", border: "1px solid rgba(196,181,253,.16)", color: "#FFF6E9", fontSize: "14px", cursor: "pointer" }}>
                <span>
                  {v.micName}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(196,181,253,.7)" strokeWidth="1.5">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", letterSpacing: ".2em", color: "rgba(226,218,240,.45)" }}>
                  NIVEL
                </span>
                <div style={{ flex: "1", height: "4px", borderRadius: "4px", background: "rgba(196,181,253,.1)", overflow: "hidden" }}>
                  <div data-nexus-meter="1" style={{ height: "100%", width: "100%", transformOrigin: "0 50%", transform: "scaleX(0)", background: "linear-gradient(90deg,#34D399,rgb(var(--acc2)))" }}></div>
                </div>
              </div>
            </div>
            <span data-scramble="1" style={{ marginTop: "8px", fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .62)" }}>
              GEMINI · QUÉ PUEDE USAR SU CUPO
            </span>
            <span style={{ fontSize: "12.5px", lineHeight: "1.5", color: "rgba(226,218,240,.5)" }}>
              {v.geminiNote}
            </span>
            {(v.geminiToggles || []).map((t, tIndex) => (<Fragment key={t?.label ?? tIndex}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "2px 0" }}>
                <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "3px" }}>
                  <span style={{ fontSize: "14.5px", color: "rgba(241,234,248,.88)" }}>
                    {t.label}
                  </span>
                  <span style={{ fontSize: "12.5px", color: "rgba(226,218,240,.45)" }}>
                    {t.note}
                  </span>
                </div>
                <button onClick={t.toggle} style={{ flex: "none", position: "relative", width: "38px", height: "22px", borderRadius: "999px", border: `1px solid ${t.tBorder}`, background: t.tBg, cursor: "pointer", padding: "0", transition: "background 250ms, border-color 250ms" }}>
                  <span style={{ position: "absolute", top: "2px", left: t.tLeft, width: "16px", height: "16px", borderRadius: "50%", background: "#FFF6E9", transition: "left 320ms cubic-bezier(.34,1.3,.64,1)" }}></span>
                </button>
              </div>
            </Fragment>))}
            <span data-scramble="1" style={{ marginTop: "8px", fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .62)" }}>
              SPOTIFY · TUS LISTAS POR NOMBRE
            </span>
            {v.spotifyConnected ? (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ flex: "1", fontSize: "14px", color: "rgba(241,234,248,.88)" }}>● Conectado como <b style={{ fontWeight: 500 }}>{v.spotifyUser}</b></span>
                <button onClick={v.spotifyDisconnect} style={{ height: "32px", padding: "0 12px", borderRadius: "8px", border: "1px solid rgba(196,181,253,.2)", background: "transparent", color: "rgba(226,218,240,.7)", fontSize: "12.5px", cursor: "pointer" }}>Desconectar</button>
              </div>
            ) : (
              <>
                <span style={{ fontSize: "12.5px", lineHeight: "1.55", color: "rgba(226,218,240,.5)" }}>
                  1 · Crea una app gratis en <a onClick={v.openSpotifyDev} style={{ color: "rgb(var(--acc2))", cursor: "pointer" }}>developer.spotify.com</a> (Web API) con esta Redirect URI: <code style={{ color: "#FFF6E9" }}>{v.spotifyRedirect}</code><br />
                  2 · Pega aquí su Client ID y pulsa Conectar.
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input value={v.spotifyIdInput} onChange={v.onSpotifyId} placeholder="Client ID (32 caracteres)" style={{ flex: "1", minWidth: "0", height: "36px", padding: "0 12px", borderRadius: "9px", background: "rgba(0,0,0,.3)", border: "1px solid rgba(196,181,253,.16)", outline: "none", color: "#FFF6E9", fontFamily: "'JetBrains Mono',monospace", fontSize: "12px" }} />
                  <button onClick={v.spotifyConnect} disabled={v.spotifyBusy} style={{ height: "36px", padding: "0 14px", borderRadius: "9px", border: "1px solid rgba(255,255,255,.18)", background: "linear-gradient(180deg, #1DB954, #158a3e)", color: "#fff", fontSize: "13px", cursor: "pointer", opacity: v.spotifyBusy ? .6 : 1 }}>{v.spotifyBusy ? 'Esperando…' : 'Conectar'}</button>
                </div>
                {v.spotifyError && <span style={{ fontSize: "12.5px", color: "#FB7185" }}>{v.spotifyError}</span>}
              </>
            )}
            <span data-scramble="1" style={{ marginTop: "8px", fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .62)" }}>
              AGENTE
            </span>
            {(v.agentToggles || []).map((t, tIndex) => (<Fragment key={t?.label ?? tIndex}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "2px 0" }}>
                <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "3px" }}>
                  <span style={{ fontSize: "14.5px", color: "rgba(241,234,248,.88)" }}>
                    {t.label}
                  </span>
                  <span style={{ fontSize: "12.5px", color: "rgba(226,218,240,.45)" }}>
                    {t.note}
                  </span>
                </div>
                <button onClick={t.toggle} style={{ flex: "none", position: "relative", width: "38px", height: "22px", borderRadius: "999px", border: `1px solid ${t.tBorder}`, background: t.tBg, cursor: "pointer", padding: "0", transition: "background 250ms, border-color 250ms" }}>
                  <span style={{ position: "absolute", top: "2px", left: t.tLeft, width: "16px", height: "16px", borderRadius: "50%", background: "#FFF6E9", transition: "left 320ms cubic-bezier(.34,1.3,.64,1)" }}></span>
                </button>
              </div>
            </Fragment>))}
          </div>
        </div>
      </div>
    </>)}
    </>
  )
}
