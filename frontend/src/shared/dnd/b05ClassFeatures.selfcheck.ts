/**
 * B-05 acceptance numbers.
 * Run: npx tsx src/shared/dnd/b05ClassFeatures.selfcheck.ts
 */
import {
  absorbDamageWithArcaneWard,
  arcaneWardMax,
} from './wizardTradition.ts'
import {
  buildBuffEffect,
  defensesFromActiveEffects,
  initiativeBonusFromActiveEffects,
  listRollDieChips,
  resolveAdvantageFromEffects,
  saveBonusFromActiveEffects,
  weaponBonusesFromActiveEffects,
} from './activeEffects.ts'
import {
  darkOnesBlessingTempHp,
  inspiringSmiteTempPool,
  tombOfLevistusTempHp,
} from './b05BuffSpecs.ts'
import { buildMaxHpByLevels } from './multiclassRules.ts'
import { initiativeBonusFromFeatures } from '../../features/characters/featureCombatBonuses.ts'
import { featureResourceId } from './featureResources.ts'
import type { SheetResource } from './rest.ts'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg)
}

// Aura of Protection ally: Cha 16 → +3 saves when active.
{
  const aura = buildBuffEffect({
    name: 'Аура защиты',
    slug: 'aura_of_protection',
    casterMod: 3,
  })!
  assert(aura.slug === 'aura_of_protection', 'aura slug')
  assert(saveBonusFromActiveEffects([aura], 'all') === 3, 'aura +3 saves')
  const off = { ...aura, inactive: true, inactive_reason: 'вне ауры' }
  assert(saveBonusFromActiveEffects([off], 'all') === 0, 'aura off → 0')
}

// Dark One's Blessing: warlock 5 Cha 18 → 9 temp HP.
assert(darkOnesBlessingTempHp(5, 4) === 9, 'dark one blessing 9')
assert(tombOfLevistusTempHp(3) === 30, 'tomb 30')

{
  const bless = buildBuffEffect({
    name: 'Благословение Темнейшего',
    slug: 'dark_ones_blessing',
    classLevel: 5,
    casterMod: 4,
  })!
  const temp = bless.mods?.find((m) => m.target === 'temp_hp')
  assert(temp?.value === 9, `bless temp 9 got ${temp?.value}`)
}

// Arcane Ward absorb order: ward → temp → hp (tested absorb helper).
{
  const max = arcaneWardMax(4, 16)
  assert(max === 11, `ward max 11 got ${max}`)
  const resources: SheetResource[] = [
    {
      id: featureResourceId('wizard', 'arcane_ward', 'w1'),
      name: 'Тайный страж',
      max: 11,
      used: 11,
      reset: 'long',
      track: 'stock',
      wardCreated: true,
    },
  ]
  const hit = absorbDamageWithArcaneWard(resources, 15)
  assert(hit.absorbed === 11, `absorbed 11 got ${hit.absorbed}`)
  assert(hit.remaining === 4, `remaining 4 got ${hit.remaining}`)
  assert(hit.resources[0].used === 0, 'ward empty')

  const mid: SheetResource[] = [
    {
      id: featureResourceId('wizard', 'arcane_ward', 'w1'),
      name: 'Тайный страж',
      max: 11,
      used: 5,
      reset: 'long',
      track: 'stock',
      wardCreated: true,
    },
  ]
  const hit2 = absorbDamageWithArcaneWard(mid, 15)
  assert(hit2.absorbed === 5, 'absorbed 5')
  assert(hit2.remaining === 10, 'remaining 10 after ward 5')
}

// Draconic Resilience HP: sorcerer 1 CON 14 → 6+2+1 = 9; level 3 → 23.
{
  const L1 = buildMaxHpByLevels({
    classes: [{ name: 'Чародей', level: 1 }],
    constitutionMod: 2,
    fallbackDie: 'd6',
    draconicResilience: true,
  })!
  assert(L1.total === 9, `draconic L1 9 got ${L1.total}`)
  const L3 = buildMaxHpByLevels({
    classes: [{ name: 'Чародей', level: 3 }],
    constitutionMod: 2,
    fallbackDie: 'd6',
    draconicResilience: true,
  })!
  assert(L3.total === 23, `draconic L3 23 got ${L3.total}`)
}

