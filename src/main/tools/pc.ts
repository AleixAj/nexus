// Control of the PC by voice (lock, sleep, shut down, screen, brightness) and the clipboard.
import { clipboard, nativeImage } from 'electron'
import { execFile } from 'child_process'
import { powershell } from '../lib/powershell'
import { clip } from '../lib/text'
import { describeImage, visionUnavailable } from '../vision'
import { num, oneOf, str, said, type Tool } from './define'

const run = (file: string, args: string[]) => new Promise<boolean>(res => execFile(file, args, { windowsHide: true }, err => res(!err)))

// turning the screen off: the standard Windows message, sent to every window
const SCREEN_OFF = `Add-Type -Namespace Nx -Name Mon -MemberDefinition '[DllImport("user32.dll")] public static extern int PostMessage(int h, int m, int w, int l);'; [Nx.Mon]::PostMessage(0xffff, 0x0112, 0xF170, 2) | Out-Null`

const ACTIONS: Record<string, { label: string; ask?: string; run: (a: any) => Promise<string> }> = {
  lock: { label: 'Equipo bloqueado', run: async () => (await run('rundll32.exe', ['user32.dll,LockWorkStation'])) ? 'Equipo bloqueado' : 'No he podido bloquear el equipo' },
  screen_off: { label: 'Pantalla apagada', run: async () => { await powershell(SCREEN_OFF, 8000); return 'Pantalla apagada (se enciende al mover el ratón)' } },
  sleep: {
    label: 'Suspendiendo', ask: 'Suspender el equipo',
    run: async () => { setTimeout(() => powershell("Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Application]::SetSuspendState('Suspend', $false, $false)", 15000), 2500); return 'Suspendo el equipo en unos segundos' }
  },
  shutdown: {
    label: 'Apagado programado', ask: 'Apagar el equipo',
    run: async a => { const m = minutes(a); return (await run('shutdown.exe', ['/s', '/t', String(m * 60), '/c', 'NEXUS apagará el equipo. Di «cancela el apagado» para evitarlo.'])) ? `El equipo se apagará en ${m} min. Di «cancela el apagado» si cambias de idea.` : 'No he podido programar el apagado' }
  },
  restart: {
    label: 'Reinicio programado', ask: 'Reiniciar el equipo',
    run: async a => { const m = minutes(a); return (await run('shutdown.exe', ['/r', '/t', String(m * 60)])) ? `El equipo se reiniciará en ${m} min.` : 'No he podido programar el reinicio' }
  },
  cancel_shutdown: { label: 'Apagado cancelado', run: async () => (await run('shutdown.exe', ['/a'])) ? 'Apagado o reinicio cancelado' : 'No había ningún apagado programado' },
  brightness: {
    label: 'Brillo cambiado',
    run: async a => {
      const v = Math.max(0, Math.min(100, Math.round(Number(a.value))))
      if (!Number.isFinite(v)) return 'Falta el porcentaje de brillo'
      const out = await powershell(`try { (Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods -ErrorAction Stop) | Invoke-CimMethod -MethodName WmiSetBrightness -Arguments @{ Timeout = 1; Brightness = ${v} } | Out-Null; 'ok' } catch { 'no' }`, 10000)
      return out.includes('ok') ? `Brillo al ${v} %` : 'Esta pantalla no deja cambiar el brillo desde Windows (pasa en monitores de sobremesa); usa los botones del monitor.'
    }
  }
}
/** The copied image, if there is one. */
async function clipboardImage() {
  for (const item of await clipboard.read().catch(() => [])) {
    const type = item.types.find(t => t.startsWith('image/'))
    if (!type) continue
    const blob = await item.getType(type) as Blob
    const img = nativeImage.createFromBuffer(Buffer.from(await blob.arrayBuffer()))
    if (!img.isEmpty()) return img
  }
  return null
}

const minutes = (a: any) => Math.max(0, Math.min(240, Math.round(Number(a.minutes ?? 1))))

export const pcTools: Tool[] = [
  {
    name: 'pc_control',
    description: 'Controla el PC: bloquear, apagar pantalla, suspender, apagar o reiniciar (en X min), cancelar apagado, brillo (0-100).',
    params: { action: oneOf(Object.keys(ACTIONS)), minutes: num('Para apagar/reiniciar: dentro de cuántos minutos (por defecto 1)'), value: num('Brillo 0-100') },
    required: ['action'],
    // shutting down, restarting, sleeping or locking only if the user's words ask for it
    intent: a => ({
      shutdown: /apag|cierra (el |todo)|shut ?down|desconect/i,
      restart: /reinici|restart|reboot/i,
      sleep: /suspend|duerm|dormir|sleep|hiberna/i,
      lock: /bloque|lock/i,
    } as Record<string, RegExp>)[a.action] || null,
    // sleeping, shutting down and restarting always ask first
    confirm: a => ACTIONS[a.action]?.ask ? { title: ACTIONS[a.action].ask!, detail: a.action === 'sleep' ? 'Ahora mismo' : `Dentro de ${minutes(a)} min` } : null,
    run: async a => {
      const act = Object.hasOwn(ACTIONS, a.action) ? ACTIONS[a.action] : null
      if (!act) return said('Acción desconocida')
      return { result: await act.run(a), label: act.label }
    }
  },
  {
    name: 'read_clipboard', readOnly: true,
    description: 'Lee lo que el usuario ha copiado (texto o imagen) para traducirlo, resumirlo, corregirlo… ',
    progress: () => 'Leyendo el portapapeles',
    run: async () => {
      const text = await clipboard.readText().catch(() => '')
      if (text.trim()) return { result: clip(text, 8000), label: `Portapapeles leído · ${text.length} caracteres` }
      const img = await clipboardImage()
      if (!img) return { result: 'El portapapeles está vacío.', label: 'Portapapeles vacío' }
      const why = await visionUnavailable()
      if (why) return { result: 'En el portapapeles hay una imagen. ' + why, label: 'Imagen en el portapapeles' }
      const small = img.getSize().width > 1600 ? img.resize({ width: 1600 }) : img
      return { result: 'Imagen copiada: ' + await describeImage(small.toJPEG(85).toString('base64'), 'image/jpeg', 'Describe la imagen y copia el texto que tenga.'), label: 'Imagen del portapapeles analizada' }
    }
  },
  {
    name: 'write_clipboard',
    description: 'Copia un texto al portapapeles (por ejemplo la traducción o corrección) para que el usuario lo pegue.',
    params: { text: str('Texto a copiar') },
    required: ['text'],
    run: async a => { await clipboard.writeText(String(a.text || '')); return { result: 'Copiado al portapapeles; el usuario puede pegarlo con Ctrl+V.', label: 'Copiado al portapapeles' } }
  }
]
