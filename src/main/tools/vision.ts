// "¿Qué hay en mi pantalla?", "explícame este error", "¿qué tengo en la mano?", and images the
// user drops in the chat. Whatever NEXUS looks at is shown in a small preview, so the user always
// knows what it saw (idea from JARVIS-OS: VisionPreviewWindow).
import { basename } from 'path'
import { describeImage, imageFile, screenshot, visionUnavailable } from '../vision'
import { short } from '../lib/text'
import { askWindow, broadcast } from '../window'
import { toPath } from './files'
import { str, type Tool } from './define'

const unavailable = (why: string) => ({ result: why, label: 'Sin visión disponible' })
const preview = (base64: string, mime: string, source: string) => broadcast('vision:preview', { src: `data:${mime};base64,${base64}`, source })

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
      const shot = await screenshot()
      preview(shot, 'image/jpeg', 'PANTALLA')
      return { result: await describeImage(shot, 'image/jpeg', String(a.question || '')), label: 'Pantalla analizada' }
    }
  },
  {
    name: 'look_at_camera',
    description: 'Mira por la webcam (por ejemplo "¿qué tengo en la mano?", "¿cómo me queda?") y responde. Solo si lo pide.',
    params: { question: str('Qué quiere saber') },
    required: ['question'],
    confirm: () => ({ title: 'Usar la cámara', detail: 'Tomaré una sola foto con la webcam para responderte. Verás la foto en pantalla.' }),
    progress: () => 'Mirando por la cámara',
    run: async a => {
      const why = await visionUnavailable()
      if (why) return unavailable(why)
      // the photo is taken by the window (it has camera access); one frame, the camera turns off after
      const photo = await askWindow('camera:snap', 15000) as string | { error: string }
      if (typeof photo !== 'string') return { result: 'No he podido usar la cámara: ' + (photo?.error || 'sin respuesta'), label: 'Cámara no disponible' }
      preview(photo, 'image/jpeg', 'CÁMARA')
      return { result: await describeImage(photo, 'image/jpeg', String(a.question || '')), label: 'Foto analizada' }
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
      preview(base64, mime, basename(String(a.path || '')).toUpperCase())
      return { result: await describeImage(base64, mime, String(a.question || '')), label: 'Imagen analizada · ' + basename(String(a.path || '')) }
    }
  }
]
