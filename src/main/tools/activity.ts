// "Deshaz lo último": puts back the last change NEXUS made to the user's files.
import { undoLast } from '../activity'
import { said, type Tool } from './define'

export const activityTools: Tool[] = [
  {
    name: 'undo_last', trivial: true,
    description: 'Deshace el último cambio que hizo NEXUS en archivos (guardar, editar, mover, crear carpeta). Para "deshaz eso" o "vuelve a dejarlo como estaba".',
    progress: () => 'Deshaciendo',
    run: async () => said(await undoLast())
  }
]
