// "Hey Nexus": always listening on the PC when the switch in Settings is on.
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
      await api.wakeStart();
      await voice.startWakeMic(samples => api.wakeAudio(samples));
    } catch (e) {
      console.warn(e);
      this.setState({ wakeListen: false });
      this.notify('HEY NEXUS', 'No he podido activar la escucha', String((e && e.message) || e).slice(0, 80), '#FB7185');
    }
  },
  stopWake() { voice.stopWakeMic(); api && api.wakeStop(); },
  // heard "Hey Nexus": only when Nexus is free (not talking, listening or thinking)
  onWakeWord() {
    if (!['idle', 'music'].includes(this.state.core) || this.state.onb || this.state.dictating) return;
    sfx.blip(true);
    this.talk();
  },
};
