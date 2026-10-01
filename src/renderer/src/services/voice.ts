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
    // a running audio graph costs CPU even in silence: suspend it after a quiet while
    setInterval(() => {
      if (ctx && ctx.state === 'running' && !playing && queue.length === 0 && !rec && Date.now() - lastSound > 8000) ctx.suspend()
    }, 4000)
  }
  lastSound = Date.now()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}
let lastSound = 0

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
  // natural voices: only a touch of presence and air, no metallic colour
  clean: { comb: 0, chorus: 0, verb: 0, presence: 1.5, air: 1.5, lowcut: 70, body: .5 },
  soft: { comb: .08, chorus: .06, verb: .04, presence: 2, air: 2, lowcut: 100, body: 1 },
  holo: { comb: .16, chorus: .1, verb: .05, presence: 3, air: 3.5, lowcut: 130, body: 0 },
  synth: { comb: .3, chorus: .08, verb: .04, presence: 3, air: 3, lowcut: 140, body: 0 },
  jarvis: { comb: .14, chorus: .06, verb: .05, presence: 3.5, air: 2.5, lowcut: 120, body: 2 },
  deep: { comb: .18, chorus: .05, verb: .06, presence: 2, air: 2, lowcut: 90, body: 3.5 }
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
  comb.delayTime.value = .0055; fb.gain.value = .22
  air.connect(comb); comb.connect(fb).connect(comb); comb.connect(combWet).connect(sum)
  lfo(ac, .23, .0009, comb.delayTime)

  // doubler: a second, slightly detuned copy
  const chorus = ac.createDelay(.06), chorusWet = ac.createGain()
  chorus.delayTime.value = .009
  air.connect(chorus).connect(chorusWet).connect(sum)
  lfo(ac, .55, .0022, chorus.delayTime)

  // short synthetic room
  const verb = ac.createConvolver(), verbWet = ac.createGain()
  verb.buffer = impulse(ac, .45) // a small, dry room: presence without echo
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

// Voice samples (previews) are kept: replaying one is instant and costs no quota
const previewCache = new Map<string, Promise<AudioBuffer | null>>()

function synth(text: string, voice?: string): Promise<AudioBuffer | null> {
  if (voice) {
    const key = voice + '|' + text
    let p = previewCache.get(key)
    if (!p) {
      // previews skip the queue: a new voice must not wait for the previous one
      p = fetchAudio(text, voice)
      previewCache.set(key, p)
      p.then(b => { if (!b) previewCache.delete(key) })
    }
    return p
  }
  const job = synthChain.then(() => fetchAudio(text))
  synthChain = job
  return job
}

async function fetchAudio(text: string, voice?: string): Promise<AudioBuffer | null> {
  try {
    const bytes: Uint8Array = voice ? await api.previewVoice(text, voice) : await api.speak(text)
    const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    return await audio().decodeAudioData(copy)
  } catch (e) {
    console.warn('tts failed', e)
    return null
  }
}

/** Prepares a voice sample in the background (plays instantly when asked for). */
export function prefetch(text: string, voice: string) {
  synth(text, voice)
}

/** Opens the connections of every voice in the background so the first sample plays fast. */
export function warmVoices() {
  api?.warmVoices?.()
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
  const clip = trimSilence(buf)
  handlers.onLine?.(line.text, clip.duration)
  source = audio().createBufferSource()
  source.buffer = clip
  applyFx(line.fx || fxVoice)
  source.connect(fxNodes ? fxNodes.input : outAnalyser!)
  source.onended = next
  source.start()
}

// Keeps ~40 ms before the voice starts and ~180 ms after it ends
function trimSilence(buf: AudioBuffer) {
  const d = buf.getChannelData(0), rate = buf.sampleRate, th = .012
  let a = 0, b = d.length - 1
  while (a < d.length && Math.abs(d[a]) < th) a++
  while (b > a && Math.abs(d[b]) < th) b--
  a = Math.max(0, a - Math.round(rate * .04))
  b = Math.min(d.length - 1, b + Math.round(rate * .18))
  if (b - a < rate * .1 || (a === 0 && b === d.length - 1)) return buf
  const out = audio().createBuffer(buf.numberOfChannels, b - a + 1, rate)
  for (let c = 0; c < buf.numberOfChannels; c++) out.copyToChannel(buf.getChannelData(c).subarray(a, b + 1), c)
  return out
}

