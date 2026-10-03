// Settings, split in tabs (left) so each page has few options, large text and a line that says
// what that page is for.
import { useEffect, useRef, useState, type ReactNode } from 'react'

const mono = "'JetBrains Mono',monospace"
const TEXT = 'rgba(241,234,248,.92)'
const NOTE = 'rgba(226,218,240,.6)'
const LINE = 'rgba(196,181,253,.16)'

const ICONS: Record<string, string> = {
  features: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  ai: 'M12 3l1.8 4.6L18.5 9l-4.7 1.6L12 15l-1.8-4.4L5.5 9l4.7-1.4zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z',
  agent: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6zM9 12l2 2 4-4',
  voice: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  look: 'M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5 0-1.2-1-1.5-1-2.5s.8-2 2-2H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8zM7.5 11.5h.01M10 7.5h.01M15 7.5h.01',
  system: 'M3 5h18v11H3zM8 20h8M12 16v4',
  accounts: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  check: 'M20 6L9 17l-5-5',
}

const Icon = ({ d, size = 20 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)

/** A group of options with a small title. */
const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
    <span data-scramble="1" style={{ fontFamily: mono, fontSize: '12px', letterSpacing: '.2em', color: 'rgb(var(--acc2) / .7)' }}>{title}</span>
    {children}
  </section>
)

/** Name and explanation on the left, the control on the right. */
const Row = ({ label, note, children }: { label: string; note?: string; children?: ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '12px 0', borderBottom: `1px solid ${LINE}` }}>
    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
      <span style={{ fontSize: '16px', color: TEXT }}>{label}</span>
      {note && <span style={{ fontSize: '14px', lineHeight: 1.5, color: NOTE }}>{note}</span>}
    </div>
    {children}
  </div>
)

const Switch = ({ t }: { t: any }) => (
  <button onClick={t.toggle} role="switch" aria-checked={t.tOn} aria-label={t.label} style={{ flex: 'none', position: 'relative', width: '48px', height: '28px', borderRadius: '999px', border: `1px solid ${t.tBorder}`, background: t.tBg, cursor: 'pointer', padding: 0, transition: 'background 250ms, border-color 250ms' }}>
    <span style={{ position: 'absolute', top: '3px', left: t.tOn ? '23px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#FFF6E9', transition: 'left 320ms cubic-bezier(.34,1.3,.64,1)' }} />
  </button>
)

const Toggles = ({ list }: { list: any[] }) => <>{list.map(t => <Row key={t.label} label={t.label} note={t.note}><Switch t={t} /></Row>)}</>

