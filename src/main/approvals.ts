// "Permitir siempre": actions the user approved for good, so NEXUS stops asking.
// Kept per kind of action (for example "guardar archivos" or "suspender el equipo").
import { readJson, writeJson } from './lib/store'

const FILE = 'approvals.json'
type Approval = { key: string; title: string; at: number }
let list: Approval[] | null = null
const load = () => (list ??= readJson<Approval[]>(FILE, []))

/** Same tool and same action = same approval (the details, like the file name, may change). */
export const approvalKey = (tool: string, args: any) => tool + (args && typeof args.action === 'string' ? ':' + args.action : '')

export const isApproved = (key: string) => load().some(a => a.key === key)
export const listApprovals = () => load()

export function approve(key: string, title: string) {
  if (isApproved(key)) return
  list = [...load(), { key, title, at: Date.now() }]
  writeJson(FILE, list)
}

export function revoke(key: string) {
  list = load().filter(a => a.key !== key)
  writeJson(FILE, list)
}
