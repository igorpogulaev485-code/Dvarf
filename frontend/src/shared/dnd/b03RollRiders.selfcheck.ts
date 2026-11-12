/**
 * B-03 acceptance: roll riders, advantage, marks.
 * Run: npx tsx src/shared/dnd/b03RollRiders.selfcheck.ts
 */
import {
  buildBuffEffect,
  consumeRollDieChips,
  listRollDieChips,
  mergeDeskRollMode,
  resolveAdvantageFromEffects,
} from './activeEffects.ts'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg)
}

// Paladin 5, Divine Favor: +1d4 radiant on weapon damage
{
  const fx = buildBuffEffect({ name: 'Божественное благоволение', slotLevel: 1 })!
  const chips = listRollDieChips([fx], 'damage')
  assert(chips.length === 1, 'divine favor damage chip')
  assert(chips[0].dice === '1d4', `favor dice ${chips[0].dice}`)
  assert(chips[0].damageType === 'излучение', `favor type ${chips[0].damageType}`)
  assert(chips[0].once === false, 'favor not once')
}

// Hunter's mark: optional marked-target 1d6; upcast 5 → 3d6
{
  const fx = buildBuffEffect({ name: 'Метка охотника', slotLevel: 1 })!
  const chips = listRollDieChips([fx], 'damage')
  assert(chips[0]?.optional === true, 'mark optional')
  assert(chips[0]?.dice === '1d6', 'mark 1d6')
  const up = buildBuffEffect({ name: 'Метка охотника', slotLevel: 5 })!
  assert(listRollDieChips([up], 'damage')[0]?.dice === '3d6', 'mark upcast 3d6')
}

// Wrathful smite: +1d6 psychic once, then gone
{
  const fx = buildBuffEffect({ name: 'Гневная кара', slotLevel: 1 })!
  const chips = listRollDieChips([fx], 'damage')
  assert(chips[0]?.dice === '1d6' && chips[0]?.once === true, 'wrathful once')
  assert(chips[0]?.damageType === 'психическая энергия', 'wrathful psychic')
  const after = consumeRollDieChips([fx], chips)
  assert(after.length === 0, 'smite removed after hit')
}

// Absorb elements slot 1 fire → next melee 1d6; slot 2 → 2d6; resistance kept after rider
{
  const fx = buildBuffEffect({
    name: 'Поглощение стихий',
    slotLevel: 1,
    option: 'fire',
  })!
  const chips = listRollDieChips([fx], 'damage', { melee: true })
  assert(chips[0]?.dice === '1d6', 'absorb 1d6')
  assert(chips[0]?.damageType === 'огонь', `absorb type ${chips[0]?.damageType}`)
  assert(chips[0]?.once === true, 'absorb once')
  const after = consumeRollDieChips([fx], chips)
  assert(after.length === 1, 'absorb keeps resistance')
  assert(
    (after[0].mods ?? []).some((m) => m.target === 'resistance'),
    'resistance remains',
  )
  const up = buildBuffEffect({
    name: 'Поглощение стихий',
    slotLevel: 2,
    option: 'fire',
  })!
  assert(listRollDieChips([up], 'damage')[0]?.dice === '2d6', 'absorb slot2 2d6')
  assert(
    listRollDieChips([fx], 'damage', { melee: false }).length === 0,
    'absorb skipped on ranged',
  )
}

// Elemental weapon slot 3 fire: 1d4 fire dice chip; slot 5 → 2d4
{
  const fx = buildBuffEffect({
    name: 'Стихийное оружие',
    slotLevel: 3,
    option: 'fire',
  })!
  const chips = listRollDieChips([fx], 'damage')
  assert(chips.some((c) => c.dice === '1d4' && c.damageType === 'огонь'), 'elem 1d4 fire')
  const up = buildBuffEffect({
    name: 'Стихийное оружие',
    slotLevel: 5,
    option: 'fire',
  })!
  assert(
    listRollDieChips([up], 'damage').some((c) => c.dice === '2d4'),
    'elem slot5 2d4',
  )
}

// Zephyr strike: +1d8 force once with advantage once
{
  const fx = buildBuffEffect({ name: 'Удар Зефира' })!
  const dmg = listRollDieChips([fx], 'damage')
  assert(dmg[0]?.dice === '1d8' && dmg[0]?.damageType === 'силовое поле', 'zephyr 1d8')
  assert(
    resolveAdvantageFromEffects([fx], { rollKind: 'attack' }) === 'advantage',
    'zephyr adv',
  )
  const after = consumeRollDieChips([fx], dmg)
  assert(
    resolveAdvantageFromEffects(after, { rollKind: 'attack' }) === 'normal',
    'zephyr adv cleared with once mods',
  )
}

// Foresight: adv attack+save; +dis → normal
{
  const fx = buildBuffEffect({ name: 'Предвидение' })!
  assert(
    resolveAdvantageFromEffects([fx], { rollKind: 'attack' }) === 'advantage',
    'foresight attack',
  )
  assert(
    resolveAdvantageFromEffects([fx], { rollKind: 'save' }) === 'advantage',
    'foresight save',
  )
  assert(
    resolveAdvantageFromEffects([fx], { rollKind: 'check' }) === 'advantage',
    'foresight check',
  )
  const mixed = mergeDeskRollMode('disadvantage', 'advantage')
  assert(mixed === 'normal', 'desk dis + foresight adv cancel')
}

// Mirror image: 3 charges
{
  const fx = buildBuffEffect({ name: 'Отражения' })!
  assert(fx.charges === 3, 'mirror 3')
}

// Gift of Alacrity: initiative 1d8
{
  const fx = buildBuffEffect({ name: 'Дар проворства' })!
  const chips = listRollDieChips([fx], 'initiative')
  assert(chips[0]?.dice === '1d8', 'alacrity init')
}

// Ceremony dedication / coming of age
{
  const ded = buildBuffEffect({
    name: 'Церемония',
    catalogId: 'ceremony',
    option: 'dedication',
  })!
  assert(ded.slug === 'ceremony_dedication', 'dedication slug')
  assert(listRollDieChips([ded], 'save')[0]?.dice === '1d4', 'dedication save d4')
  const age = buildBuffEffect({
    name: 'Церемония',
    catalogId: 'ceremony',
    option: 'coming_of_age',
  })!
  assert(listRollDieChips([age], 'check')[0]?.dice === '1d4', 'coming of age check d4')
}

// Banishing smite 5d10 force
{
  const fx = buildBuffEffect({ name: 'Изгоняющая кара' })!
  assert(listRollDieChips([fx], 'damage')[0]?.dice === '5d10', 'banishing 5d10')
}

// Holy weapon 2d8 radiant
{
  const fx = buildBuffEffect({ name: 'Священное оружие' })!
  assert(
    listRollDieChips([fx], 'damage')[0]?.dice === '2d8' &&
      listRollDieChips([fx], 'damage')[0]?.damageType === 'излучение',
    'holy weapon',
  )
}

// Sanctuary / blink marks exist
{
  assert(buildBuffEffect({ name: 'Убежище' })?.slug === 'sanctuary', 'sanctuary')
  assert(buildBuffEffect({ name: 'Мерцание' })?.slug === 'blink', 'blink')
  assert(buildBuffEffect({ name: 'Невидимость' })?.slug === 'invisibility', 'invis')
}

console.log('b03RollRiders.selfcheck: ok')
