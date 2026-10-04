// Settings: load and save, look (theme, quality), the AI service and its keys, microphone,
// and the data the panels show (weather, system snapshot).
import * as voice from '../../services/voice';
import { GEMINI_SETTING, KEY_ORDER } from '../constants';
import { api } from '../util';

export const settings = {
  async loadSettings() {
    if (!api) return null;
    let s;
    try { s = await api.getSettings(); } catch (e) { console.warn(e); return null; }
    this.setState(st => ({
      provider: s.provider, model: s.model, providers: s.providers, voiceSel: s.voice, userName: s.userName, persona: s.persona,
      theme: s.theme, quality: s.quality, reduced: s.reduced, autostart: !!s.autostart, hotkey: s.hotkey || st.hotkey,
      subtitles: !!s.subtitles, learn: s.memoryLearn !== false, newsTopics: s.newsTopics, newsAvoid: s.newsAvoid, briefing: s.briefing, lastBriefing: s.lastBriefing, wakeListen: !!s.wakeListen, bgMotion: s.bgMotion || 'desktop', wakeWord: s.wakeWord || 'Oye Nexus', wakeLearnt: s.wakeLearnt || [], wakeGate: s.wakeGate || 0, wallDock: s.wallDock !== false, wallClicks: s.wallClicks !== false, wallExtend: !!s.wallExtend, privateMode: !!s.privateMode, appVersion: s.version || '', disabled: s.disabled || [], proactive: s.proactive !== false, eveningReview: s.eveningReview !== false, eveningAt: s.eveningAt || '21:30', spotifyClientId: s.spotifyClientId,
      premiumPaused: !!s.premiumPaused, azurePaused: !!s.azurePaused, hasAzure: !!s.hasAzure, azureRegion: s.azureRegion,
      agent: { web: s.agentWeb, files: s.agentFiles, write: s.agentWrite, shell: s.agentShell }, micId: s.micId || '',
      gemini: { tts: s.geminiTts, search: s.geminiSearch, stt: s.geminiStt, vision: s.geminiVision, memory: s.geminiMemory, fallback: s.geminiFallback },
      lang: s.lang, sliders: { ...st.sliders, speed: s.speed, pitch: s.pitch, volume: s.volume, warmth: s.warmth, formal: s.formal, fx: s.fx },
    }));
    return s;
  },
  save(patch) { api && api.setSettings(patch); },
  // typing fields (name) are written once the user pauses
  saveLater(patch) { clearTimeout(this.saveT); this.saveT = setTimeout(() => this.save(patch), 500); },
  /** Flips a boolean setting in the state and on disk. */
  flip(stateKey, settingKey = stateKey) {
    const on = !this.state[stateKey];
    this.setState({ [stateKey]: on });
    this.save({ [settingKey]: on });
  },

  setTheme(t) { this.setState({ theme: t }); const E = this.E(); E && E.setTheme(t); this.save({ theme: t }); },
  setQuality(q) { this.setState({ quality: q }); const E = this.E(); E && E.setQuality(q); this.save({ quality: q }); },
  setReduced(b) { this.setState({ reduced: b }); const E = this.E(); E && E.setReduced(b); this.save({ reduced: b }); },
  setName(n) { this.setState({ userName: n }); this.saveLater({ userName: n.trim() || 'señor' }); },
  async setAutostart(on) {
    this.setState({ autostart: on });
    try { await api.setAutostart(on); } catch { this.setState({ autostart: !on }); }
  },
  setGemini(k, on) {
    this.setState(s => ({ gemini: { ...s.gemini, [k]: on } }));
    this.save({ [GEMINI_SETTING[k]]: on });
  },
  setAgent(k, settingKey) {
    const on = !(this.state.agent || {})[k];
    this.setState(s => ({ agent: { ...s.agent, [k]: on } }));
    this.save({ [settingKey]: on });
  },
  hotkeyLabel() { return this.state.hotkey.replace('Control', 'Ctrl').replace('Space', 'Espacio').split('+').join(' + ').toUpperCase(); },

  // a feature on or off (Settings → Funciones); the main process drops its tools and hotkey
  toggleFeature(id) {
    const cur = this.state.disabled || [];
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
    this.setState({ disabled: next });
    this.save({ disabled: next });
  },
  // which page of Settings is open (remembered between sessions)
  setSettingsTab(id) {
    this.setState({ settingsTab: id });
    try { localStorage.setItem('nx-settings-tab', id); } catch { /* private storage off */ }
  },

  // ---------- AI service and keys ----------
  pickProvider(p) {
    if (p === 'Auto') { this.setState({ provider: p, keyInput: '' }); this.save({ provider: p }); return; }
    const models = (this.state.providers[p] || {}).models || [];
    this.setState({ provider: p, model: models[0], keyInput: '' }); this.save({ provider: p, model: models[0] });
  },
  // which service's key the key field edits (in Auto mode the user picks it)
  keyProv() {
    const S = this.state;
    if (S.provider !== 'Auto') return S.provider;
    return S.keyTarget || KEY_ORDER.find(p => !(S.providers[p] || {}).hasKey) || 'Groq';
  },
  pickModel(m) { this.setState({ model: m }); this.save({ model: m }); },
  async saveKey() {
    const key = this.state.keyInput.trim(); if (!key || !api) return;
    try { await api.setKey(this.keyProv(), key); } catch { this.fail('No he podido guardar la clave'); return; }
    this.setState({ keyInput: '', showKey: false });
    await this.loadSettings();
    this.loadQuota();
    this.say(`Clave guardada, ${this.name()}. Ya puedo pensar.`);
  },

  // ---------- microphone ----------
  async countMics() {
    try {
      const list = await voice.listMics();
      this.setState({ mics: list.length, micList: list });
    } catch { this.setState({ mics: 0, micList: [] }); }
  },
  pickMic(id) { this.setState({ micId: id }); voice.setMicDevice(id); this.save({ micId: id }); },
  micLabel() {
    const m = (this.state.micList || []).find(x => x.id === this.state.micId);
    return m ? m.label : 'Predeterminado de Windows';
  },

  // how much of today's free AI quota is used (counted by NEXUS itself)
  async loadQuota() {
    if (!api) return;
    try { this.setState({ quota: await api.getQuota() }); } catch { /* keep the last one */ }
  },

  // ---------- self-test ----------
  async runDiagnostics() {
    if (!api || this.state.diagRunning) return;
    this.setState({ diagRunning: true, diag: null });
    let list = [];
    try { list = await api.runDiagnostics(); } catch (e) { list = [{ group: 'NEXUS', name: 'Diagnóstico', status: 'fail', detail: String(e) }]; }
    const mics = await voice.listMics().catch(() => []);
    list.splice(list.findIndex(c => c.group === 'Voz'), 0, { group: 'Voz', name: 'Micrófono', status: mics.length ? 'ok' : 'fail', detail: mics.length ? this.micLabel() : 'No hay ningún micrófono conectado o Windows lo bloquea (Privacidad → Micrófono)' });
    this.setState({ diag: list, diagRunning: false });
    const bad = list.filter(c => c.status === 'fail').length;
    this.say(bad ? `He encontrado ${bad} problema${bad > 1 ? 's' : ''}. Te los muestro en pantalla.` : `Todo funciona, ${this.name()}.`);
  },
  // ---------- calendar ----------
  async loadCalendar() {
    if (!api) return;
    try { const ev = await api.calendarEvents(2); this.setState({ calendar: ev, calConnected: ev !== null }); } catch { /* keep */ }
  },
  async saveCalendar(remove) {
    const url = remove ? '' : (this.state.calInput || '').trim();
    if (!remove && !url) return;
    this.setState({ calBusy: true, calError: '' });
    try {
      await api.setCalendar(url);
      this.setState({ calInput: '' });
      await this.loadCalendar();
      if (!remove) this.say(`Calendario conectado, ${this.name()}.`);
    } catch (e) { this.setState({ calError: String((e && e.message) || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '') }); }
    this.setState({ calBusy: false });
  },
  // ---------- data for the panels ----------
  async loadWorld() {
    if (!api) return;
    try { this.setState({ world: await api.getWorld() }); } catch { /* offline: keep the last data */ }
  },
  // real snapshot of the PC: taken when the System panel opens or on "Actualizar"
  async loadSystem() {
    if (!api || this.state.sysLoading) return;
    this.setState({ sysLoading: true });
    try { this.setState({ sysInfo: await api.systemSnapshot() }); } catch (e) { console.warn(e); }
    this.setState({ sysLoading: false });
  },
};
