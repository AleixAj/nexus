// What the Spotify desktop app is playing, read from Windows' media sessions (no account
// needed), its controls, the cover (iTunes catalogue) and synced lyrics (LRCLIB). All free, no keys.
import { spawn, type ChildProcess } from 'child_process'
import { writeFileSync } from 'fs'
import { dataPath } from './lib/store'
import { powershell } from './lib/powershell'

const COMMON = String.raw`
[Console]::OutputEncoding = [Text.Encoding]::UTF8  # accents in song titles
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation` + '`' + String.raw`1' })[0]
function Await($op, [type]$t) { $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(-1) | Out-Null; $task.Result }
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime] | Out-Null
$MgrT = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]
$PropT = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]
$mgr = Await ($MgrT::RequestAsync()) ($MgrT)

# only the Spotify desktop app (never browsers or other players)
function Pick { @($mgr.GetSessions()) | Where-Object { $_.SourceAppUserModelId -match 'Spotify' } | Select-Object -First 1 }
`

// Watches every ~1.5 s and prints a JSON line only when something changed
// (track, play state, a seek); the app interpolates the progress in between.
const WATCH = COMMON + String.raw`
$last = ''; $lastPos = 0; $lastT = [DateTime]::UtcNow
while ($true) {
  if ($env:NX_PARENT -and -not (Get-Process -Id $env:NX_PARENT -ErrorAction SilentlyContinue)) { exit }
  try {
    $s = Pick
    if ($s) {
      $p = Await ($s.TryGetMediaPropertiesAsync()) ($PropT)
      $tl = $s.GetTimelineProperties(); $pb = $s.GetPlaybackInfo()
      $playing = "$($pb.PlaybackStatus)" -eq 'Playing'
      $pos = $tl.Position.TotalSeconds; $dur = $tl.EndTime.TotalSeconds
      $now = [DateTime]::UtcNow
      $expected = $lastPos + $(if ($playing) { ($now - $lastT).TotalSeconds } else { 0 })
      $key = "$($s.SourceAppUserModelId)|$($p.Title)|$($p.Artist)|$playing|$($pb.IsShuffleActive)|$($pb.AutoRepeatMode)"
      $seeked = [math]::Abs($pos - $expected) -gt 3
      if ($key -ne $last -or $seeked) {
        [pscustomobject]@{
          title = $p.Title; artist = $p.Artist; album = $p.AlbumTitle
          playing = $playing; pos = $pos; dur = $dur; shuffle = $pb.IsShuffleActive; repeat = "$($pb.AutoRepeatMode)"
        } | ConvertTo-Json -Compress
        [Console]::Out.Flush()
        $last = $key
      }
      $lastPos = $pos; $lastT = $now
    } elseif ($last -ne 'none') { '{"none":true}'; [Console]::Out.Flush(); $last = 'none' }
  } catch { }
  Start-Sleep -Milliseconds 1500
}
`

export type MediaState = { title: string; artist: string; album: string; playing: boolean; pos: number; dur: number; shuffle: boolean; repeat: string }
export type MediaExtra = { key: string; cover: string; lyrics: Lyric[] | null }
type Lyric = { t: number; text: string }

let watcher: ChildProcess | null = null
let last: MediaState | null = null
let extra: MediaExtra = { key: '', cover: '', lyrics: null }

export const currentMedia = () => last
export const currentExtra = () => extra

/**
 * Watches Spotify. `onState` gets every change (play, pause, seek, new song);
 * `onExtra` gets the cover and lyrics once per song, when they have been found.
 */
export function watchMedia(onState: (m: MediaState | null) => void, onExtra: (x: MediaExtra) => void) {
  if (watcher) return
  const changed = async (m: MediaState | null) => {
    last = m
    onState(m)
    if (!m || !m.title) return
    const key = m.artist + '|' + m.title
    if (key === extra.key) return
    extra = { key, cover: '', lyrics: null }
    const [cover, lyrics] = await Promise.all([coverFor(m.title, m.artist), lyricsFor(m.title, m.artist, m.album, m.dur)])
    if (extra.key !== key) return // the song changed meanwhile
    extra = { key, cover, lyrics }
    onExtra(extra)
  }
  const file = dataPath('nexus-media.ps1')
  writeFileSync(file, WATCH, 'utf8')
  const p = spawn('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', file], {
    windowsHide: true, env: { ...process.env, NX_PARENT: String(process.pid) }
  })
  let buf = ''
  p.stdout.setEncoding('utf8') // decodes characters split between chunks
  p.stdout.on('data', d => {
    buf += d
    const lines = buf.split(/\r?\n/)
    buf = lines.pop() || ''
    for (const l of lines) {
      if (!l.startsWith('{')) continue
      try {
        const m = JSON.parse(l)
        changed(m.none ? null : m)
      } catch { /* partial line */ }
    }
  })
  p.on('exit', () => { watcher = null; setTimeout(() => watchMedia(onState, onExtra), 5000) }) // restart if it dies
  watcher = p
}

