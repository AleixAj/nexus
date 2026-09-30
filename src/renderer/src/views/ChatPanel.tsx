// Generated from design/NEXUS.dc.html by scripts/convert-design.mjs
import { Fragment } from 'react'

export default function ChatPanel({ v }: { v: any }) {
  return (
    <>
    {v.isChat && (<>
      <div style={{ position: "absolute", right: "24px", top: "24px", bottom: "112px", width: "600px", display: "flex", flexDirection: "column", background: "linear-gradient(rgba(7,5,14,.5),rgba(7,5,14,.5)) padding-box, linear-gradient(155deg, rgb(var(--acc) / .55), rgb(var(--acc) / .06) 45%, rgb(var(--acc) / 0)) border-box", border: "1px solid transparent", borderRadius: "14px", backdropFilter: "blur(24px) saturate(1.2)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.07), 0 24px 70px rgba(0,0,0,.35)", animation: "nx-right 600ms cubic-bezier(.16,1,.3,1) both" }} className="dc8 dc9">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "26px 28px 18px", borderBottom: "1px solid rgba(196,181,253,.08)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", animation: "nx-in 500ms cubic-bezier(.16,1,.3,1) 80ms both" }}>
            <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .62)" }}>
              CHAT · {v.modelName}
            </span>
            <span style={{ fontSize: "28px", fontWeight: "400" }}>
              Conversación de hoy
            </span>
          </div>
          <button onClick={v.closePanel} style={{ width: "36px", height: "36px", borderRadius: "10px", border: "1px solid rgba(196,181,253,.14)", background: "rgba(255,255,255,.02)", color: "rgba(226,218,240,.7)", display: "grid", placeItems: "center", cursor: "pointer" }} className="dc10">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div ref={v.chatRef} style={{ flex: "1", overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: "18px", scrollBehavior: "smooth" }}>
          {(v.chatMsgs || []).map((m, mIndex) => (<Fragment key={m?.id ?? mIndex}>
            {m.isUser && (<>
              <div style={{ alignSelf: "flex-end", maxWidth: "78%", padding: "12px 16px", borderRadius: "14px 14px 4px 14px", background: "rgb(var(--acc) / .16)", border: "1px solid rgb(var(--acc) / .28)", fontSize: "15.5px", lineHeight: "1.5", color: "#FFF6E9", animation: m.anim }}>
                {m.text}
              </div>
            </>)}
            {m.isNexus && (<>
              <div style={{ display: "flex", gap: "12px", maxWidth: "92%", animation: m.anim }}>
                <span style={{ flex: "none", width: "22px", height: "22px", marginTop: "2px", borderRadius: "50%", background: "radial-gradient(circle, #FFF6E9 0 18%, rgb(var(--acc2) / .7) 30%, transparent 62%)", boxShadow: "0 0 0 1px rgb(var(--acc2) / .5), 0 0 14px rgb(var(--acc) / .6)" }}></span>
                <span style={{ fontSize: "15.5px", lineHeight: "1.6", color: "rgba(241,234,248,.9)", textWrap: "pretty" }}>
                  {m.shown}
                  {m.streaming && (<>
                    <span style={{ display: "inline-block", width: "7px", height: "1em", marginLeft: "3px", verticalAlign: "-2px", background: "rgb(var(--acc2))", animation: "nx-caret 900ms steps(1) infinite" }}></span>
                  </>)}
                </span>
              </div>
            </>)}
            {m.isAction && (<>
              <div style={{ marginLeft: "34px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "10px", borderRadius: "12px", background: "rgba(52,211,153,.04)", border: "1px solid rgba(52,211,153,.2)", animation: m.anim }}>
                <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", letterSpacing: ".2em", color: "rgba(52,211,153,.75)" }}>
                  ACCIONES EJECUTADAS
                </span>
                {(m.items || []).map((it, itIndex) => (<Fragment key={it?.id ?? itIndex}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "rgba(241,234,248,.88)" }}>
                    <span style={{ width: "20px", height: "20px", borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(52,211,153,.14)", boxShadow: "0 0 12px rgba(52,211,153,.3)" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12l5 5 9-10" style={{ strokeDasharray: "24", animation: "nx-check 600ms cubic-bezier(.16,1,.3,1) both", animationDelay: it.delay }} />
                      </svg>
                    </span>
                    {it.t}
                  </div>
                </Fragment>))}
              </div>
            </>)}
          </Fragment>))}
        </div>
        <div style={{ position: "relative", padding: "16px 20px 20px", borderTop: "1px solid rgba(196,181,253,.08)", display: "flex", flexDirection: "column", gap: "10px" }}>
          {v.showSlash && (<>
            <div style={{ position: "absolute", left: "20px", right: "20px", bottom: "100%", marginBottom: "-6px", padding: "8px", display: "flex", flexDirection: "column", gap: "2px", borderRadius: "12px", background: "rgba(12,9,22,.92)", border: "1px solid rgb(var(--acc) / .35)", backdropFilter: "blur(24px)", boxShadow: "0 20px 60px rgba(0,0,0,.5)", animation: "nx-in 260ms cubic-bezier(.16,1,.3,1) both" }}>
              {(v.slashCmds || []).map((c, cIndex) => (<Fragment key={c?.id ?? cIndex}>
                <button onClick={c.pick} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "10px 12px", borderRadius: "8px", border: "none", background: "transparent", color: "#F1EAF8", cursor: "pointer", textAlign: "left" }} className="dc11">
                  <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "13px", color: "rgb(var(--acc2))", width: "96px" }}>
                    {c.cmd}
                  </span>
                  <span style={{ fontSize: "14px", color: "rgba(226,218,240,.7)" }}>
                    {c.desc}
                  </span>
                </button>
              </Fragment>))}
            </div>
          </>)}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", height: "52px", padding: "0 8px 0 16px", borderRadius: "12px", background: "rgba(0,0,0,.35)", border: "1px solid rgba(196,181,253,.16)", transition: "border-color 250ms, box-shadow 250ms" }} className="dc12">
            <input value={v.chatInput} onChange={v.onChatInput} onKeyDown={v.onChatKey} placeholder="Escriba a Nexus o pulse / para comandos" style={{ flex: "1", background: "none", border: "none", outline: "none", color: "#FFF6E9", fontSize: "15px" }} />
            <button onClick={v.onMic} style={{ width: "38px", height: "38px", borderRadius: "9px", border: "none", background: "transparent", color: "rgba(226,218,240,.7)", display: "grid", placeItems: "center", cursor: "pointer" }} className="dc13">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            </button>
            <button onClick={v.onChatSend} style={{ width: "38px", height: "38px", borderRadius: "9px", border: "1px solid rgba(255,255,255,.16)", background: "rgb(var(--acc) / .8)", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer", boxShadow: "0 0 18px rgb(var(--acc) / .45)" }} className="dc14">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
                <path d="M4 12l16-8-6 16-2-6z" />
              </svg>
            </button>
          </div>
          <div style={{ display: "flex", gap: "16px", fontFamily: "'JetBrains Mono',monospace", fontSize: "10.5px", letterSpacing: ".14em", color: "rgba(226,218,240,.42)" }}>
            <span>
              ↵ ENVIAR
            </span>
            <span>
              / COMANDOS
            </span>
            <span style={{ marginLeft: "auto" }}>
              CTRL + ALT + ESPACIO DESDE CUALQUIER APP
            </span>
          </div>
        </div>
      </div>
    </>)}
    </>
  )
}
