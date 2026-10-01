// Everything the window can ask the main process for. Only our own page may call it.
import { app, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { createHash } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { PROVIDERS, getKey, loadSettings, saveSettings, setKey, testKey } from './settings'
import { azureVoicesPaused, geminiVoicesPaused, isPremium, speak, speakDetailed, warmVoices } from './tts'
import { abort, ask, resetHistory } from './brain'
import { transcribe } from './stt'
import { spotify } from './tools'
import { getWorld } from './world'
import { TOPICS, getNews } from './news'
import { systemSnapshot } from './sysinfo'
import { cancelReminders, listReminders } from './reminders'
import { addFact, clearMemory, deleteExchange, deleteFact, getMemory } from './memory'
import { currentExtra, currentMedia, mediaControl } from './media'
import { HOTKEY, isDev, switchMode } from './window'

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
const pendingConfirms = new Map<number, (ok: boolean) => void>()
let confirmSeq = 0
function answerConfirm(cid: number, ok: boolean) {
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
  handle('settings:set', (_e, patch) => saveSettings(patch && typeof patch === 'object' ? patch : {}))
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
    const { audio, premium } = await speakDetailed(str(text, 300), o)
    // a premium voice that fell back to a regular one (no key or no quota) is not cached as its sample
    if (!isPremium(o.voice) || premium) mkdir(dir, { recursive: true }).then(() => writeFile(file, audio)).catch(() => {})
    return audio
  })
  handle('tts:warm', () => warmVoices(loadSettings().lang))
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
        confirm: req => new Promise<boolean>(resolve => {
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
  handle('brain:abort', () => { abort(); pendingConfirms.forEach((_, cid) => answerConfirm(cid, false)) })
  handle('brain:confirm-reply', (_e, cid, ok) => answerConfirm(Number(cid), ok === true))

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
  handle('memory:delete-chat', (_e, id) => deleteExchange(Number(id)))
  handle('memory:clear', (_e, what) => { clearMemory(what === 'chats' ? 'chats' : 'all'); resetHistory() })
  handle('media:get', () => ({ state: currentMedia(), extra: currentExtra() }))
  handle('media:control', (_e, action) => {
    const a = str(action, 20)
    return a === 'open' || a === 'liked' ? spotify(a).then(r => !r.startsWith('No ')) : mediaControl(a)
  })
}
