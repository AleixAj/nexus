// Files in the app data folder (%APPDATA%\nexus). Writes go to a temp file and are
// renamed, so a crash never leaves half a file. Secrets use the OS keychain (DPAPI).
import { app, safeStorage } from 'electron'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'

export const dataPath = (name: string) => join(app.getPath('userData'), name)

export function writeAtomic(name: string, data: string | Buffer) {
  const f = dataPath(name), tmp = f + '.tmp'
  writeFileSync(tmp, data)
  renameSync(tmp, f)
}

export function readJson<T>(name: string, fallback: T): T {
  try { return existsSync(dataPath(name)) ? JSON.parse(readFileSync(dataPath(name), 'utf8')) : fallback } catch { return fallback }
}

export const writeJson = (name: string, value: unknown) => writeAtomic(name, JSON.stringify(value, null, 1))

/** JSON encrypted with the user's Windows account; plain if the keychain is unavailable. */
export function readSecretJson<T>(name: string, fallback: T): T {
  try {
    if (!existsSync(dataPath(name))) return fallback
    const raw = readFileSync(dataPath(name))
    return JSON.parse(raw[0] === 0x7b ? raw.toString('utf8') : safeStorage.decryptString(raw)) // "{" = plain JSON
  } catch (e) {
    console.warn(`[store] ${name} unreadable`, e)
    return fallback
  }
}

export function writeSecretJson(name: string, value: unknown) {
  const json = JSON.stringify(value)
  writeAtomic(name, safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(json) : Buffer.from(json, 'utf8'))
}
