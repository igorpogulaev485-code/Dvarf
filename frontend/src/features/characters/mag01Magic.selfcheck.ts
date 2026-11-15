/**
 * MAG-01: magic column + bug fixes.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/mag01Magic.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  classSlugChipLabel,
  formatNamedClassQuotas,
  formatNamedKnownBudgets,
} from '../../shared/dnd/castProfiles.ts'
import { maxSpellLevelForClassAlone } from '../../shared/dnd/casterProgression.ts'
import {
  applyMetamagicToCastParams,
  listApplicableMetamagic,
  metamagicSelectionCost,
  metamagicStackOk,
} from '../../shared/dnd/metamagicCast.ts'
import { bridgeOriginPicks } from '../../shared/dnd/pack04SorcererWarlock.ts'
import { emptyFeaturePicks, getFeaturePick } from '../../shared/dnd/featurePicks.ts'
import {
  addCatalogSpellToKnown,
  countLearnedLeveledForSlug,
  countPreparedLeveled,
  countPreparedLeveledBySlug,
  prepareCapForSpell,
  canPrepareSpell,
  type SheetSpell,
} from './spells.ts'
import { resolveClassEntryIdForSubclassCommit } from '../createPipeline/resolveClassEntryIdForSubclass.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

const compact = read('src/features/characters/PlayDeskSpellsCompact.tsx')
const attacks = read('src/features/characters/PlayDeskAttacksCompact.tsx')
const createPage = read('src/pages/CreateCharacterPage.tsx')
const grimoire = read('src/features/characters/GrimoireDialog.tsx')
const castDlg = read('src/features/characters/CastSpellDialog.tsx')
const settings = read('src/features/characters/SpellsSettingsDialog.tsx')
const pack04 = read('src/shared/dnd/pack04SorcererWarlock.ts')
const tokens = read('src/styles/01-tokens-base.css')

// --- Visual contract ---
assert.match(compact, /Свернуть все/)
assert.match(compact, /Развернуть все/)
assert.match(compact, /play-desk-compact__list--scroll/)
assert.match(compact, /ритуалы из книги/)
assert.match(compact, /formatNamedClassQuotas/)
assert.match(compact, /classSlugChipLabel/)
assert.match(compact, /play-desk-compact__cast-profile--line/)
assert.doesNotMatch(compact, /play-desk-compact__meta-select/)
assert.doesNotMatch(compact, /play-desk-compact__meta-toggle/)
assert.doesNotMatch(compact, /listApplicableMetamagic/)
assert.match(compact, /aria-expanded/)
assert.match(compact, /ui-button--edge-end/)
assert.match(tokens, /ui-button--edge-end/)
assert.match(tokens, /--radius-card/)
assert.doesNotMatch(compact, /Always show every ready spell/)

// --- No sorcery duplicate under attacks ---
assert.match(attacks, /очки чародейства только в хот-панели/)
assert.match(attacks, /sorcery_points/)

// --- Book picks stamp class_slug ---
assert.match(createPage, /class_slug: 'wizard'/)
assert.match(createPage, /maxSpellLevelForClassAlone/)
assert.match(createPage, /bridgeOriginPicks/)
assert.match(createPage, /resolvedId/)

// --- Grimoire prepare scoped ---
assert.match(grimoire, /prepareCapForSpell/)
assert.match(grimoire, /countPreparedLeveledBySlug/)

// --- Cast dialog full metamagic (collapsible; no per-option «осталось») ---
assert.match(castDlg, /listKnownMetamagic/)
assert.match(castDlg, /knownMetamagic/)
assert.match(castDlg, /metamagicOpen/)
assert.match(castDlg, /metamagicDisableReason/)
assert.match(castDlg, /metamagicCostLabel/)
assert.doesNotMatch(castDlg, /осталось \$\{sorceryLeft\}/)
assert.match(castDlg, /useDistant|useCareful|useEmpowered/)

// --- Settings multiclass profiles ---
assert.match(settings, /showMultiProfiles/)
assert.match(settings, /spells-settings__profile-line/)

// --- Dragon ancestor bridge ---
assert.match(pack04, /draconic_bloodline/)
assert.match(pack04, /dragon_ancestor/)

// --- 11: book count with / without class_slug ---
const bookTagged = addCatalogSpellToKnown(
  [],
  { id: 'cat-magic-missile', name_ru: 'Волшебная стрела', data: { level: 1 } },
  {
    prepare: false,
    spellbook_acquisition: 'starting',
    in_spellbook: true,
    class_slug: 'wizard',
  },
)
assert.equal(countLearnedLeveledForSlug(bookTagged, 'wizard'), 1)

const bookLegacy: SheetSpell[] = [
  {
    id: 'legacy-book',
    name: 'Щит',
    catalog_id: 'shield',
    level: 1,
    prepared: false,
    notes: '',
    casting_time: '1 реакция',
    range: 'на себя',
    attack_or_save: '—',
    damage: '—',
    concentration: false,
    spellbook_acquisition: 'starting',
    in_spellbook: true,
  },
]
assert.equal(
  countLearnedLeveledForSlug(bookLegacy, 'wizard'),
  1,
  'legacy book rows count for wizard',
)
assert.equal(countLearnedLeveledForSlug(bookLegacy, 'bard'), 0)

// --- 12: wizard 2 alone max is 1, not shared slot 3 ---
assert.equal(maxSpellLevelForClassAlone('full', 2), 1)
assert.equal(maxSpellLevelForClassAlone('full', 5), 3)

// --- 13: no global изв. 17/5 ---
const namedKnown = formatNamedKnownBudgets(
  [
    {
      mode: 'known',
      slug: 'bard',
      labelRu: 'Бард',
      cantrips: 2,
      leveledKnown: 5,
      maxPrepared: null,
    },
    {
      mode: 'known',
      slug: 'warlock',
      labelRu: 'Колдун',
      cantrips: 2,
      leveledKnown: 2,
      maxPrepared: null,
    },
  ],
  { bard: 2, warlock: 2 },
)
assert.equal(namedKnown, 'Бард изв. 2/5 · Колдун изв. 2/2')
assert.doesNotMatch(namedKnown ?? '', /изв\. 17\//)

const mixed = formatNamedClassQuotas(
  [
    {
      mode: 'known',
      slug: 'bard',
      labelRu: 'Бард',
      cantrips: 2,
      leveledKnown: 2,
      maxPrepared: null,
    },
    {
      mode: 'prepared_list',
      slug: 'cleric',
      labelRu: 'Жрец',
      cantrips: 3,
      leveledKnown: null,
      maxPrepared: 3,
    },
    {
      mode: 'spellbook',
      slug: 'wizard',
      labelRu: 'Волшебник',
      cantrips: 3,
      leveledKnown: null,
      maxPrepared: 5,
    },
  ],
  { bard: 2, wizard: 6 },
  { cleric: 3, wizard: 1 },
  { bookCountBySlug: { wizard: 6 } },
)
assert.match(mixed ?? '', /Бард изв\. 2\/2/)
assert.match(mixed ?? '', /Жрец подг\. 3\/3/)
assert.match(mixed ?? '', /Волшебник подг\. 1\/5, в книге 6/)
assert.equal(classSlugChipLabel('wizard'), 'волшебник')

// --- 15: dragon ancestor from master picks ---
const bridged = bridgeOriginPicks({
  featurePicks: emptyFeaturePicks(),
  classEntryId: 'sorc-1',
  subclassSlug: 'draconic_bloodline',
  grantPicks: { values: { dragon_ancestor: 'red' } },
})
assert.equal(getFeaturePick(bridged, 'sorc-1', 'dragon_ancestor'), 'red')

// --- 16: paladin prepare ignores warlock known ---
const pkKnown: SheetSpell[] = [
  {
    id: 'wl-hex',
    name: 'Проклятие',
    catalog_id: 'hex',
    level: 1,
    prepared: true,
    notes: '',
    casting_time: '1 бонусное действие',
    range: '90 фт.',
    attack_or_save: '—',
    damage: '1к6 некротический',
    concentration: true,
    class_slug: 'warlock',
  },
  {
    id: 'wl-armor',
    name: 'Доспех Агатиса',
    catalog_id: 'armor_of_agathys',
    level: 1,
    prepared: true,
    notes: '',
    casting_time: '1 действие',
    range: 'на себя',
    attack_or_save: '—',
    damage: '5 временных хитов',
    concentration: false,
    class_slug: 'warlock',
  },
  {
    id: 'pal-bless',
    name: 'Благословение',
    catalog_id: 'bless',
    level: 1,
    prepared: false,
    notes: '',
    casting_time: '1 действие',
    range: '30 фт.',
    attack_or_save: '—',
    damage: '—',
    concentration: true,
    class_slug: 'paladin',
  },
]
assert.equal(countPreparedLeveled(pkKnown), 2)
assert.equal(countPreparedLeveledBySlug(pkKnown).paladin ?? 0, 0)
assert.equal(countPreparedLeveledBySlug(pkKnown).warlock ?? 0, 2)
const palCap = prepareCapForSpell(
  pkKnown[2]!,
  [
    { slug: 'paladin', maxPrepared: 4 },
    { slug: 'warlock', maxPrepared: null },
  ],
  4,
)
assert.equal(palCap.maxPrepared, 4)
assert.equal(palCap.scopeSlug, 'paladin')
assert.equal(
  canPrepareSpell(pkKnown, pkKnown[2]!, palCap.maxPrepared, { scopeSlug: palCap.scopeSlug }),
  true,
  'paladin can prepare while warlock known are prepared',
)

// --- 9: metamagic cost + distant range ---
const fireball = {
  level: 3,
  casting_time: '1 действие',
  range: '150 футов',
  duration: 'мгновенная',
  damage: '8к6 огонь',
  attack_or_save: 'спас Ловкости',
  components: { v: true, s: true, m: 'шарик гуано' },
}
const applicable = listApplicableMetamagic(
  ['distant', 'empowered', 'heightened', 'quickened', 'subtle', 'seeking'],
  fireball,
)
assert.ok(applicable.some((row) => row.id === 'distant'))
assert.ok(applicable.some((row) => row.id === 'empowered'))
assert.ok(applicable.some((row) => row.id === 'quickened'))
const distantOnly = applyMetamagicToCastParams(fireball, { distant: true })
assert.match(distantOnly.range, /300/)
assert.ok(distantOnly.notes.some((n) => /150\s*→\s*300/.test(n)))
assert.ok(!distantOnly.notes.some((n) => /касание\s*→\s*30/.test(n)))
const touchDistant = applyMetamagicToCastParams(
  { ...fireball, range: 'Касание' },
  { distant: true },
)
assert.match(touchDistant.range, /30/)
assert.ok(touchDistant.notes.some((n) => /касание\s*→\s*30/.test(n)))
assert.equal(metamagicSelectionCost({ distant: true, empowered: true }, 3), 2)
assert.equal(metamagicStackOk({ distant: true, empowered: true }), true)
assert.equal(metamagicStackOk({ distant: true, quickened: true }), false)

// --- 17: commitSubclassSetup resolves stale id (warlock / druid / paladin) ---
assert.match(createPage, /resolveClassEntryIdForSubclassCommit/)
const resolveSrc = read(
  'src/features/createPipeline/resolveClassEntryIdForSubclass.ts',
)
assert.match(resolveSrc, /subclassParentCatalogId/)
assert.equal(
  resolveClassEntryIdForSubclassCommit({
    classEntryId: 'stale',
    classes: [{ id: 'druid-1', catalog_id: 'druid-cat', subclass_name: '' }],
    preferredClassEntryId: null,
    subclassParentCatalogId: 'druid-cat',
  }),
  'druid-1',
)
assert.equal(
  resolveClassEntryIdForSubclassCommit({
    classEntryId: 'gone',
    classes: [
      { id: 'pal-1', catalog_id: 'paladin', subclass_name: '' },
      { id: 'wl-1', catalog_id: 'warlock', subclass_name: 'Архифея' },
    ],
    preferredClassEntryId: 'also-gone',
    subclassParentCatalogId: 'paladin',
  }),
  'pal-1',
)
assert.equal(
  resolveClassEntryIdForSubclassCommit({
    classEntryId: 'gone',
    classes: [{ id: 'only', catalog_id: 'x', subclass_name: null }],
  }),
  'only',
)

// --- 4a: subclass gate shows chosen name ---
const featuresPanel = read('src/features/characters/ClassFeaturesPanel.tsx')
assert.match(featuresPanel, /isSubclassGateFeature/)
assert.match(featuresPanel, /Выбрано:/)
assert.match(read('src/shared/dnd/pendingFeatureChoices.ts'), /druid_circle/)
assert.match(
  read('src/shared/dnd/classFeatures.ts'),
  /наследие драконьей крови/,
)
assert.match(
  read('src/features/characters/minimalSheet/useSheetEditorPart1.ts'),
  /resolveSubclassFeatureSlug\(row\.subclass_name\)/,
)

// --- 4b: no false «не выбрано» toast after confirm ---
assert.match(
  read('src/features/characters/CompanionCreaturePickDialog.tsx'),
  /Do not call onClose after confirm/,
)
assert.match(
  read('src/features/characters/FamiliarPickDialog.tsx'),
  /Do not call onClose after confirm/,
)

// --- Cast dialog shows changed params ---
assert.match(castDlg, /cast-metamagic-params|С метамагией/)

console.log('mag01Magic.selfcheck: ok')
