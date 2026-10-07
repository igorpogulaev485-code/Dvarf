/**
 * Full 2014 slot audit: every class + EK/AT vs PHB / dnd.su tables.
 * Run: npx tsx scripts/smoke-caster-slots-all.ts
 */
import {
  suggestSpellcasting,
  suggestSpellcastingFromClasses,
  multiclassCasterLevel,
  warlockPactForLevel,
} from '../src/shared/dnd/casterProgression.ts'
import type { ClassLevelEntry } from '../src/shared/dnd/classLevels.ts'

function row(
  name: string,
  level: number,
  subclass_name = '',
  id = `${name}-${level}-${subclass_name}`,
): ClassLevelEntry {
  return {
    id,
    name,
    catalog_id: null,
    level,
    subclass_name,
    subclass_catalog_id: null,
  }
}

const mod = () => 3

function slotMax(s: ReturnType<typeof suggestSpellcastingFromClasses>, level: number): number {
  return s?.slots[String(level)]?.max ?? 0
}

function expectSlots(
  label: string,
  s: ReturnType<typeof suggestSpellcastingFromClasses>,
  expected: number[],
) {
  for (let i = 0; i < expected.length; i += 1) {
    const got = slotMax(s, i + 1)
    if (got !== expected[i]) {
      throw new Error(`${label}: slot ${i + 1} expected ${expected[i]} got ${got}`)
    }
  }
}

function fromClass(name: string, level: number, subclass = '') {
  return suggestSpellcastingFromClasses({
    classes: [row(name, level, subclass)],
    abilityModFor: mod,
  })
}

// --- Full casters (cleric table = PHB full) ---
const FULL_L5 = [4, 3, 2, 0, 0, 0, 0, 0, 0]
const FULL_L17 = [4, 3, 3, 3, 2, 1, 1, 1, 1]
for (const name of ['Бард', 'Жрец', 'Друид', 'Чародей', 'Волшебник']) {
  expectSlots(`${name} 5`, fromClass(name, 5), FULL_L5)
  expectSlots(`${name} 17`, fromClass(name, 17), FULL_L17)
}

// --- Half: paladin / ranger (dnd.su) ---
const HALF_L5 = [4, 2, 0, 0, 0]
const HALF_L9 = [4, 3, 2, 0, 0]
const HALF_L17 = [4, 3, 3, 3, 1]
for (const name of ['Паладин', 'Следопыт']) {
  expectSlots(`${name} 1`, fromClass(name, 1), [0, 0, 0, 0, 0])
  expectSlots(`${name} 2`, fromClass(name, 2), [2, 0, 0, 0, 0])
  expectSlots(`${name} 5`, fromClass(name, 5), HALF_L5)
  expectSlots(`${name} 9`, fromClass(name, 9), HALF_L9)
  expectSlots(`${name} 17`, fromClass(name, 17), HALF_L17)
}

// --- Artificer half_up from L1 ---
expectSlots('Изобретатель 1', fromClass('Изобретатель', 1), [2, 0, 0, 0, 0])
expectSlots('Изобретатель 5', fromClass('Изобретатель', 5), [4, 2, 0, 0, 0])

// --- Non-casters ---
for (const name of ['Варвар', 'Монах', 'Воин', 'Плут']) {
  const s = fromClass(name, 10)
  for (let i = 1; i <= 9; i += 1) {
    if (slotMax(s, i) !== 0) throw new Error(`${name} 10 must have 0 slots`)
  }
}

// --- Warlock pact ---
const pact5 = warlockPactForLevel(5)
if (pact5.max !== 2 || pact5.level !== 3) throw new Error('warlock 5 pact')
const pact11 = warlockPactForLevel(11)
if (pact11.max !== 3 || pact11.level !== 5) throw new Error('warlock 11 pact')
const wl = fromClass('Колдун', 5)
if (wl?.pact_slots?.max !== 2 || slotMax(wl, 1) !== 0) throw new Error('warlock slots path')

// --- Eldritch Knight (⅓ table, inferred from name — no overlay grant) ---
const EK_L3 = [2, 0, 0, 0]
const EK_L7 = [4, 2, 0, 0]
const EK_L19 = [4, 3, 3, 1]
expectSlots('EK 3', fromClass('Воин', 3, 'Мистический рыцарь'), EK_L3)
expectSlots('EK 7', fromClass('Воин', 7, 'Eldritch Knight'), EK_L7)
expectSlots('EK 19', fromClass('Воин', 19, 'Эльдрический рыцарь'), EK_L19)
// Fighter without archetype stays empty
expectSlots('Fighter bare 7', fromClass('Воин', 7), [0, 0, 0, 0])
// Below unlock level: name alone at L2 → no slots
expectSlots('EK too early', fromClass('Воин', 2, 'Мистический рыцарь'), [0, 0, 0, 0])

// --- Arcane Trickster ---
expectSlots('AT 3', fromClass('Плут', 3, 'Мистический ловкач'), EK_L3)
expectSlots('AT 7', fromClass('Плут', 7, 'Arcane Trickster'), EK_L7)
expectSlots('Rogue bare 7', fromClass('Плут', 7), [0, 0, 0, 0])

// --- Catalog overlay still works when passed explicitly ---
const ekOverlay = suggestSpellcastingFromClasses({
  classes: [row('Воин', 7, '', 'f1')],
  abilityModFor: mod,
  subclassCasters: [{ classEntryId: 'f1', progression: 'third', ability: 'int' }],
})
expectSlots('EK overlay grant', ekOverlay, EK_L7)

// --- Multiclass ---
const palWiz = suggestSpellcastingFromClasses({
  classes: [row('Паладин', 5, '', 'p'), row('Волшебник', 1, '', 'w')],
  abilityModFor: mod,
})
// floor(5/2)+1 = 3 → full L3 = 4/2
expectSlots('MC pal5+wiz1', palWiz, [4, 2, 0, 0, 0])

const ekWiz = suggestSpellcastingFromClasses({
  classes: [row('Воин', 7, 'Мистический рыцарь', 'f'), row('Волшебник', 3, '', 'w')],
  abilityModFor: mod,
})
// floor(7/3)+3 = 2+3 = 5 → full L5 = 4/3/2
expectSlots('MC EK7+wiz3', ekWiz, [4, 3, 2, 0, 0])
if (multiclassCasterLevel([row('Воин', 7, 'Мистический рыцарь'), row('Волшебник', 3)]) !== 5) {
  throw new Error('MC level EK+wiz')
}

// Warlock ignored in MC slot level
if (multiclassCasterLevel([row('Волшебник', 4), row('Колдун', 5)]) !== 4) {
  throw new Error('MC ignores warlock')
}

// Legacy single-class path (no classes[]) still matches
const legacyPal = suggestSpellcasting({
  className: 'Паладин',
  level: 5,
  abilityModFor: mod,
})
expectSlots('legacy pal5', legacyPal, HALF_L5)

console.log('smoke-caster-slots-all: ok (13 classes + EK/AT + MC)')
