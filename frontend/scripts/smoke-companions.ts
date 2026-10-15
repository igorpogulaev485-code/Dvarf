/** Naparniki / companions model: HP lifecycle, revoke, name merge, templates. */
import {
  applyHpChange,
  companionAllowsAvatar,
  createCompanion,
  dealDamageToSelfForm,
  dismissSelfForm,
  dismissSelfFormsOnRest,
  formSourceBadgeRu,
  getActiveSelfForm,
  isCompanionDead,
  isCompanionStable,
  isSelfForm,
  mergeSubclassCompanions,
  normalizeSelfForms,
  readCompanions,
  resetCompanionResourcesOnRest,
  restoreCompanion,
  revokeCompanionsForSubclass,
  setCompanionActive,
  setPrimaryCompanion,
  sortCompanionsForDisplay,
} from '../src/features/characters/companions.ts'
import {
  createKnownForm,
  readKnownForms,
  upsertKnownForm,
} from '../src/features/characters/knownForms.ts'
import {
  companionFromTemplate,
  resolveCompanionTemplate,
  resolveSpellCompanionTemplate,
} from '../src/features/characters/companionTemplates.ts'
import {
  applyConcentrationChangeToCompanions,
  applySpellCastToCompanions,
  isSpellNaparnikCast,
  resolveSpellNaparnikSlug,
} from '../src/features/characters/spellCompanions.ts'
import { createSheetSpell } from '../src/features/characters/spells.ts'
import {
  applyBeastWildShape,
  applyStarryForm,
  applyWildCompanion,
  applyWildfireSpirit,
  beastPickAllowed,
  crAllowed,
  isWildShapeForkFeature,
  resolveWildShapeOptions,
  symbioticTempHp,
  wildShapeLimits,
} from '../src/features/characters/wildShape.ts'
import type { UnlockedFeature } from '../src/shared/dnd/classFeatures.ts'
import type { SheetResource } from '../src/shared/dnd/rest.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const dog = createCompanion({
  kind: 'other',
  nature: 'living',
  name: 'Рекс',
  stats: { hp: 11, hp_max: 11, ac: 12, speed: 40 },
  source: { kind: 'manual', labelRu: 'Вручную' },
})
assert(dog.active, 'dog starts active')
assert(dog.bestiary_ref === null, 'no bestiary yet')

const dying = applyHpChange(dog, 0)
assert(!dying.active, '0 HP deactivates')
assert(dying.death != null, 'living gets death track')
assert(!isCompanionDead(dying), 'not dead yet')

const stable = {
  ...dying,
  death: { successes: 3, failures: 1 },
}
assert(isCompanionStable(stable), '3 successes = stable')

const dead = {
  ...dying,
  death: { successes: 1, failures: 3 },
}
assert(isCompanionDead(dead), '3 fails = dead')
assert(setCompanionActive(dead, true).active === false, 'cannot activate dead')

const healed = applyHpChange(dying, 5)
assert(healed.death == null, 'heal clears death')
assert(healed.active, 'heal reactivates')

const revived = applyHpChange(dead, 1)
assert(revived.active && revived.death == null, 'setting HP>0 clears dead state')

const cannon = createCompanion({
  kind: 'eldritch_cannon',
  name: 'Гвоздь',
  stats: { hp: 5, hp_max: 5, ac: 18, speed: 0 },
})
assert(cannon.nature === 'construct', 'cannon is construct')
const down = applyHpChange(cannon, 0)
assert(!down.active && down.death == null, 'construct dismisses without death saves')
const back = restoreCompanion(down)
assert(back.active && back.stats.hp === 5, 'restore summon/construct')

const legacy = readCompanions([
  {
    id: 'legacy-1',
    kind: 'drake',
    name: 'Искорка',
    catalog_ref: 'old-catalog-id',
    source: {
      classEntryId: 'cls-1',
      subclassSlug: 'drakewarden',
      feature: 'drake_companion',
    },
    stats: { hp: 20, ac: 14, speed: 40 },
    notes: '',
  },
])
assert(legacy[0]?.source?.kind === 'subclass', 'legacy source migrates')
assert(legacy[0]?.bestiary_ref === 'old-catalog-id', 'catalog_ref → bestiary_ref')
assert(legacy[0]?.nature === 'living', 'drake default living')
assert(legacy[0]?.name === 'Искорка', 'name kept')

