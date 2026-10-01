// News panel: today's stories for the topics the user likes, without the ones they avoid.
import { api } from '../util';

export const news = {
  async loadNews() {
    if (!api || this.state.newsLoading) return;
    this.setState({ newsLoading: true });
    try {
      const [items, topics] = await Promise.all([api.getNews(), this.state.newsTopicList || api.newsTopics()]);
      this.setState({ news: items, newsTopicList: topics, newsAt: Date.now() });
    } catch (e) { console.warn(e); }
    this.setState({ newsLoading: false });
  },
  toggleNewsTopic(id) {
    const on = new Set(this.state.newsTopics.split(',').filter(Boolean));
    if (on.has(id)) { if (on.size > 1) on.delete(id); } else on.add(id); // at least one topic
    this.setNewsPrefs({ newsTopics: [...on].join(',') });
  },
  toggleNoPolitics() {
    const words = this.state.newsAvoid.split(',').map(w => w.trim()).filter(Boolean);
    const has = words.some(w => /^pol[ií]tica$/i.test(w));
    this.setNewsPrefs({ newsAvoid: (has ? words.filter(w => !/^pol[ií]tica$/i.test(w)) : ['política', ...words]).join(', ') });
  },
  setNewsAvoidWords(text) {
    // the field holds only the user's own words; "política" is the switch next to it
    const politics = /(^|,)\s*pol[ií]tica\s*(,|$)/i.test(this.state.newsAvoid);
    const own = text.split(',').map(w => w.trim()).filter(w => w && !/^pol[ií]tica$/i.test(w));
    this.setState({ newsAvoidInput: text });
    this.setNewsPrefs({ newsAvoid: [...(politics ? ['política'] : []), ...own].join(', ').slice(0, 80) }, true);
  },
  setNewsPrefs(patch, typing) {
    this.setState(patch);
    if (typing) { this.saveLater(patch); clearTimeout(this.newsT); this.newsT = setTimeout(() => this.loadNews(), 900); return; }
    this.save(patch);
    setTimeout(() => this.loadNews(), 50); // after the setting is written
  },
  readNewsAloud() {
    this.ask('Cuéntame en voz, en pocas frases, las noticias más interesantes de hoy.');
  },
};
