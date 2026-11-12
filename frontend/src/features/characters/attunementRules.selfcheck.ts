/**
 * npx tsx src/features/characters/attunementRules.selfcheck.ts
 * Run from frontend/.
 */
import { createClassLevel } from '../../shared/dnd/classLevels.ts'
import { createInventoryItem, type InventoryItem } from './inventory.ts'
import { createAttunementSlot, maxAttunementsForClasses } from './attunement.ts'
import { aggregateGearEffects } from './gearEffects.ts'
import {
  attunementChoiceReason,
  type AttunementCharacter,
} from './attunementRules.ts'

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

function cls(name: string, level: number) {
  return createClassLevel({ name, level })
}

assert(maxAttunementsForClasses([cls('Изобретатель', 9)]) === 3, 'artificer 9 → 3')
assert(maxAttunementsForClasses([cls('Изобретатель', 10)]) === 4, 'artificer 10 → 4')
assert(maxAttunementsForClasses([cls('Изобретатель', 14)]) === 5, 'artificer 14 → 5')
assert(maxAttunementsForClasses([cls('Изобретатель', 18)]) === 6, 'artificer 18 → 6')
assert(maxAttunementsForClasses([cls('Воин', 20)]) === 3, 'fighter 20 → 3')
assert(
  maxAttunementsForClasses([cls('Воин', 10), cls('Изобретатель', 2)]) === 3,
  'fighter 10 / artificer 2 → 3',
)

function item(partial: Partial<InventoryItem> & Pick<InventoryItem, 'name'>): InventoryItem {
  return { ...createInventoryItem(), equipped: true, requires_attunement: true, ...partial }
}

const ringA = item({
  name: 'Кольцо защиты',
  catalog_slug: 'ring_of_protection',
  effects: [{ type: 'ac_bonus', value: 1 }],
})
const ringB = item({
  name: 'Кольцо защиты',
  catalog_slug: 'ring_of_protection',
  effects: [{ type: 'ac_bonus', value: 1 }],
})
const cloak = item({
  name: 'Плащ защиты',
  catalog_slug: 'cloak_of_protection',
  effects: [{ type: 'ac_bonus', value: 1 }],
})
const devout1 = item({
  name: 'Амулет благочестия +1',
  catalog_slug: 'amulet_of_the_devout_1',
  family_slug: 'amulet_of_the_devout',
  variant_key: '1',
  attunement_classes: ['cleric', 'paladin'],
  effects: [{ type: 'spellcasting_bonus', value: 1 }],
})
const devout2 = item({
  name: 'Амулет благочестия +2',
  catalog_slug: 'amulet_of_the_devout_2',
  family_slug: 'amulet_of_the_devout',
  variant_key: '2',
  attunement_classes: ['cleric', 'paladin'],
  effects: [{ type: 'spellcasting_bonus', value: 2 }],
})
const hill = item({
  name: 'Пояс силы холмового великана',
  catalog_slug: 'belt_of_giant_strength_hill',
  family_slug: 'belt_of_giant_strength',
  variant_key: 'hill',
  single_attunement_family: true,
  effects: [{ type: 'ability_score', ability: 'str', value: 21 }],
})
const frost = item({
  name: 'Пояс силы ледяного великана',
  catalog_slug: 'belt_of_giant_strength_frost',
  family_slug: 'belt_of_giant_strength',
  variant_key: 'frost',
  single_attunement_family: true,
  effects: [{ type: 'ability_score', ability: 'str', value: 23 }],
})
const iounStr = item({
  name: 'Камень Иоун (силы)',
  catalog_slug: 'ioun_stone_strength',
  family_slug: 'ioun_stone',
  effects: [{ type: 'ability_mod', ability: 'str', value: 2, max: 20 }],
})
const iounInt = item({
  name: 'Камень Иоун (интеллекта)',
  catalog_slug: 'ioun_stone_intellect',
  family_slug: 'ioun_stone',
  effects: [{ type: 'ability_mod', ability: 'int', value: 2, max: 20 }],
})
const hammer = item({
  name: 'Метательный молот дварфов',
  catalog_slug: 'dwarven_thrower',
  attunement_races: ['dwarf'],
  effects: [{ type: 'attack_bonus', value: 3 }],
})
const staff = item({
  name: 'Посох силы',
  catalog_slug: 'staff_of_power',
  attunement_classes: ['sorcerer', 'warlock', 'wizard'],
  effects: [{ type: 'ac_bonus', value: 2 }],
})

const fighter: AttunementCharacter = {
  classes: [cls('Воин', 5)],
  raceCatalogId: 'human',
  raceSlug: 'human',
  raceParentSlug: null,
  alignmentSlug: 'lawful_good',
  alignmentUnresolved: false,
}
const cleric: AttunementCharacter = { ...fighter, classes: [cls('Жрец', 3)] }
const dwarf: AttunementCharacter = {
  ...fighter,
  raceCatalogId: 'hill',
  raceSlug: 'hill_dwarf',
  raceParentSlug: 'dwarf',
}
const human: AttunementCharacter = fighter
const thief: AttunementCharacter = {
  ...fighter,
  classes: [cls('Плут', 13)],
  raceCatalogId: null,
  raceSlug: null,
}
thief.classes[0]!.subclass_name = 'Вор'

