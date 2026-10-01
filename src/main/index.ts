import { app, BrowserWindow, Menu, Notification, Tray, globalShortcut, ipcMain, nativeImage, screen, session, shell, type IpcMainInvokeEvent } from 'electron'
import { join } from 'path'
import { PROVIDERS, getKey, loadSettings, saveSettings, setKey } from './settings'
import { azureVoicesPaused, geminiVoicesPaused, isPremium, onAzureQuotaOut, onGeminiQuota, speak, speakDetailed, warmVoices } from './tts'
import { createHash } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { ask, abort, transcribe } from './brain'
import { systemStatus } from './tools'
import { getWorld } from './world'
import { attachToDesktop, refreshWallpaper, stopWatching, watchCovered } from './wallpaper'

// the greeting plays on start, before any click
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
// laptops with two GPUs: use the dedicated one for the animated core
app.commandLine.appendSwitch('force_high_performance_gpu')

let win: BrowserWindow | null = null
let tray: Tray | null = null
let mode: 'window' | 'wallpaper' = 'window'
let quitting = false
let switching = false

export const HOTKEY = 'Control+Alt+Space'
const isDev = !app.isPackaged && !!process.env.ELECTRON_RENDERER_URL
const RES = join(__dirname, '../../resources')

// only our own page may use the privileged API
const trusted = (e: IpcMainInvokeEvent) => {
  const url = e.senderFrame?.url || ''
  return isDev ? url.startsWith(process.env.ELECTRON_RENDERER_URL!) : url.startsWith('file://')
}

function createWindow(m: 'window' | 'wallpaper', query: Record<string, string> = {}) {
  mode = m
  const wall = m === 'wallpaper'
  const { width, height } = screen.getPrimaryDisplay().bounds
  const w = new BrowserWindow({
    ...(wall
      // off-screen until it is moved behind the desktop icons
      ? { x: -32000, y: -32000, width, height, frame: false, skipTaskbar: true, resizable: false, movable: false, focusable: false }
      : { width: 1600, height: 900, minWidth: 960, minHeight: 540, autoHideMenuBar: true }),
    backgroundColor: '#05030A',
    show: false,
    title: 'NEXUS',
    icon: join(RES, 'icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      // behind the icons Chromium would think it is hidden and freeze the animation
      backgroundThrottling: !wall
    }
  })
  win = w

  w.once('ready-to-show', async () => {
    if (!wall) { w.show(); return }
    w.showInactive()
    try {
      await attachToDesktop(w)
    } catch (err: any) {
      console.warn('[wallpaper]', err.message)
      switchMode('window', { notice: 'wallpaper-failed' })
    }
  })
  // closing the window keeps NEXUS running in the tray
  w.on('close', e => {
    if (quitting || switching || wall) return
    e.preventDefault()
    w.hide()
    if (!loadSettings().trayHinted && Notification.isSupported()) {
      new Notification({ title: 'NEXUS sigue activo', body: 'Está en la bandeja del sistema. Pulse Ctrl + Alt + Espacio para hablarle.', icon: join(RES, 'icon.png') }).show()
      saveSettings({ trayHinted: true })
    }
  })
  w.on('closed', () => {
    if (win === w) win = null
    // Explorer restarted and took the desktop layer with it: come back
    if (wall && !quitting && !switching) setTimeout(() => { if (!win) createWindow('wallpaper', { quiet: '1' }) }, 3000)
  })
  w.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) shell.openExternal(url)
    return { action: 'deny' }
  })
  // dropping a file or link on the window must not navigate away from the app
  w.webContents.on('will-navigate', e => e.preventDefault())

  // pause the animation while a fullscreen app covers it
  w.webContents.once('did-finish-load', () => watchCovered(w, covered => { if (!w.isDestroyed()) w.webContents.send('app:covered', covered) }))

  const q = { mode: m, ...query }
  if (isDev) w.loadURL(process.env.ELECTRON_RENDERER_URL! + '?' + new URLSearchParams(q))
  else w.loadFile(join(__dirname, '../renderer/index.html'), { query: q })
  updateTray()
}

async function switchMode(m: 'window' | 'wallpaper', query: Record<string, string> = {}) {
  if (switching) return
  switching = true
  const was = mode
  stopWatching()
  win?.destroy()
  win = null
  if (was === 'wallpaper') await refreshWallpaper()
  saveSettings({ mode: m })
  switching = false
  createWindow(m, { quiet: '1', ...query })
}

