// Spotify (the desktop app, never the web player) and the system volume.
import { shell } from 'electron'
import { execFile } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { currentMedia, mediaControl } from '../media'
import { KEYS, sendKey } from '../lib/powershell'
import { bool, num, oneOf, said, str, type Tool } from './define'
import { myPlaylists, playByName, spotifyStatus } from '../spotifyApi'

async function openSpotify(uri?: string) {
  const exe = join(process.env.APPDATA || '', 'Spotify', 'Spotify.exe')
  if (existsSync(exe)) {
    // the installed app takes a URI on the command line and opens it inside the app
    execFile(exe, uri ? [`--uri=${uri}`] : [], () => {})
    return true
  }
  try { await shell.openExternal(uri || 'spotify:'); return true } catch { return false } // Microsoft Store version
}

const NOT_FOUND = 'No encuentro Spotify instalado'

export async function spotify(action: string, query = ''): Promise<string> {
  switch (action) {
    case 'open': return (await openSpotify()) ? 'Spotify abierto' : NOT_FOUND
    case 'liked': return (await openSpotify('spotify:collection:tracks')) ? 'Abiertas tus canciones que te gustan en Spotify' : NOT_FOUND
    case 'search':
      if (!query.trim()) return 'Falta qué buscar'
      return (await openSpotify('spotify:search:' + encodeURIComponent(query.trim()))) ? `Buscando «${query}» en Spotify` : NOT_FOUND
    case 'now_playing': {
      const m = currentMedia()
      return m && m.title ? `${m.playing ? 'Suena' : 'En pausa'}: «${m.title}» de ${m.artist || 'artista desconocido'}` : 'No suena nada ahora mismo'
    }
    case 'play_pause': case 'next': case 'previous':
      // Spotify's media session first; the media keys if that fails
      if (!(await mediaControl(action))) await sendKey(KEYS[action])
      return { play_pause: 'Reproducir / pausar', next: 'Siguiente canción', previous: 'Canción anterior' }[action]
    default: return 'Acción desconocida'
  }
}

const VOLUME_LABELS: Record<string, string> = { volume_up: 'Volumen subido', volume_down: 'Volumen bajado', mute: 'Silencio' }

export const musicTools: Tool[] = [
  {
    name: 'spotify', trivial: true,
    description: 'Spotify de escritorio: abrir, Me gusta, buscar canción/artista/lista, qué suena, reproducir/pausar, siguiente, anterior.',
    params: { action: oneOf(['open', 'liked', 'search', 'now_playing', 'play_pause', 'next', 'previous']), query: str('Qué buscar') },
    required: ['action'],
    run: async a => said(await spotify(String(a.action || ''), String(a.query || '')))
  },
  {
    name: 'spotify_play', trivial: true,
    description: 'Pone en Spotify una lista del usuario por su nombre, sus Me gusta, o una canción/artista/álbum. Mejor que spotify search cuando hay que reproducir algo concreto.',
    params: { query: str('Nombre de la lista, canción, artista o álbum'), kind: oneOf(['playlist', 'liked', 'track', 'artist', 'album']), shuffle: bool('Aleatorio') },
    required: ['kind'],
    progress: a => 'Spotify · ' + (a.kind === 'liked' ? 'Me gusta' : String(a.query || '')).slice(0, 40),
    run: async a => {
      if (!spotifyStatus().connected) return said('Para poner listas por nombre conecta tu Spotify en Ajustes → Spotify. Mientras, puedo buscarla con spotify search.')
      return said(await playByName(String(a.query || ''), String(a.kind || 'playlist'), typeof a.shuffle === 'boolean' ? a.shuffle : undefined))
    }
  },
  {
    name: 'spotify_playlists', readOnly: true,
    description: 'Lista las playlists del usuario en Spotify.',
    run: async () => {
      if (!spotifyStatus().connected) return said('Spotify no está conectado (Ajustes → Spotify).')
      const l = await myPlaylists()
      return { result: l.map(p => `- ${p.name} (${p.tracks} canciones)`).join('\n') || 'No tiene listas.', label: `Tus listas · ${l.length}` }
    }
  },
  {
    name: 'media', trivial: true,
    description: 'Volumen del sistema.',
    params: { action: oneOf(Object.keys(VOLUME_LABELS)), times: num('Pasos de 2 %') },
    required: ['action'],
    run: async a => {
      const action = String(a.action || '')
      if (!Object.hasOwn(VOLUME_LABELS, action)) return said('Acción desconocida')
      const times = action === 'mute' ? 1 : Math.max(1, Math.min(50, Math.round(Number(a.times) || 5)))
      await sendKey(KEYS[action], times)
      return { result: 'Hecho', label: VOLUME_LABELS[action] }
    }
  }
]
