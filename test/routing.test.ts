// Cheap decisions made before calling the AI: is it small talk, and does the wake phrase match.
import { describe, expect, it } from 'vitest'
import { complexity, isSimple } from '../src/main/brain/complexity'
import { soundsLike } from '../src/main/lib/phonetics'

describe('complexity routing', () => {
  it('sends small talk to the small model', () => {
    expect(isSimple('hola, ¿qué tal estás?')).toBe(true)
  })
  it('keeps actions and hard questions on the big model', () => {
    expect(isSimple('abre el navegador')).toBe(false)
    expect(isSimple('compara estos dos portátiles y explica por qué uno es mejor')).toBe(false)
    expect(complexity('```js\nconst a = 1\n```')).toBeGreaterThan(0.3)
  })
})

describe('wake phrase', () => {
  it('accepts how the phrase usually comes out of speech recognition', () => {
    expect(soundsLike('oye jarvis', 'Oye Jarvis')).toBe(true)
    expect(soundsLike('hey nexus qué hora es', 'Hey Nexus')).toBe(true)
    expect(soundsLike('oye yarbis', 'Oye Jarvis')).toBe(true)
  })
  it('does not wake up on unrelated speech', () => {
    expect(soundsLike('mañana voy al gimnasio', 'Oye Jarvis')).toBe(false)
  })
})
