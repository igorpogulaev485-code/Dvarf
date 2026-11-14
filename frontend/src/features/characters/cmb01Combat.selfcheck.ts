/**
 * CMB-01: combat scene kit invariants (attacks row, ammo dedupe, speed tip).
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/cmb01Combat.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { listCombatConsumables } from './combatConsumables.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

const attacks = read('src/features/characters/PlayDeskAttacksCompact.tsx')
assert.match(attacks, /play-desk-compact__mod--roll/)
assert.match(attacks, /play-desk-compact__dmg--roll/)
assert.match(attacks, /Действия хода/)
assert.match(attacks, /play-desk-attacks-more__hint/)
assert.match(attacks, /play-desk-compact__ammo-spend/)
assert.match(attacks, /hideAutoItemIds/)
assert.match(attacks, /ResourcePips/)
assert.match(attacks, /shouldUseCompactResourceTrack/)
assert.match(attacks, /play-desk-compact__end/)
assert.match(attacks, /play-desk-compact__tool-more/)
assert.doesNotMatch(attacks, /Ещё \/ Действия хода/)

const details = read('src/ui/DetailsMenu.tsx')
assert.match(details, /data-menu-open/)
assert.match(details, /tipTitle/)
assert.match(details, /open \? undefined : title/)

const tipsCss = read('src/styles/31-onboarding.css')
assert.match(tipsCss, /data-menu-open='true'[\s\S]*?onboarding-hover-tip/)

const header = read('src/features/characters/PlayDeskHeader.tsx')
assert.match(header, /play-desk-speed-menu/)
assert.match(header, /SpeedModesMenuBody/)
/* CMB-01 §7: only tip suppression — face/layout classes untouched. */
assert.match(header, /play-desk-vital--speed/)

const items = [
  {
    id: 'ammo1',
    name: 'Стрелы',
    qty: 20,
    notes: '',
    parent_id: null,
  },
  {
    id: 'potion1',
    name: 'Зелье лечения',
    qty: 2,
    notes: '',
    parent_id: null,
  },
] as unknown as import('./inventory').InventoryItem[]

const withDup = listCombatConsumables(items, [])
assert.equal(withDup.some((r) => r.item.id === 'ammo1'), true, 'ammo auto without hide')

const deduped = listCombatConsumables(items, [], {
  hideAutoItemIds: new Set(['ammo1']),
})
assert.equal(
  deduped.some((r) => r.item.id === 'ammo1'),
  false,
  'ammo hidden when under weapon',
)
assert.equal(deduped.some((r) => r.item.id === 'potion1'), true, 'potion stays')

const favKept = listCombatConsumables(items, ['ammo1'], {
  hideAutoItemIds: new Set(['ammo1']),
})
assert.equal(
  favKept.some((r) => r.item.id === 'ammo1' && r.favorite),
  true,
  'favorite ammo still listed',
)

console.log('cmb01Combat.selfcheck ok')
