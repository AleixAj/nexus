// The NEXUS window in its two modes (normal window or desktop wallpaper) and the tray icon.
import { app, BrowserWindow, Menu, Notification, Tray, ipcMain, nativeImage, screen, shell } from 'electron'
import { join } from 'path'
import { loadSettings, saveSettings } from './settings'
import { attachToDesktop, refreshWallpaper, stopDesktop, type Pointer } from './wallpaper'
import { closeEditBox } from './editBox'
import { openBar } from './bar'

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
// opened by a scheduled reminder: stay in the tray (the reminder speaks and notifies)
let BACKGROUND = process.argv.includes('--background')
function secondaryArea() {
  const primary = screen.getPrimaryDisplay()
  return SECONDARY ? screen.getAllDisplays().find(d => d.id !== primary.id)?.workArea || null : null
}

/** Sends an event to every open window. */
export const broadcast = (channel: string, ...data: unknown[]) =>
  BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send(channel, ...data) })

/** Asks the window to do something only it can do (take a photo…) and waits for its answer. */
let askSeq = 0
const pendingAsks = new Map<number, (v: unknown) => void>()
ipcMain.on('window:answer', (e, id, value) => { if (e.sender === win?.webContents) { pendingAsks.get(id)?.(value); pendingAsks.delete(id) } })
export function askWindow(channel: string, timeout = 10000, ...args: unknown[]) {
  return new Promise<unknown>(resolve => {
    if (!win || win.isDestroyed()) { resolve({ error: 'la ventana no está abierta' }); return }
    const id = ++askSeq
    pendingAsks.set(id, resolve)
    win.webContents.send(channel, id, ...args)
    setTimeout(() => { if (pendingAsks.delete(id)) resolve({ error: 'no ha respondido a tiempo' }) }, timeout)
  })
}

export function notify(title: string, body: string) {
  if (Notification.isSupported()) new Notification({ title, body, icon: ICON }).show()
}

// Behind the icons: report what is in front of the wallpaper (so it can rest) and, if the
// user allows it, the clicks made on the desktop
function attachWall(w: BrowserWindow) {
  const send = (ch: string, data: unknown) => { if (!w.isDestroyed()) w.webContents.send(ch, data) }
  return attachToDesktop(w, {
    onFront: state => send('app:covered', state),
    onPointer: loadSettings().wallClicks ? p => pointerTo(w, p) : undefined,
  })
}

// The mouse on the desktop, given to the page as real input: hover effects, clicks and the
// wheel behave exactly as in a normal window
function pointerTo(w: BrowserWindow, p: Pointer) {
  if (w.isDestroyed()) return
  const x = Math.round(p.x), y = Math.round(p.y), wc = w.webContents
  if (p.kind === 'leave') wc.sendInputEvent({ type: 'mouseLeave', x: -1, y: -1 })
  else if (p.kind === 'move') wc.sendInputEvent({ type: 'mouseMove', x, y })
  else if (p.kind === 'wheel') wc.sendInputEvent({ type: 'mouseWheel', x, y, deltaX: 0, deltaY: p.delta || 0, canScroll: true })
  else wc.sendInputEvent({ type: p.kind === 'down' ? 'mouseDown' : 'mouseUp', x, y, button: 'left', clickCount: 1 })
}

/** The "answer clicks on the wallpaper" switch changed: restart the helper with or without the mouse. */
export function wallClicksChanged() {
  if (mode === 'wallpaper' && win && !win.isDestroyed()) attachWall(win).catch(err => console.warn('[wallpaper]', err.message))
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
      spellcheck: false, // no dictionaries in memory: the chat is short
      // behind the icons Chromium would think it is hidden and freeze the animation
      backgroundThrottling: !wall
    }
  })
  win = w

  w.once('ready-to-show', async () => {
    if (!wall) { if (BACKGROUND) { BACKGROUND = false; return } if (SECONDARY) w.showInactive(); else w.show(); return }
    w.showInactive()
    try {
      await attachWall(w)
      openExtras()
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
      notify('NEXUS sigue activo', 'Está en la bandeja del sistema. Pulsa Ctrl + Alt + Espacio para hablarle.')
      saveSettings({ trayHinted: true })
    }
  })
  w.on('closed', () => {
    if (wall) stopDesktop(w) // its helper must not outlive it
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


  const q = { mode: m, ...(BACKGROUND ? { quiet: '1' } : {}), ...query }
  loadPage(w, q)
  updateTray()
}

function loadPage(w: BrowserWindow, q: Record<string, string>) {
  if (isDev) w.loadURL(process.env.ELECTRON_RENDERER_URL! + '?' + new URLSearchParams(q))
  else w.loadFile(join(__dirname, '../renderer/index.html'), { query: q })
}

// ---------- the other monitors ----------
// With "Fondo en las otras pantallas" every other monitor gets a window with only the galaxy
// (no core, no buttons), also behind its icons and matching the main one.
let extras: BrowserWindow[] = []
let watchingDisplays = false

/** Where a monitor is, seen from the primary one (the galaxy glows from that side). */
function sideOf(d: Electron.Display) {
  const p = screen.getPrimaryDisplay().bounds, b = d.bounds
  const dx = b.x + b.width / 2 - (p.x + p.width / 2), dy = b.y + b.height / 2 - (p.y + p.height / 2)
  return Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'top' : 'bottom')
}

