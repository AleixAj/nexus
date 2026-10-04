// A small card with what NEXUS just looked at: the screen, the camera or an image.
export default function VisionPreview({ v }: { v: any }) {
  const p = v.visionPreview
  if (!p) return null
  return (
    <div key={p.at} style={{ position: 'absolute', right: 'calc(40px - var(--ex))', bottom: 230, width: 380, padding: 10, borderRadius: 14, zIndex: 30, background: 'linear-gradient(rgba(7,5,14,.72),rgba(7,5,14,.72)) padding-box, linear-gradient(155deg, rgb(var(--acc2) / .55), rgb(var(--acc) / .08) 60%) border-box', border: '1px solid transparent', backdropFilter: 'blur(18px)', boxShadow: '0 20px 60px rgba(0,0,0,.5)', animation: 'nx-up 450ms cubic-bezier(.16,1,.3,1) both' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 4px 8px' }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '.2em', color: 'rgb(var(--acc2) / .8)' }}>● LO QUE ESTOY VIENDO · {p.source}</span>
        <button onClick={v.closeVision} title="Cerrar" style={{ width: 24, height: 24, border: 'none', background: 'none', color: 'rgba(226,218,240,.6)', cursor: 'pointer', fontSize: 13 }}>✕</button>
      </div>
      <img src={p.src} alt="" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 9, display: 'block', background: '#000' }} />
    </div>
  )
}