const kept = createCompanion({
  kind: 'other',
  name: 'Собака партии',
  source: { kind: 'manual', labelRu: 'Вручную' },
})
const granted = createCompanion({
  kind: 'beast_companion',
  name: 'beast_of_the_land',
  source: {
    kind: 'subclass',
    labelRu: 'Архетип: Повелитель зверей',
    classEntryId: 'cls-1',
    subclassSlug: 'beast_master',
    feature: 'companion_type',
  },
})
const afterRevoke = revokeCompanionsForSubclass(
  [kept, granted],
  'cls-1',
  'beast_master',
)
assert(afterRevoke.length === 1 && afterRevoke[0]?.name === 'Собака партии', 'manual survives revoke')

const previousNamed = createCompanion({
  id: 'stable-id',
  kind: 'beast_companion',
  name: 'Волчок',
  bestiary_ref: 'bestiary-uuid',
  bestiary_name_ru: 'Волк',
  stats: { hp: 7, hp_max: 15, ac: 13, speed: 40 },
  notes: 'любит сыр',
  source: {
    kind: 'subclass',
    labelRu: 'Архетип: Повелитель зверей',
    classEntryId: 'cls-1',
    subclassSlug: 'beast_master',
    feature: 'companion_type',
  },
})
const land = resolveCompanionTemplate({
  choiceId: 'companion_type',
  pickValue: 'beast_of_the_land',
  ctx: { hostClassLevel: 5, characterLevel: 5 },
})
assert(land != null, 'land template')
assert(land!.stats.hp_max === 30, '5+5*5 HP')
assert(land!.stats.ac === 16, '13+PB3')

const reapplied = companionFromTemplate({
  template: land!,
  name: 'beast_of_the_land',
  source: {
    kind: 'subclass',
    labelRu: 'Архетип: Повелитель зверей',
    classEntryId: 'cls-1',
    subclassSlug: 'beast_master',
    feature: 'companion_type',
  },
})
const merged = mergeSubclassCompanions({
  previous: [previousNamed],
  next: [reapplied],
})
assert(merged[0]?.id === 'stable-id', 'id stable')
assert(merged[0]?.name === 'Волчок', 'custom name not overwritten')
assert(merged[0]?.stats.hp === 7, 'current HP kept')
assert(merged[0]?.stats.hp_max === 30, 'template refreshes hp_max')
assert(merged[0]?.bestiary_ref === 'bestiary-uuid', 'bestiary_ref kept')
assert(merged[0]?.notes === 'любит сыр', 'notes kept')

const defender = resolveCompanionTemplate({
  choiceId: 'steel_defender_name',
  pickValue: 'Гвоздь',
  ctx: { hostClassLevel: 3, characterLevel: 3, hostIntMod: 3 },
})
assert(defender?.kind === 'steel_defender', 'defender kind')
assert(defender?.stats.hp_max === 2 + 3 + 15, 'steel HP formula')

const ballista = resolveCompanionTemplate({
  choiceId: 'eldritch_cannon',
  pickValue: 'force_ballista',
  ctx: { hostClassLevel: 3, characterLevel: 3 },
})
assert(ballista?.stats.hp_max === 15, 'cannon HP 5*level')
assert(ballista?.stats.ac === 18, 'cannon AC 18')

const familiarSpell = {
  ...createSheetSpell(),
  name: 'Поиск фамильяра',
  level: 1,
  ritual: true,
}
assert(resolveSpellNaparnikSlug(familiarSpell) === 'find_familiar', 'familiar slug')
assert(isSpellNaparnikCast(familiarSpell), 'familiar is naparnik cast')
assert(
  !isSpellNaparnikCast({ ...createSheetSpell(), name: 'Духовное оружие', level: 2 }),
  'spiritual weapon excluded',
)
assert(
  !isSpellNaparnikCast({ ...createSheetSpell(), name: 'Conjure Barrage', level: 3 }),
  'barrage excluded',
)

const afterFamiliar = applySpellCastToCompanions({
  companions: [],
  spell: familiarSpell,
  slotLevel: 1,
})
assert(afterFamiliar != null, 'creates familiar card')
assert(afterFamiliar!.companions[0]?.kind === 'familiar', 'kind familiar')
assert(afterFamiliar!.companions[0]?.nature === 'summoned', 'summoned')
assert(afterFamiliar!.companions[0]?.source?.kind === 'spell', 'source spell')

