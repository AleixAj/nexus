// Memory panel: past conversations by day and what Nexus knows about the user.
import { MEMORY_CATEGORIES } from '../constants';
import { chip, cut, dayLabel, hm, plain, toggleT } from '../util';

export function memoryView(app, c) {
  const { S } = c, q = S.memQuery.trim().toLowerCase();
  const chats = S.memChats.filter(x => !q || (x.q + ' ' + x.a).toLowerCase().includes(q)).slice().reverse().slice(0, 150);
  const facts = S.facts.filter(f => (S.memFilter === 'Todo' || f.cat === S.memFilter) && (!q || f.text.toLowerCase().includes(q)));
  let lastDay = null;
  const memItems = chats.map((x, i) => {
    const group = dayLabel(x.at), head = group !== lastDay; lastDay = group;
    return { id: x.id, group, head, time: hm(x.at), title: cut(x.q, 110), sum: cut(plain(x.a), 220), delay: Math.min(i, 12) * 40 + 120 + 'ms', del: () => app.deleteChat(x.id) };
  });
  const learn = toggleT(S.learn);
  return {
    memQuery: S.memQuery, onMemQuery: e => app.setState({ memQuery: e.target.value }), memCount: S.memChats.length + S.facts.length,
    memFilters: ['Todo', ...MEMORY_CATEGORIES].map(f => ({ label: f, ...chip(S.memFilter === f), pick: () => app.setState({ memFilter: f }) })),
    memItems, memEmpty: !memItems.length,
    memEmptyText: q ? `Nada coincide con «${S.memQuery}».` : 'Aún no hay conversaciones. Lo que hables con Nexus aparecerá aquí, guardado y cifrado solo en este equipo.',
    factItems: facts.map((f, i) => ({ id: f.id, cat: f.cat.toUpperCase(), t: f.text, delay: (160 + Math.min(i, 12) * 40) + 'ms', del: () => app.deleteFact(f.id) })),
    factsEmpty: !facts.length, factsEmptyText: S.facts.length ? 'Nada en esta categoría.' : 'Todavía no sé nada de ti. Cuéntamelo hablando o escríbelo aquí abajo.',
    factInput: S.factInput, onFactInput: e => app.setState({ factInput: e.target.value }), onFactKey: e => { if (e.key === 'Enter') { e.preventDefault(); app.addFact(); } }, addFact: () => app.addFact(),
    learnT: { bg: learn.tBg, border: learn.tBorder, left: learn.tLeft }, toggleLearn: () => app.flip('learn', 'memoryLearn'),
    forgetLabel: S.forgetArmed ? 'Pulsa otra vez para borrarlo todo' : 'Borrar toda la memoria', forgetAll: () => app.forgetAll(),
  };
}
