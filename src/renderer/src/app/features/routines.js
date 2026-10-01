// Routines panel. Still a design preview: real routines come in a later step.
import { ROUTINES } from '../constants';

export const routines = {
  routine() { return ROUTINES.find(x => x.id === this.state.routineSel) || ROUTINES[0]; },
  runRoutine() {
    // walks through the steps without doing them
    const r = this.routine(); this.interrupt();
    this.setCore('action'); this.setState({ runStep: 0, actionLabel: 'EJECUTANDO · ' + r.name.toUpperCase() });
    let i = 0;
    this.runIv = setInterval(() => {
      i++; this.setState({ runStep: i });
      if (i >= r.steps.length) { clearInterval(this.runIv); this.later(() => { this.setState({ runStep: -1 }); this.say(`Rutina «${r.name}» completada.`); }, 500); }
    }, 600);
  },
};