const named = {
  ...afterFamiliar!.companions[0]!,
  name: 'Тень',
  stats: { hp: 0, hp_max: 2, ac: 12, speed: 40 },
  active: false,
}
const recast = applySpellCastToCompanions({
  companions: [named],
  spell: familiarSpell,
  slotLevel: 1,
})
assert(recast?.refreshed === true, 'recast refreshes')
assert(recast?.companions[0]?.name === 'Тень', 'keeps nickname')
assert(recast?.companions[0]?.active === true, 'reactivates')
assert(recast?.companions[0]?.stats.hp === 2, 'restores to template hp_max')

const animals = applySpellCastToCompanions({
  companions: recast!.companions,
  spell: { ...createSheetSpell(), name: 'Призыв животных', level: 3, concentration: true },
  slotLevel: 5,
})
assert(animals?.companions.length === 2, 'second spell adds second card')
assert(animals?.companions.some((c) => c.name === 'Призванные звери'), 'animals card')

const animalsSpell = {
  ...createSheetSpell(),
  id: 'spell-animals-1',
  name: 'Призыв животных',
  level: 3,
  concentration: true,
}
const castAnimals = applySpellCastToCompanions({
  companions: [],
  spell: animalsSpell,
  slotLevel: 3,
})
assert(castAnimals?.companions[0]?.source?.spellId === 'spell-animals-1', 'stores spellId')
const afterConcEnd = applyConcentrationChangeToCompanions({
  companions: castAnimals!.companions,
  previous: { spell_id: 'spell-animals-1', name: 'Призыв животных' },
  next: null,
})
assert(afterConcEnd.dismissedNames.length === 1, 'dismisses on concentration end')
assert(afterConcEnd.companions[0]?.active === false, 'inactive')
assert(afterConcEnd.companions[0]?.stats.hp === 0, 'hp 0')

const familiarKept = applySpellCastToCompanions({
  companions: afterConcEnd.companions,
  spell: { ...createSheetSpell(), id: 'fam-1', name: 'Поиск фамильяра', level: 1 },
  slotLevel: 1,
})
const clearOtherConc = applyConcentrationChangeToCompanions({
  companions: familiarKept!.companions,
  previous: { spell_id: 'spell-animals-1', name: 'Призыв животных' },
  next: null,
})
assert(
  clearOtherConc.companions.some((c) => c.kind === 'familiar' && c.active),
  'familiar not dismissed by unrelated conc clear',
)

const switchConc = applyConcentrationChangeToCompanions({
  companions: castAnimals!.companions.map((c) => ({
    ...c,
    active: true,
    stats: { ...c.stats, hp: 10 },
  })),
  previous: { spell_id: 'spell-animals-1', name: 'Призыв животных' },
  next: { spell_id: 'other-spell', name: 'Удержание личности' },
})
assert(switchConc.dismissedNames.length === 1, 'dismiss on concentration switch')

const beastSpirit = resolveSpellCompanionTemplate({
  slug: 'summon_beast',
  ctx: { hostClassLevel: 5, characterLevel: 5, spellMod: 4, slotLevel: 4 },
})
assert(beastSpirit != null, 'summon beast template')
assert(beastSpirit!.stats.ac === 11 + 4, 'AC 11+slot')
assert(beastSpirit!.stats.hp_max === 30 + 5 * 2, 'HP 30+5×above2')
assert(beastSpirit!.actions.includes('+7'), 'spell attack PB3+mod4')

const castBeast = applySpellCastToCompanions({
  companions: [],
  spell: {
    ...createSheetSpell(),
    id: 'sb-1',
    name: 'Призыв духа зверя',
    level: 2,
    concentration: true,
  },
  slotLevel: 4,
  characterLevel: 5,
  spellMod: 4,
})
assert(castBeast?.companions[0]?.stats.hp_max === 40, 'cast applies HP')
assert(castBeast?.companions[0]?.stats.ac === 15, 'cast applies AC')

const withRepair = companionFromTemplate({
  template: resolveCompanionTemplate({
    choiceId: 'steel_defender_name',
    pickValue: 'Гвоздь',
    ctx: { hostClassLevel: 3, characterLevel: 3, hostIntMod: 3 },
  })!,
  name: 'Гвоздь',
  source: { kind: 'subclass', labelRu: 'Архетип', feature: 'steel_defender_name' },
})
assert(withRepair.resources.some((r) => r.id === 'repair' && r.max === 3), 'repair pool')
const spent = {
  ...withRepair,
  resources: withRepair.resources.map((r) =>
    r.id === 'repair' ? { ...r, used: 2 } : r,
  ),
}
const afterShort = resetCompanionResourcesOnRest([spent], 'short')
assert(afterShort[0]?.resources[0]?.used === 2, 'short does not clear long')
const afterLong = resetCompanionResourcesOnRest([spent], 'long')
assert(afterLong[0]?.resources[0]?.used === 0, 'long clears repair')

