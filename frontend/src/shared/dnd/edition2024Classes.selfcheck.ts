/** P24-M02a selfcheck — run: npm run selfcheck:p24-m02a-classes */
import assert from 'node:assert/strict'
import {
  actionSurgeAllowsAction2024,
  applyShortRestResources2024,
  checkMulticlassPrerequisites2024,
  computeProgression2024,
  listClassSlugs2024,
  multiclassCasterLevel2024,
  SRD_SUBCLASS_BY_PARENT,
  slotsForCasterLevel2024,
} from './edition2024Classes'
import { createClassLevel } from './classLevels'
import { multiclassPackage2024, resolveClassGrantDef } from './classGrants'
import { RULES_EDITION_2024_OPEN } from './rulesEdition2024'

assert.equal(RULES_EDITION_2024_OPEN, false)

const slugs = listClassSlugs2024()
assert.ok(slugs.includes('fighter'))
assert.ok(slugs.includes('artificer'))
assert.equal(slugs.length, 13)

for (const level of [1, 3, 5, 11, 20]) {
  const snap = computeProgression2024({
    classes: [
      createClassLevel({
        name: 'Воин',
        level,
        catalog_id: 'fighter',
        subclass_catalog_id: level >= 3 ? SRD_SUBCLASS_BY_PARENT.fighter : null,
      }),
    ],
  })
  assert.equal(snap.proficiency_bonus, Math.floor((level - 1) / 4) + 2)
  const sw = snap.desiredResources.find((r) => r.id.includes('second_wind'))
  assert.ok(sw, `second_wind L${level}`)
  if (level >= 2) {
    const surge = snap.desiredResources.find((r) => r.id.includes('action_surge'))
    assert.ok(surge, `action_surge L${level}`)
  }
}

const wiz = computeProgression2024({
  classes: [
    createClassLevel({
      name: 'Волшебник',
      level: 5,
      catalog_id: 'wizard',
      subclass_catalog_id: SRD_SUBCLASS_BY_PARENT.wizard,
    }),
  ],
})
assert.equal(wiz.spellcasting[0]?.prepared_spells, 9)
assert.ok(wiz.desiredResources.some((r) => r.id.includes('arcane_recovery')))
const scholar = wiz.features.find((f) => f.id === 'scholar')
assert.equal(scholar?.name_ru, 'Академические знания')
assert.equal(scholar?.choice?.options_from, 'expertise_skills_tools')
assert.equal(scholar?.choice?.max_picks, 1)
assert.deepEqual(scholar?.choice?.options, [
  'history',
  'medicine',
  'nature',
  'investigation',
  'religion',
  'arcana',
])
assert.equal(wiz.features.find((f) => f.id === 'spellcasting')?.name_ru, 'Сотворение заклинаний')
assert.equal(
  wiz.features.find((f) => f.id.includes('arcane_recovery'))?.name_ru ??
    wiz.desiredResources.find((r) => r.id.includes('arcane_recovery'))?.pool_name_ru,
  'Магическое восстановление',
)

const bard = computeProgression2024({
  classes: [createClassLevel({ name: 'Бард', level: 5, catalog_id: 'bard' })],
  abilities: { cha: 16 },
})
const bi = bard.desiredResources.find((r) => r.id.includes('bardic_inspiration'))
assert.ok(bi)
assert.equal(bi!.max, 3) // CHA 16 → +3, not PB
assert.equal(bi!.reset, 'short')
assert.ok(!bi!.id.includes('heroic'))

const bardLow = computeProgression2024({
  classes: [createClassLevel({ name: 'Бард', level: 1, catalog_id: 'bard' })],
  abilities: { cha: 8 },
})
const biLow = bardLow.desiredResources.find((r) => r.id.includes('bardic_inspiration'))
assert.equal(biLow!.max, 1)
assert.equal(biLow!.reset, 'long')

assert.equal(actionSurgeAllowsAction2024('magic'), false)
assert.equal(actionSurgeAllowsAction2024('attack'), true)

