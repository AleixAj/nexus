// Everything the window can ask the main process for. Only our own page may call it.
import { app, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { createHash } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { PROVIDERS, getKey, loadSettings, saveSettings, setKey, testKey } from './settings'
import { azureVoicesPaused, geminiVoicesPaused, isPremium, speak, speakDetailed, warmVoices } from './tts'
import { abort, ask, clearCurrentFiles, resetHistory } from './brain'
import { transcribe } from './stt'
import { spotify } from './tools'
import { getWorld } from './world'
import { TOPICS, getNews } from './news'
import { systemSnapshot } from './sysinfo'
import { cancelReminders, listReminders } from './reminders'
import { addFact, approveFact, clearMemory, deleteExchange, deleteFact, getMemory } from './memory'
import { currentExtra, currentMedia, mediaControl } from './media'
import { HOTKEY, isDev, switchMode, wallClicksChanged } from './window'
import { typeText } from './dictation'
import { ensureModel, feedWakeWord, modelReady, startWakeWord, stopWakeWord } from './wakeword'
import { broadcast } from './window'
import { listApprovals, revoke } from './approvals'
import { runDiagnostics } from './diagnostics'
import { quotaToday } from './brain/providers'
import { calendarConnected, events, setCalendarUrl } from './calendar'
import { deleteRoutine, listRoutines, setRoutineEnabled, triggerText } from './routines'
import { REDIRECT, connectSpotify, disconnectSpotify, spotifyStatus } from './spotifyApi'

const trusted = (e: IpcMainInvokeEvent) => {
  const url = e.senderFrame?.url || ''
  return isDev ? url.startsWith(process.env.ELECTRON_RENDERER_URL!) : url.startsWith('file://')
}

function handle(channel: string, fn: (e: IpcMainInvokeEvent, ...args: any[]) => unknown) {
  ipcMain.handle(channel, (e, ...args) => {
    if (!trusted(e)) throw new Error('Origen no permitido')
    return fn(e, ...args)
  })
}

const str = (v: unknown, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '')

// approvals the agent is waiting for (write files, run commands…)
const pendingConfirms = new Map<number, (ok: boolean | 'always') => void>()
let confirmSeq = 0
function answerConfirm(cid: number, ok: boolean | 'always') {
  const r = pendingConfirms.get(cid)
  if (!r) return
  pendingConfirms.delete(cid)
  r(ok)
}

export function registerIpc() {
  // ---------- settings and keys ----------
  handle('settings:get', () => ({
    ...loadSettings(),
    hotkey: HOTKEY,
    premiumPaused: geminiVoicesPaused(),
    azurePaused: azureVoicesPaused(),
    hasAzure: !!getKey('Azure'),
    autostart: app.getLoginItemSettings().openAtLogin,
    providers: Object.fromEntries(Object.entries(PROVIDERS).map(([k, p]) => [k, { models: p.models, needsKey: p.needsKey, hasKey: !!getKey(k) }]))
  }))
  handle('settings:set', (_e, patch) => {
    const p = patch && typeof patch === 'object' ? patch : {}
    const out = saveSettings(p)
    if ('wallClicks' in p) wallClicksChanged()
    return out
  })
  handle('key:set', (_e, provider, key) => setKey(str(provider, 40), str(key, 400)))
  handle('key:test', (_e, provider, key, region) => testKey(str(provider, 40), str(key, 400).trim(), str(region, 40)))
  handle('app:autostart', (_e, on) => app.setLoginItemSettings({ openAtLogin: on === true }))
  handle('app:mode', (_e, m) => { if (m === 'window' || m === 'wallpaper') switchMode(m) })

  // ---------- voice ----------
  handle('tts:speak', (_e, text) => {
    const s = loadSettings()
    return speak(str(text, 1500), { voice: s.voice, lang: s.lang, speed: s.speed, pitch: s.pitch })
  })
  handle('tts:preview', async (_e, text, voice) => {
    const s = loadSettings()
    const o = { voice: str(voice, 20), lang: s.lang, speed: s.speed, pitch: s.pitch }
    // samples are always the same sentence: keep them on disk (premium ones cost quota only once)
    const dir = join(app.getPath('userData'), 'voice-samples')
    const file = join(dir, createHash('sha1').update(JSON.stringify([str(text, 300), o])).digest('hex') + '.bin')
    try { return await readFile(file) } catch { /* not cached yet */ }
    const { audio, premium, offline } = await speakDetailed(str(text, 300), o)
    // a premium voice that fell back to a regular one (no key or no quota) is not cached as its sample
    if (!offline && (!isPremium(o.voice) || premium)) mkdir(dir, { recursive: true }).then(() => writeFile(file, audio)).catch(() => {})
    return audio
  })
  handle('tts:warm', () => warmVoices(loadSettings().lang))
  // "Hey Nexus": audio comes in small pieces many times a second, so it is a one-way message
  handle('wake:start', async (_e, phrase) => {
    // the first time, the Spanish model is downloaded (the window shows the progress)
    if (!modelReady()) await ensureModel(p => broadcast('wake:progress', p))
    startWakeWord(str(phrase, 60) || 'Hey Nexus', () => broadcast('wake:detected'))
  })
  handle('wake:stop', () => stopWakeWord())
  ipcMain.on('wake:audio', (e, data) => { if (trusted(e as any) && data instanceof Float32Array) feedWakeWord(data) })
  handle('dictation:type', (_e, text) => typeText(str(text, 20000)))
  handle('stt:transcribe', (_e, audio) => {
    if (!(audio instanceof ArrayBuffer) || audio.byteLength > 25e6) throw new Error('Audio no válido')
    return transcribe(audio, loadSettings().lang)
  })

  // ---------- the agent: deltas, progress, actions and approvals are pushed as events ----------
  handle('brain:ask', async (e, id, text) => {
    const send = (ch: string, ...a: unknown[]) => { if (!e.sender.isDestroyed()) e.sender.send(ch, ...a) }
    try {
      const full = await ask(str(text), {
        onDelta: t => send('brain:delta', id, t),
        onAction: label => send('brain:action', id, label),
        onProgress: label => send('brain:progress', id, label),
        confirm: req => new Promise<boolean | 'always'>(resolve => {
          const cid = ++confirmSeq
          pendingConfirms.set(cid, resolve)
          send('brain:confirm', id, cid, req)
          setTimeout(() => answerConfirm(cid, false), 120000) // no answer in two minutes counts as "no"
        })
      })
      return { ok: true, text: full }
    } catch (err: any) {
      if (err.name === 'AbortError') return { ok: false, error: 'ABORTED' }
      if (err.message !== 'NO_KEY') console.warn('[brain]', err.message)
      return { ok: false, error: err.message || String(err) }
    }
  })
  handle('brain:clear-file', () => clearCurrentFiles())
  handle('brain:abort', () => { abort(); pendingConfirms.forEach((_, cid) => answerConfirm(cid, false)) })
  handle('brain:confirm-reply', (_e, cid, ok) => answerConfirm(Number(cid), ok === 'always' ? 'always' : ok === true))
  handle('calendar:set', (_e, url) => setCalendarUrl(str(url, 1000)))
  handle('calendar:events', async (_e, days) => (calendarConnected() ? events(Math.max(1, Math.min(31, Number(days) || 1))).catch(() => []) : null))
  handle('diagnostics:run', () => runDiagnostics())
  handle('quota:get', () => quotaToday(loadSettings()))
  handle('approvals:list', () => listApprovals())
  handle('routines:list', () => listRoutines().map(r => ({ ...r, trigger: triggerText(r) })))
  handle('routines:delete', (_e, id) => deleteRoutine(Number(id)))
  handle('routines:enable', (_e, id, on) => setRoutineEnabled(Number(id), on === true))
  handle('approvals:revoke', (_e, key) => revoke(str(key, 100)))

  // ---------- panels ----------
  handle('system:snapshot', () => systemSnapshot())
  handle('world:get', () => getWorld())
  handle('news:get', () => { const s = loadSettings(); return getNews(s.newsTopics, s.newsAvoid) })
  handle('news:topics', () => Object.entries(TOPICS).map(([id, t]) => ({ id, label: t.label, sources: t.feeds.map(f => f[0]) })))
  handle('reminders:list', () => listReminders())
  handle('reminders:cancel', (_e, id) => cancelReminders([Number(id)]))
  handle('memory:get', () => getMemory())
  handle('memory:add', (_e, text, cat) => addFact(str(text, 300), str(cat, 30)))
  handle('memory:delete-fact', (_e, id) => deleteFact(Number(id)))
  handle('memory:approve-fact', (_e, id) => approveFact(Number(id)))
  handle('memory:delete-chat', (_e, id) => deleteExchange(Number(id)))
  handle('memory:clear', (_e, what) => { clearMemory(what === 'chats' ? 'chats' : 'all'); resetHistory() })
  handle('spotify:status', () => ({ ...spotifyStatus(), redirect: REDIRECT }))
  handle('spotify:connect', () => connectSpotify())
  handle('spotify:disconnect', () => disconnectSpotify())
  handle('media:get', () => ({ state: currentMedia(), extra: currentExtra() }))
  handle('media:control', (_e, action) => {
    const a = str(action, 20)
    return a === 'open' || a === 'liked' ? spotify(a).then(r => !r.startsWith('No ')) : mediaControl(a)
  })
}
