// What NEXUS has done (with undo), the emergency pause and private mode.
import { api } from '../util';

export const activity = {
  async loadActivity() {
    if (!api) return;
    try { this.onActivityList(await api.listActivity()); } catch { /* keep the last list */ }
  },
  onActivityList(a) { if (a) this.setState({ activity: a.list || [], paused: !!a.paused }); },
  async undoActivity(id) {
    if (!api) return;
    const msg = await api.undoActivity(id).catch(e => String(e));
    this.notify('ACTIVIDAD', 'Deshacer', msg, 'rgb(var(--acc2))');
  },
  // stop: NEXUS keeps answering, but changes nothing on the PC until resumed
  setPauseAll(on) {
    if (!api) return;
    if (on) api.abort();
    api.pauseActivity(on);
    this.say(on ? 'En pausa. No haré ningún cambio en tu PC hasta que la quites.' : 'Pausa quitada. Vuelvo a funcionar con normalidad.');
  },
  // NEXUS speaking first (main/pulse.ts): a short notice, or the evening summary out loud
  onPulseNotice({ title, body }) { this.notify('NEXUS', title, body, '#F5B971'); },
  onPulseEvening() {
    // not in the middle of a conversation: wait until it is quiet
    if (['wake', 'listening', 'thinking', 'speaking', 'action'].includes(this.state.core)) { setTimeout(() => this.onPulseEvening(), 60e3); return; }
    this.ask('Dame el resumen de la noche.');
  },
  // private mode: nothing is learnt or saved and NEXUS does not look at the screen or camera
  togglePrivate() {
    const on = !this.state.privateMode;
    this.setState({ privateMode: on, hoverDock: null });
    this.save({ privateMode: on });
    this.notify('MODO PRIVADO', on ? 'Activado' : 'Desactivado', on ? 'No guardo conversaciones ni aprendo nada, y no miro tu pantalla ni la cámara' : 'Vuelvo a recordar lo que hablamos', on ? '#F5B971' : '#34D399');
  },
};