function enqueue(text: string, voice?: string, fx?: string) {
  const t = text.trim()
  if (!t) return
  queue.push({ text: t, buf: synth(t, voice), fx })
  pump()
}

const ABBR = /\b(sr|sra|srta|dr|dra|ud|uds|etc|aprox|pág|núm|p\. ej|ej)\.$/i

// Index where the first complete sentence of `text` ends, or -1
let chunkIndex = 0 // chunks sent in this utterance

function sentenceEnd(text: string) {
  const re = /[.!?…:;\n]+(?=\s)/g
  // the first chunk is short so speech starts fast; later ones group sentences
  const min = chunkIndex === 0 ? 14 : 120
  let m
  while ((m = re.exec(text))) {
    const end = m.index + m[0].length
    if (end < min) continue
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
    chunkIndex++
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
  chunkIndex = 0
  synthChain = Promise.resolve() // what was cancelled must not delay what comes next
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
let micId = ""

/** Which input device to record from ("" = Windows default). */
export function setMicDevice(id: string) {
  micId = id || ""
}

async function openMic() {
  const base = { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
  if (micId) {
    try { return await navigator.mediaDevices.getUserMedia({ audio: { ...base, deviceId: { exact: micId } } }) }
    catch { /* unplugged: fall back to the default one */ }
  }
  return navigator.mediaDevices.getUserMedia({ audio: base })
}

/** Lists the microphones; names only appear once permission was granted. */
export async function listMics() {
  const d = await navigator.mediaDevices.enumerateDevices()
  return d.filter(x => x.kind === "audioinput" && x.deviceId !== "communications")
    .map((x, i) => ({ id: x.deviceId === "default" ? "" : x.deviceId, label: (x.label || "Micrófono " + (i + 1)).replace(/^(Predeterminado|Default) - /, "") }))
    .filter((x, i, a) => a.findIndex(y => y.label === x.label) === i)
}

/** Opens the microphone for a few seconds so the core reacts to it (setup test). */
export async function testMic(ms = 4000) {
  const ac = audio()
  const stream = await openMic()
  const src = ac.createMediaStreamSource(stream), an = ac.createAnalyser()
  an.fftSize = 512; an.smoothingTimeConstant = .6
  src.connect(an)
  engine()?.attachSource("listening", an)
  await new Promise(r => setTimeout(r, ms))
  engine()?.attachSource("listening", null)
  src.disconnect()
  stream.getTracks().forEach(t => t.stop())
}
let listenGen = 0

/** Records until the user stops talking (dictation waits longer between sentences). */
export async function listen(h: ListenHandlers, opts = { silenceMs: 1200, maxMs: 25000 }) {
  cancelListening()
  const gen = ++listenGen
  const alive = () => gen === listenGen
  // placeholder so a second click during getUserMedia is not treated as "idle"
  const pendingRec = { finish: () => cancelListening(), cancel: () => cancelListening() }
  rec = pendingRec

  const ac = audio()
  let stream: MediaStream
  try {
    stream = await openMic()
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
  // stop after a pause (1.2 s by default) once speech started
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
      if (now - quietSince > opts.silenceMs) finish()
    }
    if (!heard && now - started > 8000) cancel()
    if (now - started > opts.maxMs) finish()
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
      text = await api.transcribe(await toWav(blob))
    } catch (e: any) {
      if (alive()) h.onError(String(e?.message || e).includes('NO_KEY') ? 'Para entenderle necesito la clave de Groq (o permitir Gemini en Ajustes)' : 'No he podido entenderle')
      return
    }
    if (alive()) h.onResult(text)
  }

  recorder.start()
  if (rec === pendingRec) rec = mine
  else { cancel(); return } // cancelled while starting
}

/** Recording → 16 kHz mono 16-bit WAV (small, and every speech service accepts it). */
async function toWav(blob: Blob) {
  const decoded = await audio().decodeAudioData(await blob.arrayBuffer())
  const rate = 16000, frames = Math.ceil(decoded.duration * rate)
  const off = new OfflineAudioContext(1, frames, rate)
  const src = off.createBufferSource()
  src.buffer = decoded
  src.connect(off.destination)
  src.start()
  const pcm = (await off.startRendering()).getChannelData(0)
  const buf = new ArrayBuffer(44 + pcm.length * 2), v = new DataView(buf)
  const str = (o: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)) }
  str(0, "RIFF"); v.setUint32(4, 36 + pcm.length * 2, true); str(8, "WAVE"); str(12, "fmt ")
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true)
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, pcm.length * 2, true)
  for (let i = 0; i < pcm.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true)
  return buf
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

