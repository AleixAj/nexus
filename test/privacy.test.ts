// What must never reach the online AI, and where the agent may never write.
import { describe, expect, it } from 'vitest'
import { autorunPath, blockedPath, redact, runnablePath } from '../src/main/lib/privacy'

describe('redact', () => {
  it('hides API keys from the usual providers', () => {
    for (const key of ['gsk_' + 'a'.repeat(40), 'sk-proj-' + 'b'.repeat(40), 'sk-or-v1-' + 'c'.repeat(40), 'AIza' + 'd'.repeat(35), 'ghp_' + 'e'.repeat(36)]) {
      expect(redact(`mi clave es ${key} vale`)).toContain('[CLAVE OCULTA]')
    }
  })
  it('hides passwords written as key = value', () => {
    expect(redact('password: hunter22')).toBe('password: [OCULTA]')
    expect(redact('contraseña=MiClave123')).toBe('contraseña=[OCULTA]')
  })
  it('hides IBANs from any country', () => {
    expect(redact('ES91 2100 0418 4502 0005 1332')).toBe('[IBAN OCULTO]')
    expect(redact('DE89 3704 0044 0532 0130 00')).toBe('[IBAN OCULTO]')
  })
  it('hides card numbers that pass the Luhn check, not phone numbers', () => {
    expect(redact('tarjeta 4111 1111 1111 1111')).toBe('tarjeta [TARJETA OCULTA]')
    expect(redact('llama al 600 123 456')).toBe('llama al 600 123 456')
  })
  it('hides private keys', () => {
    expect(redact('-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----')).toBe('[CLAVE PRIVADA OCULTA]')
  })
})

describe('files', () => {
  it('blocks files and folders that hold credentials', () => {
    for (const p of ['C:\\proj\\.env', 'C:\\Users\\a\\.ssh\\id_ed25519', 'C:\\Users\\a\\.git-credentials', 'C:\\Users\\a\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Login Data', 'D:\\vault.kdbx', 'C:\\Users\\a\\.aws\\config']) {
      expect(blockedPath(p), p).toBe(true)
    }
    expect(blockedPath('C:\\Users\\a\\Documents\\notas.txt')).toBe(false)
  })
  it('finds places where a file would run on its own', () => {
    expect(autorunPath('C:\\Users\\a\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\x.bat')).toBe(true)
    expect(autorunPath('C:\\Users\\a\\Documents\\WindowsPowerShell\\Microsoft.PowerShell_profile.ps1')).toBe(true)
    expect(autorunPath('C:\\Users\\a\\Desktop\\x.bat')).toBe(false)
  })
  it('knows which files run code when opened', () => {
    for (const p of ['a.exe', 'b.bat', 'c.ps1', 'd.lnk', 'e.vbs', 'f.reg']) expect(runnablePath(p), p).toBe(true)
    for (const p of ['a.txt', 'b.md', 'c.pdf', 'd.docx']) expect(runnablePath(p), p).toBe(false)
  })
})