export function closeExtras() {
  for (const w of extras) { stopDesktop(w); if (!w.isDestroyed()) w.destroy() }
  extras = []
}

export function openExtras() {
  closeExtras()
  if (!watchingDisplays) {
    // monitors plugged, unplugged or rearranged: rebuild
    watchingDisplays = true
    let t: NodeJS.Timeout | undefined
    const again = () => { clearTimeout(t); t = setTimeout(() => { if (mode === 'wallpaper' && win) openExtras() }, 1500) }
    screen.on('display-added', again); screen.on('display-removed', again); screen.on('display-metrics-changed', again)
  }
  if (mode !== 'wallpaper' || !loadSettings().wallExtend) return
  const primary = screen.getPrimaryDisplay()
  for (const d of screen.getAllDisplays()) {
    if (d.id === primary.id) continue
    const w = new BrowserWindow({
      x: -32000, y: -32000, width: d.bounds.width, height: d.bounds.height, frame: false, skipTaskbar: true, resizable: false,
      movable: false, focusable: false, show: false, backgroundColor: '#05030A', title: 'NEXUS',
      webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: true, spellcheck: false, backgroundThrottling: false }
    })
    extras.push(w)
    w.on('closed', () => stopDesktop(w))
    w.once('ready-to-show', async () => {
      w.showInactive()
      try {
        await attachToDesktop(w, { onFront: state => { if (!w.isDestroyed()) w.webContents.send('app:covered', state) } }, d)
      } catch (err: any) {
        console.warn('[wallpaper] otra pantalla:', err.message)
        stopDesktop(w); if (!w.isDestroyed()) w.destroy()
      }
    })
    w.webContents.on('will-navigate', e => e.preventDefault())
    loadPage(w, { mode: 'wallpaper', screen: 'extra', side: sideOf(d), quiet: '1' })
  }
}

/** The look changed (theme, quality, motion): the other monitors follow. */
export const extrasRefresh = () => extras.forEach(w => { if (!w.isDestroyed()) w.webContents.send('extra:settings') })

function placeOnSecondary() {
  const a = secondaryArea()
  if (!a) return {}
  const width = Math.min(1600, a.width), height = Math.min(900, a.height)
  return { x: a.x + Math.round((a.width - width) / 2), y: a.y + Math.round((a.height - height) / 2), width, height }
}

export async function switchMode(m: Mode, query: Record<string, string> = {}) {
  if (switching) return
  switching = true
  closeEditBox()
  closeExtras()
  const was = mode
  stopDesktop()
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

// "restart and update", once an update has been downloaded
let updateItem: { label: string; click: () => void } | null = null
export function setUpdateItem(label: string, click: () => void) {
  updateItem = { label, click }
  updateTray()
}

function updateTray() {
  if (!tray) return
  tray.setToolTip(mode === 'wallpaper' ? 'NEXUS · fondo de escritorio' : 'NEXUS')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Hablar con NEXUS', accelerator: 'Ctrl+Alt+Space', click: talk },
    { label: 'Preguntar por escrito', accelerator: 'Ctrl+Alt+A', click: () => { openBar() } },
    { type: 'separator' },
    { label: 'Fondo de escritorio', type: 'checkbox', checked: mode === 'wallpaper', click: i => switchMode(i.checked ? 'wallpaper' : 'window') },
    { label: 'Abrir ventana', click: showWindow },
    { type: 'separator' },
    ...(updateItem ? [{ label: updateItem.label, click: () => { quitting = true; updateItem!.click() } }, { type: 'separator' as const }] : []),
    { label: 'Reiniciar NEXUS', click: restartApp },
    { label: 'Salir', click: () => { quitting = true; app.quit() } }
  ]))
}

export function createTray() {
  tray = new Tray(nativeImage.createFromPath(join(RES, 'tray.png')).resize({ width: 16, height: 16 }))
  tray.on('click', showWindow)
  updateTray()
}

/** Close and open again, like a fresh start (with the intro). */
export function restartApp() {
  quitting = true
  app.relaunch({ args: process.argv.slice(1).filter(a => a !== '--background') })
  app.quit()
}

/** Before quitting: give the desktop its normal wallpaper back. Returns true if quitting must wait. */
export function beforeQuit(done: () => void) {
  quitting = true
  closeExtras()
  stopDesktop()
  if (mode !== 'wallpaper' || !win) return false
  mode = 'window'
  win.destroy()
  refreshWallpaper().finally(done)
  return true
}