// ---------- PC audio (music) ----------
// The halo follows what the PC plays: system loopback through getDisplayMedia (the main
// process answers without a picker). The video track is dropped at once.
let loop: { stream: MediaStream; ctx: AudioContext } | null = null
let loopPending = false

export async function startLoopback() {
  if (loop || loopPending) return
  loopPending = true
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
    stream.getVideoTracks().forEach(t => { t.stop(); stream.removeTrack(t) })
    if (!stream.getAudioTracks().length) return
    const c = new AudioContext()
    const an = c.createAnalyser()
    an.fftSize = 512
    an.smoothingTimeConstant = 0.6
    c.createMediaStreamSource(stream).connect(an)
    loop = { stream, ctx: c }
    engine()?.attachSource('music', an)
  } catch (e) {
    console.warn('loopback', e) // the halo keeps its simulated beat
  } finally { loopPending = false }
}

export function stopLoopback() {
  if (!loop) return
  engine()?.attachSource('music', null)
  loop.stream.getTracks().forEach(t => t.stop())
  loop.ctx.close()
  loop = null
}

// ---------- "Hey Nexus" ----------
// The microphone stays open at 16 kHz and every ~100 ms of sound goes to the keyword spotter
// in the main process (on the PC: nothing is recorded or sent online).
let wake: { stream: MediaStream; ctx: AudioContext; node: ScriptProcessorNode } | null = null

export async function startWakeMic(onChunk: (samples: Float32Array) => void) {
  if (wake) return
  const stream = await openMic()
  const c = new AudioContext({ sampleRate: 16000 })
  const src = c.createMediaStreamSource(stream)
  const node = c.createScriptProcessor(2048, 1, 1)
  // Only sound that may be speech goes to the recogniser: silence and room noise cost nothing.
  // A short pre-roll keeps the start of the phrase; the gate stays open 1.5 s after the voice.
  let floor = 0.01, openUntil = 0
  const preroll: Float32Array[] = []
  node.onaudioprocess = e => {
    const x = new Float32Array(e.inputBuffer.getChannelData(0))
    let sum = 0
    for (let i = 0; i < x.length; i++) sum += x[i] * x[i]
    const rms = Math.sqrt(sum / x.length), now = performance.now()
    // the noise floor follows the room slowly (faster downwards)
    floor = rms < floor ? floor * 0.9 + rms * 0.1 : floor * 0.995 + rms * 0.005
    if (rms > Math.max(0.012, floor * 2.5)) {
      if (now > openUntil) preroll.splice(0).forEach(onChunk)
      openUntil = now + 1500
    }
    if (now <= openUntil) onChunk(x)
    else { preroll.push(x); if (preroll.length > 3) preroll.shift() }
  }
  src.connect(node)
  node.connect(c.destination) // needed for the processor to run; it outputs silence
  wake = { stream, ctx: c, node }
}

export function stopWakeMic() {
  if (!wake) return
  wake.node.disconnect()
  wake.stream.getTracks().forEach(t => t.stop())
  wake.ctx.close()
  wake = null
}

// ---------- camera ----------
/** One photo from the webcam (JPEG base64); the camera is switched off right after. */
export async function cameraPhoto() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } })
  try {
    const v = document.createElement('video')
    v.srcObject = stream
    v.muted = true
    await v.play()
    await new Promise(r => setTimeout(r, 600)) // let the exposure settle
    const c = document.createElement('canvas')
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d')!.drawImage(v, 0, 0)
    return c.toDataURL('image/jpeg', 0.85).split(',')[1]
  } finally {
    stream.getTracks().forEach(t => t.stop())
  }
}
