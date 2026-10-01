// Spotify Web API (needs Premium to start playback): the user's playlists by name.
// The user creates a free app at developer.spotify.com and pastes its Client ID; sign-in uses
// PKCE in the browser (no password or secret ever reaches NEXUS). Tokens are stored encrypted.
import { shell } from 'electron'
import { createServer, type Server } from 'http'
import { createHash, randomBytes } from 'crypto'
import os from 'os'
import { readSecretJson, writeSecretJson } from './lib/store'
import { loadSettings } from './settings'
import { spotify as openDesktop } from './tools/music'

export const REDIRECT = 'http://127.0.0.1:8737/callback'
const SCOPES = 'playlist-read-private playlist-read-collaborative user-library-read user-read-playback-state user-modify-playback-state user-read-private'
const FILE = 'spotify.bin'

type Tokens = { access: string; refresh: string; expires: number; user?: string }
let tokens: Tokens | null = readSecretJson<Tokens | null>(FILE, null)

const b64url = (b: Buffer) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const clientId = () => loadSettings().spotifyClientId.trim()

export const spotifyStatus = () => ({ connected: !!tokens, user: tokens?.user || '' })

export function disconnectSpotify() {
  tokens = null
  writeSecretJson(FILE, null)
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId(), ...body })
  })
  const j: any = await res.json()
  if (!res.ok) throw new Error(j.error_description || j.error || 'Spotify no acepta la conexión')
  tokens = { access: j.access_token, refresh: j.refresh_token || tokens?.refresh || '', expires: Date.now() + (j.expires_in - 60) * 1000, user: tokens?.user }
  writeSecretJson(FILE, tokens)
}

let server: Server | null = null

/** Opens the Spotify sign-in in the browser and waits (up to 3 min) for the user to accept. */
export function connectSpotify(): Promise<{ connected: boolean; user: string }> {
  if (!/^[0-9a-f]{32}$/i.test(clientId())) return Promise.reject(new Error('Pega primero el Client ID de tu app de Spotify (32 caracteres)'))
  server?.close()
  const verifier = b64url(randomBytes(48)), state = b64url(randomBytes(12))
  const challenge = b64url(createHash('sha256').update(verifier).digest())
  return new Promise((resolve, reject) => {
    const done = (err?: Error) => { clearTimeout(timer); server?.close(); server = null; err ? reject(err) : resolve(spotifyStatus()) }
    const timer = setTimeout(() => done(new Error('No se completó el inicio de sesión a tiempo')), 180000)
    server = createServer(async (req, res) => {
      const url = new URL(req.url || '/', REDIRECT)
      if (url.pathname !== '/callback') { res.writeHead(404).end(); return }
      const ok = url.searchParams.get('state') === state && url.searchParams.get('code')
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(`<body style="background:#05030A;color:#F1EAF8;font:20px system-ui;display:grid;place-items:center;height:90vh">${ok ? 'NEXUS ya está conectado a tu Spotify. Puedes cerrar esta pestaña.' : 'No se ha podido conectar. Vuelve a intentarlo desde NEXUS.'}</body>`)
      if (!ok) { done(new Error(url.searchParams.get('error') || 'Conexión cancelada')); return }
      try {
        await tokenRequest({ grant_type: 'authorization_code', code: url.searchParams.get('code')!, redirect_uri: REDIRECT, code_verifier: verifier })
        const me = await api('/me')
        tokens!.user = me.display_name || me.id
        writeSecretJson(FILE, tokens)
        done()
      } catch (e: any) { done(e) }
    })
    server.on('error', () => done(new Error('El puerto 8737 está ocupado; cierra lo que lo use y vuelve a probar')))
    server.listen(8737, '127.0.0.1', () => {
      shell.openExternal('https://accounts.spotify.com/authorize?' + new URLSearchParams({
        client_id: clientId(), response_type: 'code', redirect_uri: REDIRECT, scope: SCOPES, state, code_challenge_method: 'S256', code_challenge: challenge
      }))
    })
  })
}