// Dread Ambusher first-turn: +10 speed + 1d8 chip.
{
  const dread = buildBuffEffect({
    name: 'Жуткий преследователь',
    slug: 'dread_ambusher',
  })!
  const chips = listRollDieChips([dread], 'damage')
  assert(
    chips.some((c) => c.dice === '1d8' && c.optional),
    'dread 1d8 optional chip',
  )
  assert(
    dread.mods?.some((m) => m.target === 'speed' && m.value === 10),
    'dread +10 speed',
  )
  assert(
    initiativeBonusFromFeatures({
      features: [{ id: 'dread_ambusher' }],
      abilities: { wis: 16 },
    }) === 3,
    'dread +Wis init',
  )
}

// Tactical Wit +Int; Sentinel aura +Cha min 1.
assert(
  initiativeBonusFromFeatures({
    features: [{ id: 'tactical_wit' }],
    abilities: { int: 16 },
  }) === 3,
  'tactical wit +3',
)
assert(
  initiativeBonusFromFeatures({
    features: [{ id: 'aura_of_the_sentinel' }],
    abilities: { cha: 8 },
  }) === 1,
  'sentinel min +1',
)

{
  const sent = buildBuffEffect({
    name: 'Аура стража',
    slug: 'aura_of_the_sentinel',
    casterMod: 3,
  })!
  assert(initiativeBonusFromActiveEffects([sent]) === 3, 'sentinel effect +3')
}

// Sacred Weapon +Cha attack; Hexblade curse PB damage.
{
  const sacred = buildBuffEffect({
    name: 'Священное оружие',
    slug: 'cd_sacred_weapon',
    casterMod: 3,
  })!
  const w = weaponBonusesFromActiveEffects([sacred], { melee: true })
  assert(w.attack === 3, `sacred +3 attack got ${w.attack}`)
}

{
  const curse = buildBuffEffect({
    name: 'Проклятие ведьмовского клинка',
    slug: 'hexblades_curse',
    casterMod: 3,
  })!
  assert(
    curse.mods?.some((m) => m.target === 'weapon_damage' && m.value === 3),
    'hex +PB dmg',
  )
}

// Eldritch Mind: advantage on concentration.
{
  const mind = buildBuffEffect({
    name: 'Элдрический разум',
    slug: 'eldritch_mind',
  })!
  assert(
    resolveAdvantageFromEffects([mind], {
      rollKind: 'save',
      abilityKey: 'con',
    }) === 'advantage' ||
      resolveAdvantageFromEffects([mind], {
        rollKind: 'save',
        abilityKey: 'concentration',
      }) === 'advantage',
    'eldritch mind concentration adv',
  )
}

// Vow of Enmity: advantage vs vow target.
{
  const vow = buildBuffEffect({
    name: 'Обет вражды',
    slug: 'cd_vow_of_enmity',
  })!
  assert(
    resolveAdvantageFromEffects([vow], { rollKind: 'attack' }) === 'advantage',
    'vow attack adv',
  )
}

// Colossus Slayer optional chip.
{
  const col = buildBuffEffect({
    name: 'Колосс-убийца',
    slug: 'colossus_slayer',
  })!
  const chips = listRollDieChips([col], 'damage')
  assert(chips.some((c) => c.dice === '1d8'), 'colossus 1d8')
}

// Spell Resistance: adv vs spells + label (damage resist is desk-marked).
{
  const sr = buildBuffEffect({
    name: 'Сопротивление заклинаниям',
    slug: 'spell_resistance',
  })!
  assert(
    resolveAdvantageFromEffects([sr], { rollKind: 'save', condition: 'spells' }) ===
      'advantage' ||
      resolveAdvantageFromEffects([sr], { rollKind: 'save', abilityKey: 'spells' }) ===
        'advantage' ||
      sr.mods?.some((m) => m.condition === 'spells'),
    'spell resistance present',
  )
}

// Supernatural resistance nonmagic B/P/S.
{
  const res = buildBuffEffect({
    name: 'Сверхъестественное сопротивление',
    slug: 'supernatural_resistance',
  })!
  const defs = defensesFromActiveEffects([res])
  assert(
    defs.some((d) => d.type === 'slashing' && d.nonmagical && d.kind === 'resistance'),
    'oathbreaker nonmagic slash',
  )
}

// Inspiring Smite pool: 2d8 + level with fixed rng → deterministic.
{
  let i = 0
  const rng = () => {
    const seq = [0.0, 0.5] // → 1 and 5
    return seq[i++] ?? 0
  }
  const pool = inspiringSmiteTempPool(6, rng)
  assert(pool === 1 + 5 + 6, `inspiring pool 12 got ${pool}`)
}

console.log('b05ClassFeatures.selfcheck: ok')
