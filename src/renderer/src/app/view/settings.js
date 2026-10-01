// Settings panel: AI service and keys, agent permissions, Gemini switches, system and look.
import { THEMES, providerInfo } from '../constants';
import { api, seg, toggleT } from '../util';

const QUALITY = [['ultra', 'Ultra'], ['equilibrado', 'Equilibrado'], ['ahorro', 'Ahorro']];
const QUALITY_NOTE = { ultra: '2 600 PARTÍCULAS · 60 FPS', equilibrado: '1 500 PARTÍCULAS · 60 FPS', ahorro: '700 PARTÍCULAS · SIN GRANO' };

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
  return {
    // AI service and its key
    providerOpts: ['Auto', ...Object.keys(S.providers)].map(p => ({ label: p, ...seg(S.provider === p), pick: () => app.pickProvider(p) })),
    cycleModel: () => app.cycleModel(),
    keyInput: S.keyInput, keyType: S.showKey ? 'text' : 'password', keyDisabled: !prov.needsKey,
    keyPlaceholder: !prov.needsKey ? 'No necesaria · Ollama en http://localhost:11434' : prov.hasKey ? '•••••••••••• guardada · pegue otra para cambiarla' : 'Pegue aquí su clave de ' + kp,
    keyStatus: !prov.needsKey ? 'LOCAL' : prov.hasKey ? 'GUARDADA' : 'FALTA', keyColor: !prov.needsKey || prov.hasKey ? '#34D399' : '#F5B971',
    keyHelp: providerInfo(S.provider === 'Auto' ? kp : S.provider).help,
    keyTargets: S.provider === 'Auto' ? ['Cerebras', 'Groq', 'Gemini'].map(p => ({ label: ((S.providers[p] || {}).hasKey ? '✓ ' : '') + p, on: kp === p, pick: () => app.setState({ keyTarget: p, keyInput: '' }) })) : null,
    onKeyInput: e => app.setState({ keyInput: e.target.value }), onKeyEnter: e => { if (e.key === 'Enter') app.saveKey(); }, saveKey: () => app.saveKey(),
    keyBtn: S.showKey ? 'Ocultar' : 'Mostrar', toggleKey: () => app.setState(s => ({ showKey: !s.showKey })),

    // what the agent may do, and what the Gemini key is used for
    agentToggles: AGENT_TOGGLES.map(([k, key, label, note]) => ({ label, note, ...toggleT(!!(S.agent || {})[k]), toggle: () => app.setAgent(k, key) })),
    geminiToggles: (S.providers.Gemini || {}).hasKey ? GEMINI_TOGGLES.map(([k, label, note]) => ({ label, note, ...toggleT(!!(S.gemini || {})[k]), toggle: () => app.setGemini(k, !(S.gemini || {})[k]) })) : [],
    geminiNote: S.provider === 'Gemini' ? 'Gemini es ahora su IA principal: cada pregunta usa su cupo.' : 'Su IA principal es ' + S.provider + '. Gemini solo se usa para lo que active aquí.',

    // system
    sysToggles: [
      { label: 'Fondo de escritorio', note: 'Nexus se pone detrás de sus iconos · hable con ' + hotkey + ' y vuelva desde la bandeja', on: false, toggle: () => api && api.setMode('wallpaper') },
      { label: 'Iniciar con Windows', note: 'Se abre sola al encender el PC', on: S.autostart, toggle: () => app.setAutostart(!S.autostart) },
      { label: `Escuchar «${S.wakeWord}» siempre`, note: 'Próximamente · de momento use el micro o ' + hotkey, on: false, toggle: () => {} },
      { label: 'Resumen al encender', note: 'La primera vez que me abres cada día: tiempo, recordatorios y noticias', on: !!S.briefing, toggle: () => app.flip('briefing') },
      { label: 'Subtítulos', note: 'Muestra bajo el núcleo lo que dice Nexus', on: !!S.subtitles, toggle: () => app.flip('subtitles') },
      { label: 'Reducir movimiento', note: 'Sin parallax, estelas ni partículas extra', on: S.reduced, toggle: () => app.setReduced(!S.reduced) },
    ].map(t => ({ ...t, ...toggleT(t.on) })),
    micName: app.micLabel(), cycleMic: () => app.cycleMic(),

    // Spotify account
    spotifyConnected: !!(S.spotify && S.spotify.connected), spotifyUser: (S.spotify && S.spotify.user) || '',
    spotifyRedirect: (S.spotify && S.spotify.redirect) || 'http://127.0.0.1:8737/callback',
    spotifyIdInput: S.spotifyIdInput ?? S.spotifyClientId ?? '', onSpotifyId: e => app.setState({ spotifyIdInput: e.target.value.trim() }),
    spotifyBusy: !!S.spotifyBusy, spotifyError: S.spotifyError || '',
    spotifyConnect: () => app.connectSpotify(), spotifyDisconnect: () => app.disconnectSpotify(),
    openSpotifyDev: () => window.open('https://developer.spotify.com/dashboard'),

    // look
    themeCards: Object.entries(THEMES).map(([id, t]) => ({ name: t.name, c1: t.c1, c2: t.c2, bg: S.theme === id ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.02)', border: S.theme === id ? t.c2 : 'rgba(196,181,253,.1)', pick: () => app.setTheme(id) })),
    qualityOpts: QUALITY.map(([id, label]) => ({ label, ...seg(S.quality === id), pick: () => app.setQuality(id) })), qualityNote: QUALITY_NOTE[S.quality],
    qualityChips: QUALITY.map(([id, label]) => ({ label, on: S.quality === id, pick: () => app.setQuality(id) })),
  };
}
