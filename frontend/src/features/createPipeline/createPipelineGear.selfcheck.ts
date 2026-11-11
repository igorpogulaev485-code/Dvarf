/**
 * Slice C: create draft inventory + spellbook bind.
 * Run: npx tsx src/features/createPipeline/createPipelineGear.selfcheck.ts
 */
import {
  createDraftHasUsableSpellbook,
  materializeCreatePipelineGear,
} from './createPipelineGear.ts'
import { createEmptyPipelineState } from './createPipelineTypes.ts'
import { createClassLevel } from '../../shared/dnd/classLevels.ts'
import { emptyPicks as emptyClassGrantPicks } from '../characters/classEffects.ts'
import { PHB_LINES_PACKAGE_ID } from '../../shared/dnd/classGrants.ts'
import { readSpells } from '../characters/spells.ts'
import { isSpellbookInventoryItem } from '../characters/wizardSpellbookInventory.ts'
import type { CatalogEntry } from '../../shared/api/catalog.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const wizardCatalog = {
  id: 'class-wizard',
  kind: 'class',
  slug: 'wizard',
  name_ru: 'Волшебник',
  name_en: 'Wizard',
  rules_edition: '2014',
  parent_id: null,
  source: null,
  external_ref: null,
  data: {
    hit_die: 6,
    saving_throws: ['int', 'wis'],
    skill_choices: { count: 2, from: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'] },
    armor: [],
    weapons: ['daggers', 'darts', 'slings', 'quarterstaffs', 'light_crossbows'],
    equipment_lines: [
      {
        id: 'w1',
        label_ru: 'Оружие',
        options: [
          {
            id: 'staff',
            label_ru: 'Боевой посох',
            items: [{ name: 'Боевой посох', qty: 1 }],
          },
        ],
      },
      {
        id: 'w2',
        label_ru: 'Книга',
        options: [
          {
            id: 'book',
            label_ru: 'Книга заклинаний',
            items: [{ name: 'Книга заклинаний', qty: 1 }],
          },
        ],
      },
    ],
  },
  sort_order: 0,
  is_active: true,
  created_at: '',
  updated_at: '',
} as CatalogEntry

const state = createEmptyPipelineState()
const classEntry = createClassLevel({
  name: 'Волшебник',
  level: 1,
  catalog_id: wizardCatalog.id,
})
state.classes = [classEntry]
state.classEntryId = classEntry.id
state.classGrantPicks = {
  [classEntry.id]: {
    ...emptyClassGrantPicks(),
    skills: ['arcana', 'history'],
    equipmentPackageId: PHB_LINES_PACKAGE_ID,
    equipmentLinePicks: {
      w1: { optionId: 'staff' },
      w2: { optionId: 'book' },
    },
  },
}

const gear = materializeCreatePipelineGear({
  state,
  backgroundEntry: null,
  classCatalogByEntryId: { [classEntry.id]: wizardCatalog },
  spells: readSpells({}),
  ensureWizardBook: true,
})

assert(
  gear.inventory.items.some(isSpellbookInventoryItem),
  'wizard start gear materializes spellbook item',
)
assert(
  createDraftHasUsableSpellbook({
    spells: gear.spells,
    inventory: gear.inventory,
  }),
  'spellbook bound after materialize',
)
assert(
  gear.spells.wizard_spellbook?.primaryBookItemId,
  'primaryBookItemId set',
)

// Skip gear → ensure blank book (C2).
const skipState = createEmptyPipelineState()
const skipEntry = createClassLevel({
  name: 'Волшебник',
  level: 5,
  catalog_id: wizardCatalog.id,
})
skipState.classes = [skipEntry]
skipState.classEntryId = skipEntry.id
skipState.classGrantPicks = {
  [skipEntry.id]: {
    ...emptyClassGrantPicks(),
    skills: ['arcana', 'history'],
    equipmentPackageId: 'skip',
  },
}
const skipGear = materializeCreatePipelineGear({
  state: skipState,
  backgroundEntry: null,
  classCatalogByEntryId: { [skipEntry.id]: wizardCatalog },
  spells: readSpells({}),
  ensureWizardBook: true,
})
assert(skipGear.ensuredSpellbook, 'skip gear creates blank spellbook')
assert(
  createDraftHasUsableSpellbook({
    spells: skipGear.spells,
    inventory: skipGear.inventory,
  }),
  'blank book usable after ensure',
)

console.log('createPipelineGear.selfcheck: ok')
