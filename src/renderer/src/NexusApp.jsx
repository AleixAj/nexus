import { Component, createRef } from 'react'
import Stage from './views/Stage'
import * as voice from './services/voice'
import * as sfx from './services/sfx'

const api = window.nexus
const params = new URLSearchParams(location.search)
// "wallpaper": the window lives behind the desktop icons and cannot be clicked
const WALLPAPER = params.get('mode') === 'wallpaper'
// the window was re-created by a mode switch: skip the spoken greeting
const QUIET = params.get('quiet') === '1'

export default class NexusApp extends Component {
  SL = {
    speed: { min: .5, max: 2, step: .05, label: 'Velocidad', fmt: v => v.toFixed(2).replace('.', ',') + '×' },
    pitch: { min: -12, max: 12, step: 1, label: 'Tono', fmt: v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + ' st' },
    warmth: { min: 0, max: 100, step: 1, label: 'Calidez', fmt: v => v + ' %' },
    formal: { min: 0, max: 100, step: 1, label: 'Formalidad', fmt: v => v + ' %' },
    volume: { min: 0, max: 100, step: 1, label: 'Volumen', fmt: v => v + ' %' },
    fx: { min: 0, max: 100, step: 1, label: 'Efecto IA', fmt: v => v + ' %' },
  };
  TH = {
    nexus: { name: 'Nexus', acc: '139 92 246', acc2: '196 181 253', c1: '#8B5CF6', c2: '#C4B5FD' },
    arc: { name: 'Arc', acc: '34 211 238', acc2: '165 243 252', c1: '#22D3EE', c2: '#A5F3FC' },
    mark3: { name: 'Mark III', acc: '239 68 68', acc2: '253 208 150', c1: '#EF4444', c2: '#FCD34D' },
    emerald: { name: 'Esmeralda', acc: '16 185 129', acc2: '167 243 208', c1: '#10B981', c2: '#A7F3D0' },
    solar: { name: 'Solar', acc: '249 115 22', acc2: '254 215 170', c1: '#F97316', c2: '#FED7AA' },
  };
  VOICES = [
    // fx: the AI processing preset applied on top of the neural voice (services/voice.ts)
    // Lyra/Vega/Kairo/Atlas: the most natural Microsoft voices (neutral accent).
    // Aura/Zenit: premium Gemini voices, the most human; they need the Gemini key.
    { id: 'lyra', name: 'Lyra', desc: 'Femenina · natural y cálida', fx: 'clean' },
    { id: 'orion', name: 'Orión', desc: 'Masculina · española · estilo Jarvis', fx: 'jarvis' },
    { id: 'vega', name: 'Vega', desc: 'Femenina · natural y alegre', fx: 'clean' },
    { id: 'kairo', name: 'Kairo', desc: 'Masculina · natural y cercana', fx: 'clean' },
    { id: 'nova', name: 'Nova', desc: 'Femenina · española · clara', fx: 'soft' },
    { id: 'atlas', name: 'Atlas', desc: 'Masculina · natural y joven', fx: 'clean' },
    { id: 'aura', name: 'Aura ✦', desc: 'Femenina · premium Gemini · la más humana', fx: 'clean', premium: true },
    { id: 'zenit', name: 'Zenit ✦', desc: 'Masculina · premium Gemini · profunda', fx: 'clean', premium: true },
  ];
  PERSONAS = [
    { id: 'butler', name: 'Mayordomo británico', line: '«Por supuesto, señor. Ya está hecho.»' },
    { id: 'direct', name: 'Copiloto directo', line: '«Hecho. Siguiente.»' },
    { id: 'sarcastic', name: 'Sarcástico', line: '«Claro. Abrir Spotify usted solo era demasiado.»' },
  ];
  ICON = {
    chat: 'M4 5h16v11H9l-5 4z',
    voice: 'M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4',
    routines: 'M6 4a2 2 0 1 0 0 4a2 2 0 1 0 0-4M18 16a2 2 0 1 0 0 4a2 2 0 1 0 0-4M8 6h5a3 3 0 0 1 0 6h-2a3 3 0 0 0 0 6h5',
    system: 'M7 6h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM10 10h4v4h-4zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4',
    music: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0a3 3 0 1 1 6 0M20 16a3 3 0 1 1-6 0a3 3 0 1 1 6 0',
    memory: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7v5l3 2',
    settings: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5a2 2 0 1 0 0 4a2 2 0 1 0 0-4M10 15a2 2 0 1 0 0 4a2 2 0 1 0 0-4',
    volume: 'M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
    trigger: 'M12 3l9 9-9 9-9-9z',
    app: 'M4 5h16v14H4zM4 9h16',
    audio: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0a3 3 0 1 1 6 0',
    bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4M4 4l16 16',
    speak: 'M4 5h16v11H9l-5 4zM8 10h8',
    light: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5V16h8v-2.5A6 6 0 0 0 12 3z',
    power: 'M12 3v9M6.3 6.3a8 8 0 1 0 11.4 0',
    save: 'M5 4h11l3 3v13H5zM8 4v5h8V4M8 20v-6h8v6',
  };
  ROUT = [
    { id: 'work', name: 'Modo trabajo', trigger: '«NEXUS, MODO TRABAJO»', steps: [
      ['trigger', 'DISPARADOR', 'Frase de voz', '«modo trabajo»'], ['app', 'ABRIR APLICACIÓN', 'VS Code', 'nexus-core'], ['audio', 'MÚSICA', 'Spotify', 'Enfoque profundo'], ['bell', 'SISTEMA', 'Silenciar notificaciones', '2 h'], ['speak', 'RESPUESTA', 'Decir «Todo listo»', 'voz Orión']] },
    { id: 'night', name: 'Buenas noches', trigger: '23:30 · CADA DÍA', steps: [
      ['trigger', 'DISPARADOR', 'Hora programada', '23:30'], ['save', 'ARCHIVOS', 'Guardar trabajo abierto', '4 apps'], ['light', 'HOGAR', 'Bajar luces', '10 % · Hue'], ['audio', 'MÚSICA', 'Pausar reproducción', 'Spotify'], ['power', 'SISTEMA', 'Apagar el equipo', 'en 10 min']] },
    { id: 'home', name: 'Llego a casa', trigger: 'AL CONECTAR A «CASA-5G»', steps: [
      ['trigger', 'DISPARADOR', 'Red Wi-Fi', 'CASA-5G'], ['light', 'HOGAR', 'Encender salón', '60 %'], ['speak', 'RESPUESTA', 'Resumen del día', '3 puntos'], ['audio', 'MÚSICA', 'Lista Relax', 'volumen 30 %']] },
    { id: 'pres', name: 'Presentación', trigger: 'AL ABRIR POWERPOINT', steps: [
      ['trigger', 'DISPARADOR', 'Aplicación abierta', 'PowerPoint'], ['bell', 'SISTEMA', 'No molestar', 'hasta cerrar'], ['app', 'ESCRITORIO', 'Ocultar iconos', 'pantalla 2'], ['audio', 'AUDIO', 'Volumen del sistema', '40 %']] },
  ];
  PERMS = [
    ['apps', 'Abrir y cerrar aplicaciones', 'Sin confirmación'], ['music', 'Música y volumen', 'Spotify, YouTube, mezclador'], ['files', 'Leer archivos', 'Solo Documentos y Escritorio'],
    ['home', 'Luces del hogar', 'Philips Hue · 6 luces'], ['power', 'Apagar y reiniciar', 'Pide confirmación por voz'], ['msg', 'Enviar mensajes y correos', 'Desactivado'], ['cam', 'Cámara', 'Desactivado'],
  ];
  LYR = ['Cruzo la noche sin hacer ruido', 'cada luz es una puerta abierta', 'giro en torno a lo que no se ve', 'y la gravedad me llama por mi nombre', '· · ·', 'Si caigo, que sea hacia ti', 'más allá del borde del tiempo', 'donde el silencio también brilla', 'horizonte de sucesos', 'no hay vuelta atrás', 'horizonte de sucesos', 'solo luz', '· · ·', 'Vuelvo a empezar desde el centro', 'como una estrella que no sabe apagarse', 'y en cada órbita te encuentro', 'horizonte de sucesos'];
  QUEUE = [
    { t: 'Órbita baja', a: 'Satélite Norte', d: '3:21', cover: 'linear-gradient(135deg,#38BDF8,#312E81)' },
    { t: 'Polvo de estrellas', a: 'Mira Vale', d: '4:02', cover: 'linear-gradient(135deg,#F472B6,#4C1D95)' },
    { t: 'Marea lunar', a: 'Kepler & Sons', d: '3:47', cover: 'linear-gradient(135deg,#FDE68A,#7C2D12)' },
    { t: 'Señal débil', a: 'Aurora Lineal', d: '5:10', cover: 'linear-gradient(135deg,#A78BFA,#0F172A)' },
  ];
  CMDS = [
    { cmd: '/rutina', desc: 'Ejecutar una rutina guardada' }, { cmd: '/abrir', desc: 'Abrir una aplicación' }, { cmd: '/recordar', desc: 'Guardar algo en memoria' },
    { cmd: '/sistema', desc: 'Estado del equipo' }, { cmd: '/musica', desc: 'Controlar la reproducción' }, { cmd: '/voz', desc: 'Cambiar de voz o personalidad' },
  ];

