// Results of "Comprobar que todo funciona": one line per service, what failed and how to fix it.
const mono = "'JetBrains Mono',monospace"
const MARK: Record<string, [string, string]> = { ok: ['✓', '#34D399'], warn: ['!', '#F5B971'], fail: ['✕', '#FB7185'], off: ['–', 'rgba(226,218,240,.4)'] }

export default function DiagnosticsCard({ v }: { v: any }) {
  if (!v.diag) return null
  const groups: string[] = [...new Set<string>(v.diag.map((c: any) => c.group))]
  const bad = v.diag.filter((c: any) => c.status === 'fail').length, warn = v.diag.filter((c: any) => c.status === 'warn').length
  return (
    <div onClick={v.closeDiag} style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'grid', placeItems: 'center', background: 'rgba(3,2,8,.5)', animation: 'nx-in 300ms both' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 760, maxHeight: 820, display: 'flex', flexDirection: 'column', gap: 14, padding: '24px 28px', borderRadius: 16, background: 'linear-gradient(rgba(10,7,20,.9),rgba(10,7,20,.9)) padding-box, linear-gradient(155deg, rgb(var(--acc2) / .6), rgb(var(--acc) / .08) 55%) border-box', border: '1px solid transparent', backdropFilter: 'blur(24px)', boxShadow: '0 30px 90px rgba(0,0,0,.6)', animation: 'nx-up 450ms cubic-bezier(.16,1,.3,1) both' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: '.2em', color: 'rgb(var(--acc2) / .7)' }}>DIAGNÓSTICO · SIN CAMBIAR NADA</span>
            <span style={{ fontSize: 26, color: '#FFF6E9' }}>{bad ? `${bad} problema${bad > 1 ? 's' : ''}${warn ? ` y ${warn} aviso${warn > 1 ? 's' : ''}` : ''}` : warn ? `Todo funciona · ${warn} aviso${warn > 1 ? 's' : ''}` : 'Todo funciona'}</span>
          </div>
          <button onClick={v.closeDiag} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(196,181,253,.14)', background: 'transparent', color: 'rgba(226,218,240,.7)', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 6 }}>
          {groups.map(g => (
            <div key={g} style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6 }}>
              <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '.2em', color: 'rgb(var(--acc2) / .55)', margin: '4px 0' }}>{g.toUpperCase()}</span>
              {v.diag.filter((c: any) => c.group === g).map((c: any) => (
                <div key={c.name} style={{ display: 'grid', gridTemplateColumns: '26px 220px minmax(0,1fr)', gap: 10, alignItems: 'baseline', padding: '6px 4px', borderBottom: '1px solid rgba(196,181,253,.06)' }}>
                  <span style={{ fontFamily: mono, fontSize: 14, color: MARK[c.status][1], textAlign: 'center' }}>{MARK[c.status][0]}</span>
                  <span style={{ fontSize: 14.5, color: '#FFF6E9' }}>{c.name}</span>
                  <span style={{ fontSize: 13, lineHeight: 1.45, color: c.status === 'fail' ? '#FDA4AF' : c.status === 'warn' ? '#F5D0A0' : 'rgba(226,218,240,.6)' }}>{c.detail}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
