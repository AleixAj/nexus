// The shape every agent tool follows. A tool is one object: what the model sees
// (name, description, parameters) next to what runs, so adding one touches one file.

import type { Undo } from '../activity'

export type ToolResult = { result: string; label: string }

/** Which Settings switch enables the tool ('base' = always on). */
export type Group = 'base' | 'web' | 'files' | 'write' | 'shell'

/** What a running tool can use: progress labels on the core and the turn's cancel signal. */
export type RunCtx = { progress: (label: string) => void; signal: AbortSignal }

export type Tool = {
  name: string
  /** Short on purpose: it travels with every request (free-tier tokens). */
  description: string
  params?: Record<string, unknown>
  required?: string[]
  group?: Group
  /** Only reads (search, look, list…): several of these in a row run at the same time. */
  readOnly?: boolean
  /** Small everyday controls (music, volume): not written in the activity list, allowed while paused. */
  trivial?: boolean
  /** Runs before the change (after the approval) and says how to undo it: keeps a copy of a file… */
  prepare?: (a: any) => Promise<Undo | null>
  /** If present the user must approve the call; returns what the approval card shows (null = no need this time). */
  confirm?: (a: any) => { title: string; detail: string } | null
  /** Too risky to approve for good (any command, deleting): it always asks. */
  noAlways?: boolean
  /**
   * Serious actions (shut down, delete…) only run if the user's own words ask for them: the model
   * alone cannot decide them, not even when a web page or a file tells it to. Returns the words
   * to look for in what the user said (null = not needed for these arguments).
   */
  intent?: (a: any) => RegExp | null
  /** Label on the core while it runs. */
  progress?: (a: any) => string
  run: (a: any, ctx: RunCtx) => Promise<ToolResult> | ToolResult
}

export const str = (description: string) => ({ type: 'string', description })
export const num = (description: string) => ({ type: 'number', description })
export const bool = (description: string) => ({ type: 'boolean', description })
export const oneOf = (values: string[], description = '') => ({ type: 'string', enum: values, ...(description ? { description } : {}) })

/** Same text as result and label (most simple tools). */
export const said = (text: string): ToolResult => ({ result: text, label: text })
