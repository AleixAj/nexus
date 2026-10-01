// What never leaves the PC: secrets found in files, the clipboard or the screen are hidden
// before the text goes to an online AI, and key files cannot be read at all.
// Ideas taken from OpenJarvis (security/credential_stripper.py, file_policy.py, Apache-2.0).
import { basename } from 'path'

const SECRETS: [RegExp, string][] = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[CLAVE PRIVADA OCULTA]'],
  [/\b(sk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}|gsk_[A-Za-z0-9]{20,}|csk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{35}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|xox[abpr]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g, '[CLAVE OCULTA]'],
  [/\b((?:pass(?:word)?|pwd|contraseña|clave|secret|token|api[_-]?key)\s*[:=]\s*)(["']?)[^\s"']{4,}\2/gi, '$1[OCULTA]'],
  [/\bES\d{2}(?:[ -]?\d{4}){5}\b/g, '[IBAN OCULTO]'],
]

/** Card numbers pass the Luhn check; plain long numbers (phones, ids) do not. */
function luhn(digits: string) {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let d = +digits[digits.length - 1 - i]
    if (i % 2) { d *= 2; if (d > 9) d -= 9 }
    sum += d
  }
  return sum % 10 === 0
}

export function redact(text: string) {
  let out = text
  for (const [re, rep] of SECRETS) out = out.replace(re, rep)
  return out.replace(/\b\d(?:[ -]?\d){12,18}\b/g, m => (luhn(m.replace(/\D/g, '')) ? '[TARJETA OCULTA]' : m))
}

// files that hold credentials: the agent may not read them
const BLOCKED_NAMES = /^(\.env(\..*)?|id_(rsa|dsa|ecdsa|ed25519)|.*\.(pem|key|pfx|p12|kdbx|ovpn)|credentials(\.json)?|login data|cookies|key-[a-z]+\.bin|memory\.bin|spotify\.bin|calendar\.bin|wallet\.dat)$/i

export function blockedPath(path: string) {
  return BLOCKED_NAMES.test(basename(path)) || /[\\/]\.ssh[\\/]|[\\/]\.aws[\\/]|[\\/]\.gnupg[\\/]/i.test(path)
}
