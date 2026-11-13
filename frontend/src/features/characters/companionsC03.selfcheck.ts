/**
 * C-03 selfcheck: packs, steed, mount gear, homunculus Tasha, undead thralls,
 * conjure filters / multipliers, fey hostility.
 * Run: npx tsx frontend/src/features/characters/companionsC03.selfcheck.ts
 */
import {
  createCompanion,
  isHomunculusCompanion,
  isSteedCompanion,
  packDisplayName,
  readCompanions,
} from './companions'
import { isPermanentCompanionSlot } from './companionBackfill'
import {
  applyCompanionHpChange,
  companionUsesDeathSaves,
} from './companionCombat'
import {
  buildCompanionPack,
  createPackCompanion,
  companionPackHpTotal,
} from './companionPack'
import {
  applyFindSteedCompanion,
  FIND_STEED_SLUG,
} from './steedCompanions'
import {
  syncMountCompanions,
  mountCompanionId,
} from './mountGearCompanions'
import {
  homunculusServantHp,
  syncHomunculusCompanion,
  HOMUNCULUS_FEATURE,
} from './homunculusCompanion'
import {
  animateDeadCreatureLimit,
  applyAnimateOrCreateUndead,
  applyUndeadThrallsToUnit,
} from './undeadCompanions'
import {
  conjureCountForCr,
  conjureFilterForSpell,
  pickMatchesConjureFilter,
  applyConjureBestiaryPick,
} from './conjureCompanions'
import {
  conjureAnimalsCounts,
  conjureWoodlandOrMinorCounts,
  conjureWoodlandOrMinorMultiplier,
} from '../../shared/dnd/summonSpellPreview'
import { dismissCompanionsForEndedConcentration } from './spellCompanions'
import type { InventoryItem } from './inventory'
import { setActiveInfusionBindings } from '../../shared/dnd/infusionsActive'
import { emptyFeaturePicks, setFeaturePick } from '../../shared/dnd/featurePicks'
import type { BestiaryFormPick } from './wildShape'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`companionsC03 selfcheck: ${msg}`)
}

// --- Pack ---
const pack = buildCompanionPack({ unitNameRu: 'Волк', count: 8, unitHpMax: 11 })
assert(pack.alive_count === 8, 'pack alive 8')
assert(packDisplayName('Волк', 8) === 'Волк ×8', 'pack name')
const packCard = createPackCompanion({
  unitNameRu: 'Волк',
  count: 2,
  unitHpMax: 11,
  ac: 13,
  source: {
    kind: 'spell',
    labelRu: 'Призыв животных',
    feature: 'spell:conjure_animals',
  },
  initiativeMode: 'own_initiative',
  commandCost: 'none',
})
assert(packCard.name === 'Волк ×2', 'pack card name')
assert(companionPackHpTotal(packCard.pack) === 22, 'pack hp total')
const afterKillOne = applyCompanionHpChange(packCard, 11)
assert(afterKillOne.pack?.alive_count === 1, 'one wolf left')
assert(afterKillOne.name === 'Волк ×1', 'name after kill')
const wiped = applyCompanionHpChange(afterKillOne, 0)
assert(wiped.active === false, 'pack wipe dismisses temp summon')
assert(wiped.pack?.alive_count === 0, 'pack empty')

// --- Steed ---
const warhorse: BestiaryFormPick = {
  slug: 'warhorse',
  name_ru: 'Боевой конь',
  cr: '1/2',
  type: 'beast',
  ac: 11,
  hp: 19,
  speed_walk: 60,
  str: 18,
  dex: 12,
  con: 13,
  actions_text: 'Копыта',
}
const steed = applyFindSteedCompanion({
  companions: [],
  pick: warhorse,
  spell: {
    id: 's1',
    name: 'Поиск скакуна',
    catalog_id: null,
    level: 2,
    prepared: true,
    notes: '',
    casting_time: '',
    range: '',
    attack_or_save: '',
    damage: '',
    concentration: false,
  },
  slug: FIND_STEED_SLUG,
  spiritType: 'celestial',
  languageRu: 'Общий',
})
assert(steed.companions.length === 1, 'one steed')
assert(isSteedCompanion(steed.companions[0]!), 'is steed')
assert(steed.companions[0]!.stats.int === 6, 'INT floor 6')
assert(steed.companions[0]!.initiativeMode === 'with_master', 'steed host turn')
assert(isPermanentCompanionSlot(steed.companions[0]!), 'steed permanent slot')
const greater = applyFindSteedCompanion({
  companions: steed.companions,
  pick: {
    ...warhorse,
    slug: 'pegasus',
    name_ru: 'Пегас',
    hp: 59,
    ac: 12,
  },
  spell: {
    id: 's2',
    name: 'Поиск высшего скакуна',
    catalog_id: null,
    level: 4,
    prepared: true,
    notes: '',
    casting_time: '',
    range: '',
    attack_or_save: '',
    damage: '',
    concentration: false,
  },
  slug: 'find_greater_steed',
  spiritType: 'celestial',
})
assert(greater.companions.length === 1, 'still one steed slot')
assert(greater.companions[0]!.name === 'Пегас', 'replaced with pegasus')
assert(greater.refreshed, 'refreshed same card')

