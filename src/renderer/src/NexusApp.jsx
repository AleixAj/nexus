// The app: its state, start-up, the core's position and which panel is open.
// What each part does lives in app/features (behaviour) and app/view (what the panels show).
import { Component, createRef } from 'react';
import Stage from './views/Stage';
import * as voice from './services/voice';
import * as sfx from './services/sfx';
import { CORE_LAYOUT } from './app/constants';
import { QUIET, api } from './app/util';
import { buildView } from './app/view';
import { conversation } from './app/features/conversation';
import { dictation } from './app/features/dictation';
import { memory } from './app/features/memory';
import { music } from './app/features/music';
import { power } from './app/features/power';
import { news } from './app/features/news';
import { routines } from './app/features/routines';
import { settings } from './app/features/settings';
import { startup } from './app/features/startup';
import { voices } from './app/features/voices';
import { vision } from './app/features/vision';
import { wakeword } from './app/features/wakeword';

export default class NexusApp extends Component {
  chatRef = createRef();
  ovRef = createRef();
  T = []; // pending timeouts of the current flow (cleared on interrupt)

  state = {
    // stage and core
    k: .5, theme: 'nexus', quality: 'ultra', reduced: false,
    now: Date.now(), uiIn: false, core: 'idle', panel: null, overlay: false, error: false,
    settingsTab: (() => { try { return localStorage.getItem('nx-settings-tab') || 'ai'; } catch { return 'ai'; } })(),
    words: [], wordsKind: null, actionLabel: '', notifs: [],
    // first run
    onb: false, onbStep: 0, micPerm: null,
    // music
    music: false, media: null, mediaAt: 0, mediaExtra: null,
    // chat and quick overlay
    chat: [], chatInput: '', attachments: [], currentFiles: [], ovInput: '', ovState: 'idle', ovLabel: 'NEXUS', ovReply: '',
    // voice and personality
    voiceSel: 'lyra', preview: null, persona: 'butler', userName: 'señor', lang: 'es-ES', wakeWord: 'Hey Nexus',
    sliders: { speed: 1, pitch: 0, warmth: 70, formal: 85, volume: 64, fx: 35 },
    // routines and the actions approved for good
    routines: [], approvals: [], routineSel: null, runStep: -1, runningRoutine: null,
    // memory and reminders
    // news
    news: null, newsTopics: 'tech,science,curious', newsAvoid: 'política',
    memQuery: '', memFilter: 'Todo', learn: true, memChats: [], facts: [], factInput: '', forgetArmed: false, reminders: [], calendar: null,
    // settings
    provider: 'Auto', model: '', providers: {}, keyInput: '', showKey: false, autostart: false, hotkey: 'Control+Alt+Space',
    hoverDock: null, volOpen: false,
  };

  E() { return window.NexusEngine; }
  later(fn, ms) { const id = setTimeout(fn, ms); this.T.push(id); return id; }
  clearFlow() { this.T.forEach(clearTimeout); this.T = []; clearInterval(this.wordIv); clearInterval(this.runIv); }
  setCore(s) { this.setState({ core: s, error: s === 'error' }, () => this.updatePower()); const E = this.E(); E && E.setState(s); }
  name() { return this.state.userName || 'señor'; }

