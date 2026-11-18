/**
 * P24-M05: classic print 2024 rules helpers.
 * Run: npx tsx src/features/classicSheet/classicPrint2024Rules.selfcheck.ts
 */
import assert from 'node:assert/strict'
import type { CharacterDetail } from '../../shared/api/characters'
import {
  PRINT_EXHAUSTION_2024_NOTE,
  PRINT_HEROIC_INSPIRATION_2024_NOTE,
  PRINT_REST_2024_NOTE,
  classicPrintBackgroundOriginLine2024,
  classicPrintSpeciesLabel2024,
  classicPrintWeaponMasteryNote2024,
  classicPrintWeaponMasterySlotsLine2024,
  speciesNameRu2024,
} from './classicPrint2024Rules.ts'

function baseChar(sheet: Record<string, unknown>): CharacterDetail {
  return {
    id: 'm05-selfcheck',
    name: 'Тест',
    avatar_url: null,
    level: 3,
    class_name: 'Воин',
    race_name: 'Дварф (fallback)',
    hp_current: 20,
    hp_max: 28,
    rules_edition: '2024',
    sheet_version: 1,
    is_draft: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    sheet,
  }
}

assert.equal(speciesNameRu2024('dwarf'), 'Дварф')
assert.equal(speciesNameRu2024('elf'), 'Эльф')
assert.equal(speciesNameRu2024(''), null)

const withSlug = baseChar({
  identity: { species_slug: 'elf', background: 'Солдат' },
  weapon_mastery: { known: ['longsword', 'dagger'], source_class: 'fighter' },
  weapons: [
    { name: 'Длинный меч', catalog_id: 'longsword', damage: '1к8', damage_type: 'рубящий' },
    { name: 'Кинжал', catalog_id: 'dagger', damage: '1к4', damage_type: 'колющий' },
  ],
  create_2024: {
    background_asi: { str: 2, con: 1 },
    origin_feat: { slug: 'savage-attacker', name_ru: 'Свирепый атакующий' },
  },
})

assert.equal(classicPrintSpeciesLabel2024(withSlug), 'Эльф')
assert.match(classicPrintWeaponMasterySlotsLine2024(withSlug), /Длинный меч/)
assert.match(classicPrintWeaponMasterySlotsLine2024(withSlug), /Кинжал/)
assert.equal(
  classicPrintWeaponMasteryNote2024(withSlug, { catalogId: 'longsword', name: 'Длинный меч' }),
  'Ослабление',
)
assert.equal(
  classicPrintWeaponMasteryNote2024(withSlug, { catalogId: 'dagger', name: 'Кинжал' }),
  'Засечка',
)
assert.match(classicPrintBackgroundOriginLine2024(withSlug), /Свирепый атакующий/)
assert.match(classicPrintBackgroundOriginLine2024(withSlug), /СИЛ \+2/)
assert.match(classicPrintBackgroundOriginLine2024(withSlug), /ТЕЛ \+1/)

const fallback = baseChar({ identity: { background: 'Мудрец' } })
assert.equal(classicPrintSpeciesLabel2024(fallback), 'Дварф (fallback)')
assert.equal(classicPrintWeaponMasterySlotsLine2024(fallback), '')
assert.equal(classicPrintBackgroundOriginLine2024(fallback), '')

assert.match(PRINT_EXHAUSTION_2024_NOTE, /D20/)
assert.match(PRINT_HEROIC_INSPIRATION_2024_NOTE, /макс\. 1/)
assert.match(PRINT_REST_2024_NOTE, /16 ч/)

console.log('classicPrint2024Rules.selfcheck: ok')