const after = applyShortRestResources2024([
  {
    id: 'feat:fighter:second_wind:second_wind',
    name: 'Второе дыхание',
    max: 3,
    used: 3,
    reset: 'long',
    shortRestRegain: 1,
  },
])
assert.equal(after[0]?.used, 2)

const ok = checkMulticlassPrerequisites2024({
  currentClasses: ['fighter'],
  newClass: 'wizard',
  abilities: { str: 15, dex: 10, con: 12, int: 14, wis: 10, cha: 10 },
})
assert.equal(ok.ok, true)

assert.equal(multiclassCasterLevel2024([
  { slug: 'cleric', level: 3 },
  { slug: 'wizard', level: 2 },
]), 5)
assert.equal(slotsForCasterLevel2024(5)['3'], 2)

// MULTICLASS_PROFICIENCIES_2024 feeds the sheet grant package (not the full start package).
const wizardData2024 = {
  armor: [],
  weapons: { simple: true, martial: false, extras: [] },
  saving_throws: ['int', 'wis'],
  hit_die: 6,
  skill_choices: { count: 2, from: ['arcana', 'history', 'insight'] },
}
const wizardGrant = resolveClassGrantDef({
  className: 'Волшебник',
  catalogSlug: 'wizard',
  catalogData: wizardData2024,
  rulesEdition: '2024',
})
assert.ok(wizardGrant)
assert.deepEqual(wizardGrant.multiclass.skillChoices, null, '2024 wizard multiclass: no skills')
assert.deepEqual(wizardGrant.multiclass.weapons, [], '2024 wizard multiclass: no weapons')
assert.deepEqual(wizardGrant.multiclass.saves, [], 'multiclass never grants saves')
assert.deepEqual(wizardGrant.start.skillChoices?.count, 2, 'start package untouched')

const fighterMc = multiclassPackage2024('fighter', null)
assert.deepEqual(fighterMc?.armor, ['light', 'medium', 'shields'])
assert.deepEqual(fighterMc?.weapons, ['simple', 'martial'])
const rogueMc = multiclassPackage2024('rogue', {
  skill_choices: { count: 4, from: ['acrobatics', 'stealth', 'deception'] },
})
assert.equal(rogueMc?.skillChoices?.count, 1, 'rogue multiclass: 1 skill')
assert.deepEqual(rogueMc?.skillChoices?.from, ['acrobatics', 'stealth', 'deception'])
assert.deepEqual(rogueMc?.toolsFixed, ['Воровские инструменты'])
assert.deepEqual(rogueMc?.armor, ['light'])
const bardMc = multiclassPackage2024('bard', { skill_choices: { count: 3, from_any: true } })
assert.equal(bardMc?.skillChoices?.from, 'any')
assert.equal(bardMc?.toolChoices?.count, 1)
const monkMc = multiclassPackage2024('monk', null)
assert.ok(monkMc?.weaponExtras.some((row) => /лёгкое/.test(row)))
assert.equal(monkMc?.toolChoices?.count, 1)
assert.equal(multiclassPackage2024('homebrew', null), null)
// 2014 stays on the PHB table.
const wizard2014 = resolveClassGrantDef({ className: 'Волшебник', rulesEdition: '2014' })
assert.deepEqual(wizard2014?.multiclass.skillChoices, null)

