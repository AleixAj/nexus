// Typing while NEXUS is the wallpaper. A window behind the desktop icons never gets the keyboard,
// so clicking one of its text fields opens a real, tiny text box exactly on top of it. What you
// type goes to the field underneath as you type; Enter sends it; Esc or clicking elsewhere closes it.
import { BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'

export type EditReq = {
  id: string
  x: number; y: number; w: number; h: number // page pixels, the page covers the monitor with the core
  value: string; placeholder: string; secret: boolean; multiline: boolean
  fontSize: number; accent: string
}

let box: BrowserWindow | null = null
let target: { owner: BrowserWindow; id: string } | null = null

const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)

function page(r: EditReq) {
  const field = r.multiline
    ? `<textarea id="f" placeholder="${esc(r.placeholder)}"></textarea>`
    : `<input id="f" type="${r.secret ? 'password' : 'text'}" placeholder="${esc(r.placeholder)}" spellcheck="false">`
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'"><style>
html,body{margin:0;height:100%;background:transparent;overflow:hidden}
#f{box-sizing:border-box;width:100%;height:100%;padding:0 14px;border-radius:10px;outline:none;resize:none;
  border:1px solid rgb(${r.accent} / .75);background:rgb(10 7 20 / .97);color:#FFF6E9;caret-color:rgb(${r.accent});
  font:${r.fontSize}px 'Space Grotesk',system-ui,sans-serif;box-shadow:0 0 0 3px rgb(${r.accent} / .18)}
textarea#f{padding:10px 14px}
#f::placeholder{color:rgb(226 218 240 / .45)}
</style></head><body>${field}<script>
const f = document.getElementById('f')
f.value = ${JSON.stringify(r.value).replace(/</g, '\\u003c')}
f.focus(); f.setSelectionRange(f.value.length, f.value.length)
f.addEventListener('input', () => nxEdit.change(f.value))
f.addEventListener('keydown', e => {
  if (e.key === 'Escape') nxEdit.close()
  else if (e.key === 'Enter' && !(f.tagName === 'TEXTAREA' && e.shiftKey)) { e.preventDefault(); nxEdit.submit(f.value) }
})
</script></body></html>`
}

export function closeEditBox() {
  const b = box
  box = null
  target = null
  if (b && !b.isDestroyed()) b.destroy()
}

/** d: the monitor the wallpaper page is on (the user picks which one shows the core). */
export function openEditBox(owner: BrowserWindow, r: EditReq, d: Electron.Rectangle = screen.getPrimaryDisplay().bounds) {
  closeEditBox()
  const b = new BrowserWindow({
    x: Math.round(d.x + r.x), y: Math.round(d.y + r.y), width: Math.max(80, Math.round(r.w)), height: Math.max(30, Math.round(r.h)),
    frame: false, transparent: true, hasShadow: false, alwaysOnTop: true, skipTaskbar: true,
    resizable: false, movable: false, minimizable: false, maximizable: false, fullscreenable: false, show: false,
    webPreferences: { preload: join(__dirname, '../preload/edit.js'), sandbox: true, spellcheck: false }
  })
  b.setAlwaysOnTop(true, 'pop-up-menu')
  box = b
  target = { owner, id: r.id }
  b.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(page(r)))
  b.once('ready-to-show', () => { b.show(); b.focus() })
  // clicking anywhere else closes it (what was typed is already in the field)
  b.on('blur', () => { if (box === b) closeEditBox() })
}

const fromBox = (e: Electron.IpcMainEvent) => !!box && !box.isDestroyed() && e.sender === box.webContents

ipcMain.on('edit:change', (e, value: unknown, submit: unknown) => {
  if (!fromBox(e) || !target || target.owner.isDestroyed()) return
  target.owner.webContents.send('desk:edit', { id: target.id, value: String(value ?? '').slice(0, 20000), submit: !!submit })
  if (submit) closeEditBox()
})
ipcMain.on('edit:close', e => { if (fromBox(e)) closeEditBox() })