const a = createCompanion({ id: 'a', name: 'A' })
const b = createCompanion({ id: 'b', name: 'B' })
const primed = setPrimaryCompanion([a, b], 'b')
assert(primed[0]?.is_primary === false && primed[1]?.is_primary === true, 'one primary')
const cleared = setPrimaryCompanion(primed, null)
assert(cleared.every((c) => !c.is_primary), 'clear primary')

assert(companionAllowsAvatar(dog), 'manual living allows avatar')
assert(
  companionAllowsAvatar(
    createCompanion({ kind: 'familiar', nature: 'summoned', name: 'Тень' }),
  ),
  'familiar allows avatar',
)
assert(
  companionAllowsAvatar(
    createCompanion({ kind: 'steel_defender', nature: 'construct', name: 'Гвоздь' }),
  ),
  'construct allows avatar',
)
assert(
  !companionAllowsAvatar(
    createCompanion({
      kind: 'other',
      nature: 'summoned',
      name: 'Дух зверя',
      source: { kind: 'spell', labelRu: 'Заклинание', feature: 'spell:summon_beast' },
    }),
  ),
  'spell summon denies avatar',
)

// --- F1: self_form + known_forms ---
const formBear = createCompanion({
  role: 'self_form',
  kind: 'transformed_self',
  name: 'Бурый медведь',
  bestiary_ref: 'brown_bear',
  bestiary_name_ru: 'Бурый медведь',
  stats: { hp: 34, hp_max: 34, ac: 11, speed: 40 },
  form: {
    form_source: 'wild_shape',
    form_source_ref: 'wild_shape',
    host_hp_at_enter: 28,
    host_hp_max_at_enter: 28,
    duration_minutes: 1,
    entered_at: '2026-10-15T00:00:00.000Z',
  },
  source: { kind: 'class', labelRu: 'Дикий облик', feature: 'wild_shape' },
})
assert(formBear.role === 'self_form', 'self_form role')
assert(formBear.nature === 'summoned', 'self_form nature summoned')
assert(formBear.control === 'with_master', 'self_form with_master')
assert(formBear.form?.form_source === 'wild_shape', 'form meta')
assert(companionAllowsAvatar(formBear), 'self_form allows avatar')
assert(isSelfForm(formBear), 'isSelfForm')

const formDown = applyHpChange(formBear, 0)
assert(!formDown.active && formDown.death == null, 'self_form dismiss no death saves')

const legacyAlly = readCompanions([
  {
    id: 'legacy-1',
    kind: 'familiar',
    name: 'Тень',
    nature: 'summoned',
    active: true,
    is_primary: false,
    control: 'own_initiative',
    source: { kind: 'spell', labelRu: 'Familiar' },
    stats: { hp: 2, hp_max: 2, ac: 12, speed: 20 },
    death: null,
    resources: [],
    actions: '',
    notes: '',
  },
])
assert(legacyAlly[0]?.role === 'ally', 'legacy defaults role ally')

const twoForms = normalizeSelfForms([
  createCompanion({
    id: 'f1',
    role: 'self_form',
    active: true,
    name: 'Волк',
    form: {
      form_source: 'wild_shape',
      form_source_ref: 'wild_shape',
      host_hp_at_enter: 10,
      host_hp_max_at_enter: 10,
      duration_minutes: 1,
      entered_at: null,
    },
  }),
  createCompanion({
    id: 'f2',
    role: 'self_form',
    active: true,
    name: 'Медведь',
    form: {
      form_source: 'wild_shape',
      form_source_ref: 'wild_shape',
      host_hp_at_enter: 10,
      host_hp_max_at_enter: 10,
      duration_minutes: 1,
      entered_at: null,
    },
  }),
])
assert(
  twoForms.filter((r) => r.role === 'self_form' && r.active).length === 1,
  'normalize keeps one active self_form',
)
assert(getActiveSelfForm(twoForms)?.name === 'Медведь', 'newest active kept')

