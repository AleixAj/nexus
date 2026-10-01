// "Hey Nexus" without internet: a small keyword-spotting model (sherpa-onnx, Apache-2.0)
// listens on the PC. The window sends the microphone audio (16 kHz) in 100 ms pieces; nothing
// is recorded or sent anywhere. Several spellings cover the Spanish accent ("jei néksus").
import { join } from 'path'
import { writeFileSync } from 'fs'
import { tmpdir } from 'os'

// model files live outside app.asar: the native library cannot read inside it
const MODEL = join(__dirname, '../../resources/kws').replace('app.asar', 'app.asar.unpacked')
const SPELLINGS = ['▁HE Y ▁NE X US', '▁HE Y ▁NEXT US', '▁A ▁NE X US', '▁E Y ▁NE X US', '▁A Y ▁NE X US', '▁HE Y ▁NE K S US']

let spotter: any = null
let stream: any = null
let onWake: () => void = () => {}
let cooldownUntil = 0

function create() {
  // loaded only when the user turns the wake word on
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sherpa = require('sherpa-onnx-node')
  const keywords = join(tmpdir(), 'nexus-keywords.txt')
  // boost :2.0 and threshold #0.12, tuned with Spanish and English voices
  writeFileSync(keywords, SPELLINGS.map(k => `${k} :2.0 #0.12 @HEY_NEXUS`).join('\n') + '\n', 'utf8')
  spotter = new sherpa.KeywordSpotter({
    featConfig: { sampleRate: 16000, featureDim: 80 },
    modelConfig: {
      transducer: { encoder: join(MODEL, 'encoder.onnx'), decoder: join(MODEL, 'decoder.onnx'), joiner: join(MODEL, 'joiner.onnx') },
      tokens: join(MODEL, 'tokens.txt'), numThreads: 1, provider: 'cpu', debug: 0
    },
    keywordsFile: keywords
  })
  stream = spotter.createStream()
}

export function startWakeWord(cb: () => void) {
  onWake = cb
  if (!spotter) create()
}

export function stopWakeWord() {
  stream = spotter ? spotter.createStream() : null // forget what it had heard
}

/** A piece of microphone audio (mono, 16 kHz). */
export function feedWakeWord(samples: Float32Array) {
  if (!spotter || !stream) return
  stream.acceptWaveform({ samples, sampleRate: 16000 })
  while (spotter.isReady(stream)) {
    spotter.decode(stream)
    if (spotter.getResult(stream).keyword) {
      spotter.reset(stream)
      if (Date.now() > cooldownUntil) { cooldownUntil = Date.now() + 2500; onWake() }
    }
  }
}
