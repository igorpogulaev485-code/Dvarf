/**
 * Pack 02: cast formulas, artificer focus, infusions, knowledge expertise.
 * Run: npx tsx src/shared/dnd/pack02CastFocus.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  resolveCastEffect,
  resolveTypedDamageChoice,
} from './spellCatalog.ts'
import { infusionById, resolveInfusionNumericBonus } from './artificerInfusions.ts'
import { aggregateInfusionBonuses } from './infusionEffects.ts'
import { infusionAcFromSharedEffects, infusionAcceptsItem } from './infusionItems.ts'
import { emptyFeaturePicks, setFeaturePick } from './featurePicks.ts'
import { setActiveInfusionBindings } from './infusionsActive.ts'
import { desiredResourcesFromFeatures, type DesiredFeatureResource } from './featureResources.ts'
import { unlockFeaturesForClasses } from './classFeatures.ts'
import { knowledgeBlessingSkillIds, syncSkillsExpertiseFromPicks } from './expertise.ts'
import { skillModifierFromState } from './passives.ts'
import { checkSpellMaterials } from '../../features/characters/spellMaterials.ts'
import { artificerFocusGate } from '../../features/characters/artificerFocus.ts'
import { pickShillelaghAttack, shillelaghDamage } from '../../features/characters/shillelagh.ts'
import { abilityModifier } from '../../features/characters/sheetTypes.ts'

const here = dirname(fileURLToPath(import.meta.url))
const spells = JSON.parse(
  readFileSync(join(here, '../../../public/spells-2014.json'), 'utf8'),
) as Array<{ slug: string; data: Record<string, unknown> }>

function spell(slug: string) {
  const row = spells.find((item) => item.slug === slug)
  assert(row, slug)
  return row.data
}

// M01 — Cure Wounds at ability 16 is 1d8+3 / 2d8+3 with the ability name.
const cure = spell('cure_wounds')
const cure1 = resolveCastEffect(
  {
    level: 1,
    damage: String(cure.damage),
    damage_at_slot_level: cure.damage_at_slot_level as Record<string, string>,
  },
  { characterLevel: 5, slotLevel: 1, spellMod: 3, spellModLabel: 'МУД' },
)
assert.equal(cure1.effect, '1d8+3 (МУД)')
const cure2 = resolveCastEffect(
  {
    level: 1,
    damage: String(cure.damage),
    damage_at_slot_level: cure.damage_at_slot_level as Record<string, string>,
  },
  { characterLevel: 5, slotLevel: 2, spellMod: 3, spellModLabel: 'МУД' },
)
assert.equal(cure2.effect, '2d8+3 (МУД)')
assert.equal(cure1.effect.includes('MOD'), false)

// M83 — Magic Stone stays 1d6 + mod bludgeoning at every cantrip tier.
const stone = spell('magic_stone')
for (const level of [1, 5, 11, 17]) {
  const effect = resolveCastEffect(
    {
      level: 0,
      damage: String(stone.damage),
      damage_at_character_level: stone.damage_at_character_level as Record<string, string>,
    },
    { characterLevel: level, slotLevel: 0, spellMod: 3, spellModLabel: 'МУД' },
  )
  assert.equal(effect.effect, '1d6+3 дробящий (МУД)', `stone L${level}`)
}

// M84 — Silence is V, S. The report's S/M is not the PHB spell.
const silence = spell('silence') as { components: { v?: boolean; s?: boolean; m?: string } }
assert.equal(silence.components.v, true)
assert.equal(silence.components.s, true)
assert.equal(silence.components.m, undefined)

// M85 — Catapult has a DEX save and scales 3d8.
const catapult = spell('catapult')
assert.equal(catapult.attack_or_save, 'ЛОВ')
const cat1 = resolveCastEffect(
  {
    level: 1,
    damage: String(catapult.damage),
    damage_at_slot_level: catapult.damage_at_slot_level as Record<string, string>,
  },
  { characterLevel: 5, slotLevel: 1 },
)
assert.equal(cat1.effect, '3d8 дробящий')
const cat3 = resolveCastEffect(
  {
    level: 1,
    damage: String(catapult.damage),
    damage_at_slot_level: catapult.damage_at_slot_level as Record<string, string>,
  },
  { characterLevel: 5, slotLevel: 3 },
)
assert.equal(cat3.effect, '5d8 дробящий')
assert.equal(silence.attack_or_save ?? '—', '—')

// M86 — Flame Strike keeps both types; the chosen one grows.
const flame = spell('flame_strike')
const flameSpell = {
  level: 5,
  damage: String(flame.damage),
  higher_levels: String(flame.higher_levels),
  damage_at_slot_level: flame.damage_at_slot_level as Record<string, string>,
}
assert.equal(
  resolveTypedDamageChoice(flameSpell, 6, 'first'),
  '5d6 огонь + 4d6 излучение',
)
assert.equal(
  resolveCastEffect(flameSpell, { characterLevel: 17, slotLevel: 9, damageChoice: 'second' }).effect,
  '4d6 огонь + 8d6 излучение',
)

// M87 / M132 — a focus does not pay for a priced diamond.
const gate = checkSpellMaterials({
  material: 'бриллиант, стоящий как минимум 5 000 зм',
  flags: { has_spell_focus: true, has_component_pouch: true },
  items: [{ id: 'tools', name: 'Инструменты алхимика', qty: 1, cost_gp: 50 }],
})
assert.equal(gate.ok, false)
assert.equal(gate.message.includes('Фокус закрывает'), false)
const raised = checkSpellMaterials({
  material: 'бриллиант, стоящий как минимум 500 зм, расходуемый заклинанием',
  flags: { has_spell_focus: true, has_component_pouch: false },
  items: [{ id: 'gem', name: 'Алмаз', qty: 1, cost_gp: 500 }],
})
assert.equal(raised.ok, true)
assert.equal(raised.requirement?.consumed, true)

// M04 / M253 — artificer M needs a held tool, worn armor, or an infused item.
assert.equal(
  artificerFocusGate({
    classSlug: 'artificer',
    material: 'два магнетита',
    items: [{ id: 'staff', name: 'Посох', qty: 1, equipped: false, spell_tooling: 'focus' }],
    arcaneArmor: false,
    arcaneFirearm: false,
  }).ok,
  false,
)
assert.equal(
  artificerFocusGate({
    classSlug: 'artificer',
    material: 'два магнетита',
    items: [{ id: 'tools', name: 'Инструменты вора', qty: 0, equipped: true }],
    arcaneArmor: false,
    arcaneFirearm: false,
  }).ok,
  false,
)
assert.equal(
  artificerFocusGate({
    classSlug: 'artificer',
    material: undefined,
    items: [],
    arcaneArmor: false,
    arcaneFirearm: false,
  }).ok,
  true,
)
assert.equal(
  artificerFocusGate({
    classSlug: 'artificer',
    material: 'два магнетита',
    items: [{ id: 'armor', name: 'Латы', qty: 1, equipped: true, armor_kind: 'heavy' }],
    arcaneArmor: true,
    arcaneFirearm: false,
  }).ok,
  true,
)

// M07 — Restorative Reagents = INT mod, minimum 1.
const features = unlockFeaturesForClasses({
  classes: [
    {
      id: 'art',
      name: 'Изобретатель',
      catalog_id: 'artificer',
      level: 9,
      subclass_name: 'Алхимик',
      subclass_catalog_id: 'alchemist',
    },
  ],
  characterLevel: 9,
  abilities: { str: 10, dex: 10, con: 10, int: 16, wis: 10, cha: 10 },
  subclassSlugByEntryId: { art: 'alchemist' },
})
const reagents = desiredResourcesFromFeatures({
  features,
  characterLevel: 9,
  abilities: { int: 16 },
}).find((row: DesiredFeatureResource) => row.id.includes('restorative_reagents'))
assert.ok(reagents, 'reagents pool')
assert.equal(reagents!.max, 3)

// M08 — two independent 1/1 pools.
const masteryFeatures = unlockFeaturesForClasses({
  classes: [
    {
      id: 'art',
      name: 'Изобретатель',
      catalog_id: 'artificer',
      level: 15,
      subclass_name: 'Алхимик',
      subclass_catalog_id: 'alchemist',
    },
  ],
  characterLevel: 15,
  abilities: { int: 16 },
  subclassSlugByEntryId: { art: 'alchemist' },
})
const pools = desiredResourcesFromFeatures({
  features: masteryFeatures,
  characterLevel: 15,
  abilities: { int: 16 },
})
const greater = pools.find((row) => row.id.includes('greater_restoration'))
const heal = pools.find((row) => row.id.includes('chemical_mastery_heal'))
assert.equal(greater?.max, 1)
assert.equal(heal?.max, 1)
assert.notEqual(greater?.id, heal?.id)

// M112 — Shillelagh picks the held staff and forces a d8.
const staff = pickShillelaghAttack([
  { id: 'dagger', name: 'Кинжал', held: true },
  { id: 'staff', name: 'Боевой посох', held: true },
])
assert.equal(staff?.id, 'staff')
assert.equal(shillelaghDamage('1к6'), '1к8')
const wis = abilityModifier(16)
assert.equal(wis + 6, 9)
assert.equal(`1к8+${wis}`, '1к8+3')

// M119 — Knowledge blessing doubles PB. INT 9, PB 2 → +3.
const blessed = syncSkillsExpertiseFromPicks({
  skills: {
    arcana: { is_proficient: true, is_expertise: false },
    history: { is_proficient: false, is_expertise: false },
  },
  featurePicks: emptyFeaturePicks(),
  expertiseKeys: [],
  alsoExpertiseSkillIds: knowledgeBlessingSkillIds([
    {
      slug: 'knowledge_domain',
      skills: ['arcana', 'history'],
      picks: { blessings_of_knowledge_skills: ['arcana', 'history'] },
    },
  ]),
})
assert.equal(blessed.arcana.is_expertise, true)
assert.equal(
  skillModifierFromState({
    abilityMod: abilityModifier(9),
    proficiencyBonus: 2,
    isProficient: true,
    isExpertise: blessed.arcana.is_expertise,
  }),
  3,
)

// M120 / M121 — Repeating Shot is +1 and only on the chosen ammunition weapon.
const repeating = infusionById('repeating_shot')
assert.equal(resolveInfusionNumericBonus(repeating?.effects?.weaponAttackBonus, 17), 1)
assert.equal(resolveInfusionNumericBonus(repeating?.effects?.weaponDamageBonus, 17), 1)
assert.equal(
  infusionAcceptsItem('repeating_shot', { id: 'x', name: 'Лёгкий арбалет' }),
  true,
)
assert.equal(infusionAcceptsItem('repeating_shot', { id: 'd', name: 'Кинжал' }), false)

let picks = emptyFeaturePicks()
picks = setFeaturePick(picks, 'art', 'infuse_item', 'repeating_shot,enhanced_weapon')
picks = setActiveInfusionBindings(picks, 'art', [
  { infusionId: 'repeating_shot', target: 'self' },
  { infusionId: 'enhanced_weapon', target: 'self', itemId: 'sword' },
])
const spread = aggregateInfusionBonuses({
  featurePicks: picks,
  classes: [
    {
      id: 'art',
      name: 'Изобретатель',
      catalog_id: 'artificer',
      level: 17,
      subclass_name: '',
      subclass_catalog_id: null,
    },
  ],
  wearingArmor: false,
  wearingShield: false,
  items: [
    { id: 'sword', name: 'Длинный меч', equipped: true },
    { id: 'bow', name: 'Лёгкий арбалет', equipped: true },
  ],
})
assert.equal(spread.weaponAttackBonus, 0)
assert.equal(spread.weaponByItem.bow, undefined)
assert.equal(spread.weaponByItem.sword?.attack, 2)
assert.equal(spread.weaponByItem.sword?.damage, 2)

// P02-01 — a shared Enhanced Defense mark raises the target's AC, and leaves when removed.
assert.equal(
  infusionAcFromSharedEffects([
    { name: 'Усиленная защита · +1 КД', ac_bonus: 1 },
    { name: 'Благословение' },
  ]),
  1,
)
assert.equal(
  infusionAcFromSharedEffects([{ name: 'Усиленная защита · +2 КД' }]),
  2,
)
assert.equal(infusionAcFromSharedEffects([]), 0)

console.log('pack02CastFocus.selfcheck: ok')
