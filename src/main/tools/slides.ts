// "Hazme una presentación sobre…": the agent writes the content (it is the AI already, no extra
// calls) and this turns it into a designed .pptx in Documents\NEXUS\Presentaciones, then opens it.
// (Idea from JARVIS-OS: actions/presentation_maker.py — rebuilt with pptxgenjs, MIT.)
import { app, shell } from 'electron'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { loadSettings } from '../settings'
import { str, type Tool } from './define'

// each theme of the app, as slide colours (accent, light accent)
const THEMES: Record<string, [string, string]> = {
  nexus: ['8B5CF6', 'C4B5FD'], arc: ['22D3EE', 'A5F3FC'], mark3: ['EF4444', 'FCD34D'], emerald: ['10B981', 'A7F3D0'], solar: ['F97316', 'FED7AA'],
}
type Slide = { title?: string; bullets?: string[]; notes?: string; quote?: string; stat?: string; statLabel?: string }

const safeName = (s: string) => s.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Presentación'

export async function buildDeck(title: string, subtitle: string, slides: Slide[]) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PptxGenJS = require('pptxgenjs')
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE' // 13.33 × 7.5 in
  pptx.title = title
  pptx.author = 'NEXUS'
  const [acc, acc2] = THEMES[loadSettings().theme] || THEMES.solar
  const BG = '0B0816', TEXT = 'F1EAF8', DIM = 'A79FBF'
  pptx.defineSlideMaster({
    title: 'NX', background: { color: BG },
    objects: [
      { rect: { x: 0, y: 7.38, w: 13.33, h: 0.12, fill: { color: acc } } },
      { text: { text: 'NEXUS', options: { x: 11.6, y: 6.95, w: 1.5, h: 0.3, fontFace: 'Consolas', fontSize: 9, color: DIM, align: 'right', charSpacing: 4 } } },
    ],
    slideNumber: { x: 0.5, y: 6.95, w: 1, h: 0.3, fontFace: 'Consolas', fontSize: 9, color: DIM },
  })
  // cover
  const cover = pptx.addSlide({ masterName: 'NX' })
  cover.addShape(pptx.ShapeType.ellipse, { x: 8.6, y: 1.1, w: 5.2, h: 5.2, fill: { color: acc, transparency: 82 }, line: { color: acc2, width: 1, transparency: 40 } })
  cover.addShape(pptx.ShapeType.ellipse, { x: 9.7, y: 2.2, w: 3, h: 3, fill: { color: acc2, transparency: 88 }, line: { color: acc2, width: 0.75, transparency: 60 } })
  cover.addText(title, { x: 0.7, y: 2.3, w: 8.4, h: 1.8, fontFace: 'Segoe UI Light', fontSize: 44, color: TEXT, bold: false, valign: 'bottom', fit: 'shrink' })
  if (subtitle) cover.addText(subtitle, { x: 0.7, y: 4.2, w: 8.2, h: 0.9, fontFace: 'Segoe UI', fontSize: 18, color: acc2, valign: 'top' })
  cover.addText(new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase(), { x: 0.7, y: 5.4, w: 6, h: 0.4, fontFace: 'Consolas', fontSize: 11, color: DIM, charSpacing: 3 })

  for (const s of slides.slice(0, 25)) {
    const sl = pptx.addSlide({ masterName: 'NX' })
    if (s.title) {
      sl.addShape(pptx.ShapeType.rect, { x: 0.7, y: 0.62, w: 0.08, h: 0.62, fill: { color: acc } })
      sl.addText(s.title, { x: 0.95, y: 0.5, w: 11.6, h: 0.85, fontFace: 'Segoe UI Semibold', fontSize: 28, color: TEXT, fit: 'shrink' })
    }
    if (s.stat) {
      // one big number with its meaning
      sl.addText(s.stat, { x: 0.7, y: 2.0, w: 12, h: 2.2, fontFace: 'Segoe UI Light', fontSize: 110, color: acc2, align: 'center' })
      if (s.statLabel) sl.addText(s.statLabel, { x: 1.5, y: 4.3, w: 10.3, h: 1, fontFace: 'Segoe UI', fontSize: 22, color: TEXT, align: 'center' })
    } else if (s.quote) {
      sl.addText('“' + s.quote.replace(/^["“]|["”]$/g, '') + '”', { x: 1.2, y: 1.8, w: 10.9, h: 3.6, fontFace: 'Georgia', fontSize: 30, italic: true, color: TEXT, align: 'center', valign: 'middle', fit: 'shrink' })
    } else if (s.bullets?.length) {
      sl.addText(s.bullets.slice(0, 7).map(b => ({ text: b, options: { bullet: { code: '25B8', color: acc2 }, paraSpaceAfter: 14 } })), {
        x: 0.95, y: 1.65, w: 11.5, h: 5, fontFace: 'Segoe UI', fontSize: s.bullets.length > 5 ? 18 : 22, color: TEXT, valign: 'top', fit: 'shrink',
      })
    }
    if (s.notes) sl.addNotes(s.notes)
  }
  const dir = join(app.getPath('documents'), 'NEXUS', 'Presentaciones')
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `${safeName(title)}.pptx`)
  await pptx.writeFile({ fileName: file })
  return file
}

export const slideTools: Tool[] = [
  {
    name: 'create_presentation',
    description: 'Crea una presentación de PowerPoint (.pptx) con diseño y la abre. Tú escribes el contenido: 5-12 diapositivas claras, frases cortas.',
    params: {
      title: str('Título de la presentación'),
      subtitle: str('Subtítulo corto'),
      slides: {
        type: 'array',
        description: 'Diapositivas en orden. Cada una: title y bullets (3-5 puntos cortos); o quote (una cita); o stat + statLabel (un dato grande). notes = lo que decir al presentarla.',
        items: { type: 'object', properties: { title: { type: 'string' }, bullets: { type: 'array', items: { type: 'string' } }, quote: { type: 'string' }, stat: { type: 'string' }, statLabel: { type: 'string' }, notes: { type: 'string' } } }
      }
    },
    required: ['title', 'slides'],
    progress: () => 'Diseñando la presentación',
    run: async a => {
      const slides: Slide[] = Array.isArray(a.slides) ? a.slides : []
      if (!slides.length) return { result: 'Faltan las diapositivas', label: 'Presentación vacía' }
      const file = await buildDeck(String(a.title || 'Presentación'), String(a.subtitle || ''), slides)
      await shell.openPath(file)
      return { result: `Presentación creada y abierta: ${file} (${slides.length + 1} diapositivas)`, label: `Presentación · ${slides.length + 1} diapositivas` }
    }
  }
]
