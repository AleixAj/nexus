// Talking with Nexus: listen, ask the agent, stream the answer to the chat and the voice,
// approvals, errors and interruptions. Methods of NexusApp (`this` is the app).
import * as voice from '../../services/voice';
import { WALLPAPER, api, cap, hm, withAttachments } from '../util';

export const conversation = {
  say(text, done, opts, voiceId) {
    this.clearFlow();
    this.setState({ words: [], wordsKind: 'nexus', actionLabel: '' });
    this.setCore('speaking');
    voice.say(text, this.speechHandlers(done, opts), voiceId, voiceId ? this.fxOf(voiceId) : undefined);
  },
  speechHandlers(done, opts = {}) {
    return {
      onLine: (line, dur) => { if (this.state.previewLoading) this.setState({ previewLoading: false }); this.revealLine(line, dur); },
      onVoiceError: () => {
        if (this.voiceWarned) return;
        this.voiceWarned = true;
        this.setState({ voiceDown: true });
        this.notify('VOZ', 'No puedo hablar ahora mismo', 'Sin conexión con el servicio de voz · te respondo por escrito', '#FB7185');
      },
      onDone: () => {
        clearInterval(this.wordIv);
        this.setState({ ovState: 'idle' });
        if (opts.keep) { done && done(); return; }
        if (done) done(); else this.settle();
      },
    };
  },
  // show the sentence being spoken word by word, paced to the audio
  revealLine(line, dur) {
    if (this.state.core !== 'speaking') this.setCore('speaking');
    clearInterval(this.wordIv);
    const ws = line.split(/\s+/); let i = 0;
    const step = Math.max(90, (dur * 1000 / ws.length) * .9);
    this.setState({ words: [], wordsKind: 'nexus' });
    this.wordIv = setInterval(() => { i++; this.setState({ words: ws.slice(0, i) }); if (i >= ws.length) clearInterval(this.wordIv); }, step);
  },
  settle() {
    this.setCore(this.state.music ? 'music' : 'idle');
    this.later(() => this.setState({ words: [], wordsKind: null }), 2200);
  },
  // cut whatever is going on: speech, pending answer, recording
  interrupt() {
    if (this.state.confirm) this.answerConfirm(false);
    cancelAnimationFrame(this.deltaRaf); this.deltaRaf = 0; this.deltaBuf = '';
    this.spoken = ''; this.spokenDone = false;
    this.clearFlow(); voice.stopSpeech(); voice.cancelListening();
    this.reqId = null; api && api.abort();
    this.setState({ preview: null });
  },
  stopAll() {
    const wasMusic = this.state.core === 'music';
    this.interrupt();
    this.setState({ words: [], wordsKind: null, actionLabel: '' });
    if (!wasMusic) this.setCore(this.state.music ? 'music' : 'idle');
  },
  notify(app, title, body, dot = '#C4B5FD') {
    const n = { id: Date.now() + Math.random(), app, time: hm(), title, body, dot };
    this.setState(s => ({ notifs: [n, ...s.notifs].slice(0, 3) }));
    // on the wallpaper nobody can close them
    if (WALLPAPER) setTimeout(() => this.setState(s => ({ notifs: s.notifs.filter(x => x.id !== n.id) })), 15000);
  },

  // ---------- asking ----------
  talk() {
    if (voice.isListening() && this.state.core === 'listening') { voice.stopListening(); return; }
    this.interrupt();
    if (this.state.overlay) this.setState({ overlay: false });
    this.setState({ words: [], wordsKind: 'user', actionLabel: '' });
    this.setCore('wake');
    this.later(() => { if (this.state.core === 'wake') this.setCore('listening'); }, 450);
    voice.listen({
      onTranscribing: () => { this.clearFlow(); this.setCore('thinking'); },
      onResult: text => { if (text) this.ask(text); else this.settle(); },
      onError: msg => this.fail(msg),
    });
  },
  sendChat() {
    const files = this.state.attachments;
    const text = this.state.chatInput.trim() || (files.length ? (files.length > 1 ? '¿Qué son estos archivos? Resúmemelos.' : '¿Qué es esto? Resúmemelo.') : '');
    if (!text) return;
    // what was dropped stays "the current file" for the next questions ("resúmelo", "tradúcelo")
    this.setState(s => ({ chatInput: '', attachments: [], currentFiles: files.length ? files : s.currentFiles }));
    this.ask(withAttachments(text, files));
  },
  // files dropped on the window: they wait above the chat box until the message is sent
  dropFiles(list) {
    if (!api) return;
    const files = [...list].map(f => ({ name: f.name, path: api.pathForFile(f) })).filter(f => f.path);
    if (!files.length) return;
    this.setState(s => ({ attachments: [...s.attachments, ...files.filter(f => !s.attachments.some(a => a.path === f.path))].slice(0, 6), dragOver: false }));
    this.openPanel('chat', true);
  },
  forgetCurrentFile() { this.setState({ currentFiles: [] }); api && api.clearCurrentFile(); },
  removeAttachment(path) { this.setState(s => ({ attachments: s.attachments.filter(a => a.path !== path) })); },
  ovAsk() {
    const q = this.state.ovInput.trim(); if (!q) return;
    this.setState({ ovInput: '' });
    this.ask(q);
  },
  async ask(text) {
    if (!api) { this.fail('Abre NEXUS desde la aplicación de escritorio'); return; }
    this.interrupt();
    const id = Date.now();
    this.reqId = id;
    this.lastQuery = text;
    // the chat gets the question (id), the actions done (id + 1) and the answer (id + 2)
    this.setState(s => ({
      chat: [...s.chat, { id, role: 'user', text, fresh: true }, { id: id + 2, role: 'nexus', text: '', shown: '', streaming: true, fresh: true }].slice(-120),
      ovState: 'thinking', ovLabel: 'PENSANDO…', ovReply: '', actionLabel: '',
      words: [], wordsKind: null,
    }));
    this.setCore('thinking');
    voice.beginSpeech(this.speechHandlers());
    let res;
    try { res = await api.ask(id, text); } catch (e) { res = { ok: false, error: String((e && e.message) || e) }; }
    if (this.reqId === id) this.flushDelta();
    // close this bubble whatever happens next; drop it if nothing arrived
    this.setState(s => ({ chat: s.chat.flatMap(m => m.id !== id + 2 ? [m] : m.text ? [{ ...m, streaming: false }] : []) }));
    if (this.state.runningRoutine) this.later(() => this.setState({ runningRoutine: null, runStep: -1 }), 2500);
    if (this.reqId !== id) return;
    this.setState({ ovLabel: 'NEXUS · ' + hm() });
    if (res.ok) { voice.endSpeech(); this.loadMemory(); return; }
    this.setState({ ovState: 'idle' });
    // stopped from somewhere else (the floating bar asked something meanwhile): do not stay "thinking"
    if (res.error === 'ABORTED') { voice.stopSpeech(); this.settle(); return; }
    if (res.error === 'NO_KEY') {
      this.setSettingsTab('ai');
      this.openPanel('settings', true);
      this.say(`${cap(this.name())}, necesito una clave para pensar. Ponla en Ajustes; la de Groq es gratuita.`);
      return;
    }
    this.fail('No puedo conectar con el modelo', res.error);
  },
  // tokens arrive dozens of times per second: render them once per frame
  onDelta(id, t) {
    if (id !== this.reqId) return;
    this.speakPart(t);
    this.deltaBuf = (this.deltaBuf || '') + t;
    if (this.deltaRaf) return;
    this.deltaRaf = requestAnimationFrame(() => {
      const b = this.deltaBuf; this.deltaBuf = ''; this.deltaRaf = 0;
      if (id === this.reqId && b) this.appendAnswer(id, b, true);
    });
  },
  flushDelta() {
    if (!this.deltaRaf) return;
    cancelAnimationFrame(this.deltaRaf); this.deltaRaf = 0;
    const b = this.deltaBuf, id = this.reqId; this.deltaBuf = '';
    if (b && id) this.appendAnswer(id, b, false);
  },
  appendAnswer(id, b, speaking) {
    this.setState(s => ({ chat: s.chat.map(m => m.id === id + 2 ? { ...m, text: m.text + b, shown: m.text + b } : m), ovReply: s.ovReply + b, ...(speaking ? { ovState: 'speaking' } : null) }));
  },
  // long answers: only the summary before the first blank line is spoken
  speakPart(t) {
    if (this.spokenDone) return;
    this.spoken = (this.spoken || '') + t;
    const cut = this.spoken.indexOf('\n\n');
    let part = t;
    if (cut > 0) { part = t.slice(0, Math.max(0, t.length - (this.spoken.length - cut))); this.spokenDone = true; }
    part = part.replace(/[*_`#>|]/g, '').replace(/https?:\/\/\S+/g, '');
    if (part) voice.feedSpeech(part);
  },
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
    if (this.state.runningRoutine) this.setState(s => ({ runStep: s.runStep + 1 })); // the routine panel lights the steps up
    const E = this.E(); E && E.action(document.getElementById('dock-chat'), () => {});
    this.later(() => this.setState(s => s.actionLabel === tag ? { actionLabel: '' } : null), 2600);
  },
  fail(msg, detail) {
    if (detail) console.warn(detail);
    voice.stopSpeech(); this.clearFlow();
    this.setState({ words: [], errorTitle: msg, errorDetail: this.lastQuery ? 'TOQUE LA PÍLDORA DE ARRIBA PARA REINTENTAR' : '' });
    this.setCore('error');
    this.later(() => this.settle(), 6000);
  },
  retry() {
    this.clearFlow();
    if (this.lastQuery) this.ask(this.lastQuery); else this.settle();
  },

  // ---------- approvals (the agent wants to change something) ----------
  onConfirm(id, cid, req) {
    if (id !== this.reqId) { api.confirmReply(cid, false); return; }
    this.setState({ confirm: { cid, ...req }, actionLabel: 'ESPERANDO SU PERMISO' });
    if (WALLPAPER) this.confirmByVoice(req);
  },
  answerConfirm(ok) {
    const c = this.state.confirm; if (!c) return;
    api.confirmReply(c.cid, ok);
    this.setState({ confirm: null, actionLabel: ok === 'always' ? 'PERMITIDO SIEMPRE' : ok ? 'PERMITIDO' : 'DENEGADO' });
  },
  // on the wallpaper nothing can be clicked: ask out loud and listen for yes/no
  confirmByVoice(req) {
    voice.say(`Necesito tu permiso para esto: ${req.title}. ¿Lo hago?`, {
      onLine: (l, d) => this.revealLine(l, d),
      onDone: () => {
        this.setCore('listening');
        voice.listen({
          onResult: text => this.answerConfirm(/^\s*(s[ií]|vale|adelante|hazlo|claro|ok|de acuerdo|por supuesto)/i.test(text || '')),
          onError: () => this.answerConfirm(false),
        });
      },
    });
  },
};
