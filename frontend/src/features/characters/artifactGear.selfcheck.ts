/**
 * npx tsx --tsconfig tsconfig.app.json src/features/characters/artifactGear.selfcheck.ts
 * Grant-shaped sheet → open/save keeps artifact fields; live effects match the four examples.
 */
import { aggregateGearEffects, applyGearAbilityScores } from './gearEffects'
import { effectsFromAbilities, hydrateArtifactSheet } from './artifactGear'
import { inventoryToSheet, readInventory } from './inventory'
import { readWeapons } from './minimalSheet/draft'
import { readCompanions } from './companions'
import { skillModifierFromState } from '../../shared/dnd/passives'

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message)
}

const feather = effectsFromAbilities([
  { kind: 'skill', skill_key: 'nature', bonus_value: 2, id: 'n' },
  { kind: 'skill', skill_key: 'history', bonus_value: 2, id: 'h' },
  { kind: 'tool', tool_name: 'Инструменты фальсификатора', id: 't' },
])
const mask = effectsFromAbilities([
  {
    kind: 'passive',
    bonus_target: 'ability',
    bonus_value: 2,
    ability_key: 'int',
    max_score: 22,
    id: 'int',
  },
  { kind: 'condition_immunity', condition_slug: 'frightened', condition_name: 'Испуганный', id: 'fear' },
  { kind: 'condition_immunity', condition_slug: 'illusions', condition_name: 'Иллюзии', id: 'ill' },
])
const axeModes = effectsFromAbilities([
  { kind: 'requirement', ability_key: 'str', min_score: 15, id: 'req' },
  {
    kind: 'mode',
    name: 'Ярость клинка',
    active_damage: '2d12',
    advantage: true,
    charges: 1,
    reset: 'short',
    id: 'mode-1',
  },
])
const claw = effectsFromAbilities([
  {
    kind: 'companion',
    companion_name: 'Дух предка',
    hp_max: 30,
    ac: 16,
    attack_bonus: 4,
    attack_damage: '1d8',
    attack_damage_type: 'некротический',
    duration: '1 минута',
    charges: 1,
    id: 'summon',
  },
])

const sheet = {
  inventory: {
    coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    notes: '',
    items: [
      {
        id: 'feather',
        name: 'Перо Везула',
        catalog_id: null,
        qty: 1,
        equipped: true,
        requires_attunement: true,
        item_kind: 'magic',
        setting_artifact_id: 'art-feather',
        artifact_live: true,
        effects: feather,
        artifact_snapshot: { name: 'Перо Везула', abilities: [{ kind: 'skill', skill_key: 'nature' }] },
        magic_mods: { abilities: {} },
      },
      {
        id: 'mask',
        name: 'Маска Лича',
        catalog_id: null,
        qty: 1,
        equipped: true,
        requires_attunement: true,
        item_kind: 'magic',
        artifact_live: true,
        effects: mask,
        artifact_snapshot: {
          abilities: [
            { kind: 'passive', bonus_target: 'ability', ability_key: 'int', max_score: 22, bonus_value: 2 },
          ],
        },
        magic_mods: { ability_max: { int: 22 }, abilities: { int: 2 } },
      },
      {
        id: 'axe',
        name: 'Секира бури',
        catalog_id: null,
        qty: 1,
        equipped: true,
        artifact_live: true,
        effects: axeModes,
        artifact_snapshot: { name: 'Секира бури' },
      },
    ],
  },
  attunements: [
    { id: 's1', item_id: 'feather', name: 'Перо Везула', notes: '' },
    { id: 's2', item_id: 'mask', name: 'Маска Лича', notes: '' },
  ],
  weapons: [
    {
      id: 'w-axe',
      name: 'Секира бури',
      source_kind: 'artifact',
      ability: 'str',
      is_proficient: true,
      damage: '1d12',
      damage_type: 'рубящий',
      source_item_id: 'axe',
      req_ability: 'str',
      req_score: 15,
      activation: {
        id: 'mode-1',
        name: 'Ярость клинка',
        action_cost: 'bonus',
        duration: '1 минута',
        duration_rounds: 10,
        active_damage: '2d12',
        active_damage_type: 'магический',
        advantage: true,
        resource_id: 'gear-res:axe:mode-1',
        base_damage: '1d12',
        base_damage_type: 'рубящий',
        text: '',
      },
      mode_active: true,
    },
  ],
  companions: [
    {
      id: 'old-claw',
      name: 'Дух предка',
      hp_max: 30,
      hp_current: 30,
      ac: 16,
      attack_bonus: 4,
      attack_damage: '1d8',
      attack_damage_type: 'некротический',
      duration: '1 минута',
      source_item_id: 'claw',
    },
  ],
}

const opened = readInventory(sheet)
const saved = inventoryToSheet(opened)
const reopened = readInventory(saved)
const featherRow = reopened.items.find((row) => row.id === 'feather')
assert(featherRow?.artifact_snapshot, 'snapshot survives save')
assert(featherRow?.setting_artifact_id === 'art-feather', 'artifact id survives save')
assert(featherRow?.effects?.some((e) => e.type === 'skill_bonus'), 'skill effect survives save')
assert(featherRow?.artifact_live === true, 'live flag survives save')
assert(reopened.items.find((row) => row.id === 'mask')?.magic_mods, 'magic_mods survive save')

