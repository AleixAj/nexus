// Approval dialog for agent actions that change the machine (files, commands).
const mono = "'JetBrains Mono',monospace"
const ease = 'cubic-bezier(.16,1,.3,1)'

export default function ConfirmCard({ v }: { v: any }) {
  const c = v.confirm
  if (!c) return null
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'grid', placeItems: 'center', background: 'rgba(3,2,8,.45)', animation: `nx-in 300ms ${ease} both` }}>
      <div style={{
        width: 720, maxHeight: 640, display: 'flex', flexDirection: 'column', gap: 16, padding: '24px 28px 26px', boxSizing: 'border-box',
        background: 'linear-gradient(rgba(10,7,20,.86),rgba(10,7,20,.86)) padding-box, linear-gradient(155deg, rgba(245,185,113,.7), rgba(245,185,113,.08) 50%, rgb(var(--acc) / .3)) border-box',
        border: '1px solid transparent', borderRadius: 16, backdropFilter: 'blur(24px)', boxShadow: '0 30px 90px rgba(0,0,0,.6), 0 0 60px rgba(245,185,113,.12)',
        animation: `nx-up 500ms ${ease} both`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: mono, fontSize: 10.5, letterSpacing: '.22em', color: '#F5B971' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F5B971', boxShadow: '0 0 10px #F5B971', animation: 'nx-pulse 1.4s ease-in-out infinite' }} />
          NEXUS NECESITA SU PERMISO
        </div>
        <span style={{ fontSize: 26, fontWeight: 400, color: '#FFF6E9' }}>{c.title}</span>
        <pre style={{
          margin: 0, flex: 1, minHeight: 60, maxHeight: 380, overflow: 'auto', padding: '14px 16px', borderRadius: 10,
          background: 'rgba(0,0,0,.4)', border: '1px solid rgb(var(--acc2) / .14)', fontFamily: mono, fontSize: 12.5, lineHeight: 1.55,
          color: 'rgba(241,234,248,.85)', whiteSpace: 'pre-wrap', wordBreak: 'break-word'
        }}>{c.detail}</pre>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ flex: 1, fontSize: 12.5, color: 'rgba(226,218,240,.45)' }}>Enter para permitir · Esc para denegar</span>
          {c.always && <button onClick={v.confirmAlways} title="No volveré a preguntar por este tipo de acción (se puede quitar en Rutinas → Permisos)" style={{ height: 44, padding: '0 16px', borderRadius: 10, border: '1px solid rgba(245,185,113,.35)', background: 'transparent', color: '#F5B971', fontSize: 14, cursor: 'pointer' }}>Permitir siempre</button>}
          <button onClick={v.confirmNo} style={{ height: 44, padding: '0 20px', borderRadius: 10, border: '1px solid rgb(var(--acc2) / .2)', background: 'rgba(0,0,0,.3)', color: 'rgba(241,234,248,.85)', fontSize: 14.5, cursor: 'pointer' }}>Denegar</button>
          <button onClick={v.confirmYes} autoFocus style={{ height: 44, padding: '0 24px', borderRadius: 10, border: '1px solid rgba(255,255,255,.18)', background: 'linear-gradient(180deg, rgba(245,185,113,.95), rgba(214,140,70,.85))', color: '#1A1020', fontSize: 14.5, fontWeight: 600, cursor: 'pointer', boxShadow: '0 0 24px rgba(245,185,113,.35)' }}>Permitir</button>
        </div>
      </div>
    </div>
  )
}
