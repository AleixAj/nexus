// Small text helpers shared by the tools.

/** Cuts long tool output so it does not eat the free token budget. */
export const clip = (s: string, n = 5000) => (s.length > n ? s.slice(0, n) + `\n… [recortado, ${s.length - n} caracteres más]` : s)

export const short = (s: unknown, n = 40) => { const t = String(s || ''); return t.length > n ? t.slice(0, n) + '…' : t }

export const size = (b: number) => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : b < 1073741824 ? (b / 1048576).toFixed(1) + ' MB' : (b / 1073741824).toFixed(2) + ' GB'

export function htmlToText(html: string) {
  return html
    .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/?(b|strong|em|i|u|span|a|small|mark|abbr)(\s[^>]*)?>/gi, '') // inline tags: no extra spaces
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()
}
