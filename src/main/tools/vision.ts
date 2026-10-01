// "¿Qué hay en mi pantalla?", "explícame este error", and images the user drops in the chat.
import { basename } from 'path'
import { describeImage, imageFile, screenshot, visionUnavailable } from '../vision'
import { short } from '../lib/text'
import { toPath } from './files'
import { str, type Tool } from './define'

const unavailable = (why: string) => ({ result: why, label: 'Sin visión disponible' })

export const visionTools: Tool[] = [
  {
    name: 'look_at_screen',
    description: 'Mira la pantalla del usuario (lo que tiene abierto) y responde a la pregunta sobre ella. Solo si lo pide.',
    params: { question: str('Qué quiere saber de lo que hay en pantalla') },
    required: ['question'],
    progress: () => 'Mirando la pantalla',
    run: async a => {
      const why = await visionUnavailable()
      if (why) return unavailable(why)
      return { result: await describeImage(await screenshot(), 'image/jpeg', String(a.question || '')), label: 'Pantalla analizada' }
    }
  },
  {
    name: 'look_at_image',
    description: 'Mira una imagen del equipo (por ejemplo una adjunta) y responde a la pregunta.',
    params: { path: str('Ruta de la imagen'), question: str('Qué quiere saber') },
    required: ['path'],
    progress: a => 'Mirando · ' + short(basename(String(a.path || ''))),
    run: async a => {
      const why = await visionUnavailable()
      if (why) return unavailable(why)
      const { base64, mime } = await imageFile(toPath(a.path))
      return { result: await describeImage(base64, mime, String(a.question || '')), label: 'Imagen analizada · ' + basename(String(a.path || '')) }
    }
  }
]
