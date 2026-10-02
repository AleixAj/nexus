// Settings panel: AI service and keys, agent permissions, Gemini switches, system and look.
import { KEY_ORDER, THEMES, providerInfo } from '../constants';
import { api, seg, toggleT } from '../util';

const QUALITY = [['ultra', 'Ultra'], ['equilibrado', 'Equilibrado'], ['ahorro', 'Ahorro']];
const QUALITY_NOTE = { ultra: '2 600 PARTÍCULAS · 60 FPS', equilibrado: '1 500 PARTÍCULAS · 60 FPS', ahorro: '700 PARTÍCULAS · SIN GRANO' };
const QUALITY_HELP = {
  ultra: 'Ultra: la galaxia completa (2.600 partículas). Para PCs con tarjeta gráfica.',
  equilibrado: 'Equilibrado: 1.500 partículas. Va bien en casi cualquier PC.',
  ahorro: 'Ahorro: 700 partículas y sin efectos de grano. Para portátiles o PCs justos.',
};

// the pages of Settings: name, what it holds (menu) and what it is for (top of the page)
const TABS = [
  ['ai', 'Inteligencia', 'IA, claves y cupo', 'Qué IA responde, tus claves y cuánto cupo gratis queda hoy.'],
  ['agent', 'Permisos', 'Qué puede hacer en tu PC', 'Lo que NEXUS puede hacer por su cuenta. Lo que cambia algo en tu PC siempre te pide permiso antes.'],
  ['voice', 'Audio', 'Micrófono y escucha', 'Con qué micrófono te oigo y cómo me llamas.'],
  ['look', 'Apariencia', 'Tema, calidad y movimiento', 'Colores, calidad de la galaxia y opciones para leer mejor.'],
  ['system', 'Sistema', 'Inicio y fondo de escritorio', 'Cómo arranca NEXUS y cómo se comporta en segundo plano.'],
  ['accounts', 'Cuentas', 'Calendario y Spotify', 'Servicios que puedes conectar. Todo es opcional y se guarda cifrado en tu PC.'],
  ['check', 'Diagnóstico', 'Comprobar que todo va bien', 'Si algo no funciona, empieza por aquí.'],
];

const GEMINI_TOGGLES = [
  ['tts', 'Voces premium', 'Aura, Zenit, Draco y Selene'],
  ['search', 'Buscar con Google', 'Si está apagado busco con DuckDuckGo, sin límite'],
  ['stt', 'Entender mi voz', 'Si está apagado uso Groq para transcribir'],
  ['vision', 'Ver pantalla e imágenes', 'Solo cuando me lo pidas o me pases una imagen'],
  ['memory', 'Memoria por significado', 'Encuentro conversaciones pasadas aunque uses otras palabras'],
  ['fallback', 'Respaldo', 'Si otra IA agota su cupo, sigo con Gemini'],
];
const AGENT_TOGGLES = [
  ['web', 'agentWeb', 'Buscar en internet', 'Actualidad, precios, noticias y cualquier dato reciente'],
  ['files', 'agentFiles', 'Ver mis archivos', 'Buscar, leer y analizar archivos y carpetas'],
  ['write', 'agentWrite', 'Modificar archivos', 'Crear, editar, mover o enviar a la papelera · pide permiso'],
  ['shell', 'agentShell', 'Ejecutar comandos', 'PowerShell para tareas avanzadas · pide permiso'],
];

