// The tiny text box used to type while NEXUS is the wallpaper (see main/editBox.ts).
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('nxEdit', {
  change: (value: string) => ipcRenderer.send('edit:change', value, false),
  submit: (value: string) => ipcRenderer.send('edit:change', value, true),
  close: () => ipcRenderer.send('edit:close'),
})
