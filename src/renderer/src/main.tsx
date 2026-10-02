import { createRoot } from 'react-dom/client'
import './engine/nexus-engine.js'
import './styles/design.css'
import NexusApp from './NexusApp'
import ExtraScreen from './views/ExtraScreen'

// the other monitors (wallpaper mode) only show the galaxy
const extra = new URLSearchParams(location.search).get('screen') === 'extra'
createRoot(document.getElementById('root')!).render(extra ? <ExtraScreen /> : <NexusApp />)
