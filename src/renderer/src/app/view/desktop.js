// The home screen's information column: clock, weather, today in history, reminders.
import { api, hm } from '../util';

function worldView(w = {}, d) {
  const off = -d.getTimezoneOffset() / 60;
  const deg = (v, pos, neg) => Math.abs(v).toFixed(4) + '°' + (v >= 0 ? pos : neg);
  return {
    utc: 'UTC' + (off >= 0 ? '+' : '−') + Math.abs(off),
    coords: w.city ? deg(w.lat, 'N', 'S') + ' · ' + deg(w.lon, 'E', 'O') : 'SIN UBICACIÓN',
    wTemp: w.temp != null ? w.temp + '°' : '—',
    wPlace: ((w.city || 'SIN CONEXIÓN') + (w.sky ? ' · ' + w.sky : '')).toUpperCase(),
    wDetail: w.max != null ? `MÁX ${w.max}° · MÍN ${w.min}° · HUMEDAD ${w.humidity} %` : 'TIEMPO NO DISPONIBLE',
    factYear: w.fact ? w.fact.year : '—',
    factText: w.fact ? w.fact.text : 'Sin conexión con Wikipedia.',
  };
}

export function desktopView(app, c) {
  const { S, d } = c;
  const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
  const dig = ch => ({ num: true, sep: false, ty: (-(+ch)) + 'em' });
  const today = new Date().toDateString();
  return {
    ...worldView(S.world, d),
    clockDigits: [dig(hh[0]), dig(hh[1]), { sep: true, num: false }, dig(mm[0]), dig(mm[1])],
    dateStr: d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase(),
    // info on the right: desktop icons live on the left (same layout as the wallpaper mode)
    hudPos: { left: 'auto', right: '64px', alignItems: 'flex-end', textAlign: 'right' },
    indicators: [{ label: 'IA', color: S.error ? '#FB7185' : '#34D399' }, { label: 'LOCAL', color: '#34D399' }, { label: 'VOZ', color: S.voiceDown ? '#FB7185' : '#34D399' }],
    upcoming: S.reminders.slice(0, 3).map(r => {
      const rd = new Date(r.at);
      const day = rd.toDateString() === today ? '' : rd.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }).replace('.', '').toUpperCase() + ' · ';
      return { id: r.id, alarm: r.alarm, text: r.text, time: day + hm(r.at), cancel: () => api && api.cancelReminder(r.id) };
    }),
  };
}