const weapons = readWeapons(sheet)
assert(weapons[0]?.inventory_item_id === 'axe', 'source_item_id becomes inventory_item_id')
assert(weapons[0]?.activation?.active_damage === '2d12', 'activation survives read')
assert(weapons[0]?.req_score === 15, 'requirement survives read')
assert(weapons[0]?.mode_active === true, 'mode flag survives read')
const weaponsAgain = readWeapons({ weapons })
assert(weaponsAgain[0]?.activation?.advantage === true, 'activation survives a save roundtrip')

const companion = readCompanions(sheet.companions)[0]
assert(companion?.stats.hp_max === 30, 'legacy companion hp')
assert(companion?.stats.ac === 16, 'legacy companion ac')
assert(companion?.actions.includes('1d8'), 'legacy companion attack')
assert(companion?.notes === '1 минута', 'legacy companion duration')
assert(companion?.kind === 'ally', 'summon is an ally card')

const gear = aggregateGearEffects({
  items: opened.items,
  attunements: [
    { id: 's1', item_id: 'feather', name: 'Перо', notes: '' },
    { id: 's2', item_id: 'mask', name: 'Маска', notes: '' },
  ],
})
assert(gear.skillBonuses.nature === 2, 'feather nature')
assert(gear.skillBonuses.history === 2, 'feather history')
assert(gear.toolProficiencies.some((name) => name.includes('фальсификатора')), 'tool from effect')
assert(gear.conditionImmunities.some((row) => row.slug === 'frightened'), 'fear immunity')
assert(gear.conditionImmunities.some((row) => row.name === 'Иллюзии'), 'illusion immunity')

const shown = applyGearAbilityScores(
  { str: 16, dex: 10, con: 10, int: 20, wis: 10, cha: 10 },
  gear,
)
assert(shown.int === 22, 'lich mask raises INT 20 to 22')
const capped = applyGearAbilityScores(
  { str: 10, dex: 10, con: 10, int: 22, wis: 10, cha: 10 },
  gear,
)
assert(capped.int === 22, 'already at the ceiling is not pushed to 24')

const skill = skillModifierFromState({
  abilityMod: 5,
  proficiencyBonus: 3,
  isProficient: true,
  isExpertise: false,
})
assert(skill + (gear.skillBonuses.nature ?? 0) === 10, 'skillModFor adds the feather +2')

const clawGear = aggregateGearEffects({
  items: [
    {
      id: 'claw',
      name: 'Коготь Араха',
      catalog_id: null,
      qty: 1,
      weight_lb: null,
      equipped: true,
      armor_kind: 'none',
      base_ac: null,
      notes: '',
      effects: claw,
    },
  ],
  attunements: [],
})
assert(clawGear.companions[0]?.hpMax === 30, 'claw hp on the effect')
assert(clawGear.companions[0]?.ac === 16, 'claw ac on the effect')
assert(clawGear.companions[0]?.actions?.includes('1d8'), 'claw attack on the effect')

const legacy = hydrateArtifactSheet({
  abilities: { int: { score: 20, max_score: 22 } },
  combat: { speed: 40, ac: 15, magic_ac_bonus: 1, darkvision: 0 },
  identity: { darkvision: 60 },
  attunements: [{ id: 'a', item_id: 'mask', name: 'Маска Лича' }],
  inventory: {
    items: [
      {
        id: 'mask',
        name: 'Маска Лича',
        equipped: false,
        requires_attunement: true,
        magic_mods: { abilities: { int: 2 }, ability_max: { int: 22 }, speed: 10, ac: 1, darkvision: 60 },
        artifact_snapshot: {
          abilities: [
            {
              id: 'p',
              kind: 'passive',
              bonus_target: 'ability',
              bonus_value: 2,
              ability_key: 'int',
              max_score: 22,
            },
            { id: 'dv', kind: 'passive', bonus_target: 'darkvision', bonus_value: 60 },
            { id: 'sp', kind: 'passive', bonus_target: 'speed', bonus_value: 10 },
            { id: 'ac', kind: 'passive', bonus_target: 'ac', bonus_value: 1 },
          ],
        },
      },
    ],
  },
  weapons: [],
  companions: [],
  resources: [],
  spells: { slots: { '3': { max: 2, used: 0 } } },
})
const legacyItem = (legacy.inventory as { items: Array<Record<string, unknown>> }).items[0]
assert(Array.isArray(legacyItem.effects) && legacyItem.effects.length > 0, 'legacy effects rebuilt')
assert((legacy.abilities as { int: { score: number } }).int.score === 18, 'baked INT unbaked once')
assert((legacy.combat as { speed: number }).speed === 30, 'baked speed unbaked')
assert((legacy.combat as { darkvision: number }).darkvision === 60, 'darkvision written to combat')
assert((legacy.combat as { ac?: number }).ac == null, 'baked AC override cleared')
const twice = hydrateArtifactSheet(legacy)
assert((twice.abilities as { int: { score: number } }).int.score === 18, 'second open does not unbake again')

const wiped = hydrateArtifactSheet({
  inventory: { items: [{ id: 'x', name: 'Маска Лича', effects: [] }] },
})
assert(
  ((wiped.inventory as { items: Array<Record<string, unknown>> }).items[0].effects as unknown[]).length === 0,
  'wiped row stays empty',
)

console.log('artifactGear.selfcheck: ok')
