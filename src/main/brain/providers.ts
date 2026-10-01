// Which AI answers. "Auto" spreads the questions over every free service the user has a key
// for: when one hits a limit (even the per-minute one) the next takes over at once, and the
// tired one rests for a while.
import { PROVIDERS, getKey, type Settings } from '../settings'

export type Target = { name: string; url: string; key: string; model: string }

const resting = new Map<string, number>() // "provider/model" -> rest until (ms)
const restKey = (t: Target) => t.name + '/' + t.model
const isResting = (t: Target) => (resting.get(restKey(t)) || 0) > Date.now()
const rest = (t: Target, ms: number) => resting.set(restKey(t), Date.now() + ms)

let ollamaUp = { at: 0, up: false, model: '' }
async function ollama(): Promise<Target | null> {
  if (Date.now() - ollamaUp.at > 60e3) {
    ollamaUp = { at: Date.now(), up: false, model: '' }
    try {
      const j = await (await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(400) })).json()
      const names: string[] = (j.models || []).map((m: any) => m.name)
      const pick = PROVIDERS.Ollama.models.find(m => names.includes(m)) || names[0] || ''
      ollamaUp = { at: Date.now(), up: !!pick, model: pick }
    } catch { /* not installed or not running */ }
  }
  return ollamaUp.up ? { name: 'Ollama', url: PROVIDERS.Ollama.url, key: '', model: ollamaUp.model } : null
}

/** The services to try, in order. Easy questions go to the small fast model first. */
export async function targets(s: Settings, simple = false): Promise<Target[]> {
  const t = (name: string, model: string): Target | null => {
    const key = getKey(name)
    return key ? { name, url: PROVIDERS[name].url, key, model } : null
  }
  let list: (Target | null)[]
  if (s.provider === 'Auto') {
    const small = t('Groq', 'openai/gpt-oss-20b') // its own 200K/day and the fastest
    list = [
      simple ? small : null,
      t('Cerebras', 'gpt-oss-120b'), // 1M tokens/day free
      t('Groq', 'openai/gpt-oss-120b'), // 200K/day
      simple ? null : small,
      s.geminiFallback ? t('Gemini', 'gemini-3.5-flash-lite') : null,
      await ollama() // local: no limits at all
    ]
  } else if (s.provider === 'Ollama') {
    list = [{ name: 'Ollama', url: PROVIDERS.Ollama.url, key: '', model: s.model }]
  } else {
    const name = Object.hasOwn(PROVIDERS, s.provider) ? s.provider : 'Groq'
    const small = PROVIDERS[name].models.find(m => m !== s.model && /20b|8b|mini|lite/i.test(m))
    list = simple && small ? [t(name, small), t(name, s.model)] : [t(name, s.model), small ? t(name, small) : null]
    list.push(s.geminiFallback && name !== 'Gemini' ? t('Gemini', 'gemini-3.5-flash-lite') : null)
  }
  return list.filter((x): x is Target => !!x)
}

// Reads a 429: is it the daily quota, and how long to wait (Groq: "Please try again in 1m2.5s")
async function rateLimit(res: Response) {
  let msg = ''
  try { msg = JSON.stringify(await res.json()) } catch { /* no body */ }
  const daily = /per day|\(TPD\)|\(RPD\)|PerDay|daily/i.test(msg)
  const m = /try again in (?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?/i.exec(msg)
  const fromBody = m ? (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0)) : 0
  const retryDelay = /"retryDelay":"([\d.]+)s"/.exec(msg) // Gemini
  const wait = fromBody || (retryDelay ? +retryDelay[1] : 0) || Number(res.headers.get('retry-after')) || 10
  return { daily: daily || wait > 600, wait }
}

export const aborted = () => Object.assign(new Error('Aborted'), { name: 'AbortError' })
const sleep = (ms: number, signal: AbortSignal) => new Promise<void>((res, rej) => {
  const t = setTimeout(res, ms)
  signal.addEventListener('abort', () => { clearTimeout(t); rej(aborted()) }, { once: true })
})

/**
 * Sends one chat request to the first service that is not resting and accepts it,
 * moving on to the next on limits or errors. Returns a streaming response.
 */
export async function callModel(all: Target[], body: (model: string) => string, signal: AbortSignal, onProgress: (label: string) => void): Promise<Response> {
  let res: Response | null = null
  let lastLimit = { daily: false, wait: 0 }
  for (let pass = 0; pass < 3 && !res?.ok; pass++) {
    const ready = all.filter(t => !isResting(t))
    if (!ready.length) {
      // everyone is resting: wait for the first one to come back if it is soon
      const soonest = Math.min(...all.map(t => resting.get(restKey(t)) || 0)) - Date.now()
      if (soonest > 45e3) break
      onProgress(`Límite por minuto · espero ${Math.ceil(soonest / 1000)} s`)
      await sleep(soonest + 300, signal)
      continue
    }
    for (const t of ready) {
      try {
        res = await fetch(t.url + '/chat/completions', {
          method: 'POST',
          signal: AbortSignal.any([signal, AbortSignal.timeout(60000)]),
          headers: { 'Content-Type': 'application/json', ...(t.key ? { Authorization: `Bearer ${t.key}` } : {}) },
          body: body(t.model)
        })
      } catch (err: any) {
        if (signal.aborted) throw aborted()
        if (all.length === 1) {
          if (err.name === 'TimeoutError') throw new Error('El modelo tarda demasiado en responder')
          const code = err.cause?.code
          if (code === 'ECONNREFUSED' && t.name === 'Ollama') throw new Error('Ollama no está arrancado')
          throw new Error(code === 'ENOTFOUND' ? 'Sin conexión a Internet' : 'No se pudo conectar con el modelo')
        }
        rest(t, 60e3) // unreachable: try the others
        res = null
        continue
      }
      if (res.ok) break
      if (res.status === 429 || res.status >= 500) {
        const limit = res.status === 429 ? await rateLimit(res) : { daily: false, wait: 30 }
        lastLimit = limit
        rest(t, limit.daily ? 3 * 3600e3 : limit.wait * 1000 + 300)
        if (all.length > 1) onProgress(limit.daily ? `Cupo de ${t.name} agotado · cambio de IA` : `${t.name} ocupada · cambio de IA`)
        continue
      }
      // any other error: with more services available, skip this one for a while
      if (all.length > 1) { rest(t, 10 * 60e3); console.warn('[brain]', t.name, res.status, (await res.text()).slice(0, 200)); res = null; continue }
      break // reported below
    }
  }
  if (!res) throw new Error('No se pudo conectar con ninguna IA; revise las claves en Ajustes')
  if (res.status === 429 || (!res.ok && res.status >= 500)) {
    throw new Error(lastLimit.daily
      ? 'Se ha agotado el cupo gratuito de hoy de sus IA. Añada otra clave gratuita en Ajustes (Cerebras da 1 millón de tokens al día) o pruebe más tarde'
      : 'Las IA gratuitas están saturadas ahora mismo; pruebe en un minuto')
  }
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res
}
