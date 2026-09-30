// Start-up sounds, synthesized with Web Audio (no audio files).
// Lo-fi mood: a warm filtered chord with a bit of vinyl crackle, soft plucks
// for the boot log and an electric-piano arpeggio with tape echo when the core lights up.
// They go through the app volume but not through the voice effects or the halo.
import { sfxBus } from './voice'

// Fmaj9 voicing and a pentatonic scale on top of it
const PAD = [174.61, 220, 261.63, 329.63, 392]
const PLUCKS = [523.25, 587.33, 659.25, 783.99, 880]
const ARP = [349.23, 440, 523.25, 659.25, 783.99, 1046.5]

let crackle: AudioBuffer | null = null
function crackleBuffer(ac: AudioContext) {
  if (!crackle) {
    const len = ac.sampleRate * 2
    crackle = ac.createBuffer(1, len, ac.sampleRate)
    const d = crackle.getChannelData(0)
    for (let i = 0; i < len; i++) {
      // faint hiss plus sparse little pops, like an old record
      d[i] = (Math.random() * 2 - 1) * .015 + (Math.random() < .0009 ? (Math.random() * 2 - 1) * .6 : 0)
    }
  }
  return crackle
}

function env(g: AudioParam, t: number, peak: number, attack: number, release: number) {
  g.setValueAtTime(.0001, t)
  g.exponentialRampToValueAtTime(peak, t + attack)
  g.exponentialRampToValueAtTime(.0001, t + attack + release)
}

/** A soft electric-piano note: sine plus a quiet octave, with a slow tremolo. */
function epNote(ac: AudioContext, dest: AudioNode, f: number, t: number, vol: number, release: number) {
  const g = ac.createGain()
  env(g.gain, t, vol, .012, release)
  const trem = ac.createGain(); trem.gain.value = 1
  const lfo = ac.createOscillator(), depth = ac.createGain()
  lfo.frequency.value = 4.5; depth.gain.value = .12
  lfo.connect(depth).connect(trem.gain)
  for (const [mult, v] of [[1, 1], [2, .22], [3, .05]]) {
    const o = ac.createOscillator(), og = ac.createGain()
    o.type = 'sine'
    o.frequency.value = f * mult
    og.gain.value = v
    o.connect(og).connect(g)
    o.start(t); o.stop(t + release + .1)
  }
  g.connect(trem).connect(dest)
  lfo.start(t); lfo.stop(t + release + .1)
}

/** Tape-style echo: darker and quieter on every repeat. */
function tapeEcho(ac: AudioContext, out: AudioNode) {
  const input = ac.createGain(), delay = ac.createDelay(1), fb = ac.createGain(), tone = ac.createBiquadFilter(), wet = ac.createGain()
  delay.delayTime.value = .34
  fb.gain.value = .32
  tone.type = 'lowpass'; tone.frequency.value = 1400
  wet.gain.value = .45
  input.connect(out)
  input.connect(delay); delay.connect(tone).connect(fb).connect(delay)
  tone.connect(wet).connect(out)
  return input
}

/** Warm pad, vinyl crackle and one soft pluck per boot-log line. Returns a function that fades them out. */
export function bootHum(ticks: number[]) {
  const { ac, out } = sfxBus()
  const t = ac.currentTime + .05
  const bus = ac.createGain()
  const lofi = ac.createBiquadFilter() // everything slightly muffled
  lofi.type = 'lowpass'; lofi.frequency.value = 3200; lofi.Q.value = .4
  bus.connect(lofi).connect(out)

  // pad: detuned sine/triangle pairs through a slowly breathing low-pass
  const padGain = ac.createGain(), lp = ac.createBiquadFilter()
  lp.type = 'lowpass'; lp.Q.value = .6
  lp.frequency.setValueAtTime(500, t)
  lp.frequency.linearRampToValueAtTime(1100, t + 2.2)
  padGain.gain.setValueAtTime(.0001, t)
  padGain.gain.exponentialRampToValueAtTime(1, t + 1.4)
  lp.connect(padGain).connect(bus)
  const wobble = ac.createOscillator(), wobbleDepth = ac.createGain() // tape wow
  wobble.frequency.value = .45; wobbleDepth.gain.value = 7
  wobble.connect(wobbleDepth)
  wobble.start(t); wobble.stop(t + 5)
  PAD.forEach((f, i) => {
    for (const [type, cents] of [['sine', -5], ['triangle', 5]] as const) {
      const o = ac.createOscillator(), g = ac.createGain()
      o.type = type
      o.frequency.value = f
      o.detune.value = cents
      wobbleDepth.connect(o.detune)
      g.gain.value = (i === 0 ? .016 : .011) * (type === 'triangle' ? .7 : 1)
      o.connect(g).connect(lp)
      o.start(t); o.stop(t + 5)
    }
  })

  // vinyl crackle
  const cr = ac.createBufferSource(), crf = ac.createBiquadFilter(), crg = ac.createGain()
  cr.buffer = crackleBuffer(ac); cr.loop = true
  crf.type = 'bandpass'; crf.frequency.value = 2400; crf.Q.value = .7
  crg.gain.setValueAtTime(.0001, t)
  crg.gain.exponentialRampToValueAtTime(.09, t + .8)
  cr.connect(crf).connect(crg).connect(bus)
  cr.start(t); cr.stop(t + 5)

  // soft plucks, one per boot-log line
  const echo = tapeEcho(ac, bus)
  ticks.forEach((at, i) => epNote(ac, echo, PLUCKS[i % PLUCKS.length], t + at, .02, .45))

  return () => {
    const now = ac.currentTime
    bus.gain.cancelScheduledValues(now)
    bus.gain.setValueAtTime(bus.gain.value, now)
    bus.gain.linearRampToValueAtTime(0, now + 1.2) // long, gentle tail under the chime
    setTimeout(() => bus.disconnect(), 1500)
  }
}

/** The core lights up: a rising electric-piano arpeggio with tape echo. */
export function ignition(burstDelay = 1) {
  const { ac, out } = sfxBus()
  const t = ac.currentTime + burstDelay * .7
  const lofi = ac.createBiquadFilter()
  lofi.type = 'lowpass'; lofi.frequency.value = 2600; lofi.Q.value = .4
  lofi.connect(out)
  const echo = tapeEcho(ac, lofi)
  ARP.forEach((f, i) => epNote(ac, echo, f, t + i * .085, .03 - i * .003, 1.8))
  // a low, round root note under the arpeggio
  epNote(ac, lofi, 87.31, t, .05, 2.2)
}
