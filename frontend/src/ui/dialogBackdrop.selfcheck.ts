/**
 * Kit Dialog backdrop must cover full viewport (iPad Safari dynamic chrome).
 * Run: npx tsx --tsconfig tsconfig.app.json src/ui/dialogBackdrop.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const css = readFileSync(join(root, 'src/styles/07-features-dialogs.css'), 'utf8')
const dialog = readFileSync(join(root, 'src/ui/Dialog.tsx'), 'utf8')
const lock = readFileSync(join(root, 'src/ui/bodyScrollLock.ts'), 'utf8')

const block = css.match(/\.ui-dialog-backdrop\s*\{[\s\S]*?\n\}/)
assert.ok(block, 'backdrop rule present')
assert.match(block![0], /position:\s*fixed/)
assert.match(block![0], /inset:\s*0/)
assert.match(block![0], /height:\s*100vh/)
assert.match(block![0], /height:\s*100dvh/)
assert.match(block![0], /height:\s*100lvh/)
assert.match(block![0], /touch-action:\s*none/)
assert.match(block![0], /overscroll-behavior:\s*none/)

assert.match(dialog, /className="ui-dialog-backdrop"/)
assert.match(dialog, /acquireBodyScrollLock/)
assert.match(lock, /position = 'fixed'/)
assert.match(lock, /documentElement/)

console.log('dialogBackdrop.selfcheck: ok')