const known = createKnownForm({
  bestiary_slug: 'wolf',
  name_ru: 'Волк',
  cr: '1/4',
  tags: ['custom'],
})
const knownRound = readKnownForms([known])
assert(knownRound[0]?.bestiary_slug === 'wolf', 'known forms round-trip')
const known2 = upsertKnownForm(knownRound, {
  ...known,
  id: 'other',
  name_ru: 'Волк (свой)',
  notes: 'видел в лесу',
})
assert(known2.length === 1 && known2[0]?.notes === 'видел в лесу', 'upsert by slug')

// --- F2: wild shape fork + limits ---
const limL2 = wildShapeLimits({ druidLevel: 2, subclassSlug: null })
assert(limL2.maxCr === 0.25 && !limL2.allowSwim && !limL2.allowFly, 'L2 land limits')
const limL4 = wildShapeLimits({ druidLevel: 4, subclassSlug: 'circle_of_the_land' })
assert(limL4.maxCr === 0.5 && limL4.allowSwim && !limL4.allowFly, 'L4 +swim')
const limL8 = wildShapeLimits({ druidLevel: 8, subclassSlug: null })
assert(limL8.maxCr === 1 && limL8.allowFly, 'L8 +fly')
const limMoon2 = wildShapeLimits({ druidLevel: 2, subclassSlug: 'circle_of_the_moon' })
assert(limMoon2.maxCr === 1 && limMoon2.combatBonusAction, 'Moon L2 CR1')
const limMoon6 = wildShapeLimits({ druidLevel: 6, subclassSlug: 'circle_of_the_moon' })
assert(limMoon6.maxCr === 2, 'Moon L6 floor(6/3)=2')
assert(crAllowed('1/4', limL2) && !crAllowed('1/2', limL2), 'CR filter L2')

const wolfPick = {
  slug: 'wolf',
  name_ru: 'Волк',
  cr: '1/4',
  type: 'beast',
  ac: 13,
  hp: 11,
  speed_walk: 40,
  actions_text: 'Укус',
}
assert(beastPickAllowed(wolfPick, limL2), 'wolf ok L2')
assert(
  !beastPickAllowed({ ...wolfPick, speed_fly: 60 }, limL2),
  'fly blocked L2',
)

const wsPool: SheetResource = {
  id: 'feat:druid:wild_shape:c1',
  name: 'Дикий облик',
  max: 2,
  used: 0,
  reset: 'short',
}
function fakeFeature(id: string): UnlockedFeature {
  return {
    id,
    level: 2,
    name_ru: id,
    kind: 'action',
    className: 'Друид',
    classEntryId: 'c1',
    classLevel: 5,
    source: 'class',
    subclassSlug: null,
    subclassName: null,
    summary_ru: '',
    scaleValue: null,
    resourceUses: null,
  }
}
const forkLand = resolveWildShapeOptions({
  features: [fakeFeature('wild_shape'), fakeFeature('wild_companion')],
  resources: [wsPool],
  classSlug: 'druid',
  classEntryId: 'c1',
})
assert(
  forkLand.map((o) => o.id).join(',') === 'beast_form,wild_companion',
  'land fork: beast + Tasha companion only',
)
const forkStars = resolveWildShapeOptions({
  features: [
    fakeFeature('wild_shape'),
    fakeFeature('wild_companion'),
    fakeFeature('starry_form'),
  ],
  resources: [wsPool],
  classSlug: 'druid',
  classEntryId: 'c1',
})
assert(
  forkStars.some((o) => o.id === 'starry_form' && !o.disabled),
  'stars unlocks starry on fork',
)
const forkMoon10 = resolveWildShapeOptions({
  features: [fakeFeature('wild_shape'), fakeFeature('elemental_wild_shape')],
  resources: [{ ...wsPool, used: 1 }],
  classSlug: 'druid',
  classEntryId: 'c1',
})
assert(
  forkMoon10.find((o) => o.id === 'elemental_wild_shape')?.disabled,
  'elemental needs 2 uses',
)
assert(isWildShapeForkFeature('wild_companion'), 'wild_companion is fork feature')
assert(isWildShapeForkFeature('summon_wildfire_spirit'), 'wildfire is fork feature')
assert(!isWildShapeForkFeature('rage'), 'rage not fork')

const shaped = applyBeastWildShape({
  companions: [],
  knownForms: [],
  pick: wolfPick,
  hostHp: 20,
  hostHpMax: 20,
  druidLevel: 4,
})
assert(shaped.companions[0]?.role === 'self_form', 'beast → self_form')
assert(shaped.companions[0]?.stats.hp === 11, 'form HP from pick')
assert(shaped.knownForms.length === 1, 'adds known form')

