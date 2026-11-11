/**
 * Run: npx --yes tsx src/shared/dnd/bardCollege.selfcheck.ts
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { unlockFeaturesForClasses } from './classFeatures.ts'
import { createClassLevel } from './classLevels.ts'
import {
  formatSpiritTaleToast,
  hitDieHealWithSong,
  isSpiritSessionSchool,
  performanceGpCap,
  performanceSizeAllowed,
  silverTongueApplies,
  songOfRestDie,
  spiritSessionMaxSpellLevel,
  spiritTaleByRoll,
  spiritualFocusDie,
} from './bardCollege.ts'
import { bridgeSwordsFightingStyle } from './swordsFightingStyleBridge.ts'
import { emptyFeaturePicks, getFeaturePick } from './featurePicks.ts'
import { formatSkillRoll } from '../../features/characters/deskRolls.ts'
import { countLearnedLeveled } from '../../features/characters/spells.ts'
import { readSpells } from '../../features/characters/spells.ts'
import { syncMagicalSecrets } from '../../features/characters/bardSecretsSync.ts'
import { setFeaturePick } from './featurePicks.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const bard = createClassLevel({
  id: 'b1',
  name: 'Бард',
  level: 20,
  subclass_name: 'Коллегия духов',
})
const features = unlockFeaturesForClasses({
  classes: [bard],
  characterLevel: 20,
  subclassSlugByEntryId: { b1: 'college_of_spirits' },
})
const focus = features.find((row) => row.id === 'spiritual_focus')
assert(focus?.scaleValue === '+1к6', `focus die ${focus?.scaleValue}`)
assert(!focus?.summary_ru.includes('к8'), 'focus text still promises d8')
assert(spiritualFocusDie(20) === 6 && spiritualFocusDie(5) === null, 'focus helper')

const song = songOfRestDie(features)
assert(song?.sides === 12, `song die ${song?.sides}`)
assert(hitDieHealWithSong(7, 5) === 12, 'song adds a separate die')

assert(silverTongueApplies('persuasion', true), 'persuasion')
assert(!silverTongueApplies('athletics', true), 'not athletics')
const tongue = formatSkillRoll('Убеждение', 7, 'normal', () => 0.3, null, {
  value: 10,
  label: 'серебряный язык',
})
// rng 0.3 -> d20 = 7. Floor to 10, total 17.
assert(tongue.includes('17'), tongue)
assert(tongue.includes('d20:10'), tongue)

assert(spiritTaleByRoll(1)?.nameRu.includes('звере'), 'tale 1')
assert(spiritTaleByRoll(12)?.nameRu.includes('разума'), 'tale 12')
const toast = formatSpiritTaleToast({
  sides: 8,
  rolls: [7],
  chosen: spiritTaleByRoll(7)!,
})
assert(/\(1d8: 7\)/.test(toast), toast)

assert(spiritSessionMaxSpellLevel({ participants: 2, bardLevel: 6 }) === 2, 'session cap')
assert(spiritSessionMaxSpellLevel({ participants: 6, bardLevel: 6 }) === 3, 'session bard cap')
assert(isSpiritSessionSchool('necromancy'), 'necro school')
assert(!isSpiritSessionSchool('evocation'), 'not evocation')

assert(performanceGpCap(3) === 60, 'gp at 3')
assert(performanceGpCap(14) === null, 'no gp cap at 14')
assert(!performanceSizeAllowed(3, 'large'), 'large waits for 14')
assert(performanceSizeAllowed(14, 'large'), 'large at 14')

const bridged = bridgeSwordsFightingStyle({
  featurePicks: emptyFeaturePicks(),
  classEntryId: 'b1',
  styleId: 'two_weapon_fighting',
})
assert(
  getFeaturePick(bridged, 'b1', 'bonus_proficiencies_swords') === 'two_weapon_fighting',
  'style bridged',
)

const secrets = syncMagicalSecrets({
  spells: readSpells({}),
  featurePicks: setFeaturePick(
    setFeaturePick(emptyFeaturePicks(), 'b1', 'additional_magical_secrets', 'fireball'),
    'b1',
    'magical_secrets_10',
    'counterspell',
  ),
  classes: [{ id: 'b1', name: 'Бард', level: 10 }],
})
const fireball = secrets.spells.known.find((row) => row.name.includes('шар') || row.catalog_id)
assert(secrets.spells.known.length === 2, `secrets rows ${secrets.spells.known.length}`)
const extra = secrets.spells.known.find((row) => row.id.includes('additional_magical_secrets'))
const general = secrets.spells.known.find((row) => row.id.includes('magical_secrets_10'))
assert(extra?.prepared_locked === true, 'lore secrets outside known')
assert(general?.prepared_locked !== true, 'general secrets count')
assert(countLearnedLeveled(secrets.spells.known) === 1, 'only general secret counts')
assert(fireball, 'catalog row present')

const here = dirname(fileURLToPath(import.meta.url))
const catalog = JSON.parse(readFileSync(join(here, '../../../public/spells-2014.json'), 'utf8')) as Array<{
  slug: string
  data: { classes?: string[]; attack_or_save?: string; source_book?: string; school?: string }
}>
const bySlug = new Map(catalog.map((row) => [row.slug, row.data]))
assert(bySlug.get('antipathy_sympathy')?.classes?.includes('bard'), 'antipathy on bard')
assert(!bySlug.get('prismatic_spray')?.classes?.includes('bard'), 'spray is not a bard spell')
assert(!bySlug.get('prismatic_wall')?.classes?.includes('bard'), 'wall is not a bard spell')
assert(bySlug.get('light')?.attack_or_save === 'ЛОВ', 'light keeps the PHB dex save')
assert(bySlug.get('thunderclap')?.source_book === 'XGE', 'thunderclap stays XGE')
assert(bySlug.get('earth_tremor')?.source_book === 'XGE', 'earth tremor stays XGE')
assert(bySlug.get('detect_thoughts')?.attack_or_save === 'МУД', 'detect thoughts wis')
assert(bySlug.get('revivify')?.school === 'necromancy', 'revivify necromancy')

console.log('bard college selfcheck ok')
