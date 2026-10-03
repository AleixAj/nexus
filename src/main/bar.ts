// The floating bar: a small box over any app (a game, the browser…) to ask NEXUS something
// without opening it (Ctrl + Alt + A), or to act on the text selected in any app: summarise,
// translate, correct, explain or reply (Ctrl + Alt + S). The answer can be copied or pasted
// straight back where the text was. (Ideas from Ask Copilot / Raycast and Windows "Click to Do".)
import { BrowserWindow, clipboard, ipcMain, screen } from 'electron'
import { join } from 'path'
import { powershell } from './lib/powershell'
import { typeText } from './dictation'
import { isDev } from './window'

export const BAR_HOTKEY = 'Control+Alt+A'
export const SELECTION_HOTKEY = 'Control+Alt+S'

const WIDTH = 760
let bar: BrowserWindow | null = null
let ready: Promise<void> | null = null

function create() {
  const b = new BrowserWindow({
    width: WIDTH, height: 96, frame: false, transparent: true, hasShadow: false, alwaysOnTop: true, skipTaskbar: true,
    resizable: false, movable: true, minimizable: false, maximizable: false, fullscreenable: false, show: false,
    webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: true, spellcheck: false }
  })
  b.setAlwaysOnTop(true, 'pop-up-menu')
  b.webContents.on('will-navigate', e => e.preventDefault())
  // clicking elsewhere hides it (it stays loaded, so the next time it opens at once)
  b.on('blur', () => { if (!b.isDestroyed() && !b.webContents.isDevToolsOpened()) b.hide() })
  b.on('closed', () => { if (bar === b) { bar = null; ready = null } })
  ready = new Promise(res => b.webContents.once('did-finish-load', () => res()))
  const q = { screen: 'bar' }
  if (isDev) b.loadURL(process.env.ELECTRON_RENDERER_URL! + '?' + new URLSearchParams(q))
  else b.loadFile(join(__dirname, '../renderer/index.html'), { query: q })
  bar = b
  return b
}

/** Opens the bar on the monitor where the mouse is, near the top. */
export async function openBar(selection = '') {
  const b = bar && !bar.isDestroyed() ? bar : create()
  await ready
  const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea
  b.setBounds({ x: Math.round(area.x + (area.width - WIDTH) / 2), y: Math.round(area.y + area.height * 0.16), width: WIDTH, height: b.getBounds().height })
  b.webContents.send('bar:open', { selection })
  b.show()
  b.focus()
}

/**
 * The text selected in the app in front: Ctrl + C is sent once the hotkey's own keys are
 * released, and the clipboard gets its old text back afterwards.
 */
export async function copySelection(): Promise<string> {
  const before = await clipboard.readText().catch(() => '')
  await clipboard.writeText('')
  await powershell(
    "Add-Type -AssemblyName System.Windows.Forms; $n = 0; while ([System.Windows.Forms.Control]::ModifierKeys -ne 'None' -and $n -lt 40) { Start-Sleep -Milliseconds 25; $n++ }; [System.Windows.Forms.SendKeys]::SendWait('^c')",
    8000)
  let text = ''
  for (let i = 0; i < 8 && !text; i++) { await new Promise(r => setTimeout(r, 60)); text = await clipboard.readText().catch(() => '') }
  if (before) await clipboard.writeText(before)
  return text.trim()
}

export async function onSelectionHotkey() {
  const text = await copySelection().catch(() => '')
  await openBar(text.slice(0, 20000))
}

const fromBar = (e: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent) => !!bar && !bar.isDestroyed() && e.sender === bar.webContents

ipcMain.on('bar:resize', (e, h: unknown) => {
  if (!fromBar(e) || !bar) return
  const area = screen.getDisplayMatching(bar.getBounds()).workArea
  const height = Math.max(70, Math.min(Math.round(Number(h) || 0), Math.round(area.height * 0.7)))
  const r = bar.getBounds()
  if (r.height !== height) bar.setBounds({ ...r, height })
})
// "Probar" in Settings and the tray open it too
ipcMain.handle('bar:open', () => openBar())
ipcMain.on('bar:hide', e => { if (fromBar(e)) bar?.hide() })
ipcMain.handle('bar:copy', (e, text: unknown) => { if (fromBar(e)) clipboard.writeText(String(text ?? '').slice(0, 50000)) })
// back into the app where the text was: hide, let that app take the focus again, paste
ipcMain.handle('bar:paste', async (e, text: unknown) => {
  if (!fromBar(e) || !bar) return
  bar.hide()
  await new Promise(r => setTimeout(r, 180))
  await typeText(String(text ?? '').slice(0, 50000))
})
