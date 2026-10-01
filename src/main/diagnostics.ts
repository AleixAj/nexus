// "Comprobar que todo funciona": every service NEXUS uses, checked without changing anything
// (no messages, no files, no AI answers). Each line says what failed and how to fix it.
// (Idea from JARVIS-OS: scripts/self_test.py + core/qa_mode.py, rebuilt for NEXUS.)
import { app } from 'electron'
import { execFile } from 'child_process'
import { existsSync } from 'fs'
import { statfs } from 'fs/promises'
import { PROVIDERS, getKey, loadSettings, testKey } from './settings'
import { speakDetailed } from './tts'
import { windowsSpeak } from './offlineVoice'
import { transcribe } from './stt'
import { getWorld } from './world'
import { getNews } from './news'
import { calendarConnected, events } from './calendar'
import { spotifyStatus } from './spotifyApi'
import { modelReady } from './wakeword'
import { getMemory } from './memory'
import { listReminders } from './reminders'
import { ddgResults } from './tools/web'

export type Check = { group: string; name: string; status: 'ok' | 'warn' | 'fail' | 'off'; detail: string }

const timed = <T>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('No responde a tiempo')), ms))])

async function check(group: string, name: string, fn: () => Promise<Omit<Check, 'group' | 'name'>>): Promise<Check> {
  try { return { group, name, ...(await timed(fn(), 25000)) } }
  catch (e: any) { return { group, name, status: 'fail', detail: String(e?.message || e).slice(0, 140) } }
}

export async function runDiagnostics(): Promise<Check[]> {
  const s = loadSettings()
  const keyed = Object.keys(PROVIDERS).filter(p => PROVIDERS[p].needsKey)
  const checks: Promise<Check>[] = [
    check('Conexión', 'Internet', async () => {
      const r = await fetch('https://www.google.com/generate_204', { signal: AbortSignal.timeout(8000) })
      return r.status === 204 || r.ok ? { status: 'ok', detail: 'Conectado' } : { status: 'fail', detail: 'Sin salida a internet' }
    }),
    ...keyed.map(p => check('Inteligencia', `Clave de ${p}`, async () => {
      const key = getKey(p)
      if (!key) return { status: 'off', detail: p === 'Cerebras' ? 'Sin clave · gratis en cloud.cerebras.ai (1 millón de tokens/día)' : 'Sin clave (opcional)' }
      return (await testKey(p, key)) ? { status: 'ok', detail: 'Válida' } : { status: 'fail', detail: 'La clave no funciona: pega una nueva en Ajustes' }
    })),
    check('Inteligencia', 'Al menos una IA', async () => {
      const any = keyed.some(p => getKey(p))
      return any ? { status: 'ok', detail: s.provider === 'Auto' ? 'Modo automático' : s.provider } : { status: 'fail', detail: 'Sin ninguna clave no puedo pensar: la de Groq es gratis (console.groq.com)' }
    }),
    check('Voz', 'Voz neuronal (Microsoft)', async () => {
      const r = await speakDetailed('Prueba.', { voice: s.voice, lang: s.lang, speed: 1, pitch: 0 })
      return r.offline ? { status: 'warn', detail: 'No responde: hablo con la voz de Windows mientras tanto' } : { status: 'ok', detail: r.premium ? 'Voz premium' : 'Funciona' }
    }),
    check('Voz', 'Voz sin internet (Windows)', async () => {
      const b = await windowsSpeak('Prueba.', s.lang)
      return b.length > 1000 ? { status: 'ok', detail: 'Lista como respaldo' } : { status: 'warn', detail: 'Windows no tiene voces instaladas' }
    }),
    check('Voz', 'Entender lo que dices', async () => {
      if (!getKey('Groq') && !(s.geminiStt && getKey('Gemini'))) return { status: 'fail', detail: 'Necesita la clave gratuita de Groq (o activar Gemini para entender la voz)' }
      // a Windows voice says a phrase and the recogniser must understand it
      const wav = await windowsSpeak('Hola Nexus, qué hora es', 'es-ES')
      const text = await transcribe(wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength) as ArrayBuffer, 'es-ES')
      return /hora/i.test(text) ? { status: 'ok', detail: `Entendido: «${text}»` } : { status: 'warn', detail: `Entendió «${text || '(nada)'}»` }
    }),
    check('Voz', 'Escuchar siempre', async () => {
      if (!s.wakeListen) return { status: 'off', detail: 'Desactivado' }
      return modelReady() ? { status: 'ok', detail: `Escucha «${s.wakeWord}»` } : { status: 'warn', detail: 'Falta descargar el modelo: apágalo y enciéndelo en Ajustes' }
    }),
    check('Internet', 'Búsqueda web', async () => {
      const hits = await ddgResults('noticias tecnología', 3)
      return hits.length ? { status: 'ok', detail: `${hits.length} resultados` } : { status: 'warn', detail: 'El buscador no devuelve resultados ahora' }
    }),
    check('Internet', 'Noticias', async () => {
      const n = await getNews(s.newsTopics, s.newsAvoid, 50)
      return n.length ? { status: 'ok', detail: `${n.length} titulares de hoy` } : { status: 'warn', detail: 'Ningún medio responde ahora' }
    }),
    check('Internet', 'Tiempo y ubicación', async () => {
      const w = await getWorld()
      return w.temp != null ? { status: 'ok', detail: `${w.city}: ${w.temp} °C` } : { status: 'warn', detail: 'No se pudo obtener el tiempo' }
    }),
    check('Cuentas', 'Calendario', async () => {
      if (!calendarConnected()) return { status: 'off', detail: 'No conectado (Ajustes → Calendario)' }
      const e = await events(7)
      return { status: 'ok', detail: `${e.length} eventos esta semana` }
    }),
    check('Cuentas', 'Spotify', async () => {
      const desktop = existsSync(`${process.env.APPDATA}\\Spotify\\Spotify.exe`)
      const acc = spotifyStatus()
      if (!desktop) return { status: 'warn', detail: 'No encuentro la app de escritorio de Spotify' }
      return { status: 'ok', detail: acc.connected ? `App de escritorio y cuenta de ${acc.user}` : 'App de escritorio · cuenta sin conectar (listas por nombre)' }
    }),
    check('Equipo', 'Datos guardados', async () => {
      const m = getMemory()
      return { status: 'ok', detail: `${m.facts.length} datos, ${m.chats.length} conversaciones, ${listReminders().length} recordatorios` }
    }),
    check('Equipo', 'Avisos con NEXUS cerrado', async () => {
      if (!app.isPackaged) return { status: 'off', detail: 'Solo en la app instalada' }
      const ok = await new Promise<boolean>(res => execFile('schtasks', ['/Query', '/FO', 'CSV', '/NH'], { windowsHide: true }, err => res(!err)))
      return ok ? { status: 'ok', detail: 'El Programador de tareas responde' } : { status: 'warn', detail: 'El Programador de tareas no responde: los avisos solo sonarán con NEXUS abierto' }
    }),
    check('Equipo', 'Espacio en disco', async () => {
      const st = await statfs(app.getPath('userData'))
      const free = st.bavail * st.bsize / 1073741824
      return free > 2 ? { status: 'ok', detail: `${free.toFixed(0)} GB libres` } : { status: 'warn', detail: `Solo ${free.toFixed(1)} GB libres` }
    }),
  ]
  return Promise.all(checks)
}