// --- Mount gear ---
const horseItem = {
  id: 'inv-horse',
  name: 'Ездовая лошадь',
  catalog_id: null,
  catalog_slug: 'horse_riding',
  qty: 1,
  weight_lb: null,
  equipped: false,
  armor_kind: 'none' as const,
  base_ac: null,
  notes: '',
} satisfies InventoryItem
const withMount = syncMountCompanions([], [horseItem])
assert(withMount.length === 1, 'mount card')
assert(withMount[0]!.id === mountCompanionId('inv-horse'), 'mount id')
assert(withMount[0]!.nature === 'living', 'living mount')
assert(withMount[0]!.stats.hp === 13, 'riding horse HP')
assert(withMount[0]!.stats.ac === 10, 'riding horse AC')
assert(withMount[0]!.initiativeMode === 'with_master', 'mount host turn')
assert(companionUsesDeathSaves(withMount[0]!), 'mount death saves')
const mountDown = applyCompanionHpChange(withMount[0]!, 0)
assert(mountDown.death != null, 'death track started')
assert(mountDown.active === false, 'inactive at 0')
const without = syncMountCompanions([...steed.companions, ...withMount], [])
assert(
  without.every((r) => !r.id.startsWith('gear-companion:mount:')),
  'mount removed with item',
)
assert(without.some((r) => isSteedCompanion(r)), 'spirit steed kept')

// --- Homunculus Tasha ---
assert(homunculusServantHp(3, 3) === 7, '1+3+3=7')
let picks = emptyFeaturePicks()
picks = setFeaturePick(picks, 'art1', 'infuse_item', 'homunculus_servant')
picks = setActiveInfusionBindings(picks, 'art1', [
  { infusionId: 'homunculus_servant', target: 'self' },
])
const withHomo = syncHomunculusCompanion({
  companions: [],
  featurePicks: picks,
  artificerClassEntryId: 'art1',
  artificerLevel: 3,
  intelligenceMod: 3,
  characterLevel: 3,
  spellAttackBonus: 5,
})
assert(withHomo.length === 1, 'homunculus card')
assert(withHomo[0]!.stats.hp_max === 7, 'tasha hp')
assert(withHomo[0]!.stats.ac === 13, 'tasha ac')
assert(withHomo[0]!.stats.speed_fly === 30, 'fly 30 not MM 40')
assert(isHomunculusCompanion(withHomo[0]!), 'feature mark')
assert(!/укус/i.test(withHomo[0]!.actions), 'not MM bite')
picks = setActiveInfusionBindings(picks, 'art1', [])
const off = syncHomunculusCompanion({
  companions: withHomo,
  featurePicks: picks,
  artificerClassEntryId: 'art1',
  artificerLevel: 3,
  intelligenceMod: 3,
  characterLevel: 3,
  spellAttackBonus: 5,
})
assert(off.length === 1, 'card stays')
assert(off[0]!.active === false, 'unsummoned when infusion off')
assert(off[0]!.source?.feature === HOMUNCULUS_FEATURE, 'feature kept')

