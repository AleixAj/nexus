// Generated from design/NEXUS.dc.html by scripts/convert-design.mjs
import { Fragment } from 'react'

export default function Desktop({ v }: { v: any }) {
  return (
    <>
    {v.overlay && (<>
      <div style={{ position: "absolute", inset: "0", background: "repeating-linear-gradient(135deg, rgba(255,255,255,.025) 0 2px, transparent 2px 14px), #0B0B10", display: "flex", alignItems: "flex-end", justifyContent: "flex-start", padding: "48px", boxSizing: "border-box", animation: "nx-in 500ms cubic-bezier(.16,1,.3,1) both" }}>
        <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "13px", letterSpacing: ".2em", color: "rgba(255,255,255,.28)" }}>
          APLICACIÓN EN PRIMER PLANO · P. EJ. VS CODE, NAVEGADOR, JUEGO
        </span>
      </div>
    </>)}
    <canvas data-nexus-main="core" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none" }} />
    {v.showFrame && (<>
      <div style={{ position: "absolute", inset: "14px", pointerEvents: "none", animation: "nx-in 1000ms cubic-bezier(.16,1,.3,1) both", background: "linear-gradient(rgb(var(--acc2) / .4),rgb(var(--acc2) / .4)) 0 0 / 26px 1px no-repeat, linear-gradient(rgb(var(--acc2) / .4),rgb(var(--acc2) / .4)) 0 0 / 1px 26px no-repeat, linear-gradient(rgb(var(--acc2) / .4),rgb(var(--acc2) / .4)) 100% 0 / 26px 1px no-repeat, linear-gradient(rgb(var(--acc2) / .4),rgb(var(--acc2) / .4)) 100% 0 / 1px 26px no-repeat, linear-gradient(rgb(var(--acc2) / .4),rgb(var(--acc2) / .4)) 0 100% / 26px 1px no-repeat, linear-gradient(rgb(var(--acc2) / .4),rgb(var(--acc2) / .4)) 0 100% / 1px 26px no-repeat, linear-gradient(rgb(var(--acc2) / .4),rgb(var(--acc2) / .4)) 100% 100% / 26px 1px no-repeat, linear-gradient(rgb(var(--acc2) / .4),rgb(var(--acc2) / .4)) 100% 100% / 1px 26px no-repeat" }}></div>
      <div style={{ position: "absolute", left: "64px", right: "64px", top: "12px", display: "flex", justifyContent: "space-between", pointerEvents: "none", fontFamily: "'JetBrains Mono',monospace", fontSize: "9.5px", letterSpacing: ".22em", color: "rgba(226,218,240,.4)", animation: "nx-down 900ms cubic-bezier(.16,1,.3,1) 300ms both" }}>
        <div style={{ display: "flex", gap: "22px" }}>
          <span data-scramble="1">
            NX-OS 2.4.0
          </span>
          <span data-scramble="1">
            NODO NEXUS-PC
          </span>
          <span style={{ display: "flex", gap: "8px" }}>
            <span data-scramble="1">
              ACTIVO
            </span>
            <span data-tele="uptime" style={{ color: "rgb(var(--acc2) / .8)" }}></span>
          </span>
          <span style={{ display: "flex", gap: "8px" }}>
            <span data-scramble="1">
              ENERGÍA
            </span>
            <span data-tele="energy" style={{ color: "rgb(var(--acc2) / .8)" }}></span>
          </span>
        </div>
        <div style={{ display: "flex", gap: "22px" }}>
          <span style={{ display: "flex", gap: "8px" }}>
            <span data-scramble="1">
              LAT
            </span>
            <span data-tele="lat" style={{ color: "rgb(var(--acc2) / .8)" }}></span>
            <span>
              MS
            </span>
          </span>
          <span style={{ display: "flex", gap: "8px" }}>
            <span data-tele="fps" style={{ color: "rgb(var(--acc2) / .8)" }}></span>
            <span>
              FPS
            </span>
          </span>
          <span data-scramble="1">
            {v.coords}
          </span>
          <span data-tele="hex" style={{ color: "#F5B971" }}></span>
        </div>
      </div>
      <div style={{ position: "absolute", left: "22px", top: "300px", width: "14px", height: "480px", pointerEvents: "none", background: "repeating-linear-gradient(180deg, rgb(var(--acc2) / .4) 0 1px, transparent 1px 60px) 0 0 / 14px 100% no-repeat, repeating-linear-gradient(180deg, rgb(var(--acc2) / .22) 0 1px, transparent 1px 12px) 0 0 / 7px 100% no-repeat", animation: "nx-left 900ms cubic-bezier(.16,1,.3,1) 300ms both" }}></div>
      <div style={{ position: "absolute", right: "22px", top: "300px", width: "14px", height: "480px", pointerEvents: "none", background: "repeating-linear-gradient(180deg, rgb(var(--acc2) / .4) 0 1px, transparent 1px 60px) 100% 0 / 14px 100% no-repeat, repeating-linear-gradient(180deg, rgb(var(--acc2) / .22) 0 1px, transparent 1px 12px) 100% 0 / 7px 100% no-repeat", animation: "nx-right 900ms cubic-bezier(.16,1,.3,1) 300ms both" }}></div>
    </>)}
    {v.showUI && (<>
      {/* top-left HUD */}
      {v.showHud && (<>
        <div style={{ position: "absolute", left: "64px", top: "52px", display: "flex", flexDirection: "column", gap: "22px", width: "440px", ...v.hudPos }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", animation: "nx-left 800ms cubic-bezier(.16,1,.3,1) both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", letterSpacing: ".24em", color: "rgb(var(--acc2) / .5)" }}>
              <span style={{ width: "6px", height: "6px", border: "1px solid rgb(var(--acc2) / .7)", transform: "rotate(45deg)" }}></span>
              <span data-scramble="1">
                SEC.01 — CRONO LOCAL · {v.utc}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", fontSize: "124px", fontWeight: "300", lineHeight: "1", letterSpacing: "-.03em", color: "#FFF6E9", marginLeft: "-6px", textShadow: "0 0 34px rgb(var(--acc) / .5)" }}>
              {(v.clockDigits || []).map((d, dIndex) => (<Fragment key={d?.id ?? dIndex}>
                {d.sep && (<>
                  <span style={{ width: ".3em", textAlign: "center", height: "1em", lineHeight: ".92", opacity: ".45", animation: "nx-pulse 2s ease-in-out infinite" }}>
                    :
                  </span>
                </>)}
                {d.num && (<>
                  <span style={{ display: "inline-block", height: "1em", lineHeight: "1em", overflow: "hidden", width: ".6em", textAlign: "center" }}>
                    <span style={{ display: "flex", flexDirection: "column", transform: `translateY(${d.ty})`, transition: "transform 800ms cubic-bezier(.16,1,.3,1)" }}>
                      <span>
                        0
                      </span>
                      <span>
                        1
                      </span>
                      <span>
                        2
                      </span>
                      <span>
                        3
                      </span>
                      <span>
                        4
                      </span>
                      <span>
                        5
                      </span>
                      <span>
                        6
                      </span>
                      <span>
                        7
                      </span>
                      <span>
                        8
                      </span>
                      <span>
                        9
                      </span>
                    </span>
                  </span>
                </>)}
              </Fragment>))}
              <span style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "12px 0 0 14px", fontFamily: "'JetBrains Mono',monospace", fontWeight: "300", letterSpacing: "0", textShadow: "none" }}>
                <span data-tele="sec" style={{ fontSize: "28px", lineHeight: "1", color: "rgb(var(--acc2) / .9)" }}>
                  00
                </span>
                <span style={{ fontSize: "9.5px", letterSpacing: ".24em", color: "rgba(226,218,240,.4)" }}>
                  SEG
                </span>
              </span>
            </div>
            <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", letterSpacing: ".2em", textTransform: "uppercase", color: "rgb(var(--acc2) / .7)" }}>
              {v.dateStr}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "18px", animation: "nx-left 800ms cubic-bezier(.16,1,.3,1) 80ms both" }}>
            <span style={{ fontSize: "52px", fontWeight: "300", lineHeight: "1", color: "#FFF6E9" }}>
              {v.wTemp}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgba(226,218,240,.8)" }}>
                {v.wPlace}
              </span>
              <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgba(226,218,240,.5)" }}>
                {v.wDetail}
              </span>
            </div>
          </div>
          <span style={{ fontSize: "24px", fontWeight: "400", color: "rgba(255,246,233,.92)", animation: "nx-left 800ms cubic-bezier(.16,1,.3,1) 160ms both" }}>
            {v.greetText}
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "380px", animation: "nx-left 800ms cubic-bezier(.16,1,.3,1) 240ms both" }}>
            <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .6)" }}>
              EN UN DÍA COMO HOY · {v.factYear}
            </span>
            <span style={{ fontSize: "15px", lineHeight: "1.5", color: "rgba(226,218,240,.72)", textWrap: "pretty" }}>
              {v.factText}
            </span>
          </div>
          <div style={{ display: "flex", gap: "8px", animation: "nx-left 800ms cubic-bezier(.16,1,.3,1) 320ms both" }}>
            {(v.indicators || []).map((ind, indIndex) => (<Fragment key={ind?.id ?? indIndex}>
              <span style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 11px", borderRadius: "999px", border: "1px solid rgba(196,181,253,.16)", background: "rgba(0,0,0,.25)", fontFamily: "'JetBrains Mono',monospace", fontSize: "10.5px", letterSpacing: ".2em", color: "rgba(226,218,240,.78)" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: ind.color, boxShadow: `0 0 8px ${ind.color}` }}></span>
                {ind.label}
              </span>
            </Fragment>))}
          </div>
        </div>
      </>)}
      {/* status pill */}
      <div style={{ position: "absolute", top: "28px", left: v.pillLeft, width: "0", display: "flex", justifyContent: "center", transition: "left 1000ms cubic-bezier(.16,1,.3,1)" }}>
        <button onClick={v.onPill} style={{ pointerEvents: v.pillPointer, flex: "none", display: "flex", alignItems: "center", gap: "10px", height: "36px", padding: "0 18px", borderRadius: "999px", cursor: "pointer", background: "linear-gradient(rgba(7,5,14,.55),rgba(7,5,14,.55)) padding-box, linear-gradient(90deg, rgb(var(--acc) / .5), rgb(var(--acc2) / .15), rgb(var(--acc) / .5)) border-box", border: "1px solid transparent", backdropFilter: "blur(20px)", color: "rgba(241,234,248,.9)", fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", whiteSpace: "nowrap", animation: "nx-down 700ms cubic-bezier(.16,1,.3,1) 200ms both" }}>
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: v.pillDot, boxShadow: `0 0 10px ${v.pillDot}`, animation: v.pillAnim }}></span>
          <span data-scramble="1">
            {v.pillText}
          </span>
        </button>
      </div>
      {/* notifications */}
      {v.showNotifs && (<>
        <div style={{ position: "absolute", right: "40px", top: "40px", width: "360px", display: "flex", flexDirection: "column", gap: "10px", ...v.notifPos }}>
          {(v.notifs || []).map((n, nIndex) => (<Fragment key={n?.id ?? nIndex}>
            <div data-spot="1" style={{ position: "relative", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "6px", background: "linear-gradient(rgba(7,5,14,.5),rgba(7,5,14,.5)) padding-box, linear-gradient(155deg, rgb(var(--acc) / .5), rgb(var(--acc) / 0) 55%) border-box", border: "1px solid transparent", borderRadius: "14px", backdropFilter: "blur(24px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.07)", animation: "nx-right 700ms cubic-bezier(.16,1,.3,1) both" }} className="dc1">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: "'JetBrains Mono',monospace", fontSize: "10.5px", letterSpacing: ".2em", color: "rgb(var(--acc2) / .7)" }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: n.dot }}></span>
                  {n.app} · {n.time}
                </span>
                <button onClick={n.dismiss} style={{ width: "22px", height: "22px", display: v.dismissDisplay, placeItems: "center", border: "none", background: "none", color: "rgba(226,218,240,.45)", cursor: "pointer", padding: "0" }} className="dc2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <span style={{ fontSize: "16px", fontWeight: "500", color: "#FFF6E9" }}>
                {n.title}
              </span>
              <span style={{ fontSize: "13.5px", color: "rgba(226,218,240,.62)" }}>
                {n.body}
              </span>
            </div>
          </Fragment>))}
        </div>
      </>)}
      {/* core caption */}
      <div style={{ position: "absolute", left: v.capLeft, top: v.capTop, transform: "translateX(-50%)", width: v.capWidth, display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", textAlign: "center", pointerEvents: "none", transition: "left 1000ms cubic-bezier(.16,1,.3,1), top 1000ms cubic-bezier(.16,1,.3,1)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "10px", fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".3em", color: v.stateColor, transition: "color 400ms" }}>
          <span style={{ width: "18px", height: "1px", background: "currentColor", opacity: ".5" }}></span>
          <span data-scramble="1">
            {v.stateLabel}
          </span>
          <span style={{ width: "18px", height: "1px", background: "currentColor", opacity: ".5" }}></span>
        </span>
        {v.showWave && (<>
          <canvas data-nexus-wave="1" style={{ width: "440px", height: "44px", animation: "nx-in 500ms cubic-bezier(.16,1,.3,1) both" }} />
        </>)}
        <div style={{ fontSize: v.wordsSize, lineHeight: "1.35", fontWeight: "400", color: v.wordsColor, opacity: v.wordsOpacity, transition: "opacity 500ms, color 500ms", textWrap: "balance", minHeight: "1.35em" }}>
          {(v.words || []).map((w, wIndex) => (<Fragment key={w?.id ?? wIndex}>
            <span style={{ display: "inline-block", marginRight: ".26em", animation: "nx-word 560ms cubic-bezier(.16,1,.3,1) both" }}>
              {w}
            </span>
          </Fragment>))}
        </div>
        {v.hasAction && (<>
          <span style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 14px", borderRadius: "999px", border: "1px solid rgba(245,185,113,.35)", background: "rgba(245,185,113,.08)", fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "#F5B971", animation: "nx-in 400ms cubic-bezier(.16,1,.3,1) both" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", border: "1.5px solid #F5B971", borderTopColor: "transparent", animation: "nx-spin 800ms linear infinite" }}></span>
            {v.actionLabel}
          </span>
        </>)}
        {v.hasError && (<>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "center", animation: "nx-in 500ms cubic-bezier(.16,1,.3,1) both" }}>
            <span style={{ fontSize: "20px", color: "#FDA4AF" }}>
              {v.errorTitle}
            </span>
            <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".2em", color: "rgba(251,113,133,.7)" }}>
              {v.errorDetail}
            </span>
          </div>
        </>)}
      </div>
      {/* mic */}
      {v.showMic && (<>
        <div style={{ position: "absolute", left: "0", right: "0", bottom: "28px", display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", pointerEvents: "auto", animation: "nx-up 800ms cubic-bezier(.16,1,.3,1) 250ms both" }}>
            <div style={{ position: "relative", width: "560px", height: "76px", display: "grid", placeItems: "center" }}>
              <canvas data-nexus-wave="1" style={{ position: "absolute", inset: "16px 0", width: "560px", height: "44px", opacity: ".7" }} />
              <svg width="112" height="112" viewBox="0 0 112 112" style={{ position: "absolute", left: "224px", top: "-18px", pointerEvents: "none", animation: "nx-spin 30s linear infinite" }}>
                <circle cx="56" cy="56" r="54" fill="none" strokeWidth="1" strokeDasharray="1 5" style={{ stroke: "rgb(var(--acc2) / .5)" }} />
              </svg>
              <svg width="98" height="98" viewBox="0 0 98 98" style={{ position: "absolute", left: "231px", top: "-11px", pointerEvents: "none", animation: "nx-spinr 14s linear infinite" }}>
                <path d="M49 2a47 47 0 0 1 33 14M49 96a47 47 0 0 1-33-14" fill="none" strokeWidth="1.4" style={{ stroke: "rgb(var(--acc2) / .75)" }} />
              </svg>
              {v.micRing && (<>
                <span style={{ position: "absolute", width: "76px", height: "76px", borderRadius: "50%", border: "1px solid rgb(var(--acc2) / .6)", animation: "nx-ring 1600ms cubic-bezier(.16,1,.3,1) infinite" }}></span>
              </>)}
              <button onClick={v.onMic} style={{ position: "relative", width: "76px", height: "76px", borderRadius: "50%", display: "grid", placeItems: "center", cursor: "pointer", color: "#FFF6E9", background: "radial-gradient(circle at 50% 30%, rgb(var(--acc) / .35), rgba(7,5,14,.7) 70%) padding-box, linear-gradient(160deg, rgb(var(--acc2) / .8), rgb(var(--acc) / .1)) border-box", border: "1px solid transparent", backdropFilter: "blur(20px)", boxShadow: "0 0 40px rgb(var(--acc) / .35), inset 0 1px 0 rgba(255,255,255,.2)", transition: "transform 300ms cubic-bezier(.34,1.3,.64,1)" }} className="dc3 dc4">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3" />
                </svg>
              </button>
            </div>
            <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10.5px", letterSpacing: ".24em", color: "rgba(226,218,240,.5)", whiteSpace: "nowrap" }}>
              {v.micStatus}
            </span>
          </div>
        </div>
      </>)}
      {/* music mini card */}
      {v.showMusicMini && (<>
        <div data-spot="1" style={{ position: "absolute", right: "24px", bottom: "112px", width: "360px", padding: "14px", display: "flex", gap: "14px", alignItems: "center", background: "linear-gradient(rgba(7,5,14,.5),rgba(7,5,14,.5)) padding-box, linear-gradient(155deg, rgba(251,146,60,.45), rgb(var(--acc) / .1) 55%) border-box", border: "1px solid transparent", borderRadius: "14px", backdropFilter: "blur(24px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.07)", animation: "nx-up 700ms cubic-bezier(.16,1,.3,1) both" }} className="dc5">
          <button onClick={v.openMusic} style={{ width: "64px", height: "64px", flex: "none", borderRadius: "10px", border: "none", cursor: "pointer", background: "repeating-linear-gradient(135deg, rgba(255,255,255,.08) 0 2px, transparent 2px 8px), linear-gradient(135deg,#FB923C,#9333EA 60%,#1E1B4B)", display: "grid", placeItems: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: "8px", letterSpacing: ".15em", color: "rgba(255,255,255,.7)" }}>
            CARÁTULA
          </button>
          <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "6px" }}>
            <span data-scramble="1" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", letterSpacing: ".2em", color: "#FDBA74" }}>
              SPOTIFY · REPRODUCIENDO
            </span>
            <span style={{ fontSize: "15px", fontWeight: "500", color: "#FFF6E9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Horizonte de sucesos
            </span>
            <span style={{ fontSize: "12.5px", color: "rgba(226,218,240,.6)" }}>
              Aurora Lineal
            </span>
            <div style={{ height: "2px", borderRadius: "2px", background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: v.musicPct, background: "linear-gradient(90deg,#FB923C,rgb(var(--acc2)))", transition: "width 1000ms linear" }}></div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "2px" }}>
            <button onClick={v.togglePlay} style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.06)", color: "#FFF6E9", display: "grid", placeItems: "center", cursor: "pointer" }} className="dc6">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
                <path d={v.playIcon} />
              </svg>
            </button>
            <button onClick={v.nextTrack} style={{ width: "36px", height: "36px", borderRadius: "50%", border: "none", background: "none", color: "rgba(226,218,240,.7)", display: "grid", placeItems: "center", cursor: "pointer" }} className="dc7">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
                <path d="M6 6v12l9-6zM18 6v12" />
              </svg>
            </button>
          </div>
        </div>
      </>)}
    </>)}
    </>
  )
}
