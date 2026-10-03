// Activity: everything NEXUS changed on the PC (newest first), "undo" where it can, and the
// emergency pause that stops every change at once.
const mono = "'JetBrains Mono',monospace"

export default function ActivityPanel({ v }: { v: any }) {
  if (!v.isActivity) return null
  return (
    <div role="dialog" aria-label="Actividad" style={{ position: 'absolute', right: 'calc(24px - var(--ex))', top: 24, bottom: 112, width: 760, display: 'flex', flexDirection: 'column', background: 'linear-gradient(rgba(7,5,14,.6),rgba(7,5,14,.6)) padding-box, linear-gradient(155deg, rgb(var(--acc) / .55), rgb(var(--acc) / .06) 45%, rgb(var(--acc) / 0)) border-box', border: '1px solid transparent', borderRadius: 14, backdropFilter: 'blur(24px) saturate(1.2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.07), 0 24px 70px rgba(0,0,0,.35)', animation: 'nx-right 600ms cubic-bezier(.16,1,.3,1) both' }} className="dc49 dc50">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '26px 32px 18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span data-scramble="1" style={{ fontFamily: mono, fontSize: 12, letterSpacing: '.2em', color: 'rgb(var(--acc2) / .7)' }}>ACTIVIDAD · ÚLTIMOS 7 DÍAS</span>
          <span style={{ fontSize: 30, fontWeight: 400 }}>Lo que he hecho</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={v.togglePause} title={v.paused ? 'Vuelve a dejarle hacer cambios' : 'Para todo: sigue respondiendo, pero no cambia nada en tu PC'} style={{ height: 40, padding: '0 16px', borderRadius: 10, cursor: 'pointer', fontSize: 14.5, border: `1px solid ${v.paused ? 'rgba(52,211,153,.5)' : 'rgba(251,113,133,.55)'}`, background: v.paused ? 'rgba(52,211,153,.14)' : 'rgba(251,113,133,.14)', color: '#FFF6E9' }}>
            {v.paused ? '▶ Quitar la pausa' : '⏸ Pausa total'}
          </button>
          <button onClick={v.closePanel} aria-label="Cerrar" style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid rgb(var(--acc2) / .14)', background: 'rgba(255,255,255,.02)', color: 'rgba(226,218,240,.7)', display: 'grid', placeItems: 'center', cursor: 'pointer' }} className="dc51">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </div>
      {v.paused && (
        <div style={{ margin: '0 32px 14px', padding: '12px 16px', borderRadius: 10, background: 'rgba(251,113,133,.1)', border: '1px solid rgba(251,113,133,.3)', fontSize: 14.5, color: '#FDA4AF' }}>
          En pausa: sigo respondiendo y buscando, pero no cambio nada en tu PC (archivos, apps, comandos, apagado…).
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0 32px 28px' }}>
        {v.activityEmpty && <span style={{ display: 'block', padding: '40px 0', textAlign: 'center', fontSize: 15, lineHeight: 1.6, color: 'rgba(226,218,240,.6)' }}>Todavía no he cambiado nada en tu PC.<br />Aquí aparecerá cada archivo que guarde, mueva o borre, cada app que abra y cada comando, con un botón para deshacerlo cuando se pueda.</span>}
        {v.activityRows.map((r: any) => r.head ? (
          <span key={r.id} style={{ display: 'block', margin: '18px 0 6px', fontFamily: mono, fontSize: 12, letterSpacing: '.2em', color: 'rgb(var(--acc2) / .65)' }}>{r.head}</span>
        ) : (
          <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '64px minmax(0,1fr) auto', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px solid rgb(var(--acc2) / .08)' }}>
            <span style={{ fontFamily: mono, fontSize: 13, color: 'rgba(226,218,240,.6)' }}>{r.time}</span>
            <span title={r.label} style={{ fontSize: 15, color: r.undone ? 'rgba(226,218,240,.45)' : 'rgba(241,234,248,.92)', textDecoration: r.undone ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
            {r.undone ? <span style={{ fontFamily: mono, fontSize: 11.5, letterSpacing: '.15em', color: 'rgba(226,218,240,.5)' }}>DESHECHO</span>
              : r.undoLabel ? <button onClick={r.undo} style={{ height: 32, padding: '0 14px', borderRadius: 8, border: '1px solid rgb(var(--acc2) / .35)', background: 'rgb(var(--acc) / .16)', color: '#FFF6E9', fontSize: 13.5, cursor: 'pointer' }}>{r.undoLabel}</button>
              : <span />}
          </div>
        ))}
      </div>
    </div>
  )
}
