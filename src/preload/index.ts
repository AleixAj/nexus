import { contextBridge, ipcRenderer } from 'electron'

const on = (channel: string, fn: (...args: any[]) => void) => {
  const h = (_e: unknown, ...args: any[]) => fn(...args)
  ipcRenderer.on(channel, h)
  return () => ipcRenderer.removeListener(channel, h)
}

contextBridge.exposeInMainWorld('nexus', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch: object) => ipcRenderer.invoke('settings:set', patch),
  setKey: (provider: string, key: string) => ipcRenderer.invoke('key:set', provider, key),
  testKey: (provider: string, key: string) => ipcRenderer.invoke('key:test', provider, key),
  speak: (text: string) => ipcRenderer.invoke('tts:speak', text),
  previewVoice: (text: string, voice: string) => ipcRenderer.invoke('tts:preview', text, voice),
  transcribe: (audio: ArrayBuffer) => ipcRenderer.invoke('stt:transcribe', audio),
  ask: (id: number, text: string) => ipcRenderer.invoke('brain:ask', id, text),
  abort: () => ipcRenderer.invoke('brain:abort'),
  systemStatus: () => ipcRenderer.invoke('system:status'),
  getWorld: () => ipcRenderer.invoke('world:get'),
  setAutostart: (on: boolean) => ipcRenderer.invoke('app:autostart', on),
  setMode: (mode: 'window' | 'wallpaper') => ipcRenderer.invoke('app:mode', mode),
  onCovered: (fn: (covered: boolean) => void) => on('app:covered', fn),
  onDelta: (fn: (id: number, t: string) => void) => on('brain:delta', fn),
  onAction: (fn: (id: number, label: string) => void) => on('brain:action', fn),
  onProgress: (fn: (id: number, label: string) => void) => on('brain:progress', fn),
  onConfirm: (fn: (id: number, cid: number, req: { title: string; detail: string }) => void) => on('brain:confirm', fn),
  confirmReply: (cid: number, ok: boolean) => ipcRenderer.invoke('brain:confirm-reply', cid, ok),
  onHotkey: (fn: () => void) => on('hotkey:talk', fn)
})
