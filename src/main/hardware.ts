// The first time NEXUS opens, it picks its graphics quality from the PC: a dedicated graphics card
// and enough memory get "ultra", integrated graphics "equilibrado", modest machines "ahorro".
// The user can change it later in Settings. (Idea from JARVIS-OS: core/graphics_capability.py.)
import { app } from 'electron'
import os from 'os'
import { readJson } from './lib/store'
import { saveSettings } from './settings'

const VENDORS: Record<number, string> = { 0x10de: 'nvidia', 0x1002: 'amd', 0x8086: 'intel' }

export async function pickQualityOnce() {
  if (readJson<Record<string, unknown>>('settings.json', {}).quality) return // already chosen
  let vendor = ''
  try {
    const info: any = await app.getGPUInfo('basic')
    const gpu = (info.gpuDevice || []).find((g: any) => g.active) || info.gpuDevice?.[0]
    vendor = VENDORS[gpu?.vendorId] || ''
  } catch { /* unknown: decide from the rest */ }
  const ramGB = os.totalmem() / 1073741824, cores = os.cpus().length
  const quality = (vendor === 'nvidia' || vendor === 'amd') && ramGB >= 8 && cores >= 6 ? 'ultra'
    : ramGB < 6 || cores < 4 ? 'ahorro'
    : 'equilibrado'
  saveSettings({ quality })
  console.log(`[hardware] ${vendor || 'gpu?'} · ${ramGB.toFixed(0)} GB · ${cores} hilos → ${quality}`)
}
