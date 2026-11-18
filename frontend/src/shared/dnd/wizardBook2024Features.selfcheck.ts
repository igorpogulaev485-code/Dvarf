/** Run: npx tsx --tsconfig tsconfig.app.json src/shared/dnd/wizardBook2024Features.selfcheck.ts */
import assert from 'node:assert/strict'
import {
  bladesongBonuses2024,
  enchantingConversationalistChoice2024,
  enchantingOratorSkillBonus2024,
  isM02bWizardBookSubclass,
  readEnchantingOratorSkill,
  regainOneBladesongUse2024,
  songOfDefenseReduce2024,
  trainingInWarAndSongChoice2024,
  wizardBookSkillGrants2024,
} from './wizardBook2024Features'
import { featureResourceId } from './featureResources'
import { emptyFeaturePicks, setFeaturePick } from './featurePicks'

assert.equal(isM02bWizardBookSubclass('wizard__bladesinger'), true)
assert.equal(isM02bWizardBookSubclass('wizard__evoker'), false)
assert.equal(enchantingConversationalistChoice2024.options.length, 3)
assert.equal(trainingInWarAndSongChoice2024.options.length, 4)

const entry = 'w1'
let picks = emptyFeaturePicks()
picks = setFeaturePick(picks, entry, 'enchanting-conversationalist', 'persuasion')
assert.equal(readEnchantingOratorSkill(picks, entry), 'persuasion')
assert.equal(
  enchantingOratorSkillBonus2024({
    subclassSlug: 'wizard__enchanter',
    classEntryId: entry,
    featurePicks: picks,
    wizardLevel: 3,
    intelligenceScore: 16,
    skillKey: 'persuasion',
  }),
  3,
)
assert.equal(
  enchantingOratorSkillBonus2024({
    subclassSlug: 'wizard__enchanter',
    classEntryId: entry,
    featurePicks: picks,
    wizardLevel: 3,
    intelligenceScore: 16,
    skillKey: 'deception',
  }),
  0,
)

picks = setFeaturePick(picks, entry, 'training-in-war-and-song', 'acrobatics')
assert.deepEqual(
  wizardBookSkillGrants2024({
    subclassSlug: 'wizard__bladesinger',
    classEntryId: entry,
    featurePicks: picks,
    wizardLevel: 3,
  }),
  ['acrobatics'],
)

const songId = featureResourceId('wizard', 'bladesong', entry)
const inactive = bladesongBonuses2024({
  rulesEdition: '2024',
  subclassSlug: 'wizard__bladesinger',
  resources: [{ id: songId, name: 'Песнь', max: 3, used: 0 }],
  intelligenceScore: 16,
  wizardLevel: 3,
})
assert.equal(inactive.active, false)

const active = bladesongBonuses2024({
  rulesEdition: '2024',
  subclassSlug: 'wizard__bladesinger',
  resources: [{ id: songId, name: 'Песнь', max: 3, used: 1, activeLabel: 'Песнь клинка' }],
  intelligenceScore: 16,
  wizardLevel: 3,
})
assert.equal(active.active, true)
assert.equal(active.ac, 3)
assert.equal(active.speed, 10)
assert.equal(active.concentrationSave, 3)
assert.equal(active.acrobaticsAdvantage, true)
assert.equal(active.weaponAbility, 'int')

const empty2014 = bladesongBonuses2024({
  rulesEdition: '2014',
  subclassSlug: 'wizard__bladesinger',
  resources: [{ id: songId, name: 'Песнь', max: 3, used: 1, activeLabel: 'Песнь клинка' }],
  intelligenceScore: 16,
  wizardLevel: 3,
})
assert.equal(empty2014.active, false, '2014 must not use 2024 bladesong helper')

assert.equal(songOfDefenseReduce2024(3), 15)

const regained = regainOneBladesongUse2024(
  [{ id: songId, name: 'Песнь', max: 3, used: 2, activeLabel: 'Песнь клинка' }],
  entry,
)
assert.equal(regained[0]!.used, 1)

console.log('wizardBook2024Features.selfcheck ok')
