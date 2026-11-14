/**
 * Speed breakdown dialog — same BonusLine shell as AC / initiative.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/speedBreakdown.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

const dialog = read('src/features/characters/SpeedBreakdownDialog.tsx')
assert.match(dialog, /SpeedBreakdownDialog/)
assert.match(dialog, /Добавить бонус/)
assert.match(dialog, /speed_climb/)
assert.match(dialog, /speed_swim/)
assert.match(dialog, /speed_fly/)
assert.match(dialog, /ac-breakdown__badge/)

const mods = read('src/features/characters/modifiers.ts')
assert.match(mods, /\| 'speed'/)
assert.match(mods, /withSpeedBonus/)

const rolls = read('src/features/characters/minimalSheet/SheetDialogsRolls.tsx')
assert.match(rolls, /SpeedBreakdownDialog/)
assert.match(rolls, /speedBreakdownOpen/)

const header = read('src/features/characters/PlayDeskHeader.tsx')
assert.match(header, /onOpenSpeed/)
assert.match(header, /play-desk-vital--speed-wide/)
assert.match(header, /play-desk-vital__tags/)

const vitalsCss = read('src/styles/16-play-desk-header-vitals.css')
assert.match(vitalsCss, /\.play-desk-vital--speed-wide/)
assert.match(vitalsCss, /flex-wrap:\s*wrap/)

console.log('speedBreakdown.selfcheck: ok')
