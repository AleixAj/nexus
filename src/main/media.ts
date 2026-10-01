// What is playing on the PC (Spotify, browsers…) through Windows' media sessions,
// its controls, and synced lyrics from LRCLIB (free, no key).
import { app } from 'electron'
import { spawn, type ChildProcess } from 'child_process'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { powershell } from './agent'

const COMMON = String.raw`
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
        $others = @()
        [pscustomobject]@{
          app = $s.SourceAppUserModelId; title = $p.Title; artist = $p.Artist; album = $p.AlbumTitle
          playing = $playing; pos = $pos; dur = $dur; shuffle = $pb.IsShuffleActive; repeat = "$($pb.AutoRepeatMode)"
          others = $others
        } | ConvertTo-Json -Compress -Depth 4
        [Console]::Out.Flush()
        $last = $key
      }
      $lastPos = $pos; $lastT = $now
    } elseif ($last -ne 'none') { '{"none":true}'; [Console]::Out.Flush(); $last = 'none' }
  } catch { }
  Start-Sleep -Milliseconds 1500
}
`

export type MediaState = {
  none?: boolean; app: string; title: string; artist: string; album: string; playing: boolean
  pos: number; dur: number; shuffle: boolean; repeat: string; others: { app: string; title: string; artist: string }[]
}

let watcher: ChildProcess | null = null
let last: MediaState | null = null

function script(name: string, body: string) {
  const f = join(app.getPath('userData'), name)
  writeFileSync(f, body, 'utf8')
  return f
}

/** Starts watching the media sessions; `onChange` receives every change (cover only when the track changes). */
export function watchMedia(onChange: (m: MediaState | null) => void) {
  if (watcher) return
  const file = script('nexus-media.ps1', WATCH)
  const p = spawn('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', file], {
    windowsHide: true, env: { ...process.env, NX_PARENT: String(process.pid) }
  })
  let buf = ''
  p.stdout.on('data', d => {
    buf += d
    const lines = buf.split(/\r?\n/)
    buf = lines.pop() || ''
    for (const l of lines) {
      if (!l.startsWith('{')) continue
      try {
        const m = JSON.parse(l)
        if (m.none) { last = null; onChange(null); continue }
        m.others = Array.isArray(m.others) ? m.others : m.others ? [m.others] : []
        last = m
        onChange(m)
      } catch { /* partial line */ }
    }
  })
  p.on('exit', () => { watcher = null; setTimeout(() => watchMedia(onChange), 5000) }) // restart if it dies
  watcher = p
}

export const currentMedia = () => last

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
export const cleanTitle = (t: string) => t.replace(/\s*[([](with|feat\.?|ft\.?|prod\.?)[^)\]]*[)\]]/gi, '').replace(/\s+-\s+(\d{4} )?(remaster|live|radio edit|versi|en directo).*$/i, '').trim()

export async function coverFor(title: string, artist: string) {
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
const lyricsCache = new Map<string, { t: number; text: string }[] | null>()

function parseLrc(lrc: string) {
  const out: { t: number; text: string }[] = []
  for (const line of lrc.split(/\r?\n/)) {
    const m = /^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/.exec(line.trim())
    if (m) out.push({ t: +m[1] * 60 + +m[2], text: m[3].trim() || '♪' })
  }
  return out
}

/** Synced lyrics for a song (null if LRCLIB does not have them). */
export async function lyricsFor(title: string, artist: string, album: string, dur: number) {
  const key = `${artist}|${title}`.toLowerCase()
  if (lyricsCache.has(key)) return lyricsCache.get(key)!
  const get = async (url: string) => {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'NEXUS desktop assistant (github.com/AleixAj/nexus)' } })
    return r.ok ? r.json() : null
  }
  let lines: { t: number; text: string }[] | null = null
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