async function api(path: string, init: RequestInit = {}): Promise<any> {
  if (!tokens) throw new Error('NOT_CONNECTED')
  if (Date.now() > tokens.expires) await tokenRequest({ grant_type: 'refresh_token', refresh_token: tokens.refresh })
  const res = await fetch('https://api.spotify.com/v1' + path, { ...init, headers: { Authorization: `Bearer ${tokens.access}`, 'Content-Type': 'application/json', ...(init.headers || {}) } })
  if (res.status === 204) return null
  const text = await res.text()
  const j = text ? JSON.parse(text) : null
  if (!res.ok) {
    const reason = j?.error?.reason || j?.error?.message || res.status
    throw new Error(reason === 'PREMIUM_REQUIRED' ? 'Para elegir qué suena hace falta Spotify Premium' : `Spotify: ${reason}`)
  }
  return j
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

export async function myPlaylists() {
  const out: { name: string; uri: string; tracks: number }[] = []
  for (let url = '/me/playlists?limit=50'; url && out.length < 300;) {
    const j = await api(url)
    out.push(...(j.items || []).filter(Boolean).map((p: any) => ({ name: p.name, uri: p.uri, tracks: p.tracks?.total ?? 0 })))
    url = j.next ? j.next.replace('https://api.spotify.com/v1', '') : ''
  }
  return out
}

/** The PC's Spotify app as a playback device (opening the app if needed). */
async function desktopDevice() {
  const pick = (list: any[]) => list.find(d => d.type === 'Computer' && norm(d.name) === norm(os.hostname())) || list.find(d => d.type === 'Computer') || list[0]
  let d = pick((await api('/me/player/devices')).devices || [])
  if (d) return d.id as string
  await openDesktop('open')
  for (let i = 0; i < 12 && !d; i++) {
    await new Promise(r => setTimeout(r, 1000))
    d = pick((await api('/me/player/devices')).devices || [])
  }
  if (!d) throw new Error('Abre la app de Spotify del PC e inténtalo otra vez')
  return d.id as string
}

/** Plays a playlist of the user (by name), the liked songs, or searches a song/artist/album. */
export async function playByName(query: string, kind: string, shuffle?: boolean) {
  let body: any, what = ''
  if (kind === 'liked') {
    const me = await api('/me')
    body = { context_uri: `spotify:user:${me.id}:collection` }; what = 'tus canciones que te gustan'
  } else if (kind === 'playlist') {
    const q = norm(query), lists = await myPlaylists()
    const hit = lists.find(p => norm(p.name) === q) || lists.find(p => norm(p.name).startsWith(q)) || lists.find(p => norm(p.name).includes(q)) || lists.find(p => q.split(' ').every(w => norm(p.name).includes(w)))
    if (hit) { body = { context_uri: hit.uri }; what = `tu lista «${hit.name}»` }
    else {
      const j = await api('/search?' + new URLSearchParams({ q: query, type: 'playlist', limit: '1' }))
      const p = j.playlists?.items?.find(Boolean)
      if (!p) return `No encuentro ninguna lista llamada «${query}»`
      body = { context_uri: p.uri }; what = `la lista «${p.name}» (no es tuya, es pública)`
    }
  } else {
    const type = ['track', 'artist', 'album'].includes(kind) ? kind : 'track'
    const j = await api('/search?' + new URLSearchParams({ q: query, type, limit: '1' }))
    const item = j[type + 's']?.items?.[0]
    if (!item) return `No encuentro «${query}» en Spotify`
    body = type === 'track' ? { uris: [item.uri] } : { context_uri: item.uri }
    what = type === 'track' ? `«${item.name}» de ${item.artists?.[0]?.name}` : type === 'album' ? `el álbum «${item.name}»` : item.name
  }
  const device = await desktopDevice()
  if (shuffle != null) await api(`/me/player/shuffle?state=${shuffle}&device_id=${device}`, { method: 'PUT' }).catch(() => {})
  await api(`/me/player/play?device_id=${device}`, { method: 'PUT', body: JSON.stringify(body) })
  return `Reproduciendo ${what}`
}