const slot = createAttunementSlot({ id: 'slot' })
const hillSlot = createAttunementSlot({ id: 'hill', item_id: hill.id, name: hill.name })
const devoutSlot = createAttunementSlot({ id: 'devout', item_id: devout1.id, name: devout1.name })
const ringSlot = createAttunementSlot({ id: 'ring', item_id: ringA.id, name: ringA.name })

const frostBlock = attunementChoiceReason({
  item: frost,
  slots: [hillSlot, slot],
  items: [hill, frost],
  currentSlotId: slot.id,
  character: fighter,
})
assert(frostBlock.blocked, 'second giant belt blocked')
assert(
  (frostBlock.reason || '').includes('Уже настроен предмет этого вида'),
  'family hint names the attuned belt',
)

const secondRing = attunementChoiceReason({
  item: ringB,
  slots: [ringSlot, slot],
  items: [ringA, ringB],
  currentSlotId: slot.id,
  character: fighter,
})
assert(secondRing.blocked, 'second ring of protection blocked')

const cloakOk = attunementChoiceReason({
  item: cloak,
  slots: [ringSlot, slot],
  items: [ringA, cloak],
  currentSlotId: slot.id,
  character: fighter,
})
assert(!cloakOk.blocked, 'cloak of protection still stacks')

const secondDevout = attunementChoiceReason({
  item: devout2,
  slots: [devoutSlot, slot],
  items: [devout1, devout2],
  currentSlotId: slot.id,
  character: cleric,
})
assert(secondDevout.blocked, 'devout +1 and +2 cannot both be attuned')

const bothIoun = attunementChoiceReason({
  item: iounInt,
  slots: [createAttunementSlot({ item_id: iounStr.id, name: iounStr.name }), slot],
  items: [iounStr, iounInt],
  currentSlotId: slot.id,
  character: fighter,
})
assert(!bothIoun.blocked, 'different ioun stones attune together')

assert(
  attunementChoiceReason({
    item: hammer,
    slots: [slot],
    items: [hammer],
    currentSlotId: slot.id,
    character: dwarf,
  }).blocked === false,
  'hill dwarf attunes the thrower',
)
assert(
  attunementChoiceReason({
    item: hammer,
    slots: [slot],
    items: [hammer],
    currentSlotId: slot.id,
    character: human,
  }).blocked,
  'human cannot attune the thrower',
)
const freeRace = attunementChoiceReason({
  item: hammer,
  slots: [slot],
  items: [hammer],
  currentSlotId: slot.id,
  character: { ...fighter, raceCatalogId: null, raceSlug: null },
})
assert(!freeRace.blocked && Boolean(freeRace.hint), 'free-text race is a hint, not a ban')

assert(
  attunementChoiceReason({
    item: devout1,
    slots: [slot],
    items: [devout1],
    currentSlotId: slot.id,
    character: fighter,
  }).blocked,
  'fighter cannot attune the devout amulet',
)
assert(
  attunementChoiceReason({
    item: staff,
    slots: [slot],
    items: [staff],
    currentSlotId: slot.id,
    character: fighter,
  }).blocked,
  'fighter cannot attune staff of power',
)
assert(
  attunementChoiceReason({
    item: staff,
    slots: [slot],
    items: [staff],
    currentSlotId: slot.id,
    character: cleric,
  }).blocked,
  'cleric is not a staff of power class',
)
assert(
  !attunementChoiceReason({
    item: devout1,
    slots: [slot],
    items: [devout1],
    currentSlotId: slot.id,
    character: cleric,
  }).blocked,
  'cleric attunes the devout amulet',
)
assert(
  !attunementChoiceReason({
    item: staff,
    slots: [slot],
    items: [staff],
    currentSlotId: slot.id,
    character: thief,
  }).blocked,
  'thief 13 ignores the class requirement',
)

const bothRingsOn = aggregateGearEffects({
  items: [ringA, ringB],
  attunements: [
    createAttunementSlot({ item_id: ringA.id, name: ringA.name }),
    createAttunementSlot({ item_id: ringB.id, name: ringB.name }),
  ],
  gate: fighter,
})
assert(bothRingsOn.acBonus === 1, 'second copy adds no AC')

const ringAndCloak = aggregateGearEffects({
  items: [ringA, cloak],
  attunements: [
    createAttunementSlot({ item_id: ringA.id, name: ringA.name }),
    createAttunementSlot({ item_id: cloak.id, name: cloak.name }),
  ],
  gate: fighter,
})
assert(ringAndCloak.acBonus === 2, 'ring and cloak still add')

const pearl = item({
  name: 'Жемчужина силы',
  catalog_slug: 'pearl_of_power',
  attunement_spellcaster: true,
  effects: [{ type: 'ac_bonus', value: 1 }],
})