// --- Undead + thralls ---
assert(animateDeadCreatureLimit(3, false) === 1, 'AD 3 no thralls')
assert(animateDeadCreatureLimit(5, false) === 5, 'AD 5 = 1+2+2')
assert(animateDeadCreatureLimit(3, true) === 2, 'AD 3 thralls +1')
const thrall = applyUndeadThrallsToUnit({
  unitHp: 13,
  actions: 'Короткий меч',
  wizardLevel: 6,
  proficiencyBonus: 3,
})
assert(thrall.unitHp === 19, 'skeleton +6 HP')
const undead = applyAnimateOrCreateUndead({
  companions: [],
  spellSlug: 'animate_dead',
  spellName: 'Восставший труп',
  option: { slug: 'skeleton', nameRu: 'Скелет', ac: 13, hp: 13 },
  count: 2,
  mode: 'create',
  undeadThralls: true,
  wizardLevel: 6,
  proficiencyBonus: 3,
})
assert(undead.companions[0]!.name === 'Скелет ×2', 'skeleton pack')
assert(undead.companions[0]!.pack?.unit_hp_max === 19, 'thrall hp on unit')
assert(undead.companions[0]!.initiativeMode === 'own_initiative', 'undead own init')
assert(undead.companions[0]!.commandCost === 'bonus', 'undead bonus command')

// --- Conjure filter / multipliers ---
assert(conjureAnimalsCounts(5).cr1 === 4, 'animals ×2 at 5 → 4 wolves CR1')
assert(conjureWoodlandOrMinorMultiplier(6) === 2, 'woodland ×2 at 6')
assert(conjureWoodlandOrMinorMultiplier(5) === 1, 'woodland not animals table')
assert(conjureWoodlandOrMinorCounts(8).crQuarter === 24, 'minor ×3 at 8')
const filter = conjureFilterForSpell('conjure_animals', 3)
assert(pickMatchesConjureFilter(
  { slug: 'wolf', name_ru: 'Волк', cr: '1/4', type: 'beast', ac: 13, hp: 11, speed_walk: 40, actions_text: '' },
  filter,
), 'wolf ok')
assert(
  !pickMatchesConjureFilter(
    {
      slug: 'adult_red_dragon',
      name_ru: 'Взрослый красный дракон',
      cr: '17',
      type: 'dragon',
      ac: 19,
      hp: 256,
      speed_walk: 40,
      actions_text: '',
    },
    filter,
  ),
  'dragon hidden',
)
assert(conjureCountForCr('conjure_animals', 3, '1') === 2, 'CR1 → 2')
assert(conjureCountForCr('conjure_animals', 5, '1') === 4, 'CR1 at 5 → 4')
const conjured = applyConjureBestiaryPick({
  companions: [],
  kind: 'conjure_animals',
  spellName: 'Призыв животных',
  slotLevel: 3,
  pick: {
    slug: 'wolf',
    name_ru: 'Волк',
    cr: '1/4',
    type: 'beast',
    ac: 13,
    hp: 11,
    speed_walk: 40,
    actions_text: 'Укус',
  },
  count: 2,
})
assert(conjured.companions[0]!.name === 'Волк ×2', 'conjure pack')
assert(conjured.companions[0]!.stats.ac === 13, 'not stub')
assert(/фея/i.test(conjured.companions[0]!.notes), 'fairy type mark')

// --- Conjure Fey hostility ---
const fey = createCompanion({
  name: 'Фея',
  nature: 'summoned',
  active: true,
  source: {
    kind: 'spell',
    labelRu: 'Призыв феи',
    feature: 'spell:conjure_fey',
    spellId: 'cf1',
  },
  stats: { hp: 40, hp_max: 40, ac: 14, speed: 30 },
})
const hostile = dismissCompanionsForEndedConcentration({
  companions: [fey],
  ended: { spell_id: 'cf1', name: 'Призыв феи' },
})
assert(hostile.hostileNames.length === 1, 'fey hostile')
assert(hostile.companions[0]!.active === true, 'fey still active hostile')
assert(/враждебен/i.test(hostile.companions[0]!.notes), 'hostile note')

// --- readCompanions round-trip pack/mounted ---
const round = readCompanions([
  {
    ...conjured.companions[0]!,
    mounted: true,
    pack: conjured.companions[0]!.pack,
  },
])
assert(round[0]!.pack?.alive_count === 2, 'read pack')
assert(round[0]!.mounted === true, 'read mounted')

console.log('companionsC03.selfcheck: ok')
