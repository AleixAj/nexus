// The galaxy alone, for the other monitors while NEXUS is the wallpaper: no core, no buttons.
// The (hidden) core sits just past the edge that faces the main monitor, so the glow and the
// spiral come in from that side and both screens read as one sky.
import { useEffect } from 'react'
import { api } from '../app/util'

const SIDE = (new URLSearchParams(location.search).get('side') || 'right') as 'left' | 'right' | 'top' | 'bottom'
// in this screen's 1920×1080 frame
const AT = { left: { x: 2420, y: 540 }, right: { x: -500, y: 540 }, top: { x: 960, y: 1460 }, bottom: { x: 960, y: -380 } }

export default function ExtraScreen() {
  useEffect(() => {
    const E = () => (window as any).NexusEngine
    let front = 'desktop', motion = 'desktop', settling = 0
    // same rules as the main screen: still while you use another app, nothing while covered
    // (but never before the colours have finished changing, or it would freeze half-way)
    const apply = () => {
      const e = E(); if (!e) return
      e.setPaused(Date.now() >= settling && (document.hidden || front === 'covered' || motion === 'never' || (motion !== 'always' && front === 'app')))
      e.setPower('calm')
    }
    const load = async () => {
      const e = E(); if (!e) { setTimeout(load, 50); return }
      const s = api ? await api.getSettings().catch(() => null) : null
      if (s) { e.setTheme(s.theme); e.setQuality(s.quality); e.setReduced(s.reduced); motion = s.bgMotion || 'desktop' }
      e.snapCore({ ...AT[SIDE], s: 1, v: 0 })
      settling = Date.now() + 2500
      apply()
      setTimeout(apply, 2600)
    }
    load()
    const offs = api ? [api.onCovered((st: string) => { front = st; apply() }), api.onExtraSettings(() => load())] : []
    document.addEventListener('visibilitychange', apply)
    return () => { offs.forEach((off: any) => off && off()); document.removeEventListener('visibilitychange', apply) }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#05030A', overflow: 'hidden' }}>
      <canvas data-nexus-main="bg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div data-nexus-grain="1" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: .55, mixBlendMode: 'overlay' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg, rgba(255,255,255,.018) 0 1px, transparent 1px 3px)' }} />
    </div>
  )
}
