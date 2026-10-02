// News panel.
import { chip } from '../util';

function ago(at) {
  const m = Math.max(1, Math.round((Date.now() - at) / 60e3));
  return m < 60 ? `hace ${m} min` : m < 60 * 24 ? `hace ${Math.round(m / 60)} h` : 'ayer';
}

export function newsView(app, c) {
  const { S, d } = c;
  const on = new Set(S.newsTopics.split(','));
  const noPolitics = /(^|,)\s*pol[ií]tica\s*(,|$)/i.test(S.newsAvoid);
  const own = S.newsAvoid.split(',').map(w => w.trim()).filter(w => w && !/^pol[ií]tica$/i.test(w)).join(', ');
  const items = (S.news || []).map((x, i) => ({
    ...x, when: ago(x.at), meta: (x.source + ' · ' + ago(x.at)).toUpperCase(), delay: Math.min(i, 14) * 35 + 120 + 'ms',
    open: () => window.open(x.url),
  }));
  return {
    isNews: S.panel === 'news' && !S.overlay,
    newsHeader: `NOTICIAS · ${d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}${S.news ? ' · ' + S.news.length + ' TITULARES' : ''}`.toUpperCase(),
    // today in history (Wikipedia), moved here from the desktop to keep it clean
    newsFact: S.world && S.world.fact ? S.world.fact : null,
    newsTop: items[0] || null, newsRest: items.slice(1),
    newsLoading: !!S.newsLoading, newsEmpty: !!S.news && !items.length,
    newsTopics: (S.newsTopicList || []).map(t => ({ ...t, ...chip(on.has(t.id)), on: on.has(t.id), title: t.sources.join(', '), pick: () => app.toggleNewsTopic(t.id) })),
    noPolitics: { ...chip(noPolitics), on: noPolitics, pick: () => app.toggleNoPolitics() },
    newsAvoidInput: S.newsAvoidInput ?? own, onNewsAvoid: e => app.setNewsAvoidWords(e.target.value),
    refreshNews: () => app.loadNews(), readNews: () => app.readNewsAloud(),
    newsUpdated: S.newsAt ? 'ACTUALIZADO ' + ago(S.newsAt).toUpperCase() : '',
  };
}
