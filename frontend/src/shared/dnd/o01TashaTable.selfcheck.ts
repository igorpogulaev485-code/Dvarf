/**
 * O-01 selfcheck: TCE styles / maneuvers / metamagic / invocations / grapple spend.
 * Run: npx --yes tsx src/shared/dnd/o01TashaTable.selfcheck.ts
 */
import {
  FIGHTER_FIGHTING_STYLES,
  PALADIN_FIGHTING_STYLES,
  RANGER_FIGHTING_STYLES,
  BARD_SWORDS_FIGHTING_STYLES,
  fightingStyleById,
  isTceFightingStyle,
} from './fightingStyles.ts'
import {
  BATTLE_MASTER_MANEUVERS,
  isTceManeuver,
  maneuverById,
  maneuverSpendLabel,
  TCE_MANEUVER_IDS,
} from './battleMasterManeuvers.ts'
import {
  isTceMetamagic,
  metamagicById,
  TCE_METAMAGIC_IDS,
  TRANSMUTED_DAMAGE_TYPES,
} from './sorcererMetamagic.ts'
import {
  isTceInvocation,
  isTcePactBoon,
  warlockInvocationPickerIds,
  WARLOCK_PACT_BOONS,
  invocationById,
} from './warlockInvocations.ts'
import { filterTceCatalogOptions } from './filterTceCatalogOptions.ts'
import { tceOptionVisible, tceTableVisible } from './tceOptions.ts'
import {
  applyAttackSpend,
  canSpendAttack,
  emptyTurnEconomy,
} from './turnEconomy.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

// ——— Styles by class ———
for (const id of [
  'blind_fighting',
  'interception',
  'superior_technique',
  'thrown_weapon_fighting',
  'unarmed_fighting',
] as const) {
  assert(FIGHTER_FIGHTING_STYLES.includes(id), `fighter has ${id}`)
  assert(fightingStyleById(id)?.sourceBook === 'tce', `${id} is tce`)
}
assert(PALADIN_FIGHTING_STYLES.includes('blessed_warrior'), 'paladin blessed')
assert(PALADIN_FIGHTING_STYLES.includes('interception'), 'paladin interception')
assert(PALADIN_FIGHTING_STYLES.includes('blind_fighting'), 'paladin blind')
assert(!PALADIN_FIGHTING_STYLES.includes('superior_technique'), 'paladin no ST')
assert(!PALADIN_FIGHTING_STYLES.includes('unarmed_fighting'), 'paladin no unarmed')
assert(RANGER_FIGHTING_STYLES.includes('blind_fighting'), 'ranger blind')
assert(RANGER_FIGHTING_STYLES.includes('thrown_weapon_fighting'), 'ranger thrown')
assert(RANGER_FIGHTING_STYLES.includes('druidic_warrior'), 'ranger keeps druidic')
assert(!RANGER_FIGHTING_STYLES.includes('interception'), 'ranger no interception')
assert(
  !BARD_SWORDS_FIGHTING_STYLES.includes('blind_fighting'),
  'swords bard no new TCE styles',
)

// ——— Maneuvers ———
assert(TCE_MANEUVER_IDS.length === 7, '7 TCE maneuvers')
assert(maneuverSpendLabel('ambush') === 'Приём: Засада', 'ambush spend label')
assert(maneuverById('grappling_strike')?.nameRu === 'Атака с захватом', 'grappling strike name')
assert(isTceManeuver('ambush'), 'ambush is tce')
assert(!isTceManeuver('trip_attack'), 'PHB trip not tce')
assert(BATTLE_MASTER_MANEUVERS.length === 23, '16 PHB + 7 TCE')

// ——— Metamagic ———
assert(TCE_METAMAGIC_IDS.includes('seeking'), 'seeking id')
assert(TCE_METAMAGIC_IDS.includes('transmuted'), 'transmuted id')
assert(metamagicById('seeking')?.nameRu === 'Ищущее заклинание', 'seeking RU')
assert(
  metamagicById('transmuted')?.nameRu === 'Преобразованное заклинание',
  'transmuted RU',
)
assert(TRANSMUTED_DAMAGE_TYPES.length === 6, '6 transmutable types')
assert(isTceMetamagic('seeking') && isTceMetamagic('transmuted'), 'tce metamagic flags')

// ——— Invocations / pact ———
assert(WARLOCK_PACT_BOONS.some((p) => p.id === 'talisman'), 'talisman pact')
assert(isTcePactBoon('talisman'), 'talisman is tce')
assert(
  !warlockInvocationPickerIds().includes('pact_of_the_talisman'),
  'old talisman not in picker',
)
assert(invocationById('pact_of_the_talisman')?.deprecatedAsInvocation, 'legacy kept')
for (const id of [
  'investment_of_the_chain_master',
  'gift_of_the_protectors',
  'protection_of_the_talisman',
  'rebuke_of_the_talisman',
  'bond_of_the_talisman',
  'far_scribe',
  'undying_servitude',
]) {
  assert(isTceInvocation(id), `${id} is tce invocation`)
  assert(warlockInvocationPickerIds().includes(id), `${id} in picker`)
}
assert(invocationById('eldritch_mind')?.nameRu === 'Элдрический разум', 'no rename eldritch mind')
assert(invocationById('far_scribe')?.nameRu === 'Книжник из дали', 'far scribe name')

// ——— TCE gating ———
assert(tceOptionVisible({ tceAllowed: null }), 'outside lobby show')
assert(tceOptionVisible({ tceAllowed: true }), 'lobby with tce show')
assert(!tceOptionVisible({ tceAllowed: false }), 'lobby without tce hide')
assert(
  tceOptionVisible({ tceAllowed: false, alreadySelected: true }),
  'keep selected when book off',
)
assert(tceTableVisible(true) && !tceTableVisible(false) && !tceTableVisible(null), 'table gate')

const filteredOff = filterTceCatalogOptions({
  options: [...FIGHTER_FIGHTING_STYLES],
  optionsFrom: 'fighter_fighting_styles',
  tceAllowed: false,
  selectedIds: ['superior_technique'],
})
assert(filteredOff.includes('archery'), 'PHB stays')
assert(filteredOff.includes('superior_technique'), 'selected TCE stays')
assert(!filteredOff.includes('blind_fighting'), 'unselected TCE hidden')
assert(isTceFightingStyle('blind_fighting'), 'blind is tce style')

// ——— Grapple spends one attack, Extra Attack still ok ———
let te = emptyTurnEconomy()
assert(canSpendAttack(te).ok, 'first attack ok')
te = applyAttackSpend(te)
assert(te.action && te.actionSpentAs === 'attack', 'action spent as attack')
assert(canSpendAttack(te).ok, 'second attack ok after grapple (Extra Attack)')

console.log('o01TashaTable.selfcheck: ok')
