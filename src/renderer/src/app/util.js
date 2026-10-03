// Small helpers for the interface: formats and the look of toggles and segmented buttons.

export const api = window.nexus;

const params = new URLSearchParams(location.search);
// "wallpaper": the window lives behind the desktop icons and cannot be clicked
export const WALLPAPER = params.get('mode') === 'wallpaper';
// the window was re-created by a mode switch: skip the intro and the greeting
export const QUIET = params.get('quiet') === '1';
export const NOTICE = params.get('notice');

export const pad2 = n => String(n).padStart(2, '0');
/** 14:05 */
export const hm = (t = Date.now()) => { const d = new Date(t); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };
/** 3:07 (seconds of a song) */
export const clock = s => Math.floor(s / 60) + ':' + pad2(Math.floor(s % 60));
/** 1,5 */
export const fmt = (n, dec = 1) => (n == null ? '—' : Number(n).toFixed(dec).replace('.', ','));
export const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
export const cut = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s);
/** Markdown to plain text, for summaries. */
export const plain = t => t.replace(/[#*_`>|[\]()-]+/g, ' ').replace(/\s+/g, ' ').trim();

// Files sent with a message: "texto\n\n[Adjuntos: C:\a.pdf | C:\b.png]". The agent reads the
// paths; the chat shows the text and a chip per file.
const ATTACH = /\n\n\[Adjuntos: ([^\]]+)\]$/;
export const withAttachments = (text, files) => (files.length ? `${text}\n\n[Adjuntos: ${files.map(f => f.path).join(' | ')}]` : text);
export function splitAttachments(text) {
  const m = ATTACH.exec(text || '');
  return m ? { text: text.slice(0, m.index), files: m[1].split(' | ').map(p => p.split(/[\\/]/).pop()) } : { text, files: [] };
}

/** HOY, AYER or LUN 28 SEP */
export function dayLabel(at) {
  const today = new Date().setHours(0, 0, 0, 0);
  const diff = Math.round((today - new Date(at).setHours(0, 0, 0, 0)) / 864e5);
  return diff <= 0 ? 'HOY' : diff === 1 ? 'AYER' : new Date(at).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '').toUpperCase();
}

export function greeting() {
  const h = new Date().getHours();
  return h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
}

/** Colours of an on/off switch. */
export const toggleT = on => ({ tBg: on ? 'rgb(var(--acc) / .85)' : 'rgba(255,255,255,.06)', tBorder: on ? 'rgb(var(--acc2) / .5)' : 'rgb(var(--acc2) / .2)', tLeft: on ? '18px' : '2px', tOn: !!on });
/** Colours of a segmented-control option. */
export const seg = active => ({ bg: active ? 'rgb(var(--acc) / .28)' : 'transparent', color: active ? '#FFF6E9' : 'rgba(226,218,240,.6)' });
/** Colours of a selectable card. */
export const card = sel => ({ bg: sel ? 'rgb(var(--acc) / .1)' : 'rgba(255,255,255,.025)', border: sel ? 'rgb(var(--acc2) / .45)' : 'rgb(var(--acc2) / .1)' });
/** Colours of a chip. */
export const chip = on => ({ bg: on ? 'rgb(var(--acc) / .22)' : 'rgba(255,255,255,.03)', border: on ? 'rgb(var(--acc2) / .5)' : 'rgb(var(--acc2) / .16)' });