const ACTIONS: Record<string, string> = {
  play_pause: '$s.TryTogglePlayPauseAsync()',
  play: '$s.TryPlayAsync()',
  pause: '$s.TryPauseAsync()',
  next: '$s.TrySkipNextAsync()',
  previous: '$s.TrySkipPreviousAsync()',
  shuffle: '$s.TryChangeShuffleActiveAsync(-not $s.GetPlaybackInfo().IsShuffleActive)',
  repeat: "$m = \"$($s.GetPlaybackInfo().AutoRepeatMode)\"; $nx = if ($m -eq 'None') { 'List' } elseif ($m -eq 'List') { 'Track' } else { 'None' }; $s.TryChangeAutoRepeatModeAsync([Windows.Media.MediaPlaybackAutoRepeatMode]$nx)"
}

/** Controls the Spotify desktop app. */
export async function mediaControl(action: string) {
  if (!Object.hasOwn(ACTIONS, action)) return false
  const out = await powershell(COMMON + `\n$s = Pick\nif ($s) { $r = Await (${ACTIONS[action]}) ([bool]); "ok $r" } else { 'none' }`, 10000)
  return out.includes('ok True')
}

// ---------- cover art ----------
// Windows gives the cover as a stream PowerShell 5 cannot read, so it comes from the
// public iTunes catalogue (free, no key) by artist and title.
const coverCache = new Map<string, string>()
const cleanTitle = (t: string) => t.replace(/\s*[([](with|feat\.?|ft\.?|prod\.?)[^)\]]*[)\]]/gi, '').replace(/\s+-\s+(\d{4} )?(remaster|live|radio edit|versi|en directo).*$/i, '').trim()

async function coverFor(title: string, artist: string) {
  const key = (artist + '|' + title).toLowerCase()
  if (coverCache.has(key)) return coverCache.get(key)!
  let url = ''
  try {
    const q = new URLSearchParams({ term: artist.split(/,|&/)[0] + ' ' + cleanTitle(title), entity: 'song', limit: '1' })
    const j: any = await (await fetch('https://itunes.apple.com/search?' + q, { signal: AbortSignal.timeout(8000) })).json()
    const art = j.results?.[0]?.artworkUrl100
    if (art) {
      const img = await fetch(art.replace('100x100', '600x600'), { signal: AbortSignal.timeout(8000) })
      if (img.ok) url = 'data:image/jpeg;base64,' + Buffer.from(await img.arrayBuffer()).toString('base64')
    }
  } catch { /* no cover */ }
  coverCache.set(key, url)
  return url
}

// ---------- lyrics ----------
const lyricsCache = new Map<string, Lyric[] | null>()

function parseLrc(lrc: string) {
  const out: Lyric[] = []
  for (const line of lrc.split(/\r?\n/)) {
    const m = /^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/.exec(line.trim())
    if (m) out.push({ t: +m[1] * 60 + +m[2], text: m[3].trim() || '♪' })
  }
  return out
}

/** Synced lyrics for a song (null if LRCLIB does not have them). */
async function lyricsFor(title: string, artist: string, album: string, dur: number) {
  const key = `${artist}|${title}`.toLowerCase()
  if (lyricsCache.has(key)) return lyricsCache.get(key)!
  const get = async (url: string) => {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'NEXUS desktop assistant (github.com/AleixAj/nexus)' } })
    return r.ok ? r.json() : null
  }
  let lines: Lyric[] | null = null
  try {
    const q = new URLSearchParams({ track_name: cleanTitle(title), artist_name: artist, ...(album ? { album_name: album } : {}), ...(dur ? { duration: String(Math.round(dur)) } : {}) })
    let j: any = await get('https://lrclib.net/api/get?' + q)
    if (!j?.syncedLyrics) {
      const list: any[] = (await get('https://lrclib.net/api/search?' + new URLSearchParams({ track_name: cleanTitle(title), artist_name: artist }))) || []
      j = list.find(x => x.syncedLyrics) || null
    }
    lines = j?.syncedLyrics ? parseLrc(j.syncedLyrics) : null
  } catch { lines = null }
  lyricsCache.set(key, lines)
  return lines
}