  OUTS = ['Altavoces (Realtek Audio)', 'Auriculares (Sony WH-1000XM5)', 'Monitor LG (HDMI)'];
  chatRef = createRef();
  ovRef = createRef();
  T = [];
  state = {
    k: .5, theme: (this.props && this.props.theme) || 'nexus', quality: (this.props && this.props.quality) || 'ultra', reduced: !!(this.props && this.props.reducedMotion),
    now: Date.now(), uiIn: false, core: 'idle', panel: null, overlay: false, onb: false, onbStep: 0, micPerm: null,
    words: [], wordsKind: null, actionLabel: '', error: false,
    notifs: [],
    music: false, musicPos: 72,
    chat: [],
    chatInput: '', voiceSel: 'lyra', preview: null, sliders: { speed: 1, pitch: 0, warmth: 70, formal: 85, volume: 64, fx: 35 }, lang: 'es-ES', wakeWord: 'Hey Nexus', persona: 'butler', userName: 'señor',
    routineSel: 'work', routineOn: { work: true, night: true, home: true, pres: false }, runStep: -1,
    perms: { apps: true, music: true, files: true, home: true, power: true, msg: false, cam: false },
    sys: { cpu: 34, gpu: 58, ram: 38, net: 48, disk: 61, temp: 61 }, cpuHist: Array.from({ length: 40 }, (_, i) => 30 + Math.sin(i / 3) * 8 + Math.random() * 6),
    memQuery: '', memFilter: 'Todo', learn: true,
    mem: [
      { id: 1, group: 'HOY', time: '21:12', cat: 'Conversaciones', title: 'Música para concentrarse', sum: 'Puso «Horizonte de sucesos» y silenció las notificaciones durante dos horas.' },
      { id: 2, group: 'HOY', time: '18:40', cat: 'Conversaciones', title: 'Preparar la revisión de diseño', sum: 'Resumió los comentarios de Laura sobre el halo y creó tres tareas.' },
      { id: 3, group: 'AYER', time: '22:05', cat: 'Conversaciones', title: 'Rutina «Buenas noches»', sum: 'Cambió la hora de apagado de las 00:00 a las 23:30.' },
      { id: 4, group: 'AYER', time: '10:15', cat: 'Lugares', title: 'Viaje a Lisboa', sum: 'Buscó vuelos del 14 al 17 de noviembre. Prefiere ventanilla.' },
      { id: 5, group: 'SEMANA PASADA', time: 'JUE', cat: 'Personas', title: 'Cumpleaños de Marta', sum: 'Recordatorio el 14 de noviembre e ideas de regalo: libros de fotografía.' },
      { id: 6, group: 'SEMANA PASADA', time: 'LUN', cat: 'Preferencias', title: 'Configuración inicial', sum: 'Eligió la voz Orión y el tratamiento «señor».' },
    ],
    facts: [
      { id: 1, cat: 'PREFERENCIAS', t: 'Toma el café solo y sin azúcar por la mañana.' },
      { id: 2, cat: 'PERSONAS', t: 'Su hermana Marta cumple años el 14 de noviembre.' },
      { id: 3, cat: 'TRABAJO', t: 'Trabaja en nexus-core con TypeScript y Three.js.' },
      { id: 4, cat: 'LUGARES', t: 'Vive en Madrid, en el barrio de Chamberí.' },
      { id: 5, cat: 'PREFERENCIAS', t: 'No quiere interrupciones entre las 9:00 y las 11:00.' },
    ],
    provider: 'Groq', model: 'openai/gpt-oss-120b', providers: {}, keyInput: '', showKey: false, autostart: false, alwaysListen: false, hotkey: 'Control+Alt+Space', micIdx: 0, outIdx: 0,
    dirOpen: true, showDirector: false, hoverDock: null, volOpen: false,
    ovInput: '', ovState: 'idle', ovLabel: 'NEXUS', ovReply: '',
  };

