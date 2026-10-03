import { createRoot } from 'react-dom/client'
import './engine/nexus-engine.js'
import './styles/design.css'
import NexusApp from './NexusApp'
import ExtraScreen from './views/ExtraScreen'
import BarScreen from './views/BarScreen'

// the other monitors (wallpaper mode) only show the galaxy; the floating bar is its own window
const screen = new URLSearchParams(location.search).get('screen')
if (screen === 'bar') document.documentElement.style.background = document.body.style.background = 'transparent'
createRoot(document.getElementById('root')!).render(screen === 'extra' ? <ExtraScreen /> : screen === 'bar' ? <BarScreen /> : <NexusApp />)
