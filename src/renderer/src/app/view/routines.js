// Routines panel: real routines (left), the steps of the selected one (right) and what Nexus
// may do without asking (approvals given with "Permitir siempre").
import { ICON } from '../constants';
import { card, toggleT } from '../util';

// an icon for a step from its words
function stepIcon(t) {
  if (/m[uú]sica|spotify|lista|canci[oó]n|volumen/i.test(t)) return ICON.audio;
  if (/abre|abrir|cierra|app|programa|web/i.test(t)) return ICON.app;
  if (/apaga|suspende|bloquea|reinicia|pantalla/i.test(t)) return ICON.power;
  if (/recuerd|alarma|avisa/i.test(t)) return ICON.bell;
  if (/di |dime|cuenta|resumen|noticias|tiempo/i.test(t)) return ICON.speak;
  if (/guarda|archivo|carpeta/i.test(t)) return ICON.save;
  return ICON.trigger;
}

export function routinesView(app, c) {
  const { S } = c, r = app.routine();
  const running = r && S.runningRoutine === r.id;
  return {
    routineCards: S.routines.map((x, i) => ({
      id: x.id, name: x.name, trigger: x.trigger.toUpperCase(), count: x.steps.length, ...card(S.routineSel === x.id), delay: (120 + i * 40) + 'ms', ...toggleT(x.enabled),
      select: () => app.setState({ routineSel: x.id, runStep: -1 }),
      toggle: e => { e.stopPropagation(); app.toggleRoutine(x); },
    })),
    routinesEmpty: !S.routines.length,
    selRoutine: { name: r ? r.name : 'Sin rutinas', trigger: r ? r.trigger : '' },
    hasRoutine: !!r,
    routineSteps: (r ? r.steps : []).map((st, i) => {
      const act = running && S.runStep === i, done = running && S.runStep > i;
      return {
        notFirst: i > 0, icon: stepIcon(st), kind: 'PASO ' + (i + 1), title: st, detail: '', delay: (160 + i * 60) + 'ms',
        bg: act ? 'rgba(245,185,113,.12)' : done ? 'rgba(52,211,153,.06)' : 'rgba(10,7,20,.7)', border: act ? 'rgba(245,185,113,.6)' : done ? 'rgba(52,211,153,.35)' : 'rgb(var(--acc2) / .14)',
        glow: act ? '0 0 30px rgba(245,185,113,.25)' : 'none', iconColor: act ? '#F5B971' : done ? '#34D399' : 'rgb(var(--acc2))',
      };
    }),
    runRoutine: () => app.runRoutine(),
    editRoutine: () => app.editRoutineWithNexus(r), newRoutine: () => app.editRoutineWithNexus(null),
    deleteRoutine: () => r && app.deleteRoutine(r), deleteLabel: r && S.routineDelete === r.id ? 'Pulsa otra vez para borrar' : 'Borrar',
    approvalRows: S.approvals.map(a => ({ label: a.title, note: 'Sin preguntar desde el ' + new Date(a.at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }), ...toggleT(true), toggle: () => app.revokeApproval(a.key) })),
    approvalsEmpty: !S.approvals.length,
  };
}
