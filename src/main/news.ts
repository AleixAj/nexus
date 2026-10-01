// News of the day from free RSS feeds, by topic, without the topics the user wants to avoid
// (politics by default). No keys and no AI: the feeds are read and filtered here.
import { htmlToText } from './lib/text'

export const TOPICS: Record<string, { label: string; feeds: [string, string][] }> = {
  tech: { label: 'Tecnología', feeds: [['Xataka', 'https://www.xataka.com/feedburner.xml'], ['Genbeta', 'https://www.genbeta.com/feedburner.xml'], ['Hipertextual', 'https://hipertextual.com/feed/'], ['MuyComputer', 'https://www.muycomputer.com/feed/']] },
  science: { label: 'Ciencia', feeds: [['Xataka Ciencia', 'https://www.xatakaciencia.com/feedburner.xml'], ['Gizmodo', 'https://es.gizmodo.com/feed']] },
  curious: { label: 'Curiosidades', feeds: [['Magnet', 'https://www.xataka.com/categoria/magnet/rss2.xml'], ['Microsiervos', 'https://www.microsiervos.com/index.xml']] },
  games: { label: 'Videojuegos', feeds: [['VidaExtra', 'https://www.vidaextra.com/feedburner.xml']] },
  movies: { label: 'Cine y series', feeds: [['Espinof', 'https://www.espinof.com/feedburner.xml']] },
  motor: { label: 'Motor', feeds: [['Motorpasión', 'https://www.motorpasion.com/feedburner.xml']] },
  food: { label: 'Cocina', feeds: [['Directo al Paladar', 'https://www.directoalpaladar.com/feedburner.xml']] },
  health: { label: 'Salud', feeds: [['Vitónica', 'https://www.vitonica.com/feedburner.xml']] },
}
export const DEFAULT_TOPICS = 'tech,science,curious'

export type NewsItem = { id: string; title: string; summary: string; url: string; image: string; source: string; topic: string; at: number }

// Words that give away a political story (title or first lines). Checked as whole words.
const POLITICS = [
  'política', 'político', 'políticos', 'políticas', 'gobierno', 'ministro', 'ministra', 'ministerio', 'congreso', 'senado', 'parlamento', 'diputado', 'diputada',
  'elecciones', 'electoral', 'votación', 'campaña electoral', 'partido político', 'partidos políticos', 'líder de la oposición', 'presidente del gobierno', 'moncloa', 'psoe', 'pp', 'vox', 'yolanda díaz',
  'sánchez', 'feijóo', 'abascal', 'ayuso', 'puigdemont', 'trump', 'biden', 'putin', 'milei', 'casa blanca', 'kremlin', 'otan', 'ministerio del interior',
  'decreto', 'real decreto', 'boe', 'ultraderecha', 'republicanos', 'demócratas', 'sanciones', 'aranceles',
]

const decode = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
const tag = (xml: string, name: string) => decode((new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i').exec(xml) || [])[1] || '').trim()

function parse(xml: string, source: string, topic: string): NewsItem[] {
  return (xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || []).map(it => {
    const desc = tag(it, 'description') || tag(it, 'content:encoded')
    const image = /<(?:media:content|media:thumbnail|enclosure)[^>]+url="([^"]+\.(?:jpe?g|png|webp)[^"]*)"/i.exec(it)?.[1] || /<img[^>]+src="([^"]+)"/i.exec(desc)?.[1] || ''
    const text = htmlToText(desc).replace(/\s+/g, ' ').trim()
    const url = tag(it, 'link') || tag(it, 'guid')
    return {
      id: url, title: htmlToText(tag(it, 'title')), summary: text.length > 260 ? text.slice(0, 260).replace(/\s+\S*$/, '') + '…' : text,
      url, image: image.replace(/&amp;/g, '&'), source, topic, at: Date.parse(tag(it, 'pubDate') || tag(it, 'dc:date')) || 0,
    }
  }).filter(x => x.title && /^https?:\/\//.test(x.url))
}

const cache = new Map<string, { at: number; items: NewsItem[] }>()
const CACHE_MS = 20 * 60e3

async function feed(source: string, url: string, topic: string) {
  const hit = cache.get(url)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.items
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NEXUS' } })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const items = parse(await res.text(), source, topic)
    cache.set(url, { at: Date.now(), items })
    return items
  } catch {
    return hit?.items || [] // offline or the site is down: the last copy, if any
  }
}

const words = (s: string) => s.toLowerCase().normalize('NFC')
function avoided(item: NewsItem, avoid: string[]) {
  const text = ' ' + words(item.title + ' ' + item.summary.slice(0, 160)).replace(/[^\p{L}\p{N}]+/gu, ' ') + ' '
  return avoid.some(w => text.includes(' ' + w + ' '))
}

/** Today's news for the chosen topics: recent first, mixing the sources, without what the user avoids. */
export async function getNews(topics = DEFAULT_TOPICS, avoid = 'política', max = 40) {
  const ids = topics.split(',').map(t => t.trim()).filter(t => Object.hasOwn(TOPICS, t))
  const avoidWords = avoid.split(',').map(w => words(w.trim())).filter(Boolean)
  const blocked = [...avoidWords.filter(w => !/^pol[ií]tica$/.test(w)), ...(avoidWords.some(w => /^pol[ií]tica$/.test(w)) ? POLITICS : [])]
  const lists = await Promise.all(ids.flatMap(t => TOPICS[t].feeds.map(([name, url]) => feed(name, url, t))))
  const since = Date.now() - 36 * 3600e3 // today and last night
  const seen = new Set<string>()
  // round-robin between sources so one site does not fill the page
  const queues = lists.map(l => l.filter(x => x.at >= since && !avoided(x, blocked)).sort((a, b) => b.at - a.at))
  const out: NewsItem[] = []
  for (let i = 0; out.length < max && queues.some(q => q.length > i); i++) {
    for (const q of queues) {
      const x = q[i]
      if (!x) continue
      const key = words(x.title).slice(0, 60)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(x)
    }
  }
  return out.slice(0, max).sort((a, b) => b.at - a.at)
}
