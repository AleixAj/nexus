// What NEXUS has done on the PC, with "undo" where it can, and an emergency pause.
// Every action that changes something (not the ones that only read) is written down. Before a
// file is overwritten, edited or moved, what was there is kept for a week, so "deshaz lo último"
// can put it back. (Ideas from Hermes Agent's checkpoints and vierisid/jarvis's audit trail.)
import { app, shell } from 'electron'
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'fs'
import { promises as fs } from 'fs'
import { dirname, join } from 'path'
import { randomUUID } from 'crypto'
import { readJson, writeJson } from './lib/store'

/** How to put things back as they were. */
export type Undo =
  | { kind: 'restore'; path: string; backup: string | null } // backup null: the file did not exist
  | { kind: 'move'; from: string; to: string } // it was moved from → to
  | { kind: 'rmdir'; path: string } // a folder that did not exist
  | { kind: 'trash'; path: string } // sent to the recycle bin: restored from there by hand

export type Activity = { id: string; at: number; tool: string; label: string; undo?: Undo; undone?: boolean }

const FILE = 'activity.json'
const KEEP_DAYS = 7
const backupDir = () => join(app.getPath('userData'), 'undo')
let list: Activity[] | null = null
let changed: ((l: Activity[]) => void) | null = null

const load = () => (list ??= readJson<Activity[]>(FILE, []).filter(a => Date.now() - a.at < KEEP_DAYS * 864e5))
const save = () => { writeJson(FILE, load().slice(-300)); changed?.(listActivity()) }

/** Called whenever the list changes (the window shows it). */
export const onActivityChanged = (fn: (l: Activity[]) => void) => { changed = fn }

/** Newest first. */
export const listActivity = () => [...load()].reverse()

export function recordAction(tool: string, label: string, undo?: Undo) {
  load().push({ id: randomUUID(), at: Date.now(), tool, label, undo })
  save()
}

/** Before a file is changed: keep a copy of what is there now. */
export async function backupFile(path: string): Promise<Undo> {
  if (!existsSync(path)) return { kind: 'restore', path, backup: null }
  mkdirSync(backupDir(), { recursive: true })
  const backup = join(backupDir(), randomUUID() + '.bak')
  await fs.copyFile(path, backup)
  return { kind: 'restore', path, backup }
}

export const canUndo = (a: Activity) => !!a.undo && !a.undone && a.undo.kind !== 'trash'

/** Puts one action back. Returns what happened, in words. */
export async function undoAction(id: string): Promise<string> {
  const a = load().find(x => x.id === id)
  if (!a || !a.undo) return 'Eso no se puede deshacer.'
  if (a.undone) return 'Ya estaba deshecho.'
  const u = a.undo
  switch (u.kind) {
    case 'trash':
      shell.openPath('shell:RecycleBinFolder').catch(() => {})
      return `«${u.path}» está en la papelera: te la abro para que lo restaures (clic derecho → Restaurar).`
    case 'restore':
      if (u.backup) {
        if (!existsSync(u.backup)) return 'La copia ya no existe (pasó más de una semana).'
        await fs.mkdir(dirname(u.path), { recursive: true })
        await fs.copyFile(u.backup, u.path)
      } else if (existsSync(u.path)) {
        await shell.trashItem(u.path) // it did not exist before: to the recycle bin, never deleted for good
      }
      break
    case 'move':
      if (!existsSync(u.to)) return `No encuentro «${u.to}»: puede que ya lo hayas movido.`
      if (existsSync(u.from)) return `Ya hay algo en «${u.from}»; no lo piso.`
      await fs.mkdir(dirname(u.from), { recursive: true })
      await fs.rename(u.to, u.from)
      break
    case 'rmdir':
      if (existsSync(u.path) && readdirSync(u.path).length) return 'La carpeta ya tiene cosas dentro; no la quito.'
      if (existsSync(u.path)) rmSync(u.path, { recursive: false, force: true })
      break
  }
  a.undone = true
  save()
  return `Deshecho: ${a.label}.`
}

/** The newest action that can still be undone. */
export async function undoLast(): Promise<string> {
  const a = listActivity().find(canUndo)
  return a ? undoAction(a.id) : 'No hay nada reciente que pueda deshacer.'
}

/** Old copies are not needed after a week. */
export function cleanBackups() {
  try {
    for (const f of readdirSync(backupDir())) {
      const p = join(backupDir(), f)
      if (Date.now() - statSync(p).mtimeMs > KEEP_DAYS * 864e5) rmSync(p, { force: true })
    }
  } catch { /* no backups yet */ }
}

// ---------- emergency pause ----------
// While paused NEXUS answers and reads, but does nothing that changes the PC.
let paused = false
export const isPaused = () => paused
export function setPaused(on: boolean) { paused = on; changed?.(listActivity()) }
