/**
 * Kit Dialog backdrop must cover the visible viewport (iPhone Safari chrome).
 * Run: npx tsx --tsconfig tsconfig.app.json src/ui/dialogBackdrop.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const css = readFileSync(join(root, 'src/styles/07-features-dialogs.css'), 'utf8')
const mobile = readFileSync(join(root, 'src/styles/22-mobile-shell.css'), 'utf8')
const dialog = readFileSync(join(root, 'src/ui/Dialog.tsx'), 'utf8')
const lock = readFileSync(join(root, 'src/ui/bodyScrollLock.ts'), 'utf8')
const html = readFileSync(join(root, 'index.html'), 'utf8')

const block = css.match(/\.ui-dialog-backdrop\s*\{[\s\S]*?\n\}/)
assert.ok(block, 'backdrop rule present')
assert.match(block![0], /position:\s*fixed/)
assert.match(block![0], /inset:\s*0/)
assert.match(block![0], /height:\s*100vh/)
assert.match(block![0], /height:\s*100svh/)
assert.match(block![0], /height:\s*100dvh/)
assert.doesNotMatch(block![0], /height:\s*100lvh/)
assert.match(block![0], /touch-action:\s*none/)
assert.match(block![0], /overscroll-behavior:\s*none/)
assert.match(block![0], /safe-area-inset-bottom/)

const body = css.match(/\.ui-dialog__body\s*\{[\s\S]*?\n\}/)
assert.ok(body, 'body rule present')
assert.match(body![0], /touch-action:\s*pan-y/)
assert.match(body![0], /overscroll-behavior:\s*contain/)

const actions = css.match(/\.ui-dialog__actions\s*\{[\s\S]*?\n\}/)
assert.ok(actions, 'actions rule present')
assert.match(actions![0], /flex:\s*0\s+0\s+auto/)
assert.match(actions![0], /safe-area-inset-bottom/)

assert.match(css, /\.ui-dialog__header/)
assert.match(css, /\.ui-dialog__close/)

const sheet = css.match(/\.ui-dialog\s*\{[\s\S]*?\n\}/)
assert.ok(sheet, 'dialog sheet rule present')
assert.match(sheet![0], /background(?:-color)?:\s*(?:#fffdf8|var\(--card)/)
assert.match(sheet![0], /opacity:\s*1/)
assert.doesNotMatch(sheet![0], /background:\s*rgba?\([^)]+,\s*0?\.\d+/)

const mobileWide = mobile.match(/\.ui-dialog--wide[\s\S]*?min-height:/)
assert.ok(mobileWide, 'mobile wide dialog forces solid full-height sheet')

const vitals = readFileSync(join(root, 'src/styles/23-mobile-vitals.css'), 'utf8')
assert.match(vitals, /@keyframes sheet-rise/)
const sheetRise = vitals.match(/@keyframes sheet-rise\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
assert.doesNotMatch(sheetRise, /opacity\s*:/, 'sheet-rise must not animate opacity')
assert.match(
  vitals,
  /\.ui-dialog[\s\S]*?animation:\s*none/,
  'reduced-motion must not opacity-fade dialogs',
)

assert.match(dialog, /showClose/)
assert.match(dialog, /ui-dialog__close/)
assert.match(dialog, /className="ui-dialog-backdrop"/)
assert.match(dialog, /acquireBodyScrollLock/)
assert.match(lock, /position = 'fixed'/)
assert.match(lock, /documentElement/)
assert.match(html, /viewport-fit=cover/)

const mobileBackdrop = mobile.match(
  /@media \(max-width: 959px\)\s*\{[\s\S]*?\.ui-dialog-backdrop\s*\{[\s\S]*?\n\s*\}/,
)
assert.ok(mobileBackdrop, 'mobile backdrop rule')
assert.match(mobileBackdrop![0], /safe-area-inset-bottom/)
assert.doesNotMatch(
  mobileBackdrop![0].replace(/safe-area-inset-bottom[\s\S]*/, ''),
  /padding:\s*[^;]*\n\s*0\s*\n\s*0\s*\n\s*0/,
)

console.log('dialogBackdrop.selfcheck: ok')
