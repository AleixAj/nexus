import { app, BrowserWindow, globalShortcut, ipcMain, session, shell, type IpcMainInvokeEvent } from 'electron'
import { join } from 'path'
import { PROVIDERS, getKey, loadSettings, saveSettings, setKey } from './settings'
import { speak } from './tts'
import { ask, abort, transcribe } from './brain'
import { systemStatus } from './tools'
import { getWorld } from './world'

// the greeting plays on start, before any click
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
// laptops with two GPUs: use the dedicated one for the animated core
app.commandLine.appendSwitch('force_high_performance_gpu')

let win: BrowserWindow | null = null

export const HOTKEY = 'Control+Alt+Space'
const isDev = !app.isPackaged && !!process.env.ELECTRON_RENDERER_URL

// only our own page may use the privileged API
const trusted = (e: IpcMainInvokeEvent) => {
  const url = e.senderFrame?.url || ''
  return isDev ? url.startsWith(process.env.ELECTRON_RENDERER_URL!) : url.startsWith('file://')
}

function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 960,
    minHeight: 540,
    backgroundColor: '#05030A',
    show: false,
    autoHideMenuBar: true,
    title: 'NEXUS',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  })

  win.once('ready-to-show', () => win?.show())
  win.on('closed', () => { win = null })
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) shell.openExternal(url)
    return { action: 'deny' }
  })
  // dropping a file or link on the window must not navigate away from the app
  win.webContents.on('will-navigate', e => e.preventDefault())

  if (isDev) win.loadURL(process.env.ELECTRON_RENDERER_URL!)
  else win.loadFile(join(__dirname, '../renderer/index.html'))
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
    autostart: app.getLoginItemSettings().openAtLogin,
    providers: Object.fromEntries(Object.entries(PROVIDERS).map(([k, p]) => [k, { models: p.models, needsKey: p.needsKey, hasKey: !!getKey(k) }]))
  }))
  handle('settings:set', (_e, patch) => saveSettings(patch && typeof patch === 'object' ? patch : {}))
  handle('key:set', (_e, provider, key) => setKey(str(provider, 40), str(key, 400)))

  handle('tts:speak', (_e, text) => {
    const s = loadSettings()
    return speak(str(text, 1500), { voice: s.voice, lang: s.lang, speed: s.speed, pitch: s.pitch })
  })
  handle('tts:preview', (_e, text, voice) => {
    const s = loadSettings()
    return speak(str(text, 300), { voice: str(voice, 20), lang: s.lang, speed: s.speed, pitch: s.pitch })
  })

  handle('stt:transcribe', (_e, audio) => {
    if (!(audio instanceof ArrayBuffer) || audio.byteLength > 25e6) throw new Error('Audio no válido')
    return transcribe(audio, loadSettings().lang)
  })

  // streamed answer: deltas and executed actions are pushed as events
  handle('brain:ask', async (e, id, text) => {
    const send = (ch: string, ...a: unknown[]) => { if (!e.sender.isDestroyed()) e.sender.send(ch, ...a) }
    try {
      const full = await ask(str(text), {
        onDelta: t => send('brain:delta', id, t),
        onAction: label => send('brain:action', id, label)
      })
      return { ok: true, text: full }
    } catch (err: any) {
      if (err.name === 'AbortError') return { ok: false, error: 'ABORTED' }
      if (err.message !== 'NO_KEY') console.warn('[brain]', err.message)
      return { ok: false, error: err.message || String(err) }
    }
  })
  handle('brain:abort', () => abort())

  handle('system:status', () => systemStatus())
  handle('world:get', () => getWorld())
  handle('app:autostart', (_e, on) => app.setLoginItemSettings({ openAtLogin: on === true }))
}

function focusAndTalk() {
  if (!win) return
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
  win.webContents.send('hotkey:talk')
}

process.on('unhandledRejection', err => console.warn('[unhandled]', err))

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  })

  app.whenReady().then(() => {
    // microphone only for our own window
    session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => cb(permission === 'media' && wc === win?.webContents))

    registerIpc()
    createWindow()

    if (!globalShortcut.register(HOTKEY, focusAndTalk)) console.warn(`[hotkey] ${HOTKEY} está ocupado por otra aplicación`)
  })
}

app.on('will-quit', () => globalShortcut.unregisterAll())
app.on('window-all-closed', () => app.quit())
