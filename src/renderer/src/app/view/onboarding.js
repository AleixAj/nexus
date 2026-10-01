// First run (5 steps) and the start-up log of the cinematic intro.
import { providerInfo, voiceById } from '../constants';

const NAME_OPTIONS = ['señor', 'señora', 'jefe', 'jefa', 'capitán', 'comandante'];
const STEPS = 5;

// real checks shown in the start-up log
function introView(app, S) {
  const ok = '#34D399', warn = '#F5B971';
  const prov = S.providers[S.provider] || {};
  const hasKey = !prov.needsKey || prov.hasKey;
  const parts = { ultra: '2 600', equilibrado: '1 500', ahorro: '700' }[S.quality] || '2 600';
  const city = S.world && S.world.city;
  return {
    introLines: [
      { label: 'NÚCLEO GRÁFICO', detail: 'CANVAS 2D · ' + parts + ' PARTÍCULAS', status: 'OK', color: ok },
      { label: 'SÍNTESIS DE VOZ', detail: voiceById(S.voiceSel).name.toUpperCase() + ' · NEURAL · FX ' + S.sliders.fx + ' %', status: 'OK', color: ok },
      { label: 'ENLACE NEURONAL', detail: (S.provider + ' · ' + (S.model || '')).toUpperCase(), status: hasKey ? 'OK' : 'SIN CLAVE', color: hasKey ? ok : warn },
      { label: 'SENSOR ACÚSTICO', detail: S.mics == null ? 'MICRÓFONO' : S.mics ? 'MICRÓFONO · ' + S.mics + (S.mics > 1 ? ' DISPOSITIVOS' : ' DISPOSITIVO') : 'SIN MICRÓFONO', status: S.mics === 0 ? 'NO' : 'LISTO', color: S.mics === 0 ? warn : ok },
      { label: 'POSICIONAMIENTO', detail: city ? city.toUpperCase() : 'LOCALIZANDO…', status: city ? 'OK' : '···', color: city ? ok : warn },
    ],
    introStamp: new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' }).toUpperCase(),
    onIntroCollapse: () => app.onIntroCollapse(),
    onIntroDone: () => app.setState({ intro: false }),
  };
}

export function onboardingView(app, c) {
  const { S, kp } = c, step = S.onbStep || 0;
  const poke = () => { const E = app.E(); E && E.poke(); };
  return {
    intro: !!S.intro, ...(S.intro ? introView(app, S) : null),
    onbCard: S.onb && step > 0, onbStep: step, onbTotal: STEPS,
    onbDots: [1, 2, 3, 4, 5].map(i => ({ w: i === step ? '28px' : '10px', c: i <= step ? 'rgb(var(--acc2))' : 'rgba(196,181,253,.2)' })),
    onbBack: () => app.setState(s => ({ onbStep: Math.max(1, s.onbStep - 1) })), onbNext: () => app.onbNext(), onbNextLabel: step === STEPS ? 'Empezar' : 'Continuar',

    // 1 · name
    onNameOnb: e => { app.setName(e.target.value); poke(); },
    nameChips: NAME_OPTIONS.map(n => ({
      label: n, on: S.userName === n, bg: S.userName === n ? 'rgb(var(--acc) / .22)' : 'rgba(255,255,255,.03)', border: S.userName === n ? 'rgb(var(--acc2) / .5)' : 'rgba(196,181,253,.18)',
      pick: () => { app.setName(n); poke(); },
    })),
    formalOpts: [['usted', 85], ['tú', 20]].map(([label, val]) => ({
      label, on: label === 'usted' ? S.sliders.formal >= 50 : S.sliders.formal < 50,
      pick: () => { app.setState(s => ({ sliders: { ...s.sliders, formal: val } })); app.save({ formal: val }); },
    })),

    // 4 · AI key and microphone
    openGroq: () => window.open(providerInfo(kp).url),
    providerChips: ['Auto', 'Groq', 'Gemini', 'Ollama'].filter(p => S.providers[p]).map(p => ({ label: providerInfo(p).name, on: S.provider === p, pick: () => app.pickProvider(p) })),
    providerNote: providerInfo(S.provider).note, keyNeeded: !!(S.providers[kp] || {}).needsKey, keyTitle: 'Clave de ' + kp,
    askMic: () => app.askMic(), micTesting: !!S.micTesting,
    micOpts: (S.micList || []).map(m => ({ id: m.id, label: m.label, on: !!m.id && m.id === S.micId, pick: () => app.pickMic(m.id) })), micDefault: () => app.pickMic(''),
    micPermText: S.micTesting ? '● HABLE AHORA · EL NÚCLEO REACCIONA A SU VOZ' : S.micPerm === 'ok' ? '● FUNCIONA · LE OIGO BIEN' : S.micPerm === 'no' ? 'SIN ACCESO · REVISE LA PRIVACIDAD DE WINDOWS' : S.mics === 0 ? 'NO HAY NINGÚN MICRÓFONO CONECTADO' : 'ELÍJALO Y PULSE PROBAR',
    micPermColor: S.micPerm === 'ok' ? '#34D399' : S.micPerm === 'no' ? '#FB7185' : 'rgba(226,218,240,.45)',

    // 5 · how to keep Nexus
    hotkeyText: app.hotkeyLabel(),
    onbToggles: [
      { name: 'Iniciar con Windows', note: 'Me abro sola al encender el PC', on: S.autostart, onClick: () => app.setAutostart(!S.autostart) },
      { name: 'Fondo de escritorio', note: 'Me coloco detrás de sus iconos y me quedo en segundo plano', on: !!S.onbWallpaper, onClick: () => app.setState(s => ({ onbWallpaper: !s.onbWallpaper })) },
    ],
  };
}