  E() { return window.NexusEngine; }
  later(fn, ms) { const id = setTimeout(fn, ms); this.T.push(id); return id; }
  clearFlow() { this.T.forEach(clearTimeout); this.T = []; clearInterval(this.wordIv); clearInterval(this.streamIv); clearInterval(this.runIv); }
  setCore(s) { this.setState({ core: s, error: s === 'error' }); const E = this.E(); E && E.setState(s); }
  greet() { const h = new Date().getHours(); return h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches'; }
  name() { return this.state.userName || 'señor'; }
  cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  componentDidMount() {
    this.onResize = () => this.setState({ k: Math.min(innerWidth / 1920, innerHeight / 1080) });
    this.onResize(); addEventListener('resize', this.onResize);
    this.iv = setInterval(() => this.tick(), 1000);
    this.onKey = e => {
      if (e.repeat) return;
      if (this.state.confirm) {
        if (e.key === 'Enter') { e.preventDefault(); this.answerConfirm(true); }
        else if (e.key === 'Escape') { e.preventDefault(); this.answerConfirm(false); }
        return;
      }
      const typing = e.target && e.target.closest && e.target.closest('input, textarea');
      if (e.key === 'Escape') {
        if (typing) { e.target.blur(); return; }
        if (this.state.overlay) this.toggleOverlay(); else if (this.state.panel) this.openPanel(null); else if (!this.state.onb) this.stopAll();
      }
      else if (e.altKey && (e.key === 'n' || e.key === 'N')) { e.preventDefault(); this.talk(); }
      else if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') { e.preventDefault(); this.setState(s => ({ showDirector: !s.showDirector })); }
    };
    addEventListener('keydown', this.onKey);
    this.offs = [];
    if (api) {
      this.offs.push(api.onHotkey(() => this.talk()));
      this.offs.push(api.onDelta((id, t) => this.onDelta(id, t)));
      this.offs.push(api.onAction((id, label) => this.onAction(id, label)));
      this.offs.push(api.onProgress((id, label) => { if (id === this.reqId) this.setState({ actionLabel: label.toUpperCase() }); }));
      this.offs.push(api.onConfirm((id, cid, req) => this.onConfirm(id, cid, req)));
      this.offs.push(api.onCovered(covered => { const E = this.E(); E && E.setPaused(covered); }));
    }
    const go = async () => {
      const E = this.E(); if (!E) return setTimeout(go, 50);
      const s = await this.loadSettings();
      if (s) { E.setTheme(s.theme); E.setQuality(s.quality); E.setReduced(s.reduced); voice.setVolume(s.volume); voice.setFxAmount(s.fx); voice.setVoiceFx(this.fxOf(s.voice)); voice.setMicDevice(s.micId || ''); }
      E.snapCore(this.layout());
      this.loadWorld();
      this.countMics();
      // cinematic intro on a real start; straight to the core after a mode switch
      this.onboarded = !s || s.onboarded;
      if (QUIET || this.state.reduced) this.firstScreen();
      else {
        this.setState({ intro: true });
        this.stopHum = sfx.bootHum([.88, 1.14, 1.4, 1.66, 1.92]);
      }
    };
    go();
    this.worldIv = setInterval(() => this.loadWorld(), 20 * 60e3);
  }
  async loadSettings() {
    if (!api) return null;
    let s;
    try { s = await api.getSettings(); } catch (e) { console.warn(e); return null; }
    this.setState(st => ({
      provider: s.provider, model: s.model, providers: s.providers, voiceSel: s.voice, userName: s.userName, persona: s.persona,
      theme: s.theme, quality: s.quality, reduced: s.reduced, autostart: !!s.autostart, hotkey: s.hotkey || st.hotkey,
      agent: { web: s.agentWeb, files: s.agentFiles, write: s.agentWrite, shell: s.agentShell }, micId: s.micId || '',
      lang: s.lang, sliders: { ...st.sliders, speed: s.speed, pitch: s.pitch, volume: s.volume, warmth: s.warmth, formal: s.formal, fx: s.fx },
    }));
    return s;
  }
  onIntroCollapse() {
    this.stopHum && this.stopHum();
    sfx.ignition(1);
    this.firstScreen();
  }
  firstScreen() { if (this.onboarded) this.bootDesktop(); else this.startOnboarding(); }
  fem() { return ['lyra', 'vega', 'nova', 'aura'].includes(this.state.voiceSel); }
  async countMics() {
    try {
      const list = await voice.listMics();
      this.setState({ mics: list.length, micList: list });
    } catch { this.setState({ mics: 0, micList: [] }); }
  }
  pickMic(id) {
    this.setState({ micId: id }); voice.setMicDevice(id); this.save({ micId: id });
  }
  cycleMic() {
    const list = this.state.micList || [];
    if (!list.length) return;
    const i = list.findIndex(m => m.id === this.state.micId);
    this.pickMic(list[(i + 1) % list.length].id);
  }
  micLabel() {
    const m = (this.state.micList || []).find(x => x.id === this.state.micId);
    return m ? m.label : 'Predeterminado de Windows';
  }
  // real system checks shown in the start-up log
  introVals() {
    const S = this.state, ok = '#34D399', warn = '#F5B971';
    const prov = S.providers[S.provider] || {};
    const hasKey = !prov.needsKey || prov.hasKey;
    const v = this.VOICES.find(x => x.id === S.voiceSel) || this.VOICES[0];
    const parts = { ultra: '2 600', equilibrado: '1 500', ahorro: '700' }[S.quality] || '2 600';
    const city = S.world && S.world.city;
    return {
      introLines: [
        { label: 'NÚCLEO GRÁFICO', detail: 'CANVAS 2D · ' + parts + ' PARTÍCULAS', status: 'OK', color: ok },
        { label: 'SÍNTESIS DE VOZ', detail: v.name.toUpperCase() + ' · NEURAL · FX ' + S.sliders.fx + ' %', status: 'OK', color: ok },
        { label: 'ENLACE NEURONAL', detail: (S.provider + ' · ' + (S.model || '')).toUpperCase(), status: hasKey ? 'OK' : 'SIN CLAVE', color: hasKey ? ok : warn },
        { label: 'SENSOR ACÚSTICO', detail: S.mics == null ? 'MICRÓFONO' : S.mics ? 'MICRÓFONO · ' + S.mics + (S.mics > 1 ? ' DISPOSITIVOS' : ' DISPOSITIVO') : 'SIN MICRÓFONO', status: S.mics === 0 ? 'NO' : 'LISTO', color: S.mics === 0 ? warn : ok },
        { label: 'POSICIONAMIENTO', detail: city ? city.toUpperCase() : 'LOCALIZANDO…', status: city ? 'OK' : '···', color: city ? ok : warn },
      ],
      introStamp: new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' }).toUpperCase(),
      onIntroCollapse: () => this.onIntroCollapse(),
      onIntroDone: () => this.setState({ intro: false }),
    };
  }
  async loadWorld() {
    if (!api) return;
    try { this.setState({ world: await api.getWorld() }); } catch { /* offline: keep the last data */ }
  }
  save(patch) { api && api.setSettings(patch); }
  // typing fields (name) are written once the user pauses
  saveLater(patch) { clearTimeout(this.saveT); this.saveT = setTimeout(() => this.save(patch), 500); }
  componentWillUnmount() { removeEventListener('resize', this.onResize); removeEventListener('keydown', this.onKey); clearInterval(this.iv); clearInterval(this.worldIv); this.clearFlow(); (this.offs || []).forEach(off => off()); voice.cancelListening(); voice.stopSpeech(); const E = this.E(); E && E.disableMic(); }
  componentDidUpdate(pp, ps) {
    const P = this.props || {};
    if (pp.theme !== P.theme && P.theme) this.setTheme(P.theme);
    if (pp.quality !== P.quality && P.quality) this.setQuality(P.quality);
    if (pp.reducedMotion !== P.reducedMotion) this.setReduced(!!P.reducedMotion);
    const E = this.E(); if (E) { E.setCore(this.layout()); E.setBgSlow(!!this.state.panel || this.state.overlay); }
    if (this.chatRef.current && (ps.chat !== this.state.chat || ps.panel !== this.state.panel)) this.chatRef.current.scrollTop = 1e6;
    if (this.state.overlay && !ps.overlay) setTimeout(() => this.ovRef.current && this.ovRef.current.focus(), 60);
  }
  layout() {
    const { panel, overlay, onb } = this.state;
    if (overlay) return { x: 960, y: 540, s: .5, v: 0 };
    if (onb) return { x: 960, y: 290, s: .58, v: 1 };
    switch (panel) {
      case 'chat': return { x: 652, y: 480, s: .8, v: 1 };
      case 'voice': case 'routines': case 'memory': case 'settings': return { x: 410, y: 440, s: .62, v: 1 };
      case 'system': return { x: 960, y: 520, s: .46, v: 1 };
      case 'music': return { x: 960, y: 470, s: .92, v: 1 };
      default: return { x: 960, y: 480, s: 1, v: 1 };
    }
  }
  async tick() {
    // CPU and RAM are real; GPU, network and temperature are still simulated
    if (this.ticking) return;
    this.ticking = true;
    let real = null;
    if (api && this.state.panel === 'system') { try { real = await api.systemStatus(); } catch { /* keep simulated */ } }
    this.ticking = false;
    const minute = Math.floor(Date.now() / 60000);
    if (!real && !this.state.music && this.state.panel !== 'system' && minute === this.lastMinute) return;
    this.lastMinute = minute;
    this.setState(s => {
      const w = (v, a, b, d) => Math.max(a, Math.min(b, Math.round(v + (Math.random() - .5) * d)));
      const sys = { cpu: real ? real.cpu : w(s.sys.cpu, 12, 88, 12), gpu: w(s.sys.gpu, 20, 95, 10), ram: real ? real.ram : w(s.sys.ram, 30, 60, 3), net: w(s.sys.net, 2, 240, 30), disk: s.sys.disk, temp: w(s.sys.temp, 48, 78, 3) };
      const out = { now: Date.now(), sys, cpuHist: [...s.cpuHist.slice(1), sys.cpu] };
      if (s.music) out.musicPos = s.musicPos >= 228 ? 0 : s.musicPos + 1;
      return out;
    });
  }

  // ---------- flows ----------
  bootDesktop() {
    this.clearFlow(); const E = this.E(); if (!E) return;
    this.setState({ uiIn: false, panel: null, overlay: false, onb: false, words: [], actionLabel: '' });
    E.setState('idle'); E.snapCore({ x: 960, y: 480, s: 1, v: 1 });
    E.boot({ onUI: () => this.setState({ uiIn: true }), onDone: () => {
      if (!QUIET) this.say(`${this.greet()}, ${this.name()}. Todos los sistemas operativos.`);
      if (params.get('notice') === 'wallpaper-failed') this.notify('FONDO DE ESCRITORIO', 'No he podido ponerme de fondo', 'Windows no lo ha permitido · sigo en modo ventana', '#FB7185');
      const p = this.state.providers[this.state.provider];
      if (p && p.needsKey && !p.hasKey) this.later(() => this.notify('CONFIGURACIÓN', 'Falta la clave de la IA', 'Gratis en Google AI Studio · pégala en Ajustes', '#F5B971'), 4000);
    } });
  }
  notify(app, title, body, dot = '#C4B5FD') {
    const n = { id: Date.now(), app, time: this.hm(), title, body, dot };
    this.setState(s => ({ notifs: [n, ...s.notifs].slice(0, 3) }));
    // on the wallpaper nobody can close them
    if (WALLPAPER) setTimeout(() => this.setState(s => ({ notifs: s.notifs.filter(x => x.id !== n.id) })), 15000);
  }
  hm() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  // ---------- real voice ----------
  say(text, done, opts, voiceId) {
    this.clearFlow();
    this.setState({ words: [], wordsKind: 'nexus', actionLabel: '' });
    this.setCore('speaking');
    voice.say(text, this.speechHandlers(done, opts), voiceId, voiceId ? this.fxOf(voiceId) : undefined);
  }
  speechHandlers(done, opts = {}) {
    return {
      onLine: (line, dur) => this.revealLine(line, dur),
      onVoiceError: () => {
        if (this.voiceWarned) return;
        this.voiceWarned = true;
        this.setState({ voiceDown: true });
        this.notify('VOZ', 'No puedo hablar ahora mismo', 'Sin conexión con el servicio de voz · le respondo por escrito', '#FB7185');
      },
      onDone: () => {
        clearInterval(this.wordIv);
        this.setState({ ovState: 'idle' });
        if (opts.keep) { done && done(); return; }
        if (done) done(); else this.settle();
      },
    };
  }
  // show the sentence being spoken word by word, paced to the audio
  revealLine(line, dur) {
    if (this.state.core !== 'speaking') this.setCore('speaking');
    clearInterval(this.wordIv);
    const ws = line.split(/\s+/); let i = 0;
    const step = Math.max(90, (dur * 1000 / ws.length) * .9);
    this.setState({ words: [], wordsKind: 'nexus' });
    this.wordIv = setInterval(() => { i++; this.setState({ words: ws.slice(0, i) }); if (i >= ws.length) clearInterval(this.wordIv); }, step);
  }
  settle() {
    this.setCore(this.state.music ? 'music' : 'idle');
    this.later(() => this.setState({ words: [], wordsKind: null }), 2200);
  }
  // cut whatever is going on: speech, pending answer, recording
  interrupt() {
    if (this.state.confirm) this.answerConfirm(false);
    cancelAnimationFrame(this.deltaRaf); this.deltaRaf = 0; this.deltaBuf = '';
    this.spoken = ''; this.spokenDone = false;
    this.clearFlow(); voice.stopSpeech(); voice.cancelListening();
    this.reqId = null; api && api.abort();
    this.setState({ preview: null });
  }
  talk() {
    if (voice.isListening() && this.state.core === 'listening') { voice.stopListening(); return; }
    this.interrupt();
    if (this.state.overlay) this.setState({ overlay: false });
    this.setState({ words: [], wordsKind: 'user', actionLabel: '' });
    this.setCore('wake');
    this.later(() => { if (this.state.core === 'wake') this.setCore('listening'); }, 450);
    voice.listen({
      onTranscribing: () => { this.clearFlow(); this.setCore('thinking'); this.setState({ words: ['…'], wordsKind: 'userDim' }); },
      onResult: text => {
        if (!text) { this.settle(); return; }
        this.ask(text);
      },
      onError: msg => this.fail(msg),
    });
  }
  async ask(text) {
    if (!api) { this.fail('Abra NEXUS desde la aplicación de escritorio'); return; }
    this.interrupt();
    const id = Date.now();
    this.reqId = id;
    this.lastQuery = text;
    this.setState(s => ({
      chat: [...s.chat, { id, role: 'user', text, fresh: true }, { id: id + 2, role: 'nexus', text: '', shown: '', streaming: true, fresh: true }].slice(-120),
      ovState: 'thinking', ovLabel: 'PENSANDO…', ovReply: '', actionLabel: '',
      words: text.split(/\s+/), wordsKind: 'userDim',
    }));
    this.setCore('thinking');
    voice.beginSpeech(this.speechHandlers());
    let res;
    try { res = await api.ask(id, text); } catch (e) { res = { ok: false, error: String((e && e.message) || e) }; }
    if (this.reqId === id) this.flushDelta();
    // close this bubble whatever happens next; drop it if nothing arrived
    this.setState(s => ({ chat: s.chat.flatMap(m => m.id !== id + 2 ? [m] : m.text ? [{ ...m, streaming: false }] : []) }));
    if (this.reqId !== id) return;
    this.setState({ ovLabel: 'NEXUS · ' + this.hm() });
    if (res.ok) { voice.endSpeech(); return; }
    this.setState({ ovState: 'idle' });
    if (res.error === 'ABORTED') return;
    if (res.error === 'NO_KEY') {
      this.openPanel('settings', true);
      this.say(`${this.cap(this.name())}, necesito una clave para pensar. Póngala en Ajustes; la de Gemini es gratuita.`);
      return;
    }
    this.fail('No puedo conectar con el modelo', res.error);
  }
  // tokens arrive dozens of times per second: render them once per frame
  // long answers: only the summary before the first blank line is spoken
  speakPart(t) {
    if (this.spokenDone) return;
    this.spoken = (this.spoken || '') + t;
    const cut = this.spoken.indexOf('\n\n');
    let part = t;
    if (cut > 0) { part = t.slice(0, Math.max(0, t.length - (this.spoken.length - cut))); this.spokenDone = true; }
    part = part.replace(/[*_`#>|]/g, '').replace(/https?:\/\/\S+/g, '');
    if (part) voice.feedSpeech(part);
  }
  onConfirm(id, cid, req) {
    if (id !== this.reqId) { api.confirmReply(cid, false); return; }
    this.setState({ confirm: { cid, ...req }, actionLabel: 'ESPERANDO SU PERMISO' });
    if (WALLPAPER) this.confirmByVoice(cid, req);
  }
  answerConfirm(ok) {
    const c = this.state.confirm; if (!c) return;
    api.confirmReply(c.cid, ok);
    this.setState({ confirm: null, actionLabel: ok ? 'PERMITIDO' : 'DENEGADO' });
  }
  // on the wallpaper nothing can be clicked: ask out loud and listen for yes/no
  confirmByVoice(cid, req) {
    voice.say(`Necesito su permiso para esto: ${req.title}. ¿Lo hago?`, {
      onLine: (l, d) => this.revealLine(l, d),
      onDone: () => {
        this.setCore('listening');
        voice.listen({
          onResult: text => this.answerConfirm(/^\s*(s[ií]|vale|adelante|hazlo|claro|ok|de acuerdo|por supuesto)/i.test(text || '')),
          onError: () => this.answerConfirm(false),
        });
      },
    });
  }
  onDelta(id, t) {
    if (id !== this.reqId) return;
    this.speakPart(t);
    this.deltaBuf = (this.deltaBuf || '') + t;
    if (this.deltaRaf) return;
    this.deltaRaf = requestAnimationFrame(() => {
      const b = this.deltaBuf; this.deltaBuf = ''; this.deltaRaf = 0;
      if (id !== this.reqId || !b) return;
      this.setState(s => ({ chat: s.chat.map(m => m.id === id + 2 ? { ...m, text: m.text + b, shown: m.text + b } : m), ovReply: s.ovReply + b, ovState: 'speaking' }));
    });
  }
  flushDelta() {
    if (!this.deltaRaf) return;
    cancelAnimationFrame(this.deltaRaf); this.deltaRaf = 0;
    const b = this.deltaBuf, id = this.reqId; this.deltaBuf = '';
    if (b && id) this.setState(s => ({ chat: s.chat.map(m => m.id === id + 2 ? { ...m, text: m.text + b, shown: m.text + b } : m), ovReply: s.ovReply + b }));
  }
  onAction(id, label) {
    if (id !== this.reqId) return;
    const tag = label.toUpperCase();
    this.setState(s => {
      const has = s.chat.some(m => m.id === id + 1);
      const chat = has
        ? s.chat.map(m => m.id === id + 1 ? { ...m, items: [...m.items, label] } : m)
        : s.chat.flatMap(m => m.id === id + 2 ? [{ id: id + 1, role: 'action', items: [label], fresh: true }, m] : [m]);
      return { chat, actionLabel: tag };
    });
    this.setCore('action');
    const E = this.E(); E && E.action(document.getElementById('dock-chat'), () => {});
    this.later(() => this.setState(s => s.actionLabel === tag ? { actionLabel: '' } : null), 2600);
  }
  fail(msg, detail) {
    if (detail) console.warn(detail);
    voice.stopSpeech(); this.clearFlow();
    this.setState({ words: [], errorTitle: msg, errorDetail: this.lastQuery ? 'TOQUE LA PÍLDORA DE ARRIBA PARA REINTENTAR' : '' });
    this.setCore('error');
    this.later(() => this.settle(), 6000);
  }
  retry() {
    this.clearFlow();
    if (this.lastQuery) this.ask(this.lastQuery); else this.settle();
  }

  // ---------- design demo (Ctrl+Shift+D) ----------
  mimicListen(text, done) {
    clearInterval(this.wordIv);
    this.setCore('listening'); this.setState({ words: [], wordsKind: 'user' });
    const ws = text.split(' '); let i = 0;
    this.later(() => {
      this.wordIv = setInterval(() => {
        i++; this.setState({ words: ws.slice(0, i) });
        if (i >= ws.length) { clearInterval(this.wordIv); done && this.later(done, 700); }
      }, 290);
    }, 500);
  }
  think(ms, done) { this.setCore('thinking'); this.setState({ wordsKind: 'userDim' }); this.later(done, ms); }
  doAction(label, elId, done) {
    this.setCore('action'); this.setState({ actionLabel: label });
    this.later(() => { const E = this.E(); E && E.action(document.getElementById(elId), () => { this.setState({ actionLabel: '' }); done && done(); }); }, 250);
  }
  demo() {
    this.interrupt(); if (this.state.overlay) this.setState({ overlay: false });
    this.setState({ actionLabel: '' }); this.setCore('wake');
    const n = this.name();
    this.later(() => this.mimicListen('Nexus, pon algo de música para concentrarme.', () =>
      this.think(1500, () => this.say(`Por supuesto, ${n}. Pongo «Horizonte de sucesos» y silencio las notificaciones durante dos horas.`, () =>
        this.doAction('ABRIENDO SPOTIFY', 'dock-music', () => { this.startMusic(); this.later(() => this.setState({ words: [], wordsKind: null }), 1500); })
      )))
    , 800);
  }
  startMusic() { const E = this.E(); E && E.setTint([251, 146, 60]); this.setState({ music: true, words: [], wordsKind: null }); this.setCore('music'); }
  stopAll() {
    const wasMusic = this.state.core === 'music';
    this.interrupt();
    this.setState({ words: [], wordsKind: null, actionLabel: '' });
    if (wasMusic) { this.setState({ music: false }); this.setCore('idle'); return; }
    this.setCore(this.state.music ? 'music' : 'idle');
  }
  togglePlay() { if (this.state.music) { this.setState({ music: false }); if (this.state.core === 'music') this.setCore('idle'); } else this.startMusic(); }
  openPanel(p, keepOpen) {
    const opening = !!p && (keepOpen || this.state.panel !== p);
    this.setState({ panel: opening ? p : null, volOpen: false });
    const busy = ['wake', 'listening', 'thinking', 'speaking', 'action'].includes(this.state.core);
    if (opening && p === 'music' && !this.state.music && !busy) this.startMusic();
  }
  toggleOverlay() {
    const opening = !this.state.overlay;
    this.interrupt();
    this.setState({ overlay: opening, panel: null, words: [], ovInput: '' });
    this.setCore(this.state.music ? 'music' : 'idle');
  }
  setTheme(t) { this.setState({ theme: t }); const E = this.E(); E && E.setTheme(t); this.save({ theme: t }); }
  setQuality(q) { this.setState({ quality: q }); const E = this.E(); E && E.setQuality(q); this.save({ quality: q }); }
  setReduced(b) { this.setState({ reduced: b }); const E = this.E(); E && E.setReduced(b); this.save({ reduced: b }); }
  startOnboarding() {
    this.interrupt(); const E = this.E(); if (!E) return;
    this.setState({ onb: true, onbStep: 0, uiIn: false, panel: null, overlay: false, words: [], micPerm: null, onbWallpaper: false });
    E.setState('idle'); E.snapCore(this.layout());
    E.boot({ onDone: () => { this.setState({ onbStep: 1 }); this.say(`Hola. Soy Nexus, su asistente personal. Antes de empezar, ¿cómo quiere que le llame?`); } });
  }
  onbNext() {
    const s = this.state.onbStep, n = this.name();
    if (s < 5) {
      this.setState({ onbStep: s + 1 });
      const L = {
        2: `${this.fem() ? 'Encantada' : 'Encantado'}, ${n}. Ahora elija cómo quiere que suene.`,
        3: 'Perfecto. Elija también mi color.',
        4: 'Para pensar y para oírle necesito dos cosas.',
        5: `Último paso, ${n}. ¿Cómo quiere tenerme?`,
      };
      this.say(L[s + 1]);
      return;
    }
    // done
    this.onboarded = true;
    this.save({ onboarded: true, userName: this.state.userName.trim() || 'señor' });
    const E = this.E(); E && E.disableMic();
    this.clearFlow();
    if (this.state.onbWallpaper && api) {
      this.say(`Perfecto, ${n}. Me coloco en su escritorio. Llámeme con ${this.hotkeyLabel().toLowerCase()}.`, () => api.setMode('wallpaper'));
      return;
    }
    this.setState({ onb: false, uiIn: true, words: [] });
    this.later(() => this.say(`${this.greet()}, ${n}. Todos los sistemas operativos.`), 400);
  }
  async askMic() {
    if (this.state.micTesting) return;
    this.interrupt();
    this.setState({ micTesting: true });
    this.setCore('listening');
    try {
      await voice.testMic(4000);
      this.setState({ micPerm: 'ok' });
      this.countMics(); // names are visible now that permission was granted
      this.setCore('idle');
      this.say(`Le oigo perfectamente, ${this.name()}.`);
    } catch {
      this.setState({ micPerm: 'no' });
      this.setCore('idle');
    }
    this.setState({ micTesting: false });
  }
  sendChat() {
    const text = this.state.chatInput.trim(); if (!text) return;
    this.setState({ chatInput: '' });
    this.ask(text);
  }
  runRoutine() {
    const r = this.ROUT.find(x => x.id === this.state.routineSel); this.interrupt();
    this.setCore('action'); this.setState({ runStep: 0, actionLabel: 'EJECUTANDO · ' + r.name.toUpperCase() });
    let i = 0;
    this.runIv = setInterval(() => {
      i++; this.setState({ runStep: i });
      if (i >= r.steps.length) { clearInterval(this.runIv); this.later(() => { this.setState({ runStep: -1 }); this.say(`Rutina «${r.name}» completada.`); }, 500); }
    }, 600);
  }
  testVoice() {
    this.interrupt(); const n = this.name(), N = this.cap(n);
    const L = { butler: `${this.greet()}, ${n}. Su escritorio está listo cuando usted lo esté.`, direct: `${N}: todo listo. Usted dirá.`, sarcastic: `Oh, ${n}, otra vez usted. Supongo que hoy tampoco hay ganas de trabajar.` };
    this.say(L[this.state.persona] || L.butler);
  }
  fxOf(id) { return (this.VOICES.find(x => x.id === id) || this.VOICES[0]).fx; }
  previewVoice(id) {
    if (this.state.preview === id) { this.stopAll(); return; }
    this.interrupt();
    this.setState({ preview: id });
    const v = this.VOICES.find(x => x.id === id);
    this.say(`Hola, ${this.name()}. Soy ${v.name}. Sistemas en línea y a su disposición.`, () => { this.setState({ preview: null }); this.settle(); }, {}, id);
  }
  selectVoice(id) {
    this.interrupt();
    this.setState({ voiceSel: id, preview: id }); this.save({ voice: id });
    voice.setVoiceFx(this.fxOf(id));
    this.say(`Hola, ${this.name()}. Así sonaré a partir de ahora.`, () => { this.setState({ preview: null }); this.settle(); }, {}, id);
  }
  providerInfo(p) {
    return {
      Gemini: { name: 'Gemini · recomendado', url: 'https://aistudio.google.com/apikey', note: 'Google Gemini (Flash-Lite): el mejor gratis, 500 preguntas al día. Busca en internet y entiende su voz con la misma clave.', help: 'Gratis y sin tarjeta en aistudio.google.com → Get API key. En el plan gratuito Google puede usar las conversaciones para mejorar sus productos.' },
      Groq: { name: 'Groq · rápido', url: 'https://console.groq.com/keys', note: 'Muy rápido. El plan gratuito tiene menos margen por minuto para tareas largas.', help: 'Gratis y sin tarjeta en console.groq.com → API Keys. Si la pone, también se usa para entender su voz.' },
      Cerebras: { name: 'Cerebras', url: 'https://cloud.cerebras.ai', note: 'Alternativa gratuita con buen margen por minuto.', help: 'Gratis en cloud.cerebras.ai. Para entender su voz hace falta además la clave de Gemini o Groq.' },
      Ollama: { name: 'Local · sin clave', url: 'https://ollama.com/download', note: 'Funciona en su PC sin clave ni internet. Hay que instalar Ollama y descargar un modelo (unos 5 GB).', help: 'Instale Ollama y ejecute «ollama pull qwen2.5:7b». Para entender su voz hace falta la clave de Gemini o Groq.' },
    }[p] || { name: p, url: '', note: '', help: '' };
  }
  hotkeyLabel() { return this.state.hotkey.replace('Control', 'Ctrl').replace('Space', 'Espacio').split('+').join(' + ').toUpperCase(); }
  async setAutostart(on) {
    this.setState({ autostart: on });
    try { await api.setAutostart(on); } catch { this.setState({ autostart: !on }); }
  }
  setName(n) { this.setState({ userName: n }); this.saveLater({ userName: n.trim() || 'señor' }); }
  pickProvider(p) {
    const models = (this.state.providers[p] || {}).models || [];
    this.setState({ provider: p, model: models[0], keyInput: '' }); this.save({ provider: p, model: models[0] });
  }
  cycleModel() {
    const models = (this.state.providers[this.state.provider] || {}).models || [];
    if (!models.length) return;
    const next = models[(models.indexOf(this.state.model) + 1) % models.length];
    this.setState({ model: next }); this.save({ model: next });
  }
  async saveKey() {
    const key = this.state.keyInput.trim(); if (!key || !api) return;
    try {
      await api.setKey(this.state.provider, key);
    } catch {
      this.fail('No he podido guardar la clave');
      return;
    }
    this.setState({ keyInput: '', showKey: false });
    await this.loadSettings();
    this.say(`Clave guardada, ${this.name()}. Ya puedo pensar.`);
  }
  onSlider = e => {
    const el = e.currentTarget, key = el.dataset.key, c = this.SL[key];
    const set = x => { const r = el.getBoundingClientRect(); const u = Math.max(0, Math.min(1, (x - r.left) / r.width)); let v = c.min + u * (c.max - c.min); v = Math.round(v / c.step) * c.step; this.setState(s => ({ sliders: { ...s.sliders, [key]: +v.toFixed(2) } })); if (key === 'fx') voice.setFxAmount(v); };
    set(e.clientX);
    // capture so releasing outside the window still ends the drag
    try { el.setPointerCapture(e.pointerId); } catch { /* not a pointer event */ }
    const mv = ev => set(ev.clientX), up = () => {
      el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      const v = this.state.sliders[key];
      if (key === 'volume') voice.setVolume(v);
      this.save({ [key]: v });
    };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  };
  ovAsk() {
    const q = this.state.ovInput.trim(); if (!q) return;
    this.setState({ ovInput: '' });
    this.ask(q);
  }
  dirSet(s) {
    this.clearFlow(); if (this.state.overlay || this.state.onb) this.setState({ overlay: false, onb: false, uiIn: true });
    this.setState({ actionLabel: '', words: [], wordsKind: null });
    const n = this.name();
    if (s === 'idle') this.setCore(this.state.music && false ? 'music' : 'idle');
    if (s === 'wake') { this.setCore('wake'); this.later(() => this.mimicListen('¿Qué tiempo hará mañana en Madrid?'), 900); }
    if (s === 'listening') this.mimicListen('¿Qué tiempo hará mañana en Madrid?');
    if (s === 'thinking') { this.setState({ words: '¿Qué tiempo hará mañana en Madrid?'.split(' '), wordsKind: 'userDim' }); this.setCore('thinking'); }
    if (s === 'speaking') this.say(`Mañana, catorce grados y cielo despejado. Le recomiendo una chaqueta ligera, ${n}.`, null, { keep: true });
    if (s === 'action') this.doAction('ABRIENDO SPOTIFY', 'dock-music', () => this.setCore('idle'));
    if (s === 'error') this.setCore('error');
    if (s === 'music') this.startMusic();
  }
  worldVals(d) {
    const w = this.state.world || {};
    const off = -d.getTimezoneOffset() / 60;
    const deg = (v, pos, neg) => Math.abs(v).toFixed(4) + '°' + (v >= 0 ? pos : neg);
    return {
      utc: 'UTC' + (off >= 0 ? '+' : '−') + Math.abs(off),
      coords: w.city ? deg(w.lat, 'N', 'S') + ' · ' + deg(w.lon, 'E', 'O') : 'SIN UBICACIÓN',
      wTemp: w.temp != null ? w.temp + '°' : '—',
      wPlace: ((w.city || 'SIN CONEXIÓN') + (w.sky ? ' · ' + w.sky : '')).toUpperCase(),
      wDetail: w.max != null ? `MÁX ${w.max}° · MÍN ${w.min}° · HUMEDAD ${w.humidity} %` : 'TIEMPO NO DISPONIBLE',
      factYear: w.fact ? w.fact.year : '—',
      factText: w.fact ? w.fact.text : 'Sin conexión con Wikipedia.',
    };
  }
  toggleT(on) { return { tBg: on ? 'rgb(var(--acc) / .85)' : 'rgba(255,255,255,.06)', tBorder: on ? 'rgb(var(--acc2) / .5)' : 'rgba(196,181,253,.2)', tLeft: on ? '18px' : '2px' }; }
  seg(active) { return { bg: active ? 'rgb(var(--acc) / .28)' : 'transparent', color: active ? '#FFF6E9' : 'rgba(226,218,240,.6)' }; }

  renderVals() {
    const S = this.state, th = this.TH[S.theme] || this.TH.nexus, L = this.layout();
    const d = new Date(S.now), hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
    const dig = c => ({ num: true, sep: false, ty: (-(+c)) + 'em' });
    const clockDigits = [dig(hh[0]), dig(hh[1]), { sep: true, num: false }, dig(mm[0]), dig(mm[1])];
    const dateStr = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
    const core = S.core;
    const labels = { idle: 'EN REPOSO', wake: 'ACTIVANDO', listening: 'ESCUCHANDO', thinking: 'PENSANDO', speaking: 'HABLANDO', action: 'EJECUTANDO ACCIÓN', error: 'SIN CONEXIÓN', music: 'MODO MÚSICA' };
    const stateColor = core === 'error' ? '#FB7185' : core === 'thinking' || core === 'action' ? '#F5B971' : core === 'speaking' ? '#FFE4C4' : core === 'music' ? '#FDBA74' : 'rgb(var(--acc2) / .75)';
    const live = ['wake', 'listening', 'thinking', 'speaking', 'action'].includes(core);
    const pillText = core === 'error' ? 'SIN CONEXIÓN · TOCA PARA REINTENTAR' : live ? 'EN VIVO · TOCA PARA PARAR' : core === 'music' ? 'MÚSICA · TOCA PARA PAUSAR' : WALLPAPER ? 'EN ESPERA · ' + this.hotkeyLabel() + ' PARA HABLAR' : 'EN ESPERA · TOCA PARA HABLAR';
    const pillDot = core === 'error' ? '#FB7185' : live ? '#FB7185' : core === 'music' ? '#FDBA74' : '#34D399';
    const capTop = S.panel === 'system' ? 905 : L.y + 150 * L.s * 2.3 + 12;
    const wk = S.wordsKind;
    const P = S.panel, wide = ['voice', 'routines', 'memory', 'settings'].includes(P);
    const mem = S.mem.filter(m => (S.memFilter === 'Todo' || m.cat === S.memFilter) && (!S.memQuery || (m.title + ' ' + m.sum).toLowerCase().includes(S.memQuery.toLowerCase())));
    const facts = S.facts.filter(f => !S.memQuery || f.t.toLowerCase().includes(S.memQuery.toLowerCase()));
    let lastG = null;
    const memItems = mem.map((m, i) => { const head = m.group !== lastG; lastG = m.group; return { ...m, head, delay: (i * 40 + 120) + 'ms', del: () => this.setState(s => ({ mem: s.mem.filter(x => x.id !== m.id) })) }; });
    const r = this.ROUT.find(x => x.id === S.routineSel);
    const sl = k => { const c = this.SL[k], v = S.sliders[k]; return { key: k, label: c.label, val: c.fmt(v), pct: ((v - c.min) / (c.max - c.min) * 100).toFixed(1) + '%' }; };
    const g6 = [
      { label: 'CPU', val: S.sys.cpu, unit: ' %', detail: 'RYZEN 9 · 4,2 GHZ', p: S.sys.cpu / 100 },
      { label: 'GPU', val: S.sys.gpu, unit: ' %', detail: 'RTX 4070 · 8,1 / 12 GB', p: S.sys.gpu / 100 },
      { label: 'TEMP', val: S.sys.temp, unit: ' °C', detail: 'CPU · 1 180 RPM', p: S.sys.temp / 100, warn: S.sys.temp > 72 },
      { label: 'RED', val: S.sys.net, unit: ' Mb/s', detail: '↑ 6,2 MB/S · WI-FI 6', p: Math.min(1, S.sys.net / 250) },
      { label: 'DISCO C:', val: S.sys.disk, unit: ' %', detail: '612 / 1 000 GB', p: S.sys.disk / 100 },
      { label: 'RAM', val: (S.sys.ram * .32).toFixed(1).replace('.', ','), unit: ' GB', detail: 'DE 32 GB · DDR5', p: S.sys.ram / 100 },
    ];
    const ang = [-90, -30, 30, 90, 150, 210];
    const gauges = g6.map((g, i) => { const a = ang[i] * Math.PI / 180; return { ...g, left: (960 + Math.cos(a) * 300 - 85) + 'px', top: (520 + Math.sin(a) * 262 - 85) + 'px', dash: (414.7 * g.p).toFixed(1) + ' 999', color: g.warn ? '#FB7185' : i === 2 ? '#F5B971' : 'rgb(var(--acc2))', delay: (200 + i * 60) + 'ms' }; });
    const hist = S.cpuHist, cpuPoly = hist.map((v, i) => (i * 356 / (hist.length - 1)).toFixed(1) + ',' + (66 - v * .64).toFixed(1)).join(' ');
    const procs = [['Blender', 18, '3,2 GB'], ['Chrome · 24 pestañas', 9, '2,8 GB'], ['VS Code', 5, '1,1 GB'], ['Nexus · motor', 3, '420 MB'], ['Spotify', 2, '310 MB'], ['Discord', 1, '280 MB']]
      .map((p, i) => { const c = Math.max(1, Math.round(p[1] * S.sys.cpu / 34)); return { name: p[0], cpu: c + ' %', ram: p[2], pct: Math.min(100, c * 3) + '%', delay: (160 + i * 40) + 'ms' }; });
    const agendaRaw = [['09:30', 'Revisión de diseño', 'Laura · sala Órbita', 1], ['12:00', 'Dentista', 'Clínica Arganzuela', 1], ['16:00', 'Llamada con Tokio', 'Equipo de motor', 1], ['19:30', 'Entrenamiento', 'Gimnasio', 1], ['23:30', 'Rutina «Buenas noches»', 'Automática', 0]];
    const nowH = d.getHours() + d.getMinutes() / 60;
    const agenda = agendaRaw.map((a, i) => { const [h, m] = a[0].split(':').map(Number), past = h + m / 60 < nowH; return { time: a[0], title: a[1], sub: a[2], op: past ? .45 : 1, dot: past ? 'rgba(196,181,253,.3)' : a[3] ? 'rgb(var(--acc2))' : '#F5B971', timeColor: past ? 'rgba(226,218,240,.35)' : '#FFF6E9', delay: (160 + i * 40) + 'ms' }; });
    const li = Math.floor((S.musicPos - 60) / 4), cur = Math.max(0, li) % this.LYR.length;
    const lyrics = this.LYR.map((t, i) => { const dd = Math.abs(i - cur); return { t, size: i === cur ? '30px' : '22px', color: i === cur ? '#FFF6E9' : i < cur ? 'rgba(226,218,240,.28)' : 'rgba(226,218,240,.45)', blur: dd > 2 ? 'blur(1px)' : 'none', shadow: i === cur ? '0 0 24px rgba(251,146,60,.45)' : 'none' }; });
    const qN = { ultra: '2 600 PARTÍCULAS · 60 FPS', equilibrado: '1 500 PARTÍCULAS · 60 FPS', ahorro: '700 PARTÍCULAS · SIN GRANO' };
    const dockDef = [['chat', 'CHAT', 'chat'], ['voice', 'VOZ Y PERSONALIDAD', 'voice'], ['routines', 'RUTINAS', 'routines'], ['system', 'SISTEMA', 'system'], ['music', 'MÚSICA', 'music'], ['memory', 'MEMORIA', 'memory'], ['settings', 'AJUSTES', 'settings'], ['volume', 'VOLUMEN', 'volume']];
    const dock = dockDef.map(([id, label, ic]) => { const act = P === id || (id === 'volume' && S.volOpen); return {
      sep: id === 'volume', domId: 'dock-' + id, d: this.ICON[ic], bg: act ? 'rgb(var(--acc) / .22)' : 'transparent', color: act ? '#FFF6E9' : 'rgba(214,204,236,.72)', dot: act || (id === 'music' && S.music) ? 1 : 0,
      click: () => id === 'volume' ? this.setState(s => ({ volOpen: !s.volOpen, hoverDock: null })) : this.openPanel(id),
      enter: () => this.setState({ hoverDock: label }), leave: () => this.setState({ hoverDock: null }) }; });
    const dirDef = [['idle', 'Reposo'], ['wake', 'Despertar'], ['listening', 'Escuchando'], ['thinking', 'Pensando'], ['speaking', 'Hablando'], ['action', 'Ejecutando'], ['error', 'Error'], ['music', 'Música']];
    const nameOpts = ['señor', 'señora', 'jefe', 'jefa', 'capitán', 'comandante'];
    const vs = S.onbStep ? S.onbStep : 0;
    return {
      k: S.k, qualityAttr: S.quality, intro: !!S.intro,
      confirm: S.confirm, confirmYes: () => this.answerConfirm(true), confirmNo: () => this.answerConfirm(false),
      micOpts: (S.micList || []).map(m => ({ id: m.id, label: m.label, on: !!m.id && m.id === S.micId, pick: () => this.pickMic(m.id) })), micDefault: () => this.pickMic(''), micTesting: !!S.micTesting,
      agentToggles: [
        ['web', 'agentWeb', 'Buscar en internet', 'Actualidad, precios, noticias y cualquier dato reciente'],
        ['files', 'agentFiles', 'Ver mis archivos', 'Buscar, leer y analizar archivos y carpetas'],
        ['write', 'agentWrite', 'Modificar archivos', 'Crear, editar, mover o enviar a la papelera · pide permiso'],
        ['shell', 'agentShell', 'Ejecutar comandos', 'PowerShell para tareas avanzadas · pide permiso'],
      ].map(([k, key, label, note]) => ({ label, note, ...this.toggleT(!!(S.agent || {})[k]), toggle: () => { this.setState(s => ({ agent: { ...s.agent, [k]: !(s.agent || {})[k] } })); this.save({ [key]: !(S.agent || {})[k] }); } })), ...(S.intro ? this.introVals() : null), ...this.worldVals(d), acc: th.acc, acc2: th.acc2, reducedAttr: S.reduced ? '1' : '0',
      bgFilter: S.overlay ? 'blur(12px) brightness(.3)' : P === 'music' ? 'brightness(.85)' : P === 'system' ? 'blur(3px) brightness(.78)' : P ? 'blur(6px) brightness(.7)' : 'none',
      overlay: S.overlay,
      showUI: S.uiIn && !S.overlay && !S.onb,
      showHud: !P || P === 'chat', showFrame: (S.uiIn && !S.overlay) || S.onb, showMic: !WALLPAPER && (!P || P === 'chat'), showNotifs: !P,
      // wallpaper: info on the right (desktop icons live on the left), no clickable controls
      hudPos: WALLPAPER ? { left: 'auto', right: '64px', alignItems: 'flex-end', textAlign: 'right' } : null,
      notifPos: WALLPAPER ? { top: 'auto', bottom: '150px' } : null,
      pillPointer: WALLPAPER ? 'none' : 'auto', dismissDisplay: WALLPAPER ? 'none' : 'grid',
      clockDigits, dateStr, greetText: `${this.greet()}, ${this.name()}.`,
      indicators: [{ label: 'IA', color: S.error ? '#FB7185' : '#34D399' }, { label: 'LOCAL', color: '#34D399' }, { label: 'VOZ', color: S.voiceDown ? '#FB7185' : '#34D399' }],
      pillLeft: L.x + 'px', pillText, pillDot, pillAnim: live || core === 'error' ? 'nx-pulse 1.4s ease-in-out infinite' : 'none',
      onPill: () => core === 'error' ? this.retry() : core === 'listening' ? this.talk() : live || core === 'music' ? this.stopAll() : this.talk(),
      notifs: S.notifs.map(n => ({ ...n, dismiss: () => this.setState(s => ({ notifs: s.notifs.filter(x => x.id !== n.id) })) })),
      capLeft: L.x + 'px', capTop: capTop + 'px', capWidth: (wide ? 640 : P === 'chat' ? 760 : 1000) + 'px',
      stateLabel: labels[core] || '', stateColor, showWave: core === 'listening',
      words: S.words, wordsColor: wk === 'nexus' ? '#FFE9D2' : 'rgba(255,246,233,.95)', wordsOpacity: wk === 'userDim' ? .45 : 1, wordsSize: wide ? '22px' : '30px',
      hasAction: !!S.actionLabel, actionLabel: S.actionLabel, hasError: core === 'error', errorTitle: S.errorTitle || 'No puedo conectar con el modelo', errorDetail: S.errorDetail || '',
      onMic: () => core === 'listening' ? this.talk() : live ? this.stopAll() : this.talk(), micRing: core === 'listening' || core === 'wake',
      micStatus: core === 'listening' ? 'LE ESCUCHO · TOQUE PARA TERMINAR' : live ? 'TOQUE PARA INTERRUMPIR' : `TOQUE O PULSE ${this.hotkeyLabel()}`,
      showMusicMini: S.music && !P, musicPct: (S.musicPos / 228 * 100).toFixed(2) + '%', musicTime: Math.floor(S.musicPos / 60) + ':' + String(S.musicPos % 60).padStart(2, '0'),
      playIcon: S.music ? 'M8 5v14M16 5v14' : 'M8 5v14l11-7z', togglePlay: () => this.togglePlay(), openMusic: () => this.openPanel('music'),
      nextTrack: () => this.setState({ musicPos: 0 }), prevTrack: () => this.setState({ musicPos: 0 }),
      isChat: P === 'chat' && !S.overlay, isVoice: P === 'voice' && !S.overlay, isRoutines: P === 'routines' && !S.overlay, isSystem: P === 'system' && !S.overlay, isMusic: P === 'music' && !S.overlay, isMemory: P === 'memory' && !S.overlay, isSettings: P === 'settings' && !S.overlay,
      closePanel: () => this.openPanel(null),
      chatRef: this.chatRef, modelName: S.model,
      chatMsgs: S.chat.map((m, i) => ({ ...m, isUser: m.role === 'user', isNexus: m.role === 'nexus', isAction: m.role === 'action', shown: m.shown !== undefined ? m.shown : m.text,
        anim: 'nx-in 520ms cubic-bezier(.16,1,.3,1) ' + (m.fresh ? 0 : 120 + i * 40) + 'ms both', items: (m.items || []).map((t, j) => ({ t, delay: (m.fresh ? 200 : 400 + i * 40) + j * 180 + 'ms' })) })),
      chatInput: S.chatInput, onChatInput: e => this.setState({ chatInput: e.target.value }),
      onChatKey: e => { if (e.key === 'Enter') { e.preventDefault(); this.sendChat(); } }, onChatSend: () => this.sendChat(),
      showSlash: S.chatInput.startsWith('/'),
      slashCmds: this.CMDS.filter(c => c.cmd.startsWith(S.chatInput.split(' ')[0]) || S.chatInput === '/').map(c => ({ ...c, pick: () => this.setState({ chatInput: c.cmd + ' ' }) })),
      voiceCards: this.VOICES.map((v, i) => { const sel = S.voiceSel === v.id; const noKey = v.premium && !(S.providers.Gemini || {}).hasKey; return { ...v, desc: noKey ? v.desc + ' · requiere clave de Gemini' : v.desc, selected: sel, state: S.preview === v.id ? 'speaking' : sel ? 'idle' : 'idle',
        bg: sel ? 'rgb(var(--acc) / .1)' : 'rgba(255,255,255,.025)', border: sel ? 'rgb(var(--acc2) / .45)' : 'rgba(196,181,253,.1)', delay: (140 + i * 40) + 'ms',
        previewLabel: S.preview === v.id ? '■ SONANDO…' : '▶ ESCUCHAR',
        select: () => this.selectVoice(v.id), preview: e => { e.stopPropagation(); this.previewVoice(v.id); },
        selectSay: () => this.selectVoice(v.id) }; }),
      personaCards: this.PERSONAS.map((p, i) => { const sel = S.persona === p.id; return { ...p, sel, bg: sel ? 'rgb(var(--acc) / .1)' : 'rgba(255,255,255,.025)', border: sel ? 'rgb(var(--acc2) / .45)' : 'rgba(196,181,253,.1)', delay: (320 + i * 40) + 'ms', select: () => { this.setState({ persona: p.id }); this.save({ persona: p.id }); } }; }),
      voiceSliders: ['speed', 'pitch', 'fx', 'warmth', 'formal'].map((k, i) => ({ ...sl(k), delay: (200 + i * 40) + 'ms' })), volSlider: sl('volume'), onSlider: this.onSlider,
      langOpts: [['es-ES', 'Español (ES)'], ['es-MX', 'Español (MX)'], ['en', 'English']].map(([id, label]) => ({ label, ...this.seg(S.lang === id), pick: () => { this.setState({ lang: id }); this.save({ lang: id }); } })),
      wakeWord: S.wakeWord, onWake: e => this.setState({ wakeWord: e.target.value }), userName: S.userName, onName: e => this.setName(e.target.value),
      onNameOnb: e => { this.setName(e.target.value); const E = this.E(); E && E.poke(); },
      nameChips: nameOpts.map(n => ({ label: n, on: S.userName === n, bg: S.userName === n ? 'rgb(var(--acc) / .22)' : 'rgba(255,255,255,.03)', border: S.userName === n ? 'rgb(var(--acc2) / .5)' : 'rgba(196,181,253,.18)', pick: () => { this.setName(n); const E = this.E(); E && E.poke(); } })),
      testVoice: () => this.testVoice(),
      routineCards: this.ROUT.map((x, i) => { const sel = S.routineSel === x.id, on = S.routineOn[x.id]; return { name: x.name, trigger: x.trigger, count: x.steps.length, bg: sel ? 'rgb(var(--acc) / .1)' : 'rgba(255,255,255,.025)', border: sel ? 'rgb(var(--acc2) / .45)' : 'rgba(196,181,253,.1)', delay: (120 + i * 40) + 'ms', ...this.toggleT(on),
        select: () => this.setState({ routineSel: x.id, runStep: -1 }), toggle: e => { e.stopPropagation(); this.setState(s => ({ routineOn: { ...s.routineOn, [x.id]: !s.routineOn[x.id] } })); } }; }),
      selRoutine: { name: r.name },
      routineSteps: r.steps.map((st, i) => { const act = S.runStep === i, done = S.runStep > i; return { notFirst: i > 0, icon: this.ICON[st[0]], kind: st[1], title: st[2], detail: st[3], delay: (160 + i * 60) + 'ms',
        bg: act ? 'rgba(245,185,113,.12)' : done ? 'rgba(52,211,153,.06)' : 'rgba(10,7,20,.7)', border: act ? 'rgba(245,185,113,.6)' : done ? 'rgba(52,211,153,.35)' : 'rgba(196,181,253,.14)', glow: act ? '0 0 30px rgba(245,185,113,.25)' : 'none', iconColor: act ? '#F5B971' : done ? '#34D399' : 'rgb(var(--acc2))' }; }),
      runRoutine: () => this.runRoutine(),
      permRows: this.PERMS.map(([id, label, note]) => ({ label, note, ...this.toggleT(S.perms[id]), toggle: () => this.setState(s => ({ perms: { ...s.perms, [id]: !s.perms[id] } })) })),
      gauges, cpuPoly, cpuMax: Math.round(Math.max(...hist)), procs, agenda, dateShort: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }).toUpperCase(),
      lyrics, lyricY: (-(cur * 56) + 2 * 56) + 'px', queue: this.QUEUE.map((q, i) => ({ ...q, delay: (200 + i * 40) + 'ms' })),
      memQuery: S.memQuery, onMemQuery: e => this.setState({ memQuery: e.target.value }), memCount: 122 + S.mem.length + S.facts.length - 5,
      memFilters: ['Todo', 'Conversaciones', 'Preferencias', 'Personas', 'Lugares'].map(f => ({ label: f, bg: S.memFilter === f ? 'rgb(var(--acc) / .22)' : 'rgba(255,255,255,.03)', border: S.memFilter === f ? 'rgb(var(--acc2) / .5)' : 'rgba(196,181,253,.16)', pick: () => this.setState({ memFilter: f }) })),
      memItems, memEmpty: memItems.length === 0,
      factItems: facts.map((f, i) => ({ ...f, delay: (160 + i * 40) + 'ms', del: () => this.setState(s => ({ facts: s.facts.filter(x => x.id !== f.id) })) })),
      learnT: { bg: this.toggleT(S.learn).tBg, border: this.toggleT(S.learn).tBorder, left: this.toggleT(S.learn).tLeft }, toggleLearn: () => this.setState(s => ({ learn: !s.learn })),
      forgetAll: () => { this.setState({ mem: [], facts: [] }); this.say(`Hecho, ${this.name()}. He olvidado todo lo que sabía de usted.`); },
      providerOpts: Object.keys(S.providers).map(p => ({ label: p, ...this.seg(S.provider === p), pick: () => this.pickProvider(p) })),
      cycleModel: () => this.cycleModel(),
      keyInput: S.keyInput, keyType: S.showKey ? 'text' : 'password', keyDisabled: !(S.providers[S.provider] || {}).needsKey,
      keyPlaceholder: !(S.providers[S.provider] || {}).needsKey ? 'No necesaria · Ollama en http://localhost:11434' : (S.providers[S.provider] || {}).hasKey ? '•••••••••••• guardada · pegue otra para cambiarla' : 'Pegue aquí su clave de ' + S.provider,
      keyStatus: !(S.providers[S.provider] || {}).needsKey ? 'LOCAL' : (S.providers[S.provider] || {}).hasKey ? 'GUARDADA' : 'FALTA', keyColor: !(S.providers[S.provider] || {}).needsKey || (S.providers[S.provider] || {}).hasKey ? '#34D399' : '#F5B971',
      keyHelp: this.providerInfo(S.provider).help,
      onKeyInput: e => this.setState({ keyInput: e.target.value }), onKeyEnter: e => { if (e.key === 'Enter') this.saveKey(); }, saveKey: () => this.saveKey(),
      keyBtn: S.showKey ? 'Ocultar' : 'Mostrar', toggleKey: () => this.setState(s => ({ showKey: !s.showKey })),
      sysToggles: [
        { label: 'Fondo de escritorio', note: 'Nexus se pone detrás de sus iconos · hable con ' + this.hotkeyLabel().toLowerCase() + ' y vuelva desde la bandeja', on: false, toggle: () => api && api.setMode('wallpaper') },
        { label: 'Iniciar con Windows', note: 'Se abre sola al encender el PC', on: S.autostart, toggle: () => this.setAutostart(!S.autostart) },
        { label: `Escuchar «${S.wakeWord}» siempre`, note: 'Próximamente · de momento use el micro o ' + this.hotkeyLabel().toLowerCase(), on: false, toggle: () => {} },
        { label: 'Reducir movimiento', note: 'Sin parallax, estelas ni partículas extra', on: S.reduced, toggle: () => this.setReduced(!S.reduced) },
      ].map(t => ({ ...t, ...this.toggleT(t.on) })),
      themeCards: Object.keys(this.TH).map(id => { const t = this.TH[id], sel = S.theme === id; return { name: t.name, c1: t.c1, c2: t.c2, bg: sel ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.02)', border: sel ? t.c2 : 'rgba(196,181,253,.1)', pick: () => this.setTheme(id) }; }),
      qualityOpts: [['ultra', 'Ultra'], ['equilibrado', 'Equilibrado'], ['ahorro', 'Ahorro']].map(([id, label]) => ({ label, ...this.seg(S.quality === id), pick: () => this.setQuality(id) })), qualityNote: qN[S.quality],
      micName: this.micLabel(), outName: "Predeterminada del sistema", cycleMic: () => this.cycleMic(), cycleOut: () => {},
      ovRef: this.ovRef, ovInput: S.ovInput, ovState: S.ovState, ovLabel: S.ovLabel, ovReply: S.ovReply,
      onOvInput: e => this.setState({ ovInput: e.target.value, ovState: e.target.value ? 'listening' : 'idle' }),
      onOvKey: e => {
        if (e.key === 'Enter' && e.altKey) { e.preventDefault(); this.talk(); }
        else if (e.key === 'Enter') { e.preventDefault(); this.ovAsk(); }
        else if (e.key === 'Tab') { e.preventDefault(); this.setState({ overlay: false }); this.openPanel('chat', true); }
      },
      onbCard: S.onb && S.onbStep > 0, onbStep: vs, onbTotal: 5,
      formalOpts: [['usted', 85], ['tú', 20]].map(([label, val]) => ({ label, on: label === 'usted' ? S.sliders.formal >= 50 : S.sliders.formal < 50, pick: () => { this.setState(s => ({ sliders: { ...s.sliders, formal: val } })); this.save({ formal: val }); } })),
      qualityChips: [['ultra', 'Ultra'], ['equilibrado', 'Equilibrado'], ['ahorro', 'Ahorro']].map(([id, label]) => ({ label, on: S.quality === id, pick: () => this.setQuality(id) })),
      openGroq: () => window.open(this.providerInfo(S.provider).url),
      providerChips: ['Gemini', 'Groq', 'Ollama'].filter(p => S.providers[p]).map(p => ({ label: this.providerInfo(p).name, on: S.provider === p, pick: () => this.pickProvider(p) })),
      providerNote: this.providerInfo(S.provider).note, keyNeeded: !!(S.providers[S.provider] || {}).needsKey, keyTitle: 'Clave de ' + S.provider,
      hotkeyText: this.hotkeyLabel(),
      onbToggles: [
        { name: 'Iniciar con Windows', note: 'Me abro sola al encender el PC', on: S.autostart, onClick: () => this.setAutostart(!S.autostart) },
        { name: 'Fondo de escritorio', note: 'Me coloco detrás de sus iconos y me quedo en segundo plano', on: !!S.onbWallpaper, onClick: () => this.setState(s => ({ onbWallpaper: !s.onbWallpaper })) },
      ],
      onbDots: [1, 2, 3, 4, 5].map(i => ({ w: i === vs ? '28px' : '10px', c: i <= vs ? 'rgb(var(--acc2))' : 'rgba(196,181,253,.2)' })),
      onbBack: () => this.setState(s => ({ onbStep: Math.max(1, s.onbStep - 1) })), onbNext: () => this.onbNext(), onbNextLabel: vs === 5 ? 'Empezar' : 'Continuar', askMic: () => this.askMic(),
      micPermText: S.micTesting ? '● HABLE AHORA · EL NÚCLEO REACCIONA A SU VOZ' : S.micPerm === 'ok' ? '● FUNCIONA · LE OIGO BIEN' : S.micPerm === 'no' ? 'SIN ACCESO · REVISE LA PRIVACIDAD DE WINDOWS' : S.mics === 0 ? 'NO HAY NINGÚN MICRÓFONO CONECTADO' : 'ELÍJALO Y PULSE PROBAR',
      micPermColor: S.micPerm === 'ok' ? '#34D399' : S.micPerm === 'no' ? '#FB7185' : 'rgba(226,218,240,.45)',
      showDock: !WALLPAPER && (S.uiIn || S.overlay) && !S.onb && !S.overlay, dock, hasHover: !!S.hoverDock && !S.volOpen, hoverLabel: S.hoverDock, volOpen: S.volOpen,
      showDirector: !WALLPAPER && S.showDirector, dirOpen: S.dirOpen, toggleDir: () => this.setState(s => ({ dirOpen: !s.dirOpen })),
      dirStates: dirDef.map(([id, label]) => { const a = core === id; return { label, click: () => this.dirSet(id), bg: a ? 'rgb(var(--acc) / .25)' : 'rgba(255,255,255,.03)', border: a ? 'rgb(var(--acc2) / .6)' : 'rgba(196,181,253,.16)', color: a ? '#FFF6E9' : 'rgba(226,218,240,.7)' }; }),
      dirActions: [
        { label: '▶ Demo por voz', click: () => this.demo() }, { label: 'Arranque', click: () => this.bootDesktop() },
        { label: 'Onboarding', click: () => this.startOnboarding() }, { label: 'Mini overlay', click: () => this.toggleOverlay() },
      ],
    };
  }

  render() {
    return <Stage v={this.renderVals()} />
  }
}
