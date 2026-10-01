// Does a transcript contain something that sounds like the wake phrase? Spanish is written as it
// sounds, so a few rules turn both into "sound spellings" (b/v, c/k/z/s, silent h, j…) and a small
// edit distance absorbs what the recogniser spells differently ("Yarbis", "Gei Lira" for "Hey Lyra").

export const sound = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-zñ ]/g, ' ')
  .replace(/qu(?=[ei])/g, 'k').replace(/c(?=[ei])/g, 's').replace(/[cq]/g, 'k').replace(/z/g, 's')
  .replace(/gu(?=[ei])/g, 'g').replace(/g(?=[ei])/g, 'j').replace(/v/g, 'b').replace(/ll/g, 'y')
  .replace(/[hj]/g, '').replace(/y/g, 'i').replace(/x/g, 'ks').replace(/w/g, 'u')
  .replace(/(.)\1+/g, '$1').replace(/\s+/g, ' ').trim()

function distance(a: string, b: string) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[b.length]
}

/** How many sound changes a phrase may have and still count. Short ones must match exactly. */
export const tolerance = (phrase: string) => { const n = sound(phrase).replace(/ /g, '').length; return n <= 5 ? 0 : n <= 8 ? 1 : 2 }

/** Is the phrase (as it sounds) somewhere in the text? Looks at windows of 1 to 4 words. */
export function soundsLike(text: string, phrase: string) {
  const words = sound(text).split(' ').filter(Boolean), p = sound(phrase).replace(/ /g, '')
  if (!p) return false
  const tol = tolerance(phrase)
  for (let i = 0; i < words.length; i++) {
    for (let n = 1; n <= 4 && i + n <= words.length; n++) if (distance(words.slice(i, i + n).join(''), p) <= tol) return true
  }
  return false
}
