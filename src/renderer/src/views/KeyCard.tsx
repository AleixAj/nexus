// Asks for the free Gemini key right where it is needed (premium voices).
const mono = "'JetBrains Mono',monospace"
const ease = 'cubic-bezier(.16,1,.3,1)'

export default function KeyCard({ v }: { v: any }) {
  const k = v.keyAsk
  if (!k) return null
  return (
    <div onPointerDown={e => { if (e.target === e.currentTarget) v.keyAskCancel() }}
      style={{ position: 'absolute', inset: 0, zIndex: 45, display: 'grid', placeItems: 'center', background: 'rgba(3,2,8,.5)', animation: `nx-in 300ms ${ease} both` }}>
      <div style={{
        width: 640, display: 'flex', flexDirection: 'column', gap: 16, padding: '26px 30px 28px', boxSizing: 'border-box',
        background: 'linear-gradient(rgba(10,7,20,.88),rgba(10,7,20,.88)) padding-box, linear-gradient(155deg, rgb(var(--acc2) / .7), rgb(var(--acc) / .1) 50%, rgb(var(--acc) / .35)) border-box',
        border: '1px solid transparent', borderRadius: 16, backdropFilter: 'blur(24px)', boxShadow: '0 30px 90px rgba(0,0,0,.6), 0 0 60px rgb(var(--acc) / .18)',
        animation: `nx-up 500ms ${ease} both`
      }}>
        <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: '.22em', color: 'rgb(var(--acc2) / .75)' }}>✦ VOZ PREMIUM · {k.voiceName.toUpperCase()}</span>
        <span style={{ fontSize: 26, fontWeight: 400, color: '#FFF6E9' }}>Active las voces premium</span>
        <span style={{ fontSize: 14.5, lineHeight: 1.55, color: 'rgba(226,218,240,.65)' }}>
          Las voces premium usan Gemini, de Google. Solo necesita una clave gratuita (sin tarjeta):
          pulse <b style={{ color: '#FFF6E9', fontWeight: 500 }}>Conseguir clave</b>, inicie sesión con su cuenta de Google, pulse «Create API key» y péguela aquí.
          La misma clave sirve también para que Nexus piense y le entienda.
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="password" autoFocus value={v.keyAskInput} onChange={v.keyAskChange} onKeyDown={v.keyAskKey} placeholder="Pegue aquí su clave de Gemini" spellCheck={false}
            style={{ flex: 1, minWidth: 0, height: 46, padding: '0 16px', borderRadius: 10, background: 'rgba(0,0,0,.4)', border: '1px solid rgb(var(--acc2) / .3)', color: '#FFF6E9', fontFamily: mono, fontSize: 13, outline: 'none' }} />
          <button onClick={v.keyAskOpen} style={{ height: 46, padding: '0 16px', borderRadius: 10, border: '1px solid rgba(196,181,253,.2)', background: 'transparent', color: 'rgba(226,218,240,.85)', fontSize: 14, cursor: 'pointer' }}>Conseguir clave ↗</button>
        </div>
        {k.error && <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: '.14em', color: '#FB7185' }}>{k.error}</span>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ flex: 1, fontSize: 12.5, color: 'rgba(226,218,240,.45)' }}>Se guarda cifrada en este PC</span>
          <button onClick={v.keyAskCancel} style={{ height: 44, padding: '0 20px', borderRadius: 10, border: '1px solid rgba(196,181,253,.2)', background: 'rgba(0,0,0,.3)', color: 'rgba(241,234,248,.85)', fontSize: 14.5, cursor: 'pointer' }}>Ahora no</button>
          <button onClick={v.keyAskSave} disabled={k.saving} style={{ height: 44, padding: '0 24px', borderRadius: 10, border: '1px solid rgba(255,255,255,.18)', background: 'linear-gradient(180deg, rgb(var(--acc) / .95), rgb(var(--acc) / .7))', color: '#fff', fontSize: 14.5, fontWeight: 500, cursor: 'pointer', boxShadow: '0 0 24px rgb(var(--acc) / .45)', opacity: k.saving ? .6 : 1 }}>{k.saving ? 'Comprobando…' : 'Activar voz'}</button>
        </div>
      </div>
    </div>
  )
}
