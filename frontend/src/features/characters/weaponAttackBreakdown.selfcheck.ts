/**
 * Weapon attack/damage editable breakdown (Ability-style dialog).
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/weaponAttackBreakdown.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const dialog = readFileSync(
  join(root, 'src/features/characters/WeaponAttackBreakdownDialog.tsx'),
  'utf8',
)
const compact = readFileSync(
  join(root, 'src/features/characters/PlayDeskAttacksCompact.tsx'),
  'utf8',
)
const scenes = readFileSync(
  join(root, 'src/features/characters/minimalSheet/PlayDeskScenes.tsx'),
  'utf8',
)
const mods = readFileSync(join(root, 'src/features/characters/modifiers.ts'), 'utf8')

assert.match(dialog, /Добавить бонус/)
assert.match(dialog, /ac-breakdown__badge/)
assert.match(dialog, /Атака/)
assert.match(dialog, /Урон/)
assert.match(dialog, /BonusRow/)
assert.match(dialog, /VariablePicker/)
assert.match(dialog, /weaponHitBonusTarget/)
assert.match(dialog, /weaponDamageBonusTarget/)

assert.match(compact, /WeaponAttackBreakdownDialog/)
assert.match(compact, />\s*мод\.\s*</)
assert.match(compact, /weaponManualBonus/)
assert.match(compact, /onModifiersChange/)

assert.match(scenes, /modifiers=\{model\.draft\.modifiers\}/)
assert.match(scenes, /onModifiersChange/)

assert.match(mods, /weapon_hit:\$\{string\}/)
assert.match(mods, /weapon_dmg:\$\{string\}/)
assert.match(mods, /export function weaponManualBonus/)

console.log('weaponAttackBreakdown.selfcheck: ok')