const withFamiliar = applyWildCompanion({ companions: shaped.companions, druidLevel: 4 })
assert(
  withFamiliar.some((c) => c.source?.feature === 'wild_companion' && c.role === 'ally'),
  'wild companion ally',
)
assert(symbioticTempHp(5) === 20, 'symbiotic 4×level')
const starry = applyStarryForm({
  companions: shaped.companions,
  constellation: 'archer',
  hostHp: 20,
  hostHpMax: 20,
})
assert(getActiveSelfForm(starry)?.name?.includes('Лучник'), 'starry replaces self_form')
assert(getActiveSelfForm(starry)?.stats.hp == null, 'starry keeps host HP pool')
const fire = applyWildfireSpirit({ companions: [], druidLevel: 6 })
assert(fire[0]?.stats.hp_max === 40, 'wildfire HP 10+5×6 (ttg)')

// --- F3: overflow / dismiss / rest ---
const allyPrimary = createCompanion({
  id: 'ally-1',
  kind: 'familiar',
  role: 'ally',
  name: 'Тень',
  is_primary: true,
  active: true,
  nature: 'summoned',
  stats: { hp: 2, hp_max: 2, ac: 12, speed: 20 },
})
const form10 = applyBeastWildShape({
  companions: [allyPrimary],
  knownForms: [],
  pick: {
    slug: 'wolf',
    name_ru: 'Волк',
    cr: '1/4',
    type: 'beast',
    ac: 13,
    hp: 10,
    speed_walk: 40,
    actions_text: 'Укус',
  },
  hostHp: 28,
  hostHpMax: 28,
  druidLevel: 4,
})
assert(form10.companions.find((c) => c.id === 'ally-1')?.is_primary === false, 'form steals primary')
assert(
  getActiveSelfForm(form10.companions)?.form?.previous_primary_id === 'ally-1',
  'stores previous primary',
)
assert(
  formSourceBadgeRu(getActiveSelfForm(form10.companions)?.form).includes('Дикий облик'),
  'badge copy',
)

const hit14 = dealDamageToSelfForm({
  companions: form10.companions,
  damage: 14,
  hostHp: 28,
})
assert(hit14.formDismissed, '14 dmg vs 10 HP dismisses')
assert(hit14.overflow === 4, 'overflow 4')
assert(hit14.hostHp === 24, 'host 28-4')
assert(!getActiveSelfForm(hit14.companions), 'no active form after overflow')
assert(hit14.companions.find((c) => c.id === 'ally-1')?.is_primary === true, 'restore primary')

const formAgain = applyBeastWildShape({
  companions: [allyPrimary],
  knownForms: [],
  pick: {
    slug: 'wolf',
    name_ru: 'Волк',
    cr: '1/4',
    type: 'beast',
    ac: 13,
    hp: 10,
    speed_walk: 40,
    actions_text: 'Укус',
  },
  hostHp: 28,
  hostHpMax: 28,
  druidLevel: 4,
})
const voluntary = dismissSelfForm({
  companions: formAgain.companions,
  formId: getActiveSelfForm(formAgain.companions)!.id,
})
assert(!getActiveSelfForm(voluntary.companions), 'voluntary dismiss')
assert(voluntary.restoredPrimaryId === 'ally-1', 'voluntary restores primary')

const softHit = dealDamageToSelfForm({
  companions: formAgain.companions,
  damage: 3,
  hostHp: 28,
})
assert(!softHit.formDismissed && softHit.overflow === 0, 'partial dmg keeps form')
assert(getActiveSelfForm(softHit.companions)?.stats.hp === 7, '10-3=7')

const onRest = dismissSelfFormsOnRest(formAgain.companions, 'short')
assert(onRest.dismissedNames.includes('Волк'), 'rest dismisses form')
assert(!getActiveSelfForm(onRest.companions), 'rest clears active form')

const ordered = sortCompanionsForDisplay([
  createCompanion({ role: 'ally', name: 'Ally', active: true }),
  createCompanion({
    role: 'self_form',
    name: 'Form',
    active: true,
    form: {
      form_source: 'wild_shape',
      form_source_ref: 'wild_shape',
      host_hp_at_enter: 1,
      host_hp_max_at_enter: 1,
      duration_minutes: 1,
      entered_at: null,
    },
  }),
])
assert(ordered[0]?.role === 'self_form', 'display sort: form first')

console.log('smoke-companions: ok')
