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
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function setVolume(pct: number) {
  audio()
  outGain!.gain.value = Math.max(0, Math.min(1, pct / 100))
}

// ---------- speaking ----------
type Line = { text: string; buf: Promise<AudioBuffer | null> }
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
  source.connect(outAnalyser!)
  source.onended = next
  source.start()
}

function enqueue(text: string, voice?: string) {
  const t = text.trim()
  if (!t) return
  queue.push({ text: t, buf: synth(t, voice) })
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

export function say(text: string, h: SpeakHandlers, voice?: string) {
  beginSpeech(h)
  ended = true
  enqueue(text, voice)
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
