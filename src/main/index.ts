// Start-up: one instance only, then the window, the tray, the hotkey and the background watchers.
import { cleanBackups } from './activity'
import { applyHotkeys, isOff } from './features'
import { startPulse } from './pulse'
import { BAR_HOTKEY, SELECTION_HOTKEY, onSelectionHotkey, openBar } from './bar'
import { Menu, app, desktopCapturer, globalShortcut, session, shell, webContents } from 'electron'
import { loadSettings } from './settings'
import { onAzureQuotaOut, onGeminiQuota } from './tts'
import { listReminders, startReminders, when } from './reminders'
import { listRoutines, startRoutines } from './routines'
import { watchMedia } from './media'
import { registerIpc } from './ipc'
import { startUpdater } from './updater'
import { pickQualityOnce } from './hardware'
import { DICTATE_HOTKEY } from './dictation'
import { HOTKEY, isDev, beforeQuit, broadcast, createTray, createWindow, mainWindow, notify, showWindow, talk } from './window'

// the greeting plays on start, before any click
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
// laptops with two GPUs: use the dedicated one for the animated core
app.commandLine.appendSwitch('force_high_performance_gpu')
// NEXUS's voice is not "media": no entry in the Windows media flyout and no media-key handling
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling,MediaSessionService')

process.on('unhandledRejection', err => console.warn('[unhandled]', err))

// ---------- hardening for every window (main, bar, wallpaper screens, text box) ----------
// No pop-ups, no navigating away from NEXUS's own page, no <webview>: links open in the browser.
app.on('web-contents-created', (_e, wc) => {
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  // (while developing, the page may reload itself from the dev server)
  wc.on('will-navigate', (e, url) => { if (!(isDev && url.startsWith(process.env.ELECTRON_RENDERER_URL!))) e.preventDefault() })
  wc.on('will-redirect', e => e.preventDefault())
  wc.on('will-attach-webview', e => e.preventDefault())
})

function startWatchers() {
  watchMedia(m => broadcast('media:state', m), x => broadcast('media:extra', x))
  startReminders((r, late) => {
    notify(r.alarm ? '⏰ Alarma' : 'Recordatorio', (late ? `Se te pasó (${when(r.at)}): ` : '') + r.text)
    broadcast('reminder:due', { ...r, late })
  }, () => broadcast('reminders:changed', listReminders()))
  startRoutines(r => { if (!isOff('routines')) broadcast('routine:run', r) }, () => broadcast('routines:changed', listRoutines()))
  // warnings on its own and the evening summary
  startPulse({ notice: (title, body) => mainWindow()?.webContents.send('pulse:notice', { title, body }), evening: () => mainWindow()?.webContents.send('pulse:evening') })
  onGeminiQuota(() => broadcast('tts:quota', 'Gemini'))
  onAzureQuotaOut(() => broadcast('tts:quota', 'Azure'))
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  // a scheduled reminder starting a second copy: this one already handles it
  app.on('second-instance', (_e, argv) => { if (!argv.includes('--background')) showWindow() })

  app.whenReady().then(async () => {
    // no menu in the installed app (its hidden shortcuts would open the developer tools)
    if (app.isPackaged) Menu.setApplicationMenu(null)
    // microphone and camera only for our own window; nothing else (location, notifications…) for anyone
    const isMain = (wc: Electron.WebContents | null) => !!wc && wc === mainWindow()?.webContents
    session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => cb(permission === 'media' && isMain(wc)))
    session.defaultSession.setPermissionCheckHandler((wc, permission) => permission === 'media' && isMain(wc))
    // the halo can follow the PC's audio (music): system loopback, no picker, only for the main window
    session.defaultSession.setDisplayMediaRequestHandler((req, cb) => {
      if (!req.frame || !isMain(webContents.fromFrame(req.frame) || null)) { cb({}); return }
      desktopCapturer.getSources({ types: ['screen'] }).then(src => cb({ video: src[0], audio: 'loopback' })).catch(() => cb({}))
    })

    registerIpc()
    cleanBackups() // copies kept for "undo" older than a week
    await pickQualityOnce()
    startWatchers()
    createTray()
    const st = loadSettings()
    createWindow(st.mode === 'wallpaper' || st.bootWall ? 'wallpaper' : 'window')
    startUpdater()
    if (!globalShortcut.register(HOTKEY, talk)) console.warn(`[hotkey] ${HOTKEY} está ocupado por otra aplicación`)
    // the hotkeys of features that can be switched off (Settings → Funciones): dictation does not
    // bring the window up (the text goes to the app in front); the bar asks from any app or acts on
    // the selected text
    applyHotkeys([
      { feature: 'dictation', accel: DICTATE_HOTKEY, run: () => broadcast('hotkey:dictate') },
      { feature: 'bar', accel: BAR_HOTKEY, run: () => { openBar() } },
      { feature: 'selection', accel: SELECTION_HOTKEY, run: () => { onSelectionHotkey() } },
    ])
  })
}

app.on('before-quit', e => { if (beforeQuit(() => app.quit())) e.preventDefault() })
app.on('will-quit', () => globalShortcut.unregisterAll())
// NEXUS lives in the tray: closing or swapping windows does not quit it
app.on('window-all-closed', () => {})
