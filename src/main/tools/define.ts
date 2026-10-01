// The shape every agent tool follows. A tool is one object: what the model sees
// (name, description, parameters) next to what runs, so adding one touches one file.

export type ToolResult = { result: string; label: string }

/** Which Settings switch enables the tool ('base' = always on). */
export type Group = 'base' | 'web' | 'files' | 'write' | 'shell'

export type Tool = {
  name: string
  /** Short on purpose: it travels with every request (free-tier tokens). */
  description: string
  params?: Record<string, unknown>
  required?: string[]
  group?: Group
  /** If present the user must approve each call; returns what the approval card shows. */
  confirm?: (a: any) => { title: string; detail: string }
  /** Label on the core while it runs. */
  progress?: (a: any) => string
  run: (a: any) => Promise<ToolResult> | ToolResult
}

export const str = (description: string) => ({ type: 'string', description })
export const num = (description: string) => ({ type: 'number', description })
export const bool = (description: string) => ({ type: 'boolean', description })
export const oneOf = (values: string[], description = '') => ({ type: 'string', enum: values, ...(description ? { description } : {}) })

/** Same text as result and label (most simple tools). */
export const said = (text: string): ToolResult => ({ result: text, label: text })
