// The NEXUS window in its two modes (normal window or desktop wallpaper) and the tray icon.
import { app, BrowserWindow, Menu, Notification, Tray, nativeImage, screen, shell } from 'electron'
import { join } from 'path'
import { loadSettings, saveSettings } from './settings'
import { attachToDesktop, refreshWallpaper, stopWatching, watchCovered } from './wallpaper'

export type Mode = 'window' | 'wallpaper'

export const HOTKEY = 'Control+Alt+Space'
export const isDev = !app.isPackaged && !!process.env.ELECTRON_RENDERER_URL
export const RES = join(__dirname, '../../resources')
export const ICON = join(RES, 'icon.png')

let win: BrowserWindow | null = null
let tray: Tray | null = null
let mode: Mode = 'window'
let switching = false
export let quitting = false

export const mainWindow = () => win

// "--display=secondary": open on the other monitor without taking the focus (tests and updates,
// so a game or work on the main screen is not interrupted)
const SECONDARY = process.argv.includes('--display=secondary')
function secondaryArea() {
  const primary = screen.getPrimaryDisplay()
  return SECONDARY ? screen.getAllDisplays().find(d => d.id !== primary.id)?.workArea || null : null
}

/** Sends an event to every open window. */
export const broadcast = (channel: string, ...data: unknown[]) =>
  BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send(channel, ...data) })

export function notify(title: string, body: string) {
  if (Notification.isSupported()) new Notification({ title, body, icon: ICON }).show()
}

export function createWindow(m: Mode, query: Record<string, string> = {}) {
  mode = m
  const wall = m === 'wallpaper'
  const { width, height } = screen.getPrimaryDisplay().bounds
  const w = new BrowserWindow({
    ...(wall
      // off-screen until it is moved behind the desktop icons
      ? { x: -32000, y: -32000, width, height, frame: false, skipTaskbar: true, resizable: false, movable: false, focusable: false }
      : { width: 1600, height: 900, minWidth: 960, minHeight: 540, autoHideMenuBar: true, ...placeOnSecondary() }),
    backgroundColor: '#05030A',
    show: false,
    title: 'NEXUS',
    icon: ICON,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      // behind the icons Chromium would think it is hidden and freeze the animation
      backgroundThrottling: !wall
    }
  })
  win = w

  w.once('ready-to-show', async () => {
    if (!wall) { if (SECONDARY) w.showInactive(); else w.show(); return }
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
    if (!loadSettings().trayHinted) {
      notify('NEXUS sigue activo', 'Está en la bandeja del sistema. Pulse Ctrl + Alt + Espacio para hablarle.')
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

function placeOnSecondary() {
  const a = secondaryArea()
  if (!a) return {}
  const width = Math.min(1600, a.width), height = Math.min(900, a.height)
  return { x: a.x + Math.round((a.width - width) / 2), y: a.y + Math.round((a.height - height) / 2), width, height }
}

export async function switchMode(m: Mode, query: Record<string, string> = {}) {
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

export function showWindow() {
  if (mode === 'wallpaper') { switchMode('window'); return }
  if (!win) { createWindow('window', { quiet: '1' }); return }
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

/** Global hotkey: in wallpaper mode just listen, in window mode also bring the window up. */
export function talk() {
  if (!win) { showWindow(); return }
  if (mode === 'window') showWindow()
  win.webContents.send('hotkey:talk')
}

function updateTray() {
  if (!tray) return
  tray.setToolTip(mode === 'wallpaper' ? 'NEXUS · fondo de escritorio' : 'NEXUS')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Hablar con NEXUS', accelerator: 'Ctrl+Alt+Space', click: talk },
    { type: 'separator' },
    { label: 'Fondo de escritorio', type: 'checkbox', checked: mode === 'wallpaper', click: i => switchMode(i.checked ? 'wallpaper' : 'window') },
    { label: 'Abrir ventana', click: showWindow },
    { type: 'separator' },
    { label: 'Salir', click: () => { quitting = true; app.quit() } }
  ]))
}

export function createTray() {
  tray = new Tray(nativeImage.createFromPath(join(RES, 'tray.png')).resize({ width: 16, height: 16 }))
  tray.on('click', showWindow)
  updateTray()
}

/** Before quitting: give the desktop its normal wallpaper back. Returns true if quitting must wait. */
export function beforeQuit(done: () => void) {
  quitting = true
  stopWatching()
  if (mode !== 'wallpaper' || !win) return false
  mode = 'window'
  win.destroy()
  refreshWallpaper().finally(done)
  return true
}
