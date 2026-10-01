// The wake phrase the user picks ("Hey Nexus", "Oye Jarvis", "Hola Viernes"…), without internet:
// a Spanish speech recogniser (sherpa-onnx + Kroko community model, CC-BY-SA) transcribes on the
// PC and the phrase is looked for by how it sounds. Nothing is recorded or sent anywhere.
// Small English keyword models were tried first: with Spanish voices they caught about 1 in 6.
// The model (~124 MB) is downloaded once, the first time the user turns this on.
import { app } from 'electron'
import { createWriteStream, existsSync, mkdirSync, renameSync } from 'fs'
import { join } from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { soundsLike } from './lib/phonetics'

const MODEL_URL = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-zipformer-es-kroko-2025-08-06.tar.bz2'
const FILES = ['encoder.onnx', 'decoder.onnx', 'joiner.onnx', 'tokens.txt']
const dir = () => join(app.getPath('userData'), 'wake-es')
export const modelReady = () => FILES.every(f => existsSync(join(dir(), f)))

let downloading: Promise<void> | null = null

/** Downloads and unpacks the model once. `onProgress` gets 0…1. */
export function ensureModel(onProgress: (p: number) => void) {
  if (modelReady()) return Promise.resolve()
  downloading ??= (async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bz2 = require('unbzip2-stream'), tar = require('tar-stream')
    const res = await fetch(MODEL_URL, { signal: AbortSignal.timeout(30 * 60e3) })
    if (!res.ok || !res.body) throw new Error(`No he podido descargar el modelo de voz (HTTP ${res.status})`)
    const total = Number(res.headers.get('content-length')) || 124e6
    let got = 0, lastTick = 0
    const body = Readable.fromWeb(res.body as any)
    body.on('data', (c: Buffer) => { got += c.length; if (Date.now() - lastTick > 500) { lastTick = Date.now(); onProgress(Math.min(.99, got / total)) } })
    const tmp = dir() + '.part'
    mkdirSync(tmp, { recursive: true })
    const extract = tar.extract()
    extract.on('entry', (header: any, stream: Readable, next: () => void) => {
      const name = header.name.split('/').pop()
      if (header.type === 'file' && FILES.includes(name)) pipeline(stream, createWriteStream(join(tmp, name))).then(() => next(), next)
      else { stream.resume(); stream.on('end', next) }
    })
    await pipeline(body, bz2(), extract)
    if (!FILES.every(f => existsSync(join(tmp, f)))) throw new Error('El modelo descargado está incompleto')
    renameSync(tmp, dir())
    onProgress(1)
  })().finally(() => { downloading = null })
  return downloading
}

let recognizer: any = null
let stream: any = null
let phrase = ''
let onWake: () => void = () => {}
let cooldownUntil = 0
let lastChecked = ''

/** Starts listening for `p` (the model must be ready). Changing the phrase needs no restart. */
export function startWakeWord(p: string, cb: () => void) {
  phrase = p
  onWake = cb
  if (recognizer) return
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sherpa = require('sherpa-onnx-node')
  const d = dir()
  recognizer = new sherpa.OnlineRecognizer({
    featConfig: { sampleRate: 16000, featureDim: 80 },
    modelConfig: { transducer: { encoder: join(d, 'encoder.onnx'), decoder: join(d, 'decoder.onnx'), joiner: join(d, 'joiner.onnx') }, tokens: join(d, 'tokens.txt'), numThreads: 1, provider: 'cpu', debug: 0 },
    decodingMethod: 'greedy_search',
    // a pause of ~0.8 s closes a sentence; the text so far is checked continuously anyway
    enableEndpoint: 1, rule1MinTrailingSilence: 1.2, rule2MinTrailingSilence: 0.8, rule3MinUtteranceLength: 12
  })
  stream = recognizer.createStream()
}

export function stopWakeWord() {
  if (recognizer) stream = recognizer.createStream() // forget what it had heard
}

/** A piece of microphone audio (mono, 16 kHz). */
export function feedWakeWord(samples: Float32Array) {
  if (!recognizer || !stream) return
  stream.acceptWaveform({ samples, sampleRate: 16000 })
  while (recognizer.isReady(stream)) recognizer.decode(stream)
  const text: string = recognizer.getResult(stream).text || ''
  // check as soon as words appear, so it answers before the sentence ends
  if (text && text !== lastChecked) {
    lastChecked = text
    if (soundsLike(text, phrase) && Date.now() > cooldownUntil) {
      cooldownUntil = Date.now() + 3000
      recognizer.reset(stream); lastChecked = ''
      onWake()
      return
    }
  }
  if (recognizer.isEndpoint(stream)) { recognizer.reset(stream); lastChecked = '' }
}
