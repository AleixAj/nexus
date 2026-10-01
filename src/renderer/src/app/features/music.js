// Spotify (desktop app): what is playing, its controls and the halo tinted with the cover.
import * as voice from '../../services/voice';
import { api } from '../util';

const DEFAULT_TINT = [251, 146, 60];

/** Average colour of an image, weighted by saturation so grey and black borders do not win. */
function coverColour(img) {
  const c = document.createElement('canvas'); c.width = c.height = 24;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, 24, 24);
  const px = g.getImageData(0, 0, 24, 24).data;
  let r = 0, gg = 0, b = 0, w = 0;
  for (let i = 0; i < px.length; i += 4) {
    const mx = Math.max(px[i], px[i + 1], px[i + 2]), mn = Math.min(px[i], px[i + 1], px[i + 2]);
    const k = (mx - mn) / 255 * (mx / 255) + .02;
    r += px[i] * k; gg += px[i + 1] * k; b += px[i + 2] * k; w += k;
  }
  const col = [r / w, gg / w, b / w], top = Math.max(...col) || 1;
  return col.map(v => Math.round(Math.min(255, v / top * 235)));
}

export const music = {
  onMedia(m) {
    const playing = !!(m && m.playing);
    this.setState({ media: m, mediaAt: Date.now(), music: playing });
    // the halo follows the PC's sound while music plays
    if (playing) voice.startLoopback(); else voice.stopLoopback();
    const core = this.state.core;
    if (playing && core === 'idle') this.setCore('music');
    else if (!playing && core === 'music') this.setCore('idle');
  },
  onMediaExtra(x) {
    this.setState({ mediaExtra: x });
    this.tintFrom(x && x.cover);
  },
  tintFrom(cover) {
    const E = this.E(); if (!E) return;
    if (!cover) { E.setTint(DEFAULT_TINT); this.setState({ mediaTint: null }); return; }
    const img = new Image();
    img.onload = () => { const tint = coverColour(img); E.setTint(tint); this.setState({ mediaTint: tint }); };
    img.src = cover;
  },
  /** Seconds into the song, counting since the last update from Spotify. */
  mediaPos() {
    const m = this.state.media; if (!m) return 0;
    const p = m.pos + (m.playing ? (Date.now() - this.state.mediaAt) / 1000 : 0);
    return m.dur ? Math.min(p, m.dur) : p;
  },
  async musicCtl(action) {
    if (!api) return;
    const m = this.state.media;
    // instant feedback; Spotify confirms a moment later
    if (action === 'play_pause' && m) this.onMedia({ ...m, playing: !m.playing, pos: this.mediaPos() });
    let ok = false;
    try { ok = await api.mediaControl(action); } catch { /* reported below */ }
    if (ok) return;
    if (action === 'play_pause' && m) this.onMedia(m);
    const opening = action === 'open' || action === 'liked';
    this.notify('MÚSICA', opening ? 'No encuentro Spotify' : 'Spotify no responde', opening ? 'Instala la app de escritorio de Spotify' : 'Ábrelo y vuelve a intentarlo', '#F5B971');
  },
};
