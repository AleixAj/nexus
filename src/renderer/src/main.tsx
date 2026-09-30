import { createRoot } from 'react-dom/client'
import './engine/nexus-engine.js'
import './styles/design.css'
import NexusApp from './NexusApp'

createRoot(document.getElementById('root')!).render(<NexusApp />)