  componentDidMount() {
    this.onResize = () => this.setState({ k: Math.min(innerWidth / 1920, innerHeight / 1080) });
    this.onResize(); addEventListener('resize', this.onResize);
    this.iv = setInterval(() => this.tick(), 1000);
    addEventListener('keydown', this.onKey);
    // focus and visibility decide how much is drawn (features/power.js)
    this.onPowerEvent = () => this.updatePower();
    this.onActivity = () => this.noteActivity();
    ['pointermove', 'pointerdown', 'keydown', 'wheel'].forEach(ev => addEventListener(ev, this.onActivity, { passive: true }));
    this.noteActivity();
    ['focus', 'blur'].forEach(ev => addEventListener(ev, this.onPowerEvent));
    document.addEventListener('visibilitychange', this.onPowerEvent);
    this.listen();
    const go = async () => {
      const E = this.E(); if (!E) return setTimeout(go, 50);
      const s = await this.loadSettings();
      if (s) { E.setTheme(s.theme); E.setQuality(s.quality); E.setReduced(s.reduced); voice.setVolume(s.volume); voice.setFxAmount(s.fx); voice.setVoiceFx(this.fxOf(s.voice)); voice.setMicDevice(s.micId || ''); }
      E.snapCore(this.layout());
      this.loadWorld();
      this.countMics();
      this.loadMemory(true);
      if (s && s.wakeListen) this.startWake();
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

  // events pushed by the main process
  listen() {
    this.offs = [];
    if (!api) return;
    const on = (sub, fn) => this.offs.push(sub(fn));
    on(api.onHotkey, () => this.talk());
    on(api.onDictate, () => this.toggleDictation());
    on(api.onWake, () => this.onWakeWord());
    on(api.onVisionPreview, p => this.onVisionPreview(p));
    on(api.onCameraSnap, id => this.onCameraSnap(id));
    on(api.onWakeProgress, p => this.onWakeProgress(p));
    on(api.onDelta, (id, t) => this.onDelta(id, t));
    on(api.onAction, (id, label) => this.onAction(id, label));
    on(api.onProgress, (id, label) => { if (id === this.reqId) this.setState({ actionLabel: label.toUpperCase() }); });
    on(api.onConfirm, (id, cid, req) => this.onConfirm(id, cid, req));
    on(api.onCovered, state => this.onScreenState(state));
    on(api.onDeskEdit, e => this.onDeskEdit(e));
    this.watchWallTyping();
    on(api.onTtsQuota, engine => this.onVoiceQuota(engine));
    on(api.onMedia, m => this.onMedia(m));
    on(api.onMediaExtra, x => this.onMediaExtra(x));
    on(api.onReminder, r => this.onReminderDue(r));
    on(api.onRemindersChanged, l => this.setState({ reminders: l }));
    on(api.onRoutineRun, r => this.onRoutineDue(r));
    on(api.onRoutinesChanged, () => this.loadRoutines());
    this.loadRoutines();
    this.loadCalendar();
    this.calIv = setInterval(() => this.loadCalendar(), 10 * 60e3);
    api.listReminders().then(l => this.setState({ reminders: l })).catch(() => {});
    api.getMedia().then(r => { if (r.state) this.onMedia(r.state); if (r.extra && r.extra.key) this.onMediaExtra(r.extra); }).catch(() => {});
  }

  onKey = e => {
    if (e.repeat) return;
    if (this.state.keyAsk && e.key === 'Escape') { e.preventDefault(); this.setState({ keyAsk: null }); return; }
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
  };

  onVoiceQuota(engine) {
    if (engine === 'Azure') {
      if (!this.state.azurePaused) this.notify('VOZ PREMIUM', 'Cupo mensual de Azure agotado', 'Mientras tanto hablo con una voz normal', '#F5B971');
      this.setState({ azurePaused: true });
      return;
    }
    if (!this.state.premiumPaused) this.notify('VOZ PREMIUM', 'Cupo de voz de Gemini agotado por hoy', 'Mientras tanto hablo con una voz normal · se renueva a las 9:00', '#F5B971');
    this.setState({ premiumPaused: true });
  }

  componentWillUnmount() {
    removeEventListener('resize', this.onResize); removeEventListener('keydown', this.onKey); ['focus', 'blur'].forEach(ev => removeEventListener(ev, this.onPowerEvent)); ['pointermove', 'pointerdown', 'keydown', 'wheel'].forEach(ev => removeEventListener(ev, this.onActivity)); clearTimeout(this.restT); document.removeEventListener('visibilitychange', this.onPowerEvent);
    clearInterval(this.iv); clearInterval(this.worldIv); clearInterval(this.calIv); this.clearFlow();
    (this.offs || []).forEach(off => off());
    voice.cancelListening(); voice.stopSpeech(); voice.stopLoopback(); voice.stopWakeMic();
    const E = this.E(); E && E.disableMic();
  }

  componentDidUpdate(_, ps) {
    const E = this.E(); if (E) { E.setCore(this.layout()); E.setBgSlow(!!this.state.panel || this.state.overlay); }
    if (this.chatRef.current && (ps.chat !== this.state.chat || ps.panel !== this.state.panel)) this.chatRef.current.scrollTop = 1e6;
    if (this.state.overlay && !ps.overlay) setTimeout(() => this.ovRef.current && this.ovRef.current.focus(), 60);
  }

  /** Where the core sits for the current screen. */
  layout() {
    const { panel, overlay, onb } = this.state;
    return CORE_LAYOUT[overlay ? 'overlay' : onb ? 'onboarding' : panel || 'home'] || CORE_LAYOUT.home;
  }

  tick() {
    const S = this.state, minute = Math.floor(Date.now() / 60000);
    // every second only while a song plays on screen (panel or mini card); otherwise once a minute
    const songOnScreen = S.music && !document.hidden && (S.panel === 'music' || !S.panel);
    if (!songOnScreen && minute === this.lastMinute) return;
    this.lastMinute = minute;
    this.setState({ now: Date.now() });
  }

  openPanel(p, keepOpen) {
    const opening = !!p && (keepOpen || this.state.panel !== p);
    if (opening && p === 'system') this.loadSystem();
    if (opening && p === 'voice') this.prepareSamples();
    if (opening && p === 'memory') this.loadMemory();
    if (opening && p === 'news') this.loadNews();
    if (opening && p === 'routines') this.loadRoutines();
    if (opening && p === 'settings') this.loadQuota();
    if (opening && p === 'settings') this.loadSpotify();
    this.setState({ panel: opening ? p : null, volOpen: false });
  }

  toggleOverlay() {
    const opening = !this.state.overlay;
    this.interrupt();
    this.setState({ overlay: opening, panel: null, words: [], ovInput: '' });
    this.setCore(this.state.music ? 'music' : 'idle');
  }

  render() {
    return <Stage v={buildView(this)} />;
  }
}

Object.assign(NexusApp.prototype, conversation, dictation, memory, music, news, power, routines, settings, startup, vision, voices, wakeword);
