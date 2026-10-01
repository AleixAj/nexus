// How hard a question is, from simple rules (no AI call). Plain chat goes to the small fast
// model with a short answer budget; anything that needs tools or thinking to the big one.
// Idea taken from OpenJarvis (learning/routing/complexity.py, Apache-2.0).

const HARD = /\b(analiza|análisis|compara|comparativa|explica (por qué|cómo)|razona|paso a paso|plan|estrategia|programa|código|script|función|bug|error de|depura|calcula|ecuación|resume|informe|redacta|escribe un|traduce|investiga|busca información|pros y contras|ventajas)\b/i
const CODE = /```|\{[\s\S]*\}|=>|function |def |SELECT |<\/?\w+>/
// asks to do something on the PC: the small model is unreliable with tools
const ACTION = /\b(pon|ponme|abre|cierra|guarda|crea|borra|elimina|mueve|copia|busca|recuerda|recuérdame|avísame|apaga|enciende|bloquea|suspende|reinicia|lee|mira|escribe|cambia|sube|baja|cancela|para|pausa|siguiente|anterior|olvida|añade|qué hay|qué tengo|noticias|tiempo|hora)\b/i

/** 0 = trivial … 1 = hard */
export function complexity(text: string) {
  let s = 0
  if (text.length > 280) s += .35
  else if (text.length > 120) s += .15
  if (HARD.test(text)) s += .45
  if (CODE.test(text)) s += .4
  if (/\[Adjuntos: /.test(text)) s += .4
  if ((text.match(/\?/g) || []).length > 1) s += .15
  if ((text.match(/\by\b|,/g) || []).length >= 3) s += .1 // several things at once
  return Math.min(1, s)
}

/** Short small talk with nothing to do: the small model is enough. */
export const isSimple = (text: string) => text.length < 90 && !ACTION.test(text) && complexity(text) < .3
