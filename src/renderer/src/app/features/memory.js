// Memory panel (facts and past conversations) and the reminders that come due.
import * as sfx from '../../services/sfx';
import { api, cap, hm } from '../util';

export const memory = {
  // facts and past conversations; on start the last ones also fill the chat
  async loadMemory(restoreChat) {
    if (!api) return;
    let m;
    try { m = await api.getMemory(); } catch (e) { console.warn(e); return; }
    this.setState({ memChats: m.chats, facts: m.facts });
    if (restoreChat && !this.state.chat.length) {
      this.setState({ chat: m.chats.slice(-20).flatMap(c => [{ id: c.id * 10, role: 'user', text: c.q }, { id: c.id * 10 + 2, role: 'nexus', text: c.a }]) });
    }
  },
  addFact() {
    const t = this.state.factInput.trim(); if (!t || !api) return;
    const cat = this.state.memFilter !== 'Todo' ? this.state.memFilter : 'Otros';
    this.setState({ factInput: '' });
    api.addFact(t, cat).then(() => this.loadMemory());
  },
  approveFact(id) {
    this.setState(s => ({ facts: s.facts.map(x => (x.id === id ? { ...x, pending: false } : x)) }));
    api && api.approveFact(id);
  },
  deleteFact(id) {
    this.setState(s => ({ facts: s.facts.filter(x => x.id !== id) }));
    api && api.deleteFact(id);
  },
  deleteChat(id) {
    this.setState(s => ({ memChats: s.memChats.filter(x => x.id !== id) }));
    api && api.deleteChat(id);
  },
  forgetAll() {
    // two clicks: the first one only arms the button for a few seconds
    if (!this.state.forgetArmed) {
      this.setState({ forgetArmed: true });
      clearTimeout(this.forgetT); this.forgetT = setTimeout(() => this.setState({ forgetArmed: false }), 4000);
      return;
    }
    clearTimeout(this.forgetT);
    this.setState({ forgetArmed: false, memChats: [], facts: [], chat: [] });
    api && api.clearMemory('all');
    this.say(`Hecho, ${this.name()}. He olvidado todo lo que sabía.`);
  },

  // ---------- reminders ----------
  onReminderDue(r) {
    const secs = sfx.chime(r.alarm);
    this.notify(r.alarm ? 'ALARMA' : 'RECORDATORIO', r.text, r.late ? 'Era para las ' + hm(r.at) + ' · NEXUS estaba cerrado' : 'Ahora · ' + hm(), '#F5B971');
    // said aloud after the chime, unless Nexus is busy talking or listening
    this.later(() => {
      if (!['idle', 'music'].includes(this.state.core) || this.state.onb) return;
      this.say(`${cap(this.name())}, ${r.late ? 'se te pasó un recordatorio' : 'te recuerdo'}: ${r.text}.`);
    }, Math.min(secs, 3.2) * 1000);
  },
};
