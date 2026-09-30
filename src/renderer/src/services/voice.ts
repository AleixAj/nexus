// Audio in/out: plays the assistant's voice and records the user's,
// feeding both into the core engine so the halo reacts to real sound.
const api = (window as any).nexus
const engine = () => (window as any).NexusEngine

let ctx: AudioContext | null = null
let outGain: GainNode | null = null
let outAnalyser: AnalyserNode | null = null

function audio() {
  if (!ctx) {
    ctx = new AudioContext()
    outAnalyser = ctx.createAnalyser()
    outAnalyser.fftSize = 512
    outAnalyser.smoothingTimeConstant = 0.55
    outGain = ctx.createGain()
    outAnalyser.connect(outGain).connect(ctx.destination)
    engine()?.attachSource('speaking', outAnalyser)
    buildFx(ctx, outAnalyser)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function setVolume(pct: number) {
  audio()
  outGain!.gain.value = Math.max(0, Math.min(1, pct / 100))
}

/** Where interface sounds go: after the volume, but not through the voice effects or the halo. */
export function sfxBus() {
  const ac = audio()
  return { ac, out: outGain! }
}

// ---------- AI voice processing ----------
// The neural voices are clean human recordings. This chain gives them the
// "computer" timbre of a film AI: tight low end, presence, a metallic comb,
// a light doubler, a short synthetic room and broadcast compression.
type FxPreset = { comb: number; chorus: number; verb: number; presence: number; air: number; lowcut: number; body: number }

export const FX: Record<string, FxPreset> = {
  soft: { comb: .12, chorus: .18, verb: .14, presence: 2, air: 2, lowcut: 110, body: 1 },
  holo: { comb: .26, chorus: .34, verb: .2, presence: 3.5, air: 4, lowcut: 140, body: 0 },
  synth: { comb: .5, chorus: .26, verb: .16, presence: 3, air: 3, lowcut: 150, body: 0 },
  jarvis: { comb: .22, chorus: .2, verb: .22, presence: 4, air: 3, lowcut: 130, body: 2 },
  deep: { comb: .32, chorus: .16, verb: .3, presence: 2, air: 2, lowcut: 90, body: 4 }
}

let fxNodes: {
  input: GainNode; hp: BiquadFilterNode; body: BiquadFilterNode; presence: BiquadFilterNode; air: BiquadFilterNode
  combWet: GainNode; chorusWet: GainNode; verbWet: GainNode
} | null = null
let fxVoice = 'soft'
let fxAmount = .6

function impulse(ac: AudioContext, secs: number) {
  const len = Math.floor(ac.sampleRate * secs), buf = ac.createBuffer(2, len, ac.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      const t = i / len
      // a few early reflections, then a smooth dark tail
      const early = i < ac.sampleRate * .03 && Math.random() < .004 ? 1 : 0
      d[i] = ((Math.random() * 2 - 1) * Math.pow(1 - t, 3.2) + early * .6) * (i < ac.sampleRate * .012 ? 0 : 1)
    }
  }
  return buf
}

function lfo(ac: AudioContext, rate: number, depth: number, target: AudioParam) {
  const o = ac.createOscillator(), g = ac.createGain()
  o.frequency.value = rate
  g.gain.value = depth
  o.connect(g).connect(target)
  o.start()
}

function buildFx(ac: AudioContext, out: AudioNode) {
  const input = ac.createGain()
  const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.Q.value = .7
  const body = ac.createBiquadFilter(); body.type = 'lowshelf'; body.frequency.value = 180
  const presence = ac.createBiquadFilter(); presence.type = 'peaking'; presence.frequency.value = 3200; presence.Q.value = .9
  const air = ac.createBiquadFilter(); air.type = 'highshelf'; air.frequency.value = 8500
  input.connect(hp).connect(body).connect(presence).connect(air)

  const sum = ac.createGain()
  air.connect(sum) // dry

  // metallic comb: very short delay with feedback, slowly modulated
  const comb = ac.createDelay(.05), fb = ac.createGain(), combWet = ac.createGain()
  comb.delayTime.value = .0055; fb.gain.value = .42
  air.connect(comb); comb.connect(fb).connect(comb); comb.connect(combWet).connect(sum)
  lfo(ac, .23, .0009, comb.delayTime)

  // doubler: a second, slightly detuned copy
  const chorus = ac.createDelay(.06), chorusWet = ac.createGain()
  chorus.delayTime.value = .017
  air.connect(chorus).connect(chorusWet).connect(sum)
  lfo(ac, .55, .0022, chorus.delayTime)

  // short synthetic room
  const verb = ac.createConvolver(), verbWet = ac.createGain()
  verb.buffer = impulse(ac, 1.3)
  air.connect(verb).connect(verbWet).connect(sum)

  const comp = ac.createDynamicsCompressor()
  comp.threshold.value = -22; comp.ratio.value = 3.5; comp.attack.value = .004; comp.release.value = .18
  const makeup = ac.createGain(); makeup.gain.value = 1.15
  sum.connect(comp).connect(makeup).connect(out)

  fxNodes = { input, hp, body, presence, air, combWet, chorusWet, verbWet }
  applyFx(fxVoice)
}

function applyFx(preset: string) {
  if (!fxNodes || !ctx) return
  const p = FX[preset] || FX.soft, a = fxAmount, t = ctx.currentTime, k = .05
  const n = fxNodes
  n.hp.frequency.setTargetAtTime(40 + (p.lowcut - 40) * a, t, k)
  n.body.gain.setTargetAtTime(p.body * a, t, k)
  n.presence.gain.setTargetAtTime(p.presence * a, t, k)
  n.air.gain.setTargetAtTime(p.air * a, t, k)
  n.combWet.gain.setTargetAtTime(p.comb * a, t, k)
  n.chorusWet.gain.setTargetAtTime(p.chorus * a, t, k)
  n.verbWet.gain.setTargetAtTime(p.verb * a, t, k)
}

/** Effect preset of the selected voice. */
export function setVoiceFx(preset: string) {
  fxVoice = preset
  applyFx(preset)
}

/** 0-100: how "synthetic" the voice sounds. */
export function setFxAmount(pct: number) {
  fxAmount = Math.max(0, Math.min(1, pct / 100))
  applyFx(fxVoice)
}

// ---------- speaking ----------
type Line = { text: string; buf: Promise<AudioBuffer | null>; fx?: string }
type SpeakHandlers = { onLine?: (text: string, duration: number) => void; onDone?: () => void; onVoiceError?: () => void }

let queue: Line[] = []
let playing = false
let source: AudioBufferSourceNode | null = null
let handlers: SpeakHandlers = {}
let pending = ''
let token = 0
let ended = false // no more text will arrive for this utterance
let doneFired = false
let waitTimer = 0

// Synthesis runs one request at a time (the next line is prepared while the current one plays)
let synthChain: Promise<unknown> = Promise.resolve()

function synth(text: string, voice?: string): Promise<AudioBuffer | null> {
  const job = synthChain.then(async () => {
    try {
      const bytes: Uint8Array = voice ? await api.previewVoice(text, voice) : await api.speak(text)
      const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
      return await audio().decodeAudioData(copy)
    } catch (e) {
      console.warn('tts failed', e)
      return null
    }
  })
  synthChain = job
  return job
}

function maybeDone() {
  if (ended && !playing && !queue.length && !doneFired) {
    doneFired = true
    handlers.onDone?.()
  }
}

async function pump() {
  if (playing) return
  const my = token
  const line = queue.shift()
  if (!line) { maybeDone(); return }
  playing = true
  const buf = await line.buf
  if (my !== token) return
  const next = () => { if (my !== token) return; playing = false; source = null; pump() }

  if (!buf) {
    // voice unavailable: still show the words at reading pace
    const secs = Math.max(1.2, line.text.split(/\s+/).length * 0.32)
    handlers.onVoiceError?.()
    handlers.onLine?.(line.text, secs)
    waitTimer = window.setTimeout(next, secs * 1000)
    return
  }
  handlers.onLine?.(line.text, buf.duration)
  source = audio().createBufferSource()
  source.buffer = buf
  applyFx(line.fx || fxVoice)
  source.connect(fxNodes ? fxNodes.input : outAnalyser!)
  source.onended = next
  source.start()
}

function enqueue(text: string, voice?: string, fx?: string) {
  const t = text.trim()
  if (!t) return
  queue.push({ text: t, buf: synth(t, voice), fx })
  pump()
}

const ABBR = /\b(sr|sra|srta|dr|dra|ud|uds|etc|aprox|pág|núm|p\. ej|ej)\.$/i

// Index where the first complete sentence of `text` ends, or -1
function sentenceEnd(text: string) {
  const re = /[.!?…:;\n]+(?=\s)/g
  let m
  while ((m = re.exec(text))) {
    const end = m.index + m[0].length
    if (end < 14) continue // join very short openers ("Hecho.") with what follows
    if (ABBR.test(text.slice(0, end))) continue
    return end
  }
  // long run without punctuation: cut at a comma or a space so it starts sounding
  if (text.length > 220) {
    const head = text.slice(0, 200)
    const cut = Math.max(head.lastIndexOf(', '), head.lastIndexOf(' '))
    return cut > 40 ? cut + 1 : -1
  }
  return -1
}

/** Start a new utterance; previous speech is cut. */
export function beginSpeech(h: SpeakHandlers) {
  stopSpeech()
  handlers = h
}

/** Feed streamed text; complete sentences are voiced as soon as they arrive. */
export function feedSpeech(delta: string) {
  pending += delta
  let end
  while ((end = sentenceEnd(pending)) > 0) {
    enqueue(pending.slice(0, end))
    pending = pending.slice(end).replace(/^\s+/, '')
  }
}

/** No more text is coming: voice whatever is left. */
export function endSpeech() {
  ended = true
  const rest = pending
  pending = ''
  if (rest.trim()) enqueue(rest)
  else maybeDone()
}

/** Speaks a fixed text; `voice`/`fx` override the selected voice (previews). */
export function say(text: string, h: SpeakHandlers, voice?: string, fx?: string) {
  beginSpeech(h)
  ended = true
  enqueue(text, voice, fx)
  maybeDone()
}

export function stopSpeech() {
  token++
  queue = []
  pending = ''
  playing = false
  ended = false
  doneFired = false
  clearTimeout(waitTimer)
  try { source?.stop() } catch { /* already stopped */ }
  source = null
}

export const isSpeaking = () => playing || queue.length > 0

// ---------- listening ----------
type ListenHandlers = {
  onSpeech?: () => void
  onTranscribing?: () => void
  onResult: (text: string) => void
  onError: (msg: string) => void
}

let rec: { finish: () => void; cancel: () => void } | null = null
let listenGen = 0

export async function listen(h: ListenHandlers) {
  cancelListening()
  const gen = ++listenGen
  const alive = () => gen === listenGen
  // placeholder so a second click during getUserMedia is not treated as "idle"
  const pendingRec = { finish: () => cancelListening(), cancel: () => cancelListening() }
  rec = pendingRec

  const ac = audio()
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
  } catch {
    if (alive()) { rec = null; h.onError('No tengo acceso al micrófono.') }
    return
  }
  if (!alive()) { stream.getTracks().forEach(t => t.stop()); return }

  const src = ac.createMediaStreamSource(stream)
  const an = ac.createAnalyser()
  an.fftSize = 512
  an.smoothingTimeConstant = 0.6
  src.connect(an)

  let recorder: MediaRecorder
  try {
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : ''
    recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  } catch {
    stream.getTracks().forEach(t => t.stop())
    src.disconnect()
    rec = null
    h.onError('No puedo grabar audio.')
    return
  }
  engine()?.attachSource('listening', an)

  const chunks: Blob[] = []
  recorder.ondataavailable = e => e.data.size && chunks.push(e.data)

  // voice activity detection with an adaptive noise floor:
  // stop after ~1.2 s of silence once speech started
  const data = new Uint8Array(an.fftSize)
  let heard = false, quietSince = 0, cancelled = false, floor = 0.01, samples = 0
  const started = performance.now()
  const iv = setInterval(() => {
    an.getByteTimeDomainData(data)
    let sum = 0
    for (const v of data) sum += ((v - 128) / 128) ** 2
    const rms = Math.sqrt(sum / data.length)
    const now = performance.now()
    if (samples < 6) { floor = Math.max(floor, rms); samples++; return }
    const threshold = Math.max(0.02, floor * 2.2)
    if (rms > threshold) {
      if (!heard) h.onSpeech?.()
      heard = true
      quietSince = 0
    } else if (heard) {
      quietSince ||= now
      if (now - quietSince > 1200) finish()
    }
    if (!heard && now - started > 8000) cancel()
    if (now - started > 25000) finish()
  }, 50)

  const cleanup = () => {
    clearInterval(iv)
    stream.getTracks().forEach(t => t.stop())
    src.disconnect()
    if (rec === mine) { rec = null; engine()?.attachSource('listening', null) }
  }
  const finish = () => { if (recorder.state === 'recording') recorder.stop() }
  const cancel = () => { cancelled = true; finish() }
  const mine = { finish, cancel }

  recorder.onstop = async () => {
    cleanup()
    if (!alive()) return
    if (cancelled || !heard) { h.onResult(''); return }
    h.onTranscribing?.()
    let text = ''
    try {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      text = await api.transcribe(await blob.arrayBuffer())
    } catch (e: any) {
      if (alive()) h.onError(String(e?.message || e).includes('NO_KEY') ? 'Falta la clave de Groq en Ajustes' : 'No he podido entenderle')
      return
    }
    if (alive()) h.onResult(text)
  }

  recorder.start()
  if (rec === pendingRec) rec = mine
  else { cancel(); return } // cancelled while starting
}

/** Stop recording and send what was said. */
export function stopListening() {
  rec?.finish()
}

/** Drop the current recording or pending transcription. */
export function cancelListening() {
  listenGen++
  const r = rec
  rec = null
  r?.cancel()
  engine()?.attachSource('listening', null)
}

export const isListening = () => !!rec
