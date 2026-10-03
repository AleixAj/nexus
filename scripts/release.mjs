// Uploads the installer already built (npm run release) to a GitHub Releases draft, with the GitHub CLI (gh).
// Fixed file names (no version) so the README's download buttons never change.
import { execFileSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
const files = ['NEXUS-Setup.exe', 'NEXUS-Setup.exe.blockmap', 'latest.yml', 'NEXUS-Portable.zip'].map(f => join('dist', f))
for (const f of files) if (!existsSync(f)) { console.error(`Falta ${f}. Ejecuta antes "npm run release".`); process.exit(1) }

const notes = readFileSync(join('scripts', 'notes.md'), 'utf8').replaceAll('{version}', version)
execFileSync('gh', ['release', 'create', `v${version}`, ...files, '--draft', '--title', `NEXUS ${version}`, '--notes', notes], { stdio: 'inherit' })
console.log(`\nBorrador v${version} creado. Revísalo y publícalo con: gh release edit v${version} --draft=false`)
