// Draws the NEXUS icon (glowing core ring) as PNGs: node scripts/make-icon.mjs
import { mkdirSync, writeFileSync } from 'fs'
import { deflateSync } from 'zlib'

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c })
const crc = buf => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0 }

function png(size, px) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type), data])
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td))
    return Buffer.concat([len, td, c])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4) }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

function draw(size, { background }) {
  const px = Buffer.alloc(size * size * 4)
  const c = size / 2, R = size * .34, ss = 4
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0
    for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
      const dx = x + (sx + .5) / ss - c, dy = y + (sy + .5) / ss - c, d = Math.hypot(dx, dy) / R
      // dark disc, bright ring, violet glow, hot centre
      const ring = Math.exp(-((d - 1) ** 2) / (size > 64 ? .0045 : .012))
      const glow = Math.exp(-((d - 1) ** 2) / .08) * .55
      const core = Math.exp(-(d ** 2) / .05)
      const disc = d < 1 ? 1 : 0
      const bg = background && Math.max(Math.abs(dx), Math.abs(dy)) < c * .94 ? 1 : 0
      let pr = 5, pg = 3, pb = 10, pa = Math.max(bg, disc) * 255
      pr += 139 * glow + 255 * ring + 255 * core; pg += 92 * glow + 236 * ring + 240 * core; pb += 246 * glow + 255 * ring + 255 * core
      pa = Math.max(pa, Math.min(255, (glow + ring) * 255))
      r += Math.min(255, pr); g += Math.min(255, pg); b += Math.min(255, pb); a += pa
    }
    const n = ss * ss, i = (y * size + x) * 4
    px[i] = r / n; px[i + 1] = g / n; px[i + 2] = b / n; px[i + 3] = a / n
  }
  return png(size, px)
}

mkdirSync('resources', { recursive: true })
writeFileSync('resources/icon.png', draw(256, { background: true }))
writeFileSync('resources/tray.png', draw(32, { background: false }))
console.log('resources/icon.png, resources/tray.png')
