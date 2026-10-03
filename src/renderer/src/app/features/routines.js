// Routines panel: the user's real routines and the actions approved for good.
import { api } from '../util';

export const routines = {
  async loadRoutines() {
    if (!api) return;
    try {
      const [list, approvals] = await Promise.all([api.listRoutines(), api.listApprovals()]);
      this.setState(s => ({ routines: list, approvals, routineSel: list.some(r => r.id === s.routineSel) ? s.routineSel : list[0] && list[0].id }));
    } catch (e) { console.warn(e); }
  },
  routine() { return this.state.routines.find(r => r.id === this.state.routineSel) || null; },
  runRoutine(r = this.routine()) {
    if (!r) return;
    this.setState({ runningRoutine: r.id, runStep: 0, routineSel: r.id });
    this.ask('/rutina ' + r.name);
  },
  // a routine scheduled for this time: it runs even with the window hidden
  onRoutineDue(r) {
    this.notify('RUTINA', r.name, 'Programada a las ' + r.time, 'rgb(var(--acc2))');
    this.runRoutine(r);
  },
  async toggleRoutine(r) { await api.enableRoutine(r.id, !r.enabled); this.loadRoutines(); },
  async deleteRoutine(r) {
    if (this.state.routineDelete !== r.id) { this.setState({ routineDelete: r.id }); setTimeout(() => this.setState({ routineDelete: null }), 4000); return; }
    await api.deleteRoutine(r.id); this.setState({ routineDelete: null }); this.loadRoutines();
  },
  async revokeApproval(key) { await api.revokeApproval(key); this.loadRoutines(); },
  // routines are created and changed by talking: the chat opens with the sentence started
  editRoutineWithNexus(r) {
    this.openPanel('chat', true);
    this.setState({ chatInput: r ? `Cambia la rutina «${r.name}»: ` : 'Crea una rutina llamada … que … cuando diga «…» (o a las …)' });
  },
};
