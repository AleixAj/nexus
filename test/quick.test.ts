// Orders answered without the AI: they must be understood exactly, and anything unclear must
// go to the AI instead of doing the wrong thing.
import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/main/media', () => ({ currentMedia: () => ({ playing: true, title: 'Song', artist: 'Band' }) }))
vi.mock('../src/main/world', () => ({ getWorld: async () => ({ city: 'Madrid', temp: 21, max: 25, min: 14, sky: 'Despejado' }) }))

const { quickCommand } = await import('../src/main/brain/quick')
const tool = async (text: string, name = '') => {
  const q: any = await quickCommand(text, name)
  return q ? (q.answer ? 'answer' : q.tool) : null
}

describe('quickCommand', () => {
  it('handles music and volume', async () => {
    expect(await tool('pausa')).toBe('spotify')
    expect(await tool('Siguiente canción')).toBe('spotify')
    const up: any = await quickCommand('sube el volumen un poco')
    expect(up.tool).toBe('media')
    expect(up.args).toEqual({ action: 'volume_up', times: 3 })
  })
  it('strips the wake phrase and politeness', async () => {
    const q: any = await quickCommand('Oye Jarvis, abre el bloc de notas por favor', 'Jarvis')
    expect(q.tool).toBe('open_app')
    expect(q.args.name).toBe('bloc de notas')
  })
  it('understands reminders, timers and alarms', async () => {
    const r: any = await quickCommand('Avísame en 20 minutos de sacar la ropa y tender')
    expect(r.args).toEqual({ text: 'sacar la ropa y tender', in_minutes: 20 })
    const t: any = await quickCommand('pon un temporizador de cinco minutos')
    expect(t.args).toMatchObject({ in_minutes: 5, alarm: true })
    const a: any = await quickCommand('pon una alarma a las 8 de la tarde para cenar')
    expect(a.args.at).toMatch(/T20:00$/)
    expect(a.args.text).toBe('cenar')
  })
  it('answers the time and weather locally', async () => {
    const w: any = await quickCommand('¿qué tiempo hace?')
    expect(w.answer).toContain('Madrid')
    expect(await tool('qué hora es')).toBe('answer')
  })
  it('sends anything long, compound or unclear to the AI', async () => {
    expect(await tool('abre spotify y pon mi lista gym')).toBeNull()
    expect(await tool('explícame la teoría de la relatividad')).toBeNull()
    expect(await tool('abre la carpeta de descargas')).toBeNull()
  })
  it('keeps serious actions explicit', async () => {
    const off: any = await quickCommand('apaga el ordenador en 10 minutos')
    expect(off.args).toEqual({ action: 'shutdown', minutes: 10 })
    expect(await tool('deshaz lo último')).toBe('undo_last')
  })
})