// Warlock 2024: subclass resource badges = unlock level; mystic arcanum not duplicated.
{
  const fiend14 = computeProgression2024({
    classes: [
      createClassLevel({
        name: 'Колдун',
        level: 14,
        catalog_id: 'warlock',
        subclass_catalog_id: 'warlock__fiend-patron',
      }),
    ],
    abilities: { cha: 17 },
  })
  const luck = fiend14.features.find((f) => f.id === 'dark_ones_own_luck')
  assert.equal(luck?.level, 6, 'Dark One’s Own Luck badge = 6')
  const hurl = fiend14.features.find((f) => f.id === 'hurl_through_hell')
  assert.equal(hurl?.level, 14, 'Hurl Through Hell badge = 14')
  const arcanumText = fiend14.features.filter(
    (f) => f.id === 'mystic_arcanum' && !f.resource,
  )
  assert.equal(arcanumText.length, 0, 'no bare mystic-arcanum text cards')
  const a6 = fiend14.features.find((f) => f.id === 'mystic_arcanum_6')
  const a7 = fiend14.features.find((f) => f.id === 'mystic_arcanum_7')
  assert.equal(a6?.level, 11)
  assert.equal(a7?.level, 13)
  assert.ok(a6?.resource)
  assert.ok(a7?.resource)

  const archfey10 = computeProgression2024({
    classes: [
      createClassLevel({
        name: 'Колдун',
        level: 10,
        catalog_id: 'warlock',
        subclass_catalog_id: 'warlock__archfey',
      }),
    ],
    abilities: { cha: 16 },
  })
  assert.equal(archfey10.features.find((f) => f.id === 'steps_of_the_fey')?.level, 3)
  assert.equal(archfey10.features.find((f) => f.id === 'beguiling_defenses')?.level, 10)
  assert.equal(
    archfey10.features.find((f) => f.id === 'misty_escape')?.level,
    6,
  )

  const celestial14 = computeProgression2024({
    classes: [
      createClassLevel({
        name: 'Колдун',
        level: 14,
        catalog_id: 'warlock',
        subclass_catalog_id: 'warlock__celestial-patron',
      }),
    ],
    abilities: { cha: 16 },
  })
  assert.equal(celestial14.features.find((f) => f.id === 'healing_light')?.level, 3)
  assert.equal(celestial14.features.find((f) => f.id === 'searing_vengeance')?.level, 14)

  const goo6 = computeProgression2024({
    classes: [
      createClassLevel({
        name: 'Колдун',
        level: 6,
        catalog_id: 'warlock',
        subclass_catalog_id: 'warlock__greate-old-one-patron',
      }),
    ],
    abilities: { cha: 16 },
  })
  assert.equal(goo6.features.find((f) => f.id === 'clairvoyant_combatant')?.level, 6)
}

{
  const clericAt = (level: number) =>
    computeProgression2024({
      classes: [
        createClassLevel({
          name: 'Жрец',
          level,
          catalog_id: 'cleric',
          subclass_catalog_id: 'cleric__life-domain',
        }),
      ],
      abilities: { wis: 16 },
    })
  const c1 = clericAt(1)
  assert.equal(c1.features.some((f) => f.id === 'divine_spark'), false)
  const c2 = clericAt(2)
  for (const id of ['divine_spark', 'turn_undead']) {
    const rows = c2.features.filter((f) => f.id === id)
    assert.equal(rows.length, 1, `cleric ${id} single card`)
    assert.equal(rows[0]?.resource?.pool_id, 'channel_divinity')
  }
  assert.equal(c2.features.some((f) => f.id === 'divine_intervention'), false)
  const c10 = clericAt(10)
  assert.equal(c10.features.find((f) => f.id === 'divine_intervention')?.resource?.pool_id, 'divine_intervention')
  assert.equal(c10.features.find((f) => f.id === 'divine_intervention')?.level, 10)
  assert.ok(c10.desiredResources.some((r) => r.id.includes(':divine_intervention:') && r.max === 1))
  assert.equal(c10.features.find((f) => f.id === 'blessed_strikes')?.choice?.id, 'blessed-strikes')
}

/* Druid 2024: Druidic → Speak with Animals; Land terrain feeds always prepared. */
{
  const d5 = computeProgression2024({
    classes: [
      createClassLevel({ id: 'd1', name: 'Друид', catalog_id: 'druid', level: 5, subclass_catalog_id: 'druid__land' }),
    ],
    subclassSlugByEntryId: { d1: 'druid__land' },
    landChoiceByEntryId: { d1: 'arid' },
  })
  const prepared = d5.spellcasting[0]?.always_prepared ?? []
  assert.ok(prepared.includes('speak-with-animals'))
  assert.ok(prepared.includes('fireball') && !prepared.includes('sleet-storm'))
  assert.deepEqual(
    d5.features.find((f) => f.id === 'circle_of_the_land_spells')?.choice?.options,
    ['arid', 'polar', 'temperate', 'tropical'],
  )
}

console.log('edition2024Classes.selfcheck: ok')
