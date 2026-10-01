import { contextBridge, ipcRenderer, webUtils } from 'electron'

const on = (channel: string, fn: (...args: any[]) => void) => {
  const h = (_e: unknown, ...args: any[]) => fn(...args)
  ipcRenderer.on(channel, h)
  return () => ipcRenderer.removeListener(channel, h)
}

contextBridge.exposeInMainWorld('nexus', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch: object) => ipcRenderer.invoke('settings:set', patch),
  setKey: (provider: string, key: string) => ipcRenderer.invoke('key:set', provider, key),
  testKey: (provider: string, key: string, region?: string) => ipcRenderer.invoke('key:test', provider, key, region),
  speak: (text: string) => ipcRenderer.invoke('tts:speak', text),
  previewVoice: (text: string, voice: string) => ipcRenderer.invoke('tts:preview', text, voice),
  warmVoices: () => ipcRenderer.invoke('tts:warm'),
  transcribe: (audio: ArrayBuffer) => ipcRenderer.invoke('stt:transcribe', audio),
  ask: (id: number, text: string) => ipcRenderer.invoke('brain:ask', id, text),
  // where a file dropped on the window lives (the agent reads it from there)
  pathForFile: (file: File) => webUtils.getPathForFile(file),
  abort: () => ipcRenderer.invoke('brain:abort'),
  systemSnapshot: () => ipcRenderer.invoke('system:snapshot'),
  getWorld: () => ipcRenderer.invoke('world:get'),
  setAutostart: (on: boolean) => ipcRenderer.invoke('app:autostart', on),
  setMode: (mode: 'window' | 'wallpaper') => ipcRenderer.invoke('app:mode', mode),
  onCovered: (fn: (covered: boolean) => void) => on('app:covered', fn),
  onDelta: (fn: (id: number, t: string) => void) => on('brain:delta', fn),
  onAction: (fn: (id: number, label: string) => void) => on('brain:action', fn),
  onProgress: (fn: (id: number, label: string) => void) => on('brain:progress', fn),
  onConfirm: (fn: (id: number, cid: number, req: { title: string; detail: string }) => void) => on('brain:confirm', fn),
  confirmReply: (cid: number, ok: boolean) => ipcRenderer.invoke('brain:confirm-reply', cid, ok),
  onTtsQuota: (fn: (engine: string) => void) => on('tts:quota', fn),
  getNews: () => ipcRenderer.invoke('news:get'),
  newsTopics: () => ipcRenderer.invoke('news:topics'),
  listReminders: () => ipcRenderer.invoke('reminders:list'),
  cancelReminder: (id: number) => ipcRenderer.invoke('reminders:cancel', id),
  onReminder: (fn: (r: any) => void) => on('reminder:due', fn),
  onRemindersChanged: (fn: (l: any[]) => void) => on('reminders:changed', fn),
  getMemory: () => ipcRenderer.invoke('memory:get'),
  addFact: (text: string, cat: string) => ipcRenderer.invoke('memory:add', text, cat),
  deleteFact: (id: number) => ipcRenderer.invoke('memory:delete-fact', id),
  deleteChat: (id: number) => ipcRenderer.invoke('memory:delete-chat', id),
  clearMemory: (what: 'all' | 'chats') => ipcRenderer.invoke('memory:clear', what),
  spotifyStatus: () => ipcRenderer.invoke('spotify:status'),
  spotifyConnect: () => ipcRenderer.invoke('spotify:connect'),
  spotifyDisconnect: () => ipcRenderer.invoke('spotify:disconnect'),
  getMedia: () => ipcRenderer.invoke('media:get'),
  mediaControl: (action: string) => ipcRenderer.invoke('media:control', action),
  onMedia: (fn: (m: any) => void) => on('media:state', fn),
  onMediaExtra: (fn: (x: any) => void) => on('media:extra', fn),
  onHotkey: (fn: () => void) => on('hotkey:talk', fn),
  onDictate: (fn: () => void) => on('hotkey:dictate', fn),
  typeText: (text: string) => ipcRenderer.invoke('dictation:type', text)
})
