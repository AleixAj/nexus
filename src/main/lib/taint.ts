// Did outside content (a web page, a file, the screen) enter the current answer? Then a fact
// the agent wants to remember could come from that content and not from the user: it waits
// for the user's OK. Idea taken from OpenJarvis (security/taint.py, memory trust levels).

const OUTSIDE = new Set(['web_search', 'read_webpage', 'wikipedia', 'read_file', 'list_directory', 'find_files', 'look_at_screen', 'look_at_image', 'read_clipboard', 'news', 'run_powershell'])

let tainted = false
export const resetTaint = () => { tainted = false }
export const noteTool = (name: string) => { if (OUTSIDE.has(name)) tainted = true }
export const isTainted = () => tainted
