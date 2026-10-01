// Generated from design/NEXUS.dc.html by scripts/convert-design.mjs
import Desktop from './Desktop'
import ChatPanel from './ChatPanel'
import VoicePanel from './VoicePanel'
import RoutinesPanel from './RoutinesPanel'
import SystemPanel from './SystemPanel'
import MusicPanel from './MusicPanel'
import MemoryPanel from './MemoryPanel'
import NewsPanel from './NewsPanel'
import SettingsPanel from './SettingsPanel'
import Overlay from './Overlay'
import Onboarding from './Onboarding'
import Dock from './Dock'
import BootIntro from './BootIntro'
import ConfirmCard from './ConfirmCard'
import KeyCard from './KeyCard'
import VisionPreview from './VisionPreview'

export default function Stage({ v }: { v: any }) {
  return (
    <div onDragOver={v.onDragOver} onDragLeave={v.onDragLeave} onDrop={v.onDrop} style={{ position: 'fixed', inset: 0, background: '#05030A', overflow: 'hidden' }}>
      {/* the galaxy fills the whole window (any aspect ratio); the UI stays a centred 16:9 stage */}
      <canvas data-nexus-main="bg" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: v.bgFilter, transition: "filter 1000ms cubic-bezier(.16,1,.3,1)" }} />
      <div data-reduced={v.reducedAttr} data-quality={v.qualityAttr} style={{ position: "absolute", left: "50%", top: "50%", width: "1920px", height: "1080px", marginLeft: "-960px", marginTop: "-540px", transform: `scale(${v.k})`, "--acc": v.acc, "--acc2": v.acc2, overflow: "hidden", fontFamily: "'Space Grotesk',system-ui,sans-serif", color: "#F1EAF8" }}>
        <Desktop v={v} />
        <ChatPanel v={v} />
        <VoicePanel v={v} />
        <RoutinesPanel v={v} />
        <SystemPanel v={v} />
        <MusicPanel v={v} />
        <MemoryPanel v={v} />
        <NewsPanel v={v} />
        <SettingsPanel v={v} />
        <Overlay v={v} />
        <Onboarding v={v} />
        <Dock v={v} />
        <ConfirmCard v={v} />
        <KeyCard v={v} />
        <VisionPreview v={v} />
      </div>
      {v.intro && <BootIntro v={v} />}
      {v.dragOver && (
        <div style={{ position: 'absolute', inset: 16, borderRadius: 18, border: '2px dashed rgb(var(--acc2) / .6)', background: 'rgba(7,5,14,.55)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', pointerEvents: 'none', zIndex: 20, fontFamily: "'Space Grotesk',system-ui,sans-serif", color: '#FFF6E9', fontSize: 26, animation: 'nx-in 200ms both' }}>
          Suelta aquí: Nexus lo lee y te lo explica
        </div>
      )}
      {/* film grain and scanlines over the whole window, not just the 16:9 stage */}
      <div data-nexus-grain="1" style={{ position: "absolute", inset: "0", pointerEvents: "none", opacity: ".55", mixBlendMode: "overlay" }}></div>
      <div style={{ position: "absolute", inset: "0", pointerEvents: "none", background: "repeating-linear-gradient(0deg, rgba(255,255,255,.018) 0 1px, transparent 1px 3px)" }}></div>
    </div>
  )
}