/** Buttons side by side, one selected. */
const Segments = ({ opts }: { opts: any[] }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '4px', borderRadius: '12px', background: 'rgba(0,0,0,.3)', border: `1px solid ${LINE}` }}>
    {opts.map(o => (
      <button key={o.label} onClick={o.pick} style={{ flex: '1 0 auto', minWidth: '96px', height: '40px', padding: '0 14px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '15px', background: o.bg, color: o.color, transition: 'background 250ms, color 250ms' }}>{o.label}</button>
    ))}
  </div>
)

const field = { height: '46px', padding: '0 14px', borderRadius: '10px', background: 'rgba(0,0,0,.3)', border: `1px solid ${LINE}`, outline: 'none', color: '#FFF6E9', fontSize: '15px' } as const
const ghostBtn = { height: '40px', padding: '0 16px', borderRadius: '9px', border: '1px solid rgba(196,181,253,.25)', background: 'transparent', color: 'rgba(226,218,240,.85)', fontSize: '14.5px', cursor: 'pointer' } as const
const mainBtn = { height: '40px', padding: '0 18px', borderRadius: '9px', border: '1px solid rgb(var(--acc2) / .45)', background: 'rgb(var(--acc) / .4)', color: '#FFF6E9', fontSize: '14.5px', cursor: 'pointer' } as const
const Help = ({ children }: { children: ReactNode }) => <span style={{ fontSize: '14px', lineHeight: 1.55, color: NOTE }}>{children}</span>

/** A real drop-down: shows the chosen option; a click opens the list, picking one closes it
 *  (so do Esc and a click outside). `onOpen` refreshes the options (new microphones…). */
function Select({ value, options, onOpen, label }: { value: string; options: any[]; onOpen?: () => void; label: string }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const out = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) } }
    document.addEventListener('mousedown', out); document.addEventListener('keydown', key, true)
    return () => { document.removeEventListener('mousedown', out); document.removeEventListener('keydown', key, true) }
  }, [open])
  return (
    <div ref={box} style={{ position: 'relative', width: '100%' }}>
      <button onClick={() => { if (!open) onOpen?.(); setOpen(!open) }} aria-haspopup="listbox" aria-expanded={open} aria-label={label}
        style={{ ...field, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', cursor: 'pointer', width: '100%', borderColor: open ? 'rgb(var(--acc2) / .5)' : LINE }} className="dc52">
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        <span style={{ flex: 'none', display: 'grid', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}><Icon d="M6 9l6 6 6-6" size={16} /></span>
      </button>
      {open && (
        <div role="listbox" aria-label={label} style={{ position: 'absolute', zIndex: 30, left: 0, right: 0, top: 'calc(100% + 6px)', maxHeight: '280px', overflow: 'auto', padding: '6px', borderRadius: '12px', background: 'rgb(12 9 22 / .98)', border: '1px solid rgb(var(--acc2) / .35)', boxShadow: '0 18px 40px rgba(0,0,0,.55)', animation: 'nx-in 160ms both' }}>
          {options.length === 0 && <span style={{ display: 'block', padding: '10px 12px', fontSize: '14px', color: NOTE }}>No hay opciones</span>}
          {options.map(o => (
            <button key={o.label} role="option" aria-selected={o.on} onClick={() => { o.pick(); setOpen(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '15px', background: o.on ? 'rgb(var(--acc) / .22)' : 'transparent', color: o.on ? '#FFF6E9' : TEXT }} className="dc11">
              <span style={{ flex: 'none', width: '16px', color: 'rgb(var(--acc2))' }}>{o.on ? '✓' : ''}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AiTab({ v }: { v: any }) {
  return (
    <>
      <Group title="QUÉ IA PIENSA POR TI">
        <Segments opts={v.providerOpts} />
        <Help>{v.providerNote}</Help>
        {v.showModel && <Row label="Modelo" note="El modelo de este servicio que me responde"><div style={{ width: '320px' }}><Select label="Modelo" value={v.modelName} options={v.modelOptions} /></div></Row>}
      </Group>
      <Group title="CLAVE DE API">
        {v.keyTargets && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {v.keyTargets.map((o: any) => (
              <button key={o.label} onClick={o.pick} style={{ height: '36px', padding: '0 16px', borderRadius: '999px', cursor: 'pointer', fontSize: '14.5px', border: `1px solid ${o.on ? 'rgb(var(--acc2) / .6)' : 'rgba(196,181,253,.2)'}`, background: o.on ? 'rgb(var(--acc) / .28)' : 'rgba(255,255,255,.03)', color: TEXT }}>{o.label}</button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input type={v.keyType} value={v.keyInput} onChange={v.onKeyInput} onKeyDown={v.onKeyEnter} disabled={v.keyDisabled} placeholder={v.keyPlaceholder} spellCheck={false} aria-label="Clave de API" style={{ ...field, flex: '1', minWidth: 0, fontFamily: mono, fontSize: '14px' }} />
          <button onClick={v.toggleKey} style={ghostBtn}>{v.keyBtn}</button>
          <button onClick={v.saveKey} style={mainBtn}>Guardar</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: mono, fontSize: '12px', letterSpacing: '.15em', color: v.keyColor }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: v.keyColor, boxShadow: `0 0 8px ${v.keyColor}` }} />
          {v.keyStatus}
        </div>
        <Help>{v.keyHelp}</Help>
      </Group>
      {v.quota.length > 0 && (
        <Group title="CUPO GRATIS DE HOY">
          {v.quota.map((q: any) => (
            <div key={q.label} style={{ display: 'grid', gridTemplateColumns: '200px minmax(0,1fr) 110px', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '15px', color: TEXT }}>{q.label}</span>
              <span style={{ height: '6px', borderRadius: '3px', background: 'rgba(196,181,253,.12)', overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', width: q.w + '%', background: q.color, borderRadius: '3px' }} />
              </span>
              <span style={{ fontFamily: mono, fontSize: '13px', color: NOTE, textAlign: 'right' }}>{q.text}</span>
            </div>
          ))}
          <Help>Las órdenes sencillas (música, volumen, abrir apps, alarmas, la hora) no gastan cupo.</Help>
        </Group>
      )}
      {v.geminiToggles.length > 0 && (
        <Group title="PARA QUÉ SE USA GEMINI">
          <Help>{v.geminiNote}</Help>
          <Toggles list={v.geminiToggles} />
        </Group>
      )}
    </>
  )
}

/** Settings → Funciones: every feature as a card; a click opens what it does, how to ask for it and its switch. */
/** "Enséñame tu frase": the phrase said three times, so the wake word works with this voice and mic. */
function WakeTraining({ v }: { v: any }) {
  const t = v.wakeTrain
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 18px', borderRadius: '14px', border: `1px solid ${LINE}`, background: 'rgba(255,255,255,.025)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '16px', color: TEXT }}>Enséñame tu frase {v.wakeTrained && !t && <span style={{ fontSize: '13px', color: '#34D399' }}>· ✓ entrenada</span>}</span>
          <span style={{ fontSize: '14px', lineHeight: 1.5, color: NOTE }}>Pulsa grabar y di «{v.wakePhrase}» con tu voz normal, tres veces. Así aprendo cómo te oigo por tu micrófono y te reconozco mucho mejor.</span>
        </div>
        <button onClick={v.trainWake} disabled={t?.busy} style={{ ...mainBtn, flex: 'none', minWidth: '190px', opacity: t?.busy ? .75 : 1, background: t?.recording ? 'rgba(251,113,133,.35)' : mainBtn.background }}>
          {t ? t.label : v.wakeTrained ? 'Volver a entrenar' : 'Grabar (1 de 3)'}
        </button>
      </div>
      {t && t.heard.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {t.heard.map((h: string, i: number) => (
            <span key={i} style={{ fontSize: '14px', color: h ? TEXT : '#FDA4AF' }}>{i + 1}. {h ? <>He oído «{h}»</> : 'No he oído nada: acércate al micrófono o revisa cuál está elegido'}</span>
          ))}
        </div>
      )}
      {t?.done && <span style={{ fontSize: '14px', color: t.ok ? '#34D399' : '#FDA4AF' }}>{t.ok ? '✓ Listo: la escucha está activada con tu voz. Prueba a decir la frase.' : 'No he podido aprenderla. Revisa el micrófono y vuelve a probar.'}</span>}
      {t?.error && <span style={{ fontSize: '14px', color: '#FDA4AF' }}>{t.error}</span>}
      {v.wakeHeard && <span style={{ fontSize: '13.5px', color: NOTE }}>Ahora mismo oigo: <span style={{ color: TEXT }}>«{v.wakeHeard}»</span></span>}
    </div>
  )
}

function FeaturesTab({ v }: { v: any }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ ...field, flex: '1', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon d="M10 4a6 6 0 1 0 0 12a6 6 0 1 0 0-12M20 20l-5.5-5.5" size={18} />
          <input value={v.featQuery} onChange={v.onFeatQuery} placeholder="Buscar una función… (música, archivos, alarma)" aria-label="Buscar una función" spellCheck={false}
            style={{ flex: '1', minWidth: 0, background: 'none', border: 'none', outline: 'none', color: '#FFF6E9', fontSize: '15px' }} />
        </div>
        <span style={{ flex: 'none', fontFamily: mono, fontSize: '12px', letterSpacing: '.15em', color: 'rgb(var(--acc2) / .75)' }}>{v.featOn} DE {v.featTotal} ACTIVAS</span>
      </div>
      {!v.featGroups.length && <Help>No hay ninguna función con ese nombre. Prueba con otra palabra.</Help>}
      {v.featGroups.map((g: any) => (
        <Group key={g.name} title={g.name.toUpperCase()}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '10px' }}>
            {g.items.map((f: any) => (
              <div key={f.id} ref={el => { if (f.open && el) setTimeout(() => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60) }} style={{ gridColumn: f.open ? '1 / -1' : 'auto', borderRadius: '14px', border: `1px solid ${f.open ? 'rgb(var(--acc2) / .45)' : LINE}`, background: f.open ? 'rgb(var(--acc) / .1)' : 'rgba(255,255,255,.025)', transition: 'border-color 200ms, background 200ms', opacity: f.on ? 1 : .62 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px' }}>
                  <button onClick={f.select} aria-expanded={f.open} style={{ flex: '1', minWidth: 0, display: 'flex', alignItems: 'center', gap: '14px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', color: 'inherit' }}>
                    <span style={{ flex: 'none', width: '42px', height: '42px', borderRadius: '12px', display: 'grid', placeItems: 'center', background: f.on ? 'rgb(var(--acc) / .2)' : 'rgba(255,255,255,.05)', color: f.on ? 'rgb(var(--acc2))' : 'rgba(226,218,240,.5)' }}>
                      <Icon d={f.icon} size={21} />
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                      <span style={{ fontSize: '16px', color: TEXT }}>{f.name}</span>
                      <span style={{ fontSize: '13.5px', lineHeight: 1.4, color: NOTE }}>{f.short}</span>
                    </span>
                  </button>
                  {f.always
                    ? <span title="Siempre activa" style={{ flex: 'none', fontFamily: mono, fontSize: '10.5px', letterSpacing: '.15em', color: 'rgba(226,218,240,.45)' }}>SIEMPRE</span>
                    : <Switch t={f} />}
                </div>
                {f.open && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '0 18px 18px 72px', animation: 'nx-in 300ms both' }}>
                    <span style={{ fontSize: '15px', lineHeight: 1.6, color: 'rgba(241,234,248,.86)' }}>{f.long}</span>
                    {f.examples.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontFamily: mono, fontSize: '11.5px', letterSpacing: '.18em', color: 'rgb(var(--acc2) / .7)' }}>PRUEBA A DECIR</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {f.examples.map((x: string) => <span key={x} style={{ padding: '7px 12px', borderRadius: '999px', background: 'rgba(0,0,0,.3)', border: `1px solid ${LINE}`, fontSize: '14px', color: '#FFF6E9' }}>«{x}»</span>)}
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13.5px', color: f.on ? '#34D399' : '#F5B971' }}>{f.always ? '● Siempre activa' : f.on ? '● Activada' : '● Desactivada: no la uso aunque me la pidas'}</span>
                      {f.more && <button onClick={f.more.go} style={{ ...ghostBtn, height: '34px', fontSize: '13.5px' }}>Más opciones en {f.more.label} →</button>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Group>
      ))}
    </>
  )
}

function AccountsTab({ v }: { v: any }) {
  return (
    <>
      <Group title="CALENDARIO · GOOGLE, OUTLOOK O ICLOUD">
        {v.calConnected ? (
          <Row label={'● ' + v.calStatus}><button onClick={v.calRemove} style={ghostBtn}>Quitar</button></Row>
        ) : (
          <>
            <Help>Google Calendar (web) → Configuración → tu calendario → «Dirección secreta en formato iCal». Cópiala y pégala aquí. NEXUS solo la lee y la guarda cifrada.</Help>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="password" value={v.calInput} onChange={v.onCalInput} aria-label="Dirección del calendario" placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" style={{ ...field, flex: '1', minWidth: 0, fontSize: '14px' }} />
              <button onClick={v.calSave} disabled={v.calBusy} style={{ ...mainBtn, height: '46px', opacity: v.calBusy ? .6 : 1 }}>{v.calBusy ? 'Probando…' : 'Conectar'}</button>
            </div>
            {v.calError && <span style={{ fontSize: '14px', color: '#FB7185' }}>{v.calError}</span>}
          </>
        )}
      </Group>
      <Group title="SPOTIFY · TUS LISTAS POR NOMBRE">
        {v.spotifyConnected ? (
          <Row label="● Conectado" note={'Cuenta de ' + v.spotifyUser}><button onClick={v.spotifyDisconnect} style={ghostBtn}>Desconectar</button></Row>
        ) : (
          <>
            <Help>
              Para que NEXUS ponga tus listas por su nombre («pon mi lista Gym»). Lo que suena lo ve igualmente sin conectar nada.<br /><br />
              1 · Crea una app gratis en <a onClick={v.openSpotifyDev} style={{ color: 'rgb(var(--acc2))', cursor: 'pointer' }}>developer.spotify.com</a> (marca Web API) con esta Redirect URI: <code style={{ color: '#FFF6E9' }}>{v.spotifyRedirect}</code><br />
              2 · Pega aquí su Client ID y pulsa Conectar.
            </Help>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input value={v.spotifyIdInput} onChange={v.onSpotifyId} aria-label="Client ID de Spotify" placeholder="Client ID (32 caracteres)" style={{ ...field, flex: '1', minWidth: 0, fontFamily: mono, fontSize: '14px' }} />
              <button onClick={v.spotifyConnect} disabled={v.spotifyBusy} style={{ ...mainBtn, height: '46px', border: '1px solid rgba(255,255,255,.18)', background: 'linear-gradient(180deg, #1DB954, #158a3e)', opacity: v.spotifyBusy ? .6 : 1 }}>{v.spotifyBusy ? 'Esperando…' : 'Conectar'}</button>
            </div>
            {v.spotifyError && <span style={{ fontSize: '14px', color: '#FB7185' }}>{v.spotifyError}</span>}
          </>
        )}
      </Group>
    </>
  )
}

function Tab({ v }: { v: any }) {
  const t = v.toggles
  switch (v.settingsTab) {
    case 'features': return <FeaturesTab v={v} />
    case 'ai': return <AiTab v={v} />
    case 'agent': return <Group title="LO QUE PUEDE HACER EN TU PC"><Toggles list={v.agentToggles} /></Group>
    case 'voice': return (
      <>
        <Group title="MI VOZ">
          <Row label={v.voiceNow} note="Voz, personalidad, velocidad, tono y la frase con la que me despiertas">
            <button onClick={v.openVoice} style={mainBtn}>Cambiar voz</button>
          </Row>
        </Group>
        <Group title="MICRÓFONO">
          <Select label="Micrófono" value={v.micName} options={v.micOptions} onOpen={v.refreshMics} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: NOTE }}>Nivel</span>
            <div style={{ flex: '1', height: '6px', borderRadius: '4px', background: 'rgba(196,181,253,.1)', overflow: 'hidden' }}>
              <div data-nexus-meter="1" style={{ height: '100%', width: '100%', transformOrigin: '0 50%', transform: 'scaleX(0)', background: 'linear-gradient(90deg,#34D399,rgb(var(--acc2)))' }} />
            </div>
          </div>
          <Help>Habla: si la barra se mueve, te oigo bien. Si no es este micrófono, elige otro en la lista.</Help>
        </Group>
        <Group title="ESCUCHA Y ATAJOS">
          <Toggles list={[t.wake]} />
          <WakeTraining v={v} />
          {[
            ['Hablar con NEXUS', 'Desde cualquier aplicación, aunque NEXUS esté detrás', v.hotkeyKeys],
            ['Preguntar por escrito', 'Una barra pequeña encima de lo que estés haciendo', ['CTRL', 'ALT', 'A'], v.tryBar],
            ['Con el texto seleccionado', 'Resumir, traducir, corregir, explicar o responder lo que tengas seleccionado en cualquier app', ['CTRL', 'ALT', 'S']],
            ['Dictar', 'Hablas y se escribe donde esté el cursor', ['CTRL', 'ALT', 'D']],
          ].map(([label, note, keys, test]: any) => (
            <Row key={label} label={label} note={note}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {test && <button onClick={test} style={{ ...ghostBtn, height: '32px', padding: '0 12px', fontSize: '13px', marginRight: '6px' }}>Probar</button>}
                {keys.map((k: string) => <span key={k} style={{ padding: '6px 11px', borderRadius: '7px', border: '1px solid rgba(196,181,253,.3)', borderBottomWidth: '2px', fontFamily: mono, fontSize: '13px', color: '#FFF6E9' }}>{k.toUpperCase()}</span>)}
              </div>
            </Row>
          ))}
        </Group>
      </>
    )
    case 'look': return (
      <>
        <Group title="TEMA DE COLOR">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px' }}>
            {v.themeCards.map((c: any) => (
              <button key={c.name} onClick={c.pick} aria-pressed={c.on} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '18px 6px', borderRadius: '14px', cursor: 'pointer', background: c.bg, border: `1px solid ${c.border}`, color: '#F1EAF8', transition: 'transform 300ms cubic-bezier(.34,1.2,.64,1), border-color 300ms' }} className="dc53">
                <span style={{ width: '48px', height: '48px', borderRadius: '50%', background: `radial-gradient(circle at 50% 50%, #FFF6E9 0 12%, ${c.c2} 24%, ${c.c1} 48%, #05030A 72%)`, boxShadow: `0 0 0 1.5px ${c.c2}, 0 0 18px ${c.c1}` }} />
                <span style={{ fontSize: '15px' }}>{c.name}</span>
              </button>
            ))}
          </div>
        </Group>
        <Group title="CALIDAD GRÁFICA">
          <Segments opts={v.qualityOpts} />
          <Help>{v.qualityHelp}</Help>
        </Group>
        <Group title="LECTURA Y MOVIMIENTO"><Toggles list={[t.subtitles, t.reduced]} /></Group>
      </>
    )
    case 'system': return (
      <>
        <Group title="AL ENCENDER"><Toggles list={[t.autostart, t.briefing]} /></Group>
        <Group title="AVISOS">
          <Toggles list={[t.proactive, t.evening]} />
          {v.showEveningTime && <Row label="Hora del resumen de la noche"><div style={{ width: '540px' }}><Segments opts={v.eveningTimes} /></div></Row>}
        </Group>
        <Group title="FONDO DE ESCRITORIO"><Toggles list={[t.wallpaper]} />
          <Row label="En qué pantallas" note="Con varias, las secundarias muestran la misma galaxia sin el núcleo, estén donde estén (izquierda, derecha, arriba o abajo)">
            <div style={{ width: '360px' }}><Segments opts={v.wallScreens} /></div>
          </Row>
          <Toggles list={[t.wallDock, t.wallClicks, t.bgMotion]} /></Group>
      </>
    )
    case 'accounts': return <AccountsTab v={v} />
    case 'check': return (
      <Group title="AUTODIAGNÓSTICO">
        <Help>Revisa internet, tus claves, las voces, el micrófono, que te entienda, la búsqueda, las noticias, el tiempo, el calendario, Spotify, el cupo y el disco. No cambia nada; si algo falla te dice cómo arreglarlo.</Help>
        <button onClick={v.runDiagnostics} disabled={v.diagRunning} style={{ ...mainBtn, height: '52px', fontSize: '16px', opacity: v.diagRunning ? .6 : 1 }}>{v.diagRunning ? 'Comprobando… (unos segundos)' : 'Comprobar que todo funciona'}</button>
      </Group>
    )
    default: return null
  }
}

export default function SettingsPanel({ v }: { v: any }) {
  if (!v.isSettings) return null
  const tab = v.settingsTabs.find((x: any) => x.id === v.settingsTab) || v.settingsTabs[0]
  return (
    <div role="dialog" aria-label="Ajustes" style={{ position: 'absolute', right: 'calc(24px - var(--ex))', top: '24px', bottom: '112px', width: 'min(1180px, calc(100% - 48px))', display: 'flex', flexDirection: 'column', background: 'linear-gradient(rgba(7,5,14,.62),rgba(7,5,14,.62)) padding-box, linear-gradient(155deg, rgb(var(--acc) / .55), rgb(var(--acc) / .06) 45%, rgb(var(--acc) / 0)) border-box', border: '1px solid transparent', borderRadius: '14px', backdropFilter: 'blur(24px) saturate(1.2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.07), 0 24px 70px rgba(0,0,0,.35)', animation: 'nx-right 600ms cubic-bezier(.16,1,.3,1) both' }} className="dc49 dc50">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '26px 32px 20px', borderBottom: `1px solid ${LINE}` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span data-scramble="1" style={{ fontFamily: mono, fontSize: '12px', letterSpacing: '.2em', color: 'rgb(var(--acc2) / .7)' }}>AJUSTES · NEXUS {v.version}</span>
          <span style={{ fontSize: '32px', fontWeight: 400 }}>Configuración</span>
        </div>
        <button onClick={v.closePanel} aria-label="Cerrar ajustes" style={{ width: '44px', height: '44px', borderRadius: '10px', border: '1px solid rgba(196,181,253,.14)', background: 'rgba(255,255,255,.02)', color: 'rgba(226,218,240,.7)', display: 'grid', placeItems: 'center', cursor: 'pointer' }} className="dc51">
          <Icon d="M6 6l12 12M18 6L6 18" size={18} />
        </button>
      </div>
      <div style={{ flex: '1', minHeight: 0, display: 'flex' }}>
        <nav role="tablist" aria-orientation="vertical" style={{ width: '270px', flex: 'none', display: 'flex', flexDirection: 'column', gap: '4px', padding: '18px 14px', borderRight: `1px solid ${LINE}`, overflow: 'auto' }}>
          {v.settingsTabs.map((x: any) => {
            const on = x.id === tab.id
            return (
              <button key={x.id} role="tab" aria-selected={on} onClick={x.pick} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', borderRadius: '11px', cursor: 'pointer', textAlign: 'left', border: `1px solid ${on ? 'rgb(var(--acc2) / .4)' : 'transparent'}`, background: on ? 'rgb(var(--acc) / .22)' : 'transparent', color: on ? '#FFF6E9' : 'rgba(226,218,240,.75)', transition: 'background 200ms, border-color 200ms' }} className="dc51">
                <span style={{ flex: 'none', color: on ? 'rgb(var(--acc2))' : 'rgba(196,181,253,.6)' }}><Icon d={ICONS[x.id]} /></span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontSize: '16px' }}>{x.label}</span>
                  <span style={{ fontSize: '12.5px', color: on ? 'rgba(241,234,248,.7)' : 'rgba(226,218,240,.45)' }}>{x.desc}</span>
                </span>
                {x.badge && <span style={{ marginLeft: 'auto', width: '8px', height: '8px', flex: 'none', borderRadius: '50%', background: '#F5B971', boxShadow: '0 0 8px #F5B971' }} title={x.badge} />}
              </button>
            )
          })}
        </nav>
        <div key={tab.id} role="tabpanel" style={{ flex: '1', minWidth: 0, overflow: 'auto', padding: '26px 40px 36px', animation: 'nx-in 350ms cubic-bezier(.16,1,.3,1) both' }}>
          <div style={{ maxWidth: '760px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '24px', color: '#FFF6E9' }}>{tab.label}</span>
              <span style={{ fontSize: '15px', lineHeight: 1.5, color: NOTE }}>{tab.intro}</span>
            </div>
            <Tab v={v} />
          </div>
        </div>
      </div>
    </div>
  )
}
