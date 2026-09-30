// Generated from design/NEXUS.dc.html by scripts/convert-design.mjs
import Desktop from './Desktop'
import ChatPanel from './ChatPanel'
import VoicePanel from './VoicePanel'
import RoutinesPanel from './RoutinesPanel'
import SystemPanel from './SystemPanel'
import MusicPanel from './MusicPanel'
import MemoryPanel from './MemoryPanel'
import SettingsPanel from './SettingsPanel'
import Overlay from './Overlay'
import Onboarding from './Onboarding'
import Dock from './Dock'
import Director from './Director'

export default function Stage({ v }: { v: any }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#05030A', overflow: 'hidden' }}>
      <div data-reduced={v.reducedAttr} data-quality={v.qualityAttr} style={{ position: "absolute", left: "50%", top: "50%", width: "1920px", height: "1080px", marginLeft: "-960px", marginTop: "-540px", transform: `scale(${v.k})`, "--acc": v.acc, "--acc2": v.acc2, overflow: "hidden", fontFamily: "'Space Grotesk',system-ui,sans-serif", color: "#F1EAF8", background: "#05030A" }}>
        <Desktop v={v} />
        <ChatPanel v={v} />
        <VoicePanel v={v} />
        <RoutinesPanel v={v} />
        <SystemPanel v={v} />
        <MusicPanel v={v} />
        <MemoryPanel v={v} />
        <SettingsPanel v={v} />
        <Overlay v={v} />
        <Onboarding v={v} />
        <Dock v={v} />
        <Director v={v} />
      </div>
    </div>
  )
}
