// Stops the agent from going round in circles (and burning the free quota): the same tool with
// the same arguments a third time, or two calls alternating A-B-A-B, is not run again.
// Idea taken from OpenJarvis (agents/loop_guard.py, Apache-2.0).

export class LoopGuard {
  private seen = new Map<string, number>()
  private recent: string[] = []

  /** Returns a note for the model instead of running the call, or null if it may run. */
  check(name: string, args: unknown): string | null {
    const key = name + ':' + JSON.stringify(args ?? {})
    const n = (this.seen.get(key) || 0) + 1
    this.seen.set(key, n)
    this.recent.push(key)
    const r = this.recent.slice(-4)
    if (n >= 3) return `Ya has llamado a ${name} con los mismos datos ${n - 1} veces. No lo repitas: responde con lo que ya tienes o prueba otra cosa.`
    if (r.length === 4 && r[0] === r[2] && r[1] === r[3] && r[0] !== r[1]) return 'Estás alternando las mismas dos acciones sin avanzar. Para y responde con lo que tienes.'
    return null
  }
}