function showWindow() {
  if (mode === 'wallpaper') { switchMode('window'); return }
  if (!win) { createWindow('window', { quiet: '1' }); return }
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

function updateTray() {
  if (!tray) return
  tray.setToolTip(mode === 'wallpaper' ? 'NEXUS · fondo de escritorio' : 'NEXUS')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Hablar con NEXUS', accelerator: 'Ctrl+Alt+Space', click: () => talk() },
    { type: 'separator' },
    { label: 'Fondo de escritorio', type: 'checkbox', checked: mode === 'wallpaper', click: i => switchMode(i.checked ? 'wallpaper' : 'window') },
    { label: 'Abrir ventana', click: showWindow },
    { type: 'separator' },
    { label: 'Salir', click: () => { quitting = true; app.quit() } }
  ]))
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(join(RES, 'tray.png')).resize({ width: 16, height: 16 }))
  tray.on('click', showWindow)
  updateTray()
}

// approvals the agent is waiting for (write files, run commands…)
const pendingConfirms = new Map<number, (ok: boolean) => void>()
let confirmSeq = 0
function answerConfirm(cid: number, ok: boolean) {
  const r = pendingConfirms.get(cid)
  if (!r) return
  pendingConfirms.delete(cid)
  r(ok)
}

// true if the service accepts the key (lists its models)
async function testKey(provider: string, key: string, region = '') {
  if (!key) return false
  if (provider === 'Azure') {
    if (!/^[a-z0-9]+$/.test(region)) return false
    try {
      const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`, { signal: AbortSignal.timeout(10000), headers: { 'Ocp-Apim-Subscription-Key': key } })
      return res.ok
    } catch { return true }
  }
  const url = provider === 'Gemini' ? 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1'
    : provider === 'Groq' ? 'https://api.groq.com/openai/v1/models'
    : provider === 'Cerebras' ? 'https://api.cerebras.ai/v1/models' : ''
  if (!url) return true
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: provider === 'Gemini' ? { 'x-goog-api-key': key } : { Authorization: `Bearer ${key}` }
    })
    return res.ok
  } catch {
    return true // offline: do not block saving
  }
}

const str = (v: unknown, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '')

function handle(channel: string, fn: (e: IpcMainInvokeEvent, ...args: any[]) => unknown) {
  ipcMain.handle(channel, (e, ...args) => {
    if (!trusted(e)) throw new Error('Origen no permitido')
    return fn(e, ...args)
  })
}

function registerIpc() {
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
    if (!isPremium(o.voice) || premium) {
      mkdir(dir, { recursive: true }).then(() => writeFile(file, audio)).catch(() => {})
    }
    return audio
  })

  handle('tts:warm', () => warmVoices(loadSettings().lang))
  handle('stt:transcribe', (_e, audio) => {
    if (!(audio instanceof ArrayBuffer) || audio.byteLength > 25e6) throw new Error('Audio no válido')
    return transcribe(audio, loadSettings().lang)
  })

  // streamed answer: deltas, progress, executed actions and approval requests are pushed as events
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
          // no answer in two minutes counts as "no"
          setTimeout(() => answerConfirm(cid, false), 120000)
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

  handle('system:status', () => systemStatus())
  handle('world:get', () => getWorld())
  handle('app:autostart', (_e, on) => app.setLoginItemSettings({ openAtLogin: on === true }))
  handle('app:mode', (_e, m) => { if (m === 'window' || m === 'wallpaper') switchMode(m) })
}

// global hotkey: in wallpaper mode just listen, in window mode also bring the window up
function talk() {
  if (!win) { showWindow(); return }
  if (mode === 'window') {
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  }
  win.webContents.send('hotkey:talk')
}

process.on('unhandledRejection', err => console.warn('[unhandled]', err))

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', showWindow)

  app.whenReady().then(() => {
    // microphone only for our own window
    session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => cb(permission === 'media' && wc === win?.webContents))

    registerIpc()
    onGeminiQuota(() => BrowserWindow.getAllWindows().forEach(w => w.webContents.send('tts:quota', 'Gemini')))
    onAzureQuotaOut(() => BrowserWindow.getAllWindows().forEach(w => w.webContents.send('tts:quota', 'Azure')))
    createTray()
    createWindow(loadSettings().mode === 'wallpaper' ? 'wallpaper' : 'window')

    if (!globalShortcut.register(HOTKEY, talk)) console.warn(`[hotkey] ${HOTKEY} está ocupado por otra aplicación`)
  })
}

app.on('before-quit', e => {
  quitting = true
  stopWatching()
  // give the desktop its normal wallpaper back before leaving
  if (mode === 'wallpaper' && win) {
    e.preventDefault()
    mode = 'window'
    win.destroy()
    refreshWallpaper().finally(() => app.quit())
  }
})
app.on('will-quit', () => globalShortcut.unregisterAll())
// NEXUS lives in the tray: closing or swapping windows does not quit it
app.on('window-all-closed', () => {})
