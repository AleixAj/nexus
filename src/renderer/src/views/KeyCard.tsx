// Asks for a free key right where it is needed (premium voices: Gemini or Azure).
const mono = "'JetBrains Mono',monospace"
const ease = 'cubic-bezier(.16,1,.3,1)'

const REGIONS = [
  ['westeurope', 'Oeste de Europa (Países Bajos)'],
  ['northeurope', 'Norte de Europa (Irlanda)'],
  ['francecentral', 'Centro de Francia'],
  ['spaincentral', 'Centro de España'],
  ['germanywestcentral', 'Centro-oeste de Alemania'],
  ['uksouth', 'Sur de Reino Unido'],
  ['eastus', 'Este de EE. UU.']
]

export default function KeyCard({ v }: { v: any }) {
  const k = v.keyAsk
  if (!k) return null
  const azure = k.engine === 'Azure'
  const b = { color: '#FFF6E9', fontWeight: 500 } as const
  return (
    <div onPointerDown={e => { if (e.target === e.currentTarget) v.keyAskCancel() }}
      style={{ position: 'absolute', inset: 0, zIndex: 45, display: 'grid', placeItems: 'center', background: 'rgba(3,2,8,.5)', animation: `nx-in 300ms ${ease} both` }}>
      <div style={{
        width: 660, display: 'flex', flexDirection: 'column', gap: 16, padding: '26px 30px 28px', boxSizing: 'border-box',
        background: 'linear-gradient(rgba(10,7,20,.88),rgba(10,7,20,.88)) padding-box, linear-gradient(155deg, rgb(var(--acc2) / .7), rgb(var(--acc) / .1) 50%, rgb(var(--acc) / .35)) border-box',
        border: '1px solid transparent', borderRadius: 16, backdropFilter: 'blur(24px)', boxShadow: '0 30px 90px rgba(0,0,0,.6), 0 0 60px rgb(var(--acc) / .18)',
        animation: `nx-up 500ms ${ease} both`
      }}>
        <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: '.22em', color: 'rgb(var(--acc2) / .75)' }}>{azure ? '◆' : '✦'} VOZ PREMIUM · {k.voiceName.toUpperCase()}</span>
        <span style={{ fontSize: 26, fontWeight: 400, color: '#FFF6E9' }}>{azure ? 'Activa las voces de Azure' : 'Activa las voces premium'}</span>
        {azure ? (
          <span style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(226,218,240,.65)' }}>
            Gratis hasta 500.000 caracteres al mes (unas 8 horas de voz). Al crear la cuenta de Azure te pedirán una tarjeta para verificar tu identidad, pero el plan gratuito no cobra.
            <br />1. Pulsa <b style={b}>Conseguir clave</b> y crea un recurso «Speech» con el plan <b style={b}>Free F0</b>.
            <br />2. En el recurso, abre <b style={b}>Claves y punto de conexión</b>: copia la <b style={b}>Clave 1</b> y elige aquí la misma <b style={b}>región</b>.
          </span>
        ) : (
          <span style={{ fontSize: 14.5, lineHeight: 1.55, color: 'rgba(226,218,240,.65)' }}>
            Las voces premium usan Gemini, de Google. Solo necesitas una clave gratuita (sin tarjeta):
            pulsa <b style={b}>Conseguir clave</b>, inicia sesión con tu cuenta de Google, pulsa «Create API key» y pégala aquí.
          </span>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="password" autoFocus value={v.keyAskInput} onChange={v.keyAskChange} onKeyDown={v.keyAskKey} placeholder={azure ? 'Clave 1 del recurso Speech' : 'Pega aquí tu clave de Gemini'} spellCheck={false}
            style={{ flex: 1, minWidth: 0, height: 46, padding: '0 16px', borderRadius: 10, background: 'rgba(0,0,0,.4)', border: '1px solid rgb(var(--acc2) / .3)', color: '#FFF6E9', fontFamily: mono, fontSize: 13, outline: 'none' }} />
          <button onClick={v.keyAskOpen} style={{ height: 46, padding: '0 16px', borderRadius: 10, border: '1px solid rgba(196,181,253,.2)', background: 'transparent', color: 'rgba(226,218,240,.85)', fontSize: 14, cursor: 'pointer' }}>Conseguir clave ↗</button>
        </div>
        {azure && (
          <select value={k.region} onChange={v.keyAskRegion}
            style={{ height: 44, padding: '0 12px', borderRadius: 10, background: 'rgba(0,0,0,.4)', border: '1px solid rgb(var(--acc2) / .3)', color: '#FFF6E9', fontSize: 14, outline: 'none' }}>
            {REGIONS.map(([id, label]) => <option key={id} value={id} style={{ background: '#0A0714' }}>{label} · {id}</option>)}
          </select>
        )}
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
