// The Activity panel: what NEXUS changed on the PC, with undo, and the emergency pause.
const day = t => {
  const d = new Date(t), today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'HOY';
  if (d.toDateString() === y.toDateString()) return 'AYER';
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
};

export function activityView(app, c) {
  const { S } = c;
  const rows = [];
  let last = '';
  for (const a of S.activity || []) {
    const d = day(a.at);
    if (d !== last) { rows.push({ head: d, id: 'h' + d }); last = d; }
    rows.push({
      id: a.id, time: new Date(a.at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), label: a.label, undone: a.undone,
      undoLabel: a.trash && !a.undone ? 'En la papelera' : a.canUndo ? 'Deshacer' : '', undo: () => app.undoActivity(a.id),
    });
  }
  return {
    isActivity: S.panel === 'activity' && !S.overlay,
    activityRows: rows, activityEmpty: !rows.length,
    paused: !!S.paused, togglePause: () => app.setPauseAll(!S.paused),
  };
}
