// Routines panel (design preview until routines become real).
import { ICON, PERMS, ROUTINES } from '../constants';
import { card, toggleT } from '../util';

export function routinesView(app, c) {
  const { S } = c, r = app.routine();
  return {
    routineCards: ROUTINES.map((x, i) => ({
      name: x.name, trigger: x.trigger, count: x.steps.length, ...card(S.routineSel === x.id), delay: (120 + i * 40) + 'ms', ...toggleT(S.routineOn[x.id]),
      select: () => app.setState({ routineSel: x.id, runStep: -1 }),
      toggle: e => { e.stopPropagation(); app.setState(s => ({ routineOn: { ...s.routineOn, [x.id]: !s.routineOn[x.id] } })); },
    })),
    selRoutine: { name: r.name },
    routineSteps: r.steps.map((st, i) => {
      const act = S.runStep === i, done = S.runStep > i;
      return {
        notFirst: i > 0, icon: ICON[st[0]], kind: st[1], title: st[2], detail: st[3], delay: (160 + i * 60) + 'ms',
        bg: act ? 'rgba(245,185,113,.12)' : done ? 'rgba(52,211,153,.06)' : 'rgba(10,7,20,.7)', border: act ? 'rgba(245,185,113,.6)' : done ? 'rgba(52,211,153,.35)' : 'rgba(196,181,253,.14)',
        glow: act ? '0 0 30px rgba(245,185,113,.25)' : 'none', iconColor: act ? '#F5B971' : done ? '#34D399' : 'rgb(var(--acc2))',
      };
    }),
    runRoutine: () => app.runRoutine(),
    permRows: PERMS.map(([id, label, note]) => ({ label, note, ...toggleT(S.perms[id]), toggle: () => app.setState(s => ({ perms: { ...s.perms, [id]: !s.perms[id] } })) })),
  };
}
