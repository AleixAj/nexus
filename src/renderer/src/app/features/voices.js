// Voice and personality: samples, choosing a voice, premium keys (Gemini / Azure) and the sliders.
import * as voice from '../../services/voice';
import { SLIDERS, VOICES, voiceById, voiceName } from '../constants';
import { api, cap, greeting } from '../util';

export const voices = {
  fxOf(id) { return voiceById(id).fx; },
  fem() { return !!voiceById(this.state.voiceSel).female; },
  sampleText(v) { return `Hola, ${this.name()}. Soy ${voiceName(v)}, y así sonaré a partir de ahora.`; },
  // the free voices' samples are generated ahead so the first click plays at once
  prepareSamples() {
    VOICES.filter(v => !v.premium).forEach(v => voice.prefetch(this.sampleText(v), v.id));
  },
  testVoice() {
    this.interrupt();
    const n = this.name(), N = cap(n);
    const L = { butler: `${greeting()}, ${n}. Tu escritorio está listo cuando tú lo estés.`, direct: `${N}: todo listo. Tú dirás.`, sarcastic: `Oh, ${n}, otra vez tú. Supongo que hoy tampoco hay ganas de trabajar.` };
    this.say(L[this.state.persona] || L.butler);
  },
  playSample(id) {
    this.say(this.sampleText(voiceById(id)), () => { this.setState({ preview: null }); this.settle(); }, {}, id);
  },
  previewVoice(id) {
    if (this.premiumLocked(id)) return;
    if (this.state.preview === id) { this.stopAll(); return; }
    this.interrupt();
    this.setState({ preview: id, previewLoading: true });
    this.playSample(id);
  },
  selectVoice(id) {
    if (this.premiumLocked(id)) return;
    this.interrupt();
    this.setState({ voiceSel: id, preview: id, previewLoading: true }); this.save({ voice: id });
    voice.setVoiceFx(this.fxOf(id));
    this.playSample(id);
  },
  // premium voices need their key; without it they would just sound like another voice
  premiumLocked(id) {
    const v = voiceById(id);
    if (!v.premium) return false;
    if (v.premium === 'azure') {
      if (this.state.hasAzure) return false;
      this.interrupt();
      this.setState({ keyAsk: { voice: id, voiceName: voiceName(v), engine: 'Azure', region: this.state.azureRegion || 'westeurope' }, keyAskInput: '' });
      return true;
    }
    if ((this.state.providers.Gemini || {}).hasKey) {
      if (!(this.state.gemini || {}).tts) this.setGemini('tts', true);
      return false;
    }
    this.interrupt();
    this.setState({ keyAsk: { voice: id, voiceName: voiceName(v), engine: 'Gemini' }, keyAskInput: '' });
    return true;
  },
  async keyAskSave() {
    const k = this.state.keyAsk, key = this.state.keyAskInput.trim();
    if (!k || !api) return;
    const fail = error => this.setState({ keyAsk: { ...k, saving: false, error } });
    if (!key) { fail('PEGUE PRIMERO LA CLAVE'); return; }
    this.setState({ keyAsk: { ...k, saving: true, error: '' } });
    if (!(await api.testKey(k.engine, key, k.region))) { fail(k.engine === 'Azure' ? 'AZURE NO ACEPTA ESA CLAVE EN ESA REGIÓN · REVÍSELAS' : 'GOOGLE NO ACEPTA ESA CLAVE · REVÍSELA'); return; }
    try { await api.setKey(k.engine, key); } catch { fail('NO SE HA PODIDO GUARDAR'); return; }
    this.setState({ keyAsk: null, keyAskInput: '' });
    if (k.engine === 'Azure') this.save({ azureRegion: k.region }); else this.setGemini('tts', true);
    await this.loadSettings();
    this.selectVoice(k.voice);
  },
  // drag on a slider; saved when released (capture: releasing outside the window still ends it)
  onSlider(e) {
    const el = e.currentTarget, key = el.dataset.key, c = SLIDERS[key];
    const set = x => {
      const r = el.getBoundingClientRect();
      const u = Math.max(0, Math.min(1, (x - r.left) / r.width));
      const v = Math.round((c.min + u * (c.max - c.min)) / c.step) * c.step;
      this.setState(s => ({ sliders: { ...s.sliders, [key]: +v.toFixed(2) } }));
      if (key === 'fx') voice.setFxAmount(v);
    };
    set(e.clientX);
    try { el.setPointerCapture(e.pointerId); } catch { /* not a pointer event */ }
    const mv = ev => set(ev.clientX), up = () => {
      el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      const v = this.state.sliders[key];
      if (key === 'volume') voice.setVolume(v);
      this.save({ [key]: v });
    };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  },
};
