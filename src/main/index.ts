// Start-up: one instance only, then the window, the tray, the hotkey and the background watchers.
import { app, desktopCapturer, globalShortcut, session } from 'electron'
import { loadSettings } from './settings'
import { onAzureQuotaOut, onGeminiQuota } from './tts'
import { listReminders, startReminders, when } from './reminders'
import { listRoutines, startRoutines } from './routines'
import { watchMedia } from './media'
import { registerIpc } from './ipc'
import { DICTATE_HOTKEY } from './dictation'
import { HOTKEY, beforeQuit, broadcast, createTray, createWindow, mainWindow, notify, showWindow, talk } from './window'

// the greeting plays on start, before any click
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
// laptops with two GPUs: use the dedicated one for the animated core
app.commandLine.appendSwitch('force_high_performance_gpu')
// NEXUS's voice is not "media": no entry in the Windows media flyout and no media-key handling
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling,MediaSessionService')

process.on('unhandledRejection', err => console.warn('[unhandled]', err))

function startWatchers() {
  watchMedia(m => broadcast('media:state', m), x => broadcast('media:extra', x))
  startReminders((r, late) => {
    notify(r.alarm ? '⏰ Alarma' : 'Recordatorio', (late ? `Se te pasó (${when(r.at)}): ` : '') + r.text)
    broadcast('reminder:due', { ...r, late })
  }, () => broadcast('reminders:changed', listReminders()))
  startRoutines(r => broadcast('routine:run', r), () => broadcast('routines:changed', listRoutines()))
  onGeminiQuota(() => broadcast('tts:quota', 'Gemini'))
  onAzureQuotaOut(() => broadcast('tts:quota', 'Azure'))
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', showWindow)

  app.whenReady().then(() => {
    // microphone only for our own window
    session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => cb(permission === 'media' && wc === mainWindow()?.webContents))
    // the halo can follow the PC's audio (music): system loopback, no picker
    session.defaultSession.setDisplayMediaRequestHandler((_req, cb) => {
      desktopCapturer.getSources({ types: ['screen'] }).then(src => cb({ video: src[0], audio: 'loopback' })).catch(() => cb({}))
    })

    registerIpc()
    startWatchers()
    createTray()
    createWindow(loadSettings().mode === 'wallpaper' ? 'wallpaper' : 'window')
    if (!globalShortcut.register(HOTKEY, talk)) console.warn(`[hotkey] ${HOTKEY} está ocupado por otra aplicación`)
    // dictation does not bring the window up: the text goes to the app in front
    if (!globalShortcut.register(DICTATE_HOTKEY, () => broadcast('hotkey:dictate'))) console.warn(`[hotkey] ${DICTATE_HOTKEY} está ocupado por otra aplicación`)
  })
}

app.on('before-quit', e => { if (beforeQuit(() => app.quit())) e.preventDefault() })
app.on('will-quit', () => globalShortcut.unregisterAll())
// NEXUS lives in the tray: closing or swapping windows does not quit it
app.on('window-all-closed', () => {})
