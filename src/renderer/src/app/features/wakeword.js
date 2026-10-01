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
  async startWake() {
    if (!api) return;
    try {
      await api.wakeStart(this.state.wakeWord);
      this.setState({ wakeProgress: null });
      await voice.startWakeMic(samples => api.wakeAudio(samples));
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
  // a new phrase: saved when the user stops typing, and used at once if it is listening
  setWakeWord(text) {
    this.setState({ wakeWord: text });
    clearTimeout(this.wakeT);
    this.wakeT = setTimeout(() => {
      const w = text.trim() || 'Hey Nexus';
      this.save({ wakeWord: w });
      if (this.state.wakeListen && api) api.wakeStart(w).catch(() => {});
    }, 700);
  },
  // heard the phrase: only when Nexus is free (not talking, listening or thinking)
  onWakeWord() {
    if (!['idle', 'music'].includes(this.state.core) || this.state.onb || this.state.dictating) return;
    sfx.blip(true);
    this.talk();
  },
};
