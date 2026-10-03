// The wake phrase (the one the user picks): always listening on the PC while the switch is on.
import * as voice from '../../services/voice';
import * as sfx from '../../services/sfx';
import { api } from '../util';

export const wakeword = {
  async setWakeListen(on) {
    this.setState({ wakeListen: on });
    this.save({ wakeListen: on });
    if (on) await this.startWake(); else this.stopWake();
  },
  async startWake(gate = this.state.wakeGate || 0) {
    if (!api) return;
    try {
      await api.wakeStart(this.state.wakeWord);
      this.setState({ wakeProgress: null });
      await voice.startWakeMic(samples => api.wakeAudio(samples), gate);
    } catch (e) {
      console.warn(e);
      this.setState({ wakeListen: false, wakeProgress: null });
      this.save({ wakeListen: false });
      this.notify('ACTIVACIÓN POR VOZ', 'No he podido activar la escucha', String((e && e.message) || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '').slice(0, 90), '#FB7185');
    }
  },
  stopWake() { voice.stopWakeMic(); api && api.wakeStop(); },
  onWakeProgress(p) {
    const first = this.state.wakeProgress == null;
    this.setState({ wakeProgress: p < 1 ? p : null });
    if (first && p < 1) this.notify('ACTIVACIÓN POR VOZ', 'Descargando el modelo de voz en español', 'Unos 124 MB, solo esta vez · luego funciona sin internet', '#C4B5FD');
  },
  // a new phrase: saved when the user stops typing, and used at once if it is listening. What was
  // learnt for the old phrase no longer applies.
  setWakeWord(text) {
    this.setState({ wakeWord: text });
    clearTimeout(this.wakeT);
    this.wakeT = setTimeout(async () => {
      const w = text.trim() || 'Hey Nexus';
      this.setState({ wakeLearnt: [], wakeTrain: null });
      if (api) await api.setSettings({ wakeWord: w, wakeLearnt: [] });
      if (this.state.wakeListen && api) api.wakeStart(w).catch(() => {});
    }, 700);
  },

  // ---------- training: the phrase said three times with the user's own voice and mic ----------
  // The recogniser is Spanish, so a name like "Jarvis" may come out as "harvis" or "yarbis": the
  // ways it writes it for this voice are kept and count as the phrase. The loudness of the voice
  // tunes the gate, so a quiet microphone is not ignored.
  async trainWake() {
    if (!api) return;
    const t = this.state.wakeTrain && !this.state.wakeTrain.done ? this.state.wakeTrain : { heard: [], voices: [] };
    if (t.busy) return;
    this.setState({ wakeTrain: { ...t, busy: true, recording: true, error: '' } });
    const listening = this.state.wakeListen;
    if (listening) voice.stopWakeMic(); // the same microphone
    try {
      const { samples, voice: level } = await voice.recordSamples(2600);
      this.setState(s => ({ wakeTrain: { ...s.wakeTrain, recording: false } }));
      const text = await api.wakeEnroll(samples);
      const next = { heard: [...t.heard, text || ''], voices: [...t.voices, level] };
      this.setState({ wakeTrain: { ...next, busy: false } });
      if (next.heard.length >= 3) await this.finishTrain(next);
      else if (listening) this.startWake();
    } catch (e) {
      this.setState(s => ({ wakeTrain: { ...s.wakeTrain, busy: false, recording: false, error: String((e && e.message) || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '').slice(0, 120) } }));
      if (listening) this.startWake();
    }
  },
  async finishTrain({ heard, voices }) {
    const phrase = (this.state.wakeWord || 'Hey Nexus').trim();
    const letters = s => s.toLowerCase().normalize('NFD').replace(/[^a-zñ]/g, '').length;
    // only what sounds like the whole phrase (a lone "oye" would wake it up all the time)
    const learnt = [...new Set(heard.map(h => h.trim()).filter(h => h && letters(h) >= letters(phrase) * 0.6))];
    const level = Math.min(...voices.filter(v => v > 0.0005));
    if (!learnt.length || !Number.isFinite(level)) {
      this.setState({ wakeTrain: { heard, voices, done: true, ok: false } });
      this.say('No te he oído bien. Mira que el micrófono sea el correcto y vuelve a probar, más cerca.');
      return;
    }
    const gate = Math.max(0.003, Math.min(0.012, level * 0.35));
    this.setState({ wakeLearnt: learnt, wakeGate: gate, wakeTrain: { heard, voices, done: true, ok: true } });
    await api.setSettings({ wakeLearnt: learnt, wakeGate: gate });
    // listening on, with what it just learnt
    this.stopWake();
    this.setState({ wakeListen: true });
    this.save({ wakeListen: true });
    await this.startWake(gate);
    this.say(`Listo. Ya conozco tu voz. Di «${phrase}» cuando quieras.`);
  },
  resetTrain() { this.setState({ wakeTrain: null }); },
  // what the recogniser hears right now (shown in Settings while listening)
  onWakeHeard(text) { this.setState({ wakeHeard: text, wakeHeardAt: Date.now() }); },
  // heard the phrase: only when Nexus is free (not talking, listening or thinking)
  onWakeWord() {
    if (!['idle', 'music'].includes(this.state.core) || this.state.onb || this.state.dictating) return;
    sfx.blip(true);
    this.talk();
  },
};
