// Updates from GitHub Releases: downloaded quietly, installed when NEXUS closes (or right away from the tray).
import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import { notify, setUpdateItem } from './window'

const EVERY = 6 * 60 * 60 * 1000 // look again every 6 hours (the PC can stay on for days)

export function startUpdater() {
  if (!app.isPackaged) return
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('update-downloaded', info => {
    notify('Actualización lista', `NEXUS ${info.version} se instalará al cerrar la app.`)
    setUpdateItem(`Reiniciar y actualizar a ${info.version}`, () => autoUpdater.quitAndInstall(true, true))
  })
  autoUpdater.on('error', err => console.warn('[update]', err.message))
  const check = () => { autoUpdater.checkForUpdates().catch(() => {}) }
  setTimeout(check, 15_000) // not during start-up
  setInterval(check, EVERY).unref()
}
