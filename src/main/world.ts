// Real data for the desktop HUD: approximate location, weather and "on this day".
// Free services without keys: ipapi.co (or ipwho.is when it is rate-limited), Open-Meteo and Wikipedia.

type Place = { city: string; lat: number; lon: number }
export type World = {
  city: string
  lat: number
  lon: number
  temp: number | null
  max: number | null
  min: number | null
  humidity: number | null
  sky: string
  fact: { year: number; text: string } | null
}

const SKY: [number, string][] = [
  [0, 'Despejado'], [1, 'Casi despejado'], [2, 'Parcialmente nublado'], [3, 'Nublado'], [48, 'Niebla'],
  [57, 'Llovizna'], [67, 'Lluvia'], [77, 'Nieve'], [82, 'Chubascos'], [86, 'Chubascos de nieve'], [99, 'Tormenta']
]
const sky = (code: number) => (SKY.find(([c]) => code <= c) || SKY[SKY.length - 1])[1]

const get = async (url: string) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'NEXUS desktop assistant' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

let place: Place | null = null
let weather: { at: number; data: Pick<World, 'temp' | 'max' | 'min' | 'humidity' | 'sky'> } | null = null
let fact: { day: string; data: World['fact'] } | null = null

async function getPlace(): Promise<Place> {
  if (place) return place
  // ipapi.co limits requests per IP (shared IPs hit it often): ipwho.is as a backup
  for (const url of ['https://ipapi.co/json/', 'https://ipwho.is/']) {
    const j = await get(url).catch(() => null)
    if (j && typeof j.latitude === 'number') return (place = { city: j.city || j.region || '', lat: j.latitude, lon: j.longitude })
  }
  throw new Error('Sin ubicación')
}

async function getWeather(p: Place) {
  if (weather && Date.now() - weather.at < 20 * 60e3) return weather.data
  const j = await get(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m,relative_humidity_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`)
  const data = {
    temp: Math.round(j.current.temperature_2m),
    humidity: Math.round(j.current.relative_humidity_2m),
    sky: sky(j.current.weather_code),
    max: Math.round(j.daily.temperature_2m_max[0]),
    min: Math.round(j.daily.temperature_2m_min[0])
  }
  weather = { at: Date.now(), data }
  return data
}

async function getFact() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0')
  if (fact?.day === mm + dd) return fact.data
  const j = await get(`https://es.wikipedia.org/api/rest_v1/feed/onthisday/selected/${mm}/${dd}`)
  // prefer short entries so they fit the HUD
  const items = (j.selected || []).filter((e: any) => e.text && e.text.length < 150)
  const pick = items.length ? items[Math.floor(Math.random() * items.length)] : null
  const data = pick ? { year: pick.year, text: pick.text } : null
  fact = { day: mm + dd, data }
  return data
}

export async function getWorld(): Promise<World> {
  const [p, f] = await Promise.allSettled([getPlace(), getFact()])
  const pl = p.status === 'fulfilled' ? p.value : null
  let w: Awaited<ReturnType<typeof getWeather>> | null = null
  if (pl) { try { w = await getWeather(pl) } catch { /* offline */ } }
  return {
    city: pl?.city || '',
    lat: pl?.lat ?? 0,
    lon: pl?.lon ?? 0,
    temp: w?.temp ?? null,
    max: w?.max ?? null,
    min: w?.min ?? null,
    humidity: w?.humidity ?? null,
    sky: w?.sky || '',
    fact: f.status === 'fulfilled' ? f.value : null
  }
}

/** One line for the assistant's context, from cache only (never waits for the network). */
export function worldSummary() {
  if (!place) return ''
  const w = weather?.data
  return `Ubicación aproximada del usuario: ${place.city}.` + (w ? ` Tiempo ahora: ${w.temp} °C, ${w.sky.toLowerCase()} (máx ${w.max}, mín ${w.min}).` : '')
}
