// Music panel and the mini card: what Spotify plays, controls and synced lyrics.
import { clock } from '../util';

const REPEAT = { None: 'Repetir', List: 'Repitiendo la lista', Track: 'Repitiendo la canción' };

/** The song on screen, or null if Spotify plays nothing. Also used to place the notifications. */
export function nowPlaying(app) {
  const S = app.state, md = S.media;
  if (!md || !md.title) return null;
  const extra = S.mediaExtra && S.mediaExtra.key === md.artist + '|' + md.title ? S.mediaExtra : null;
  const pos = app.mediaPos();
  return {
    title: md.title, artist: md.artist, playing: md.playing, shuffle: !!md.shuffle, repeat: md.repeat || 'None', repeatLabel: REPEAT[md.repeat] || 'Repetir',
    source: ['SPOTIFY', md.playing ? 'REPRODUCIENDO' : 'EN PAUSA', md.album].filter(Boolean).join(' · ').toUpperCase(),
    pct: (md.dur ? pos / md.dur * 100 : 0).toFixed(2) + '%', time: clock(pos), duration: md.dur ? clock(md.dur) : '',
    cover: extra ? extra.cover : '', extra, pos,
  };
}

export function musicView(app, c) {
  const { S, P } = c, now = c.musicCard;
  const lyr = now && now.extra && now.extra.lyrics;
  const cur = lyr ? Math.max(0, lyr.findLastIndex(l => l.t <= now.pos + .3)) : -1;
  const ctl = action => () => app.musicCtl(action);
  return {
    musicNow: now, showMusicMini: !!now && !P,
    musicGlow: 'rgba(' + (S.mediaTint || [251, 146, 60]).join(',') + ',.38)',
    playIcon: now && now.playing ? 'M8 5v14M16 5v14' : 'M8 5v14l11-7z',
    togglePlay: ctl('play_pause'), nextTrack: ctl('next'), prevTrack: ctl('previous'),
    musicShuffle: ctl('shuffle'), musicRepeat: ctl('repeat'), spotifyOpen: ctl('open'), spotifyLiked: ctl('liked'),
    openMusic: () => app.openPanel('music'),
    spotifyHint: { title: 'Spotify no está sonando', text: 'Abre la app de Spotify del PC y pon algo: aquí verás la carátula, los controles y la letra sincronizada.' },
    lyricLines: lyr ? lyr.map((l, i) => ({ text: l.text, cur: i === cur, past: i < cur, far: Math.abs(i - cur) > 3 })) : null, lyricCur: cur,
    lyricsNote: !now ? '' : !now.extra ? 'Buscando la letra…' : 'Esta canción no tiene letra sincronizada.',
  };
}
