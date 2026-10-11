/**
 * Lightweight self-check: npx --yes tsx src/shared/dnd/subclassGrants.selfcheck.ts
 * Run from frontend/.
 */
import {
  parseSubclassGrantDef,
  subclassNeedsSetupDialog,
} from './subclassGrants'

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

const moon = parseSubclassGrantDef({
  slug: 'circle_of_the_moon',
  nameRu: 'Круг луны',
  parentSlug: 'druid',
  catalogData: {
    parent_slug: 'druid',
    sheet_grants: {},
    choices: [],
    features_by_level: {
      '2': [{ title_ru: 'Облик луны', summary_ru: 'CR выше' }],
    },
  },
})
assert(moon, 'moon def parses')
assert(!subclassNeedsSetupDialog(moon), 'Moon: no dialog (empty choices)')

const wildfire = parseSubclassGrantDef({
  slug: 'circle_of_wildfire',
  nameRu: 'Круг дикого огня',
  parentSlug: 'druid',
  catalogData: {
    parent_slug: 'druid',
    sheet_grants: {},
    choices: [
      {
        id: 'wildfire_spirit',
        label_ru: 'Дух дикого огня',
        kind: 'open_text',
        count: 1,
        from: [],
        applies_to: 'companion',
        required: false,
        notes_ru: 'Имя духа — карточка спутника.',
      },
    ],
  },
})
assert(wildfire, 'wildfire def parses')
assert(
  !subclassNeedsSetupDialog(wildfire),
  'Wildfire: optional spirit name must not open SubclassSetup',
)

const land = parseSubclassGrantDef({
  slug: 'circle_of_the_land',
  nameRu: 'Круг земли',
  parentSlug: 'druid',
  catalogData: {
    parent_slug: 'druid',
    sheet_grants: {},
    choices: [
      {
        id: 'land_type',
        label_ru: 'Земля круга',
        kind: 'single',
        count: 1,
        from: ['forest', 'arctic'],
        applies_to: 'later_spells',
        required: true,
      },
    ],
  },
})
assert(land, 'land def parses')
assert(subclassNeedsSetupDialog(land), 'Land: required land_type opens dialog')

const champion = parseSubclassGrantDef({
  slug: 'champion',
  nameRu: 'Чемпион',
  parentSlug: 'fighter',
  catalogData: {
    parent_slug: 'fighter',
    sheet_grants: {},
    choices: [],
    notes_ru: 'Без развилок владений.',
  },
})
assert(champion, 'champion def parses')
assert(!subclassNeedsSetupDialog(champion), 'Champion: empty choices skip dialog')

console.log('subclassGrants.selfcheck: ok')
