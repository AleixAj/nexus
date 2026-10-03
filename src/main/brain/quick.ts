// Orders that need no AI: "pausa", "siguiente", "sube el volumen", "abre Discord", "qué hora es",
// "avísame en 10 minutos de sacar la ropa", "bloquea el PC"… They are answered at once, work
// without internet or keys and spend no free quota. Anything longer or less clear goes to the AI.
// (Idea from Open.Jarvis: local command routing before the AI.)
import { currentMedia } from '../media'
import { getWorld } from '../world'

export type Quick =
  | { answer: string }
  | { tool: string; args: Record<string, unknown>; reply: (result: string) => string; ok?: (result: string) => boolean }

const plain = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const WORDS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, quince: 15, veinte: 20, veinticinco: 25, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, noventa: 90
}
const N = '(\\d{1,3}|' + Object.keys(WORDS).join('|') + ')'
const num = (w: string) => (/^\d+$/.test(w) ? +w : WORDS[w] ?? NaN)

const pad = (n: number) => String(n).padStart(2, '0')
const local = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

// ---------- reminders, timers and alarms ----------
const IN_TIME = new RegExp(`^(?:avisame|recuerdame|recuerda|pon(?:me)? un recordatorio) (?:dentro de|en) (?:${N} (minutos?|mins?|horas?|segundos?)|(media hora|un cuarto de hora))(?:,? (?:que|de|para|a) (.+))?$`)
const TIMER = new RegExp(`^(?:pon(?:me)? )?(?:un )?(?:temporizador|cronometro|timer) (?:de|para|en) (?:${N} (minutos?|mins?|horas?|segundos?)|(media hora))$`)
const ALARM = /^(?:pon(?:me)? )?(?:una )?alarma (?:a|para) las (\d{1,2})(?::(\d{2})| y (media|cuarto))?(?: de la (manana|tarde|noche|madrugada))?(?:,? (?:para|que) (.+))?$/

function minutesOf(n: string | undefined, unit: string | undefined, phrase: string | undefined) {
  if (phrase) return phrase === 'media hora' ? 30 : 15
  const v = num(n || '')
  if (!Number.isFinite(v) || v <= 0) return NaN
  return /^hora/.test(unit || '') ? v * 60 : /^seg/.test(unit || '') ? v / 60 : v
}

function reminder(p: string, t: string): Quick | null {
  let m = IN_TIME.exec(p)
  if (m) {
    const mins = minutesOf(m[1], m[2], m[3])
    if (!Number.isFinite(mins)) return null
    // the text keeps the user's accents and capitals (p and t have the same length)
    const text = m[4] ? t.slice(t.length - m[4].length) : 'Recordatorio'
    return { tool: 'set_reminder', args: { text, in_minutes: mins }, reply: r => r.startsWith('Error') ? r : `Hecho: te aviso ${mins < 1 ? 'en unos segundos' : `en ${fmtMins(mins)}`}.` }
  }
  m = TIMER.exec(p)
  if (m) {
    const mins = minutesOf(m[1], m[2], m[3])
    if (!Number.isFinite(mins)) return null
    return { tool: 'set_reminder', args: { text: 'Temporizador', in_minutes: mins, alarm: true }, reply: r => r.startsWith('Error') ? r : `Temporizador de ${fmtMins(mins)} en marcha.` }
  }
  m = ALARM.exec(p)
  if (m) {
    let h = +m[1]
    const min = m[2] ? +m[2] : m[3] === 'media' ? 30 : m[3] === 'cuarto' ? 15 : 0
    if (h > 23 || min > 59) return null
    if ((m[4] === 'tarde' || m[4] === 'noche') && h < 12) h += 12
    const at = new Date(); at.setHours(h, min, 0, 0)
    if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1)
    const text = m[5] ? t.slice(t.length - m[5].length) : 'Alarma'
    const day = at.getDate() === new Date().getDate() ? 'hoy' : 'mañana'
    return { tool: 'set_reminder', args: { text, at: local(at), alarm: true }, reply: r => r.startsWith('Error') ? r : `Alarma puesta para ${day} a las ${h}:${pad(min)}.` }
  }
  return null
}
const fmtMins = (m: number) => m >= 60 && m % 60 === 0 ? `${m / 60} ${m === 60 ? 'hora' : 'horas'}` : m < 1 ? `${Math.round(m * 60)} segundos` : `${m} ${m === 1 ? 'minuto' : 'minutos'}`

// ---------- music, volume, apps, the PC ----------
const PAUSE = /^(pausa|pausala|pausa la musica|para la musica|deten la musica|pausa la cancion|para la cancion)$/
const RESUME = /^(reanuda|reanudala|continua|play|dale al play|quita la pausa|vuelve a poner la musica|reanuda la musica|sigue con la musica)$/
const NEXT = /^(siguiente|la siguiente|siguiente cancion|siguiente tema|pasa(la)?|pasa de cancion|salta(la)?|salta la cancion|otra cancion|cambia de cancion|next)$/
const PREV = /^(anterior|la anterior|cancion anterior|vuelve a la anterior|pon la anterior|la de antes)$/
const NOW = /^(que (cancion )?(suena|esta sonando|es esta)|que estoy escuchando|como se llama esta cancion)$/
const VOL = /^(sube|subele|baja|bajale)(?: el)? volumen(?: (un poco|mucho|bastante|al maximo))?$|^(mas alto|mas bajo|mas volumen|menos volumen)$/
const MUTE = /^(silencia(lo)?|mutea|quita el sonido|pon el sonido|activa el sonido)$/
// "abre X": not folders, webs, lists or panels of NEXUS (those need the AI or have their own tool)
const OPEN = /^(?:abre|abreme|abrir|inicia|lanza|ejecuta|arranca) (?:el |la |los |las |un |una )?(?:programa |aplicacion |app )?(.{2,40})$/
const NOT_APP = /carpeta|archivo|fichero|documento|pagina|\bweb\b|\.(com|es|net|org)\b|http|lista|playlist|cancion|juego|steam|rutina|ajustes|panel|chat|noticias|memoria|\by\b/