export function settingsView(app, c) {
  const { S, kp } = c;
  const prov = S.providers[kp] || {};
  const hotkey = app.hotkeyLabel().toLowerCase();
  const hasAnyKey = Object.values(S.providers || {}).some(p => p.needsKey && p.hasKey);
  const tab = S.settingsTab || 'ai';
  return {
    // the tabs
    settingsTab: tab, version: '2.4.0',
    settingsTabs: TABS.map(([id, label, desc, intro]) => ({ id, label, desc, intro, badge: id === 'ai' && !hasAnyKey ? 'Falta una clave' : '', pick: () => app.setSettingsTab(id) })),

    // AI service and its key
    providerOpts: ['Auto', ...Object.keys(S.providers)].map(p => ({ label: p, ...seg(S.provider === p), pick: () => app.pickProvider(p) })),
    providerNote: providerInfo(S.provider).note, showModel: S.provider !== 'Auto',
    cycleModel: () => app.cycleModel(),
    keyInput: S.keyInput, keyType: S.showKey ? 'text' : 'password', keyDisabled: !prov.needsKey,
    keyPlaceholder: !prov.needsKey ? 'No necesaria · Ollama en http://localhost:11434' : prov.hasKey ? '•••••••••••• guardada · pega otra para cambiarla' : 'Pega aquí tu clave de ' + kp,
    keyStatus: !prov.needsKey ? 'LOCAL' : prov.hasKey ? 'GUARDADA' : 'FALTA', keyColor: !prov.needsKey || prov.hasKey ? '#34D399' : '#F5B971',
    keyHelp: providerInfo(S.provider === 'Auto' ? kp : S.provider).help,
    keyTargets: S.provider === 'Auto' ? KEY_ORDER.map(p => ({ label: ((S.providers[p] || {}).hasKey ? '✓ ' : '') + p, on: kp === p, pick: () => app.setState({ keyTarget: p, keyInput: '' }) })) : null,
    onKeyInput: e => app.setState({ keyInput: e.target.value }), onKeyEnter: e => { if (e.key === 'Enter') app.saveKey(); }, saveKey: () => app.saveKey(),
    // today's free quota, as NEXUS counts it
    quota: (S.quota || []).map(q => ({ label: q.label, text: q.used == null ? (q.requests ? q.requests + ' preguntas' : 'sin límite diario') : q.used >= 1 ? 'agotado' : Math.round(q.used * 100) + ' %', w: q.used == null ? 0 : Math.max(2, Math.round(q.used * 100)), color: q.used >= .85 ? '#FB7185' : q.used >= .6 ? '#F5B971' : 'rgb(var(--acc2))' })),
    keyBtn: S.showKey ? 'Ocultar' : 'Mostrar', toggleKey: () => app.setState(s => ({ showKey: !s.showKey })),

    // what the agent may do, and what the Gemini key is used for
    agentToggles: AGENT_TOGGLES.map(([k, key, label, note]) => ({ label, note, ...toggleT(!!(S.agent || {})[k]), toggle: () => app.setAgent(k, key) })),
    geminiToggles: (S.providers.Gemini || {}).hasKey ? GEMINI_TOGGLES.map(([k, label, note]) => ({ label, note, ...toggleT(!!(S.gemini || {})[k]), toggle: () => app.setGemini(k, !(S.gemini || {})[k]) })) : [],
    geminiNote: S.provider === 'Gemini' ? 'Gemini es ahora tu IA principal: cada pregunta usa su cupo.' : 'Tu IA principal es ' + S.provider + '. Gemini solo se usa para lo que actives aquí.',

    // system
    toggles: Object.fromEntries([
      { id: 'wallpaper', label: 'Fondo de escritorio', note: 'Nexus se pone detrás de tus iconos · háblale con ' + hotkey + ' y vuelve desde la bandeja', on: false, toggle: () => api && api.setMode('wallpaper') },
      { id: 'autostart', label: 'Iniciar con Windows', note: 'Se abre sola al encender el PC', on: S.autostart, toggle: () => app.setAutostart(!S.autostart) },
      { id: 'wake', label: `Escuchar «${S.wakeWord}» siempre`, note: S.wakeProgress != null ? `Descargando el modelo de voz… ${Math.round(S.wakeProgress * 100)} %` : 'Me despierto al oírlo. Se cambia en Voz y personalidad. Todo en tu PC: no se graba ni se envía nada', on: !!S.wakeListen, toggle: () => app.setWakeListen(!S.wakeListen) },
      { id: 'bgMotion', label: 'Fondo quieto mientras usas otras apps', note: 'En modo fondo de escritorio solo se anima cuando miras el escritorio o te hablo. Ahorra batería y CPU', on: (S.bgMotion || 'desktop') !== 'always', toggle: () => { const v = (S.bgMotion || 'desktop') === 'always' ? 'desktop' : 'always'; app.setState({ bgMotion: v }, () => app.updatePower()); app.save({ bgMotion: v }); } },
      { id: 'briefing', label: 'Resumen al encender', note: 'La primera vez que me abres cada día: tiempo, recordatorios y noticias', on: !!S.briefing, toggle: () => app.flip('briefing') },
      { id: 'subtitles', label: 'Subtítulos', note: 'Muestra bajo el núcleo lo que te digo, para leerlo además de oírlo', on: !!S.subtitles, toggle: () => app.flip('subtitles') },
      { id: 'reduced', label: 'Reducir movimiento', note: 'Sin parallax, estelas ni partículas extra. Mejor si el movimiento te marea', on: S.reduced, toggle: () => app.setReduced(!S.reduced) },
    ].map(t => [t.id, { ...t, ...toggleT(t.on) }])),
    hotkeyKeys: app.hotkeyLabel().split(' + '),
    micName: app.micLabel(), cycleMic: () => app.cycleMic(),

    // self-test
    runDiagnostics: () => app.runDiagnostics(), diagRunning: !!S.diagRunning, diag: S.diag, closeDiag: () => app.setState({ diag: null }),

    // calendar (secret iCal address)
    calConnected: !!S.calConnected, calInput: S.calInput || '', onCalInput: e => app.setState({ calInput: e.target.value }),
    calSave: () => app.saveCalendar(false), calRemove: () => app.saveCalendar(true), calBusy: !!S.calBusy, calError: S.calError || '',
    calStatus: S.calendar ? `Conectado · ${S.calendar.length} evento${S.calendar.length === 1 ? '' : 's'} hoy y mañana` : '',

    // Spotify account
    spotifyConnected: !!(S.spotify && S.spotify.connected), spotifyUser: (S.spotify && S.spotify.user) || '',
    spotifyRedirect: (S.spotify && S.spotify.redirect) || 'http://127.0.0.1:8737/callback',
    spotifyIdInput: S.spotifyIdInput ?? S.spotifyClientId ?? '', onSpotifyId: e => app.setState({ spotifyIdInput: e.target.value.trim() }),
    spotifyBusy: !!S.spotifyBusy, spotifyError: S.spotifyError || '',
    spotifyConnect: () => app.connectSpotify(), spotifyDisconnect: () => app.disconnectSpotify(),
    openSpotifyDev: () => window.open('https://developer.spotify.com/dashboard'),

    // look
    themeCards: Object.entries(THEMES).map(([id, t]) => ({ name: t.name, on: S.theme === id, c1: t.c1, c2: t.c2, bg: S.theme === id ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.02)', border: S.theme === id ? t.c2 : 'rgba(196,181,253,.1)', pick: () => app.setTheme(id) })),
    qualityOpts: QUALITY.map(([id, label]) => ({ label, ...seg(S.quality === id), pick: () => app.setQuality(id) })), qualityNote: QUALITY_NOTE[S.quality], qualityHelp: QUALITY_HELP[S.quality],
    qualityChips: QUALITY.map(([id, label]) => ({ label, on: S.quality === id, pick: () => app.setQuality(id) })),
  };
}
