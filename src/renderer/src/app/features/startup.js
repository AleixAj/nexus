// Start-up: the cinematic intro, the desktop boot and the first-run onboarding.
import * as voice from '../../services/voice';
import * as sfx from '../../services/sfx';
import { CORE_LAYOUT } from '../constants';
import { NOTICE, QUIET, api, greeting } from '../util';

export const startup = {
  onIntroCollapse() {
    this.stopHum && this.stopHum();
    sfx.ignition(1);
    this.firstScreen();
  },
  firstScreen() { voice.warmVoices(); if (this.onboarded) this.bootDesktop(); else this.startOnboarding(); },
  bootDesktop() {
    this.clearFlow(); const E = this.E(); if (!E) return;
    this.setState({ uiIn: false, panel: null, overlay: false, onb: false, words: [], actionLabel: '' });
    E.setState('idle'); E.snapCore(CORE_LAYOUT.home);
    // the boot animation always plays to the end, even as a wallpaper behind another app
    // (otherwise it would wait, black and without the bar, until you look at the desktop)
    this.booting = true; this.updatePower();
    E.boot({ onUI: () => this.setState({ uiIn: true }), onDone: () => {
      this.booting = false; this.updatePower();
      if (!QUIET) this.greetOrBrief();
      if (NOTICE === 'wallpaper-failed') this.notify('FONDO DE ESCRITORIO', 'No he podido ponerme de fondo', 'Windows no lo ha permitido · sigo en modo ventana', '#FB7185');
      const p = this.state.providers[this.state.provider];
      if (p && p.needsKey && !p.hasKey) this.later(() => this.notify('CONFIGURACIÓN', 'Falta la clave de la IA', 'Gratis en console.groq.com · pégala en Ajustes', '#F5B971'), 4000);
    } });
  },
  // the first start of the day: the summary of the day; otherwise the usual greeting
  greetOrBrief() {
    const today = new Date().toDateString();
    if (this.state.briefing && this.state.lastBriefing !== today && api) {
      this.setState({ lastBriefing: today }); this.save({ lastBriefing: today });
      this.ask(`${greeting()}. Dame el resumen del día.`);
      return;
    }
    this.say(`${greeting()}, ${this.name()}. Todos los sistemas operativos.`);
  },
  startOnboarding() {
    this.interrupt(); const E = this.E(); if (!E) return;
    this.setState({ onb: true, onbStep: 0, uiIn: false, panel: null, overlay: false, words: [], micPerm: null, onbWallpaper: false });
    E.setState('idle'); E.snapCore(this.layout());
    E.boot({ onDone: () => { this.setState({ onbStep: 1 }); this.say(`Hola. Soy Nexus, tu asistente personal. Antes de empezar, ¿cómo quieres que te llame?`); } });
  },
  onbNext() {
    const s = this.state.onbStep, n = this.name();
    if (s < 5) {
      this.setState({ onbStep: s + 1 });
      if (s + 1 === 2) this.prepareSamples();
      const L = {
        2: `${this.fem() ? 'Encantada' : 'Encantado'}, ${n}. Ahora elige cómo quieres que suene.`,
        3: 'Perfecto. Elige también mi color.',
        4: 'Para pensar y para oírle necesito dos cosas.',
        5: `Último paso, ${n}. ¿Cómo quieres tenerme?`,
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
      this.say(`Perfecto, ${n}. Me coloco en tu escritorio. Llámame con ${this.hotkeyLabel().toLowerCase()}.`, () => api.setMode('wallpaper'));
      return;
    }
    this.setState({ onb: false, uiIn: true, words: [] });
    this.later(() => this.say(`${greeting()}, ${n}. Todos los sistemas operativos.`), 400);
  },
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
      this.say(`Te oigo perfectamente, ${this.name()}.`);
    } catch {
      this.setState({ micPerm: 'no' });
      this.setCore('idle');
    }
    this.setState({ micTesting: false });
  },
};