export async function quickCommand(raw: string, callName = ''): Promise<Quick | null> {
  let t = raw.normalize('NFC').trim().replace(/[¿?¡!.]+/g, '').replace(/\s+/g, ' ')
  // "Oye Nexus, …", "Jarvis, …", "… por favor"
  const names = ['oye', 'hey', 'ey', 'hola', 'vale', 'venga', 'nexus', ...(callName ? [plain(callName)] : [])]
  for (let again = true; again;) {
    again = false
    for (const n of names) {
      const re = new RegExp(`^${n.replace(/[^a-z0-9 ]/g, '')}[\\s,]+`, 'i')
      if (re.test(plain(t))) { t = t.slice(plain(t).match(re)![0].length); again = true }
    }
  }
  t = t.replace(/^por favor,? /i, '').replace(/,? por favor$/i, '').trim()
  const p = plain(t)
  if (!p) return null

  // reminders may be long and contain "y" ("…que saque la ropa y tienda")
  if (p.length <= 160) { const r = reminder(p, t); if (r) return r }
  // anything longer or with several steps is for the AI
  if (p.length > 60 || /,| y |\bluego\b|\bdespues\b|\bentonces\b/.test(p)) return null

  if (/^(que hora es|dime la hora|me dices la hora|la hora|hora)$/.test(p)) {
    const d = new Date()
    return { answer: `Son las ${d.getHours()}:${pad(d.getMinutes())}.` }
  }
  if (/^(que dia es hoy|que dia es|a que dia estamos|que fecha es hoy|dime la fecha|la fecha)$/.test(p)) {
    return { answer: 'Hoy es ' + new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '.' }
  }
  if (/^(que tiempo hace|como esta el tiempo|que temperatura hace|el tiempo|que tiempo hace hoy|que tiempo hace fuera)$/.test(p)) {
    const w = await getWorld().catch(() => null)
    if (!w || w.temp == null) return null
    return { answer: `En ${w.city}, ${w.temp} grados y ${w.sky.toLowerCase()}. Máxima de ${w.max} y mínima de ${w.min}.` }
  }

  const playing = currentMedia()?.playing
  if (PAUSE.test(p)) return playing === false ? { answer: 'No suena nada ahora mismo.' } : { tool: 'spotify', args: { action: 'play_pause' }, reply: () => 'En pausa.' }
  if (RESUME.test(p)) return playing ? { answer: 'Ya está sonando.' } : { tool: 'spotify', args: { action: 'play_pause' }, reply: () => 'Seguimos.' }
  if (NEXT.test(p)) return { tool: 'spotify', args: { action: 'next' }, reply: () => 'Siguiente.' }
  if (PREV.test(p)) return { tool: 'spotify', args: { action: 'previous' }, reply: () => 'Anterior.' }
  if (NOW.test(p)) return { tool: 'spotify', args: { action: 'now_playing' }, reply: r => r + '.' }
  const v = VOL.exec(p)
  if (v) {
    const up = /^sub|alto|mas volumen/.test(v[1] || v[3])
    const times = v[2] === 'un poco' ? 3 : v[2] === 'al maximo' ? 50 : v[2] ? 10 : 5
    return { tool: 'media', args: { action: up ? 'volume_up' : 'volume_down', times }, reply: () => up ? 'Volumen arriba.' : 'Volumen abajo.' }
  }
  if (MUTE.test(p)) return { tool: 'media', args: { action: 'mute' }, reply: () => 'Hecho.' }

  if (/^(deshaz|deshazlo|deshaz (lo ultimo|eso|el ultimo cambio|lo que has hecho)|vuelve a dejarlo como estaba|dejalo como estaba)$/.test(p)) return { tool: 'undo_last', args: {}, reply: r => r }
  if (/^(bloquea|bloquear)( el| la)?( pc| ordenador| equipo| pantalla| sesion)?$/.test(p)) return { tool: 'pc_control', args: { action: 'lock' }, reply: r => r + '.' }
  if (/^apaga (la )?pantalla$/.test(p)) return { tool: 'pc_control', args: { action: 'screen_off' }, reply: () => 'Pantalla apagada.' }
  if (/^cancela (el )?(apagado|reinicio)$/.test(p)) return { tool: 'pc_control', args: { action: 'cancel_shutdown' }, reply: r => r + '.' }
  if (/^(suspende|duerme)( el)?( pc| ordenador| equipo)?$/.test(p)) return { tool: 'pc_control', args: { action: 'sleep' }, reply: r => r + '.' }
  const off = new RegExp(`^(apaga|reinicia) (?:el )?(?:pc|ordenador|equipo)(?: en ${N} minutos?)?$`).exec(p)
  if (off) {
    const minutes = off[2] ? num(off[2]) : 1
    if (!Number.isFinite(minutes)) return null
    return { tool: 'pc_control', args: { action: off[1] === 'apaga' ? 'shutdown' : 'restart', minutes }, reply: r => r }
  }

  const o = OPEN.exec(p)
  if (o && !NOT_APP.test(o[1])) {
    const name = t.slice(t.length - o[1].length)
    // if the app is not found, the AI gets the question (it may be a web or a game)
    return { tool: 'open_app', args: { name }, ok: r => r.startsWith('Abierto'), reply: r => r.replace(/^Abierto: (.+)$/, 'Abro $1.') }
  }
  return null
}