function who(name: string, level: number, subclass = ''): AttunementCharacter {
  const row = cls(name, level)
  if (subclass) row.subclass_name = subclass
  return { ...fighter, classes: [row] }
}

function pearlGate(character: AttunementCharacter) {
  return attunementChoiceReason({
    item: pearl,
    slots: [slot],
    items: [pearl],
    currentSlotId: slot.id,
    character,
  })
}

assert(pearlGate(fighter).blocked, 'fighter cannot attune a spellcaster item')
assert(
  (pearlGate(fighter).reason || '').includes('заклинания'),
  'spellcaster hint names spellcasting',
)
assert(!pearlGate(who('Волшебник', 1)).blocked, 'wizard 1 attunes')
assert(!pearlGate(who('Изобретатель', 1)).blocked, 'artificer 1 attunes')
assert(pearlGate(who('Паладин', 1)).blocked, 'paladin 1 is not a caster yet')
assert(!pearlGate(who('Паладин', 2)).blocked, 'paladin 2 attunes')
assert(!pearlGate(who('Следопыт', 2)).blocked, 'ranger 2 attunes')
assert(pearlGate(who('Воин', 2, 'Мистический рыцарь')).blocked, 'eldritch knight 2 is early')
assert(!pearlGate(who('Воин', 3, 'Мистический рыцарь')).blocked, 'eldritch knight 3 attunes')
assert(!pearlGate(who('Плут', 3, 'Плут-трюкач')).blocked, 'arcane trickster 3 attunes')
assert(!pearlGate(thief).blocked, 'thief 13 ignores the spellcaster gate')

const fighterHoldsPearl = aggregateGearEffects({
  items: [pearl],
  attunements: [createAttunementSlot({ item_id: pearl.id, name: pearl.name })],
  gate: fighter,
})
assert(fighterHoldsPearl.acBonus === 0, 'a blocked spellcaster item grants nothing')
const wizardHoldsPearl = aggregateGearEffects({
  items: [pearl],
  attunements: [createAttunementSlot({ item_id: pearl.id, name: pearl.name })],
  gate: who('Волшебник', 5),
})
assert(wizardHoldsPearl.acBonus === 1, 'a wizard keeps the pearl bonus')

const orcsplitter = item({
  name: 'Рассекатель орков',
  catalog_slug: 'orcsplitter',
  attunement_alternatives: [
    { races: ['dwarf'] },
    { classes: ['fighter'] },
    { classes: ['paladin'], alignments: ['good'] },
  ],
  effects: [{ type: 'attack_bonus', value: 2 }],
})
const scissors = item({
  name: 'Ножницы, отсекающие тени',
  catalog_slug: 'scissors_of_shadow_snipping',
  attunement_alternatives: [
    { races: ['fairy', 'satyr', 'centaur'] },
    { spellcaster: true },
  ],
  effects: [{ type: 'custom_note', text: 'тень' }],
})

function gate(subject: InventoryItem, character: AttunementCharacter) {
  return attunementChoiceReason({
    item: subject,
    slots: [slot],
    items: [subject],
    currentSlotId: slot.id,
    character,
  })
}

const evilPaladin: AttunementCharacter = {
  ...fighter,
  classes: [cls('Паладин', 5)],
  alignmentSlug: 'lawful_evil',
}
const goodPaladin: AttunementCharacter = { ...evilPaladin, alignmentSlug: 'lawful_good' }
const dwarfWizard: AttunementCharacter = {
  ...dwarf,
  classes: [cls('Волшебник', 5)],
  alignmentSlug: 'neutral',
}
const fairy: AttunementCharacter = {
  ...fighter,
  classes: [cls('Варвар', 3)],
  raceCatalogId: 'fairy',
  raceSlug: 'fairy',
  raceParentSlug: null,
}

assert(!gate(orcsplitter, fighter).blocked, 'fighter attunes Orcsplitter')
assert(!gate(orcsplitter, dwarfWizard).blocked, 'dwarf attunes Orcsplitter')
assert(!gate(orcsplitter, goodPaladin).blocked, 'good paladin attunes Orcsplitter')
assert(gate(orcsplitter, evilPaladin).blocked, 'evil paladin does not attune Orcsplitter')
assert(gate(orcsplitter, who('Волшебник', 5)).blocked, 'human wizard does not attune Orcsplitter')
assert(!gate(orcsplitter, { ...thief, alignmentSlug: 'chaotic_evil' }).blocked, 'thief 13 bypasses race and class')
assert(!gate(scissors, fairy).blocked, 'fairy attunes the scissors')
assert(!gate(scissors, who('Волшебник', 1)).blocked, 'spellcaster attunes the scissors')
assert(gate(scissors, fighter).blocked, 'fighter does not attune the scissors')
assert(!gate(scissors, thief).blocked, 'thief 13 bypasses fey and spellcaster')
assert(
  !gate(hammer, dwarf).blocked,
  'a plain race gate still works beside the OR rules',
)

console.log('attunementRules.selfcheck: ok')
