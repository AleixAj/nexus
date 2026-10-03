// The day's priorities: up to three things the user wants to get done today. Asked in the
// morning summary, checked in the evening one. (Idea from vierisid/jarvis: morning planning
// and evening review.)
import { readJson, writeJson } from './lib/store'

export type Priority = { text: string; done: boolean }
type Plan = { day: string; items: Priority[] }

const FILE = 'dayplan.json'
const today = () => new Date().toLocaleDateString('sv')

/** Today's priorities (empty if none were set today). */
export function todayPlan(): Priority[] {
  const p = readJson<Plan | null>(FILE, null)
  return p && p.day === today() ? p.items : []
}

export function setPlan(items: string[]) {
  const list = items.map(t => String(t).trim()).filter(Boolean).slice(0, 5).map(text => ({ text: text.slice(0, 160), done: false }))
  writeJson(FILE, { day: today(), items: list })
  return list
}

/** Marks one as done, by its number (1, 2, 3) or by some of its words. */
export function markDone(which: string) {
  const items = todayPlan()
  const n = Number(which)
  const low = String(which).toLowerCase()
  const hit = Number.isInteger(n) && n >= 1 && n <= items.length ? items[n - 1] : items.find(i => i.text.toLowerCase().includes(low))
  if (!hit) return null
  hit.done = true
  writeJson(FILE, { day: today(), items })
  return hit
}
