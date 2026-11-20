/** Run: npx tsx --tsconfig tsconfig.app.json src/shared/dnd/wizard2024Features.selfcheck.ts */
import assert from 'node:assert/strict'
import { createClassLevel } from './classLevels'
import { computeProgression2024 } from './edition2024Classes'
import { featureResourceId } from './featureResources'
import type { SheetResource } from './rest'
import type { SpellSlotState } from './spells'
import { applySpellCastToCompanions } from '../../features/characters/spellCompanions'
import { createSheetSpell } from '../../features/characters/spells'
import { resolveWizardCopyMods2024 } from './wizardSpellbook2024'
import {
  applyAbjurationToWard,
  setWizardCapstonePick,
  syncWizardCapstoneSpells,
  thirdEyeDarkvisionBonus,
  thirdEyeDarkvisionFloor2024,
} from './wizardTradition'
import {
  applyExpertDivination2024,
  applySelfDamage2024,
  applyWizard2024FeatureUse,
  castTimingOverride2024,
  clearWizard2024RestSwaps,
  improvedIllusionsRange2024,
  isPhantasmalFreeCast2024,
  markWizard2024RestSwap,
  parseSculptCreatureNames,
  readWizard2024RestSwaps,
  sculptCreatureLimit2024,
  spellBreakerRefundOffer2024,
  spellResistanceDefenseNote2024,
  spellResistanceSaveNote2024,
  wizard2024RestSwapDone,
  masteryCandidates2024,
  memorizeFromCandidates2024,
  overchannelNecroticDice2024,
  swapMemorizeSpell,
  swapSpellMastery2024,
  swapSpellcastingCantrip2024,
  syncWizardSubclassSpells2024,
  trimSavantSpellsOnLevelDown2024,
  validateSpellMasteryPicks2024,
  wizard2024Context,
  wizard2024Flags,
  wizard2024CastFollowUp,
  type W24Spell,
} from './wizard2024Features'

let seq = 0
function spell(partial: Partial<W24Spell> & { name: string; level: number }): W24Spell {
  seq += 1
  return {
    id: `s${seq}`,
    prepared: false,
    in_spellbook: true,
    class_slug: 'wizard',
    casting_time: 'Действие',
    ...partial,
  }
}

const ENTRY = 'w1'
const edition = '2024'

// --- Memorize Spell ---------------------------------------------------------
{
  const a = spell({ name: 'Огненный шар', level: 3, prepared: true })
  const b = spell({ name: 'Щит', level: 1, casting_time: 'Реакция' })
  const lockedSpell = spell({ name: 'Подпись', level: 3, prepared: true, prepared_locked: true })
  const sig = spell({ name: 'Полёт', level: 3, prepared: true })
  const feature = spell({
    name: 'Контрзаклинание',
    level: 3,
    prepared: true,
    spellbook_acquisition: 'feature',
    source_kind: 'subclass',
  })
  const known = [a, b, lockedSpell, sig, feature]
  const ok = swapMemorizeSpell({ known, fromId: a.id, toId: b.id, wizardLevel: 5, rulesEdition: edition })
  assert.ok(ok.ok, ok.message)
  assert.equal(ok.known.find((row) => row.id === a.id)?.prepared, false)
  assert.equal(ok.known.find((row) => row.id === b.id)?.prepared, true)
  assert.equal(
    swapMemorizeSpell({ known, fromId: a.id, toId: b.id, wizardLevel: 4, rulesEdition: edition }).ok,
    false,
    'L4 cannot memorize',
  )
  assert.equal(
    swapMemorizeSpell({ known, fromId: a.id, toId: b.id, wizardLevel: 5, rulesEdition: '2014' }).ok,
    false,
    '2014 has no Memorize Spell',
  )
  assert.equal(
    swapMemorizeSpell({ known, fromId: lockedSpell.id, toId: b.id, wizardLevel: 5, rulesEdition: edition }).ok,
    false,
    'prepared_locked stays',
  )
  assert.equal(
    swapMemorizeSpell({
      known,
      fromId: sig.id,
      toId: b.id,
      wizardLevel: 20,
      rulesEdition: edition,
      lockedIds: [sig.id],
    }).ok,
    false,
    'signature/mastery ids stay',
  )
  assert.equal(
    swapMemorizeSpell({ known, fromId: a.id, toId: b.id, wizardLevel: 5, rulesEdition: edition, maxSpellLevel: 0 }).ok,
    false,
    'level cap',
  )
  const notInBook = spell({ name: 'Чужое', level: 1, in_spellbook: false })
  assert.equal(
    swapMemorizeSpell({
      known: [...known, notInBook],
      fromId: a.id,
      toId: notInBook.id,
      wizardLevel: 5,
      rulesEdition: edition,
    }).ok,
    false,
    'swap target must be in the book',
  )
  assert.ok(!memorizeFromCandidates2024(known).some((row) => row.id === feature.id), 'feature spell not swappable')
}

// --- Cantrip swap -----------------------------------------------------------
{
  const fire = spell({ name: 'Огненный снаряд', level: 0, prepared: true })
  const hand = spell({ name: 'Волшебная рука', level: 0, prepared: true })
  const racial = spell({ name: 'Свет', level: 0, prepared: true, source_kind: 'race' })
  const ray = spell({ name: 'Луч холода', level: 0, prepared: true })
  const known = [fire, hand, racial]
  const swapped = swapSpellcastingCantrip2024({ known, fromId: fire.id, replacement: ray, rulesEdition: edition })
  assert.ok(swapped.ok, swapped.message)
  assert.ok(swapped.known.some((row) => row.name === 'Луч холода'))
  assert.ok(!swapped.known.some((row) => row.name === 'Огненный снаряд'))
  assert.equal(
    swapSpellcastingCantrip2024({ known, fromId: racial.id, replacement: ray, rulesEdition: edition }).ok,
    false,
    'racial cantrip is not a Spellcasting cantrip',
  )
  assert.equal(
    swapSpellcastingCantrip2024({
      known,
      fromId: fire.id,
      replacement: spell({ name: 'Волшебная рука', level: 0 }),
      rulesEdition: edition,
    }).ok,
    false,
    'duplicate cantrip',
  )
  assert.equal(
    swapSpellcastingCantrip2024({ known, fromId: fire.id, replacement: ray, rulesEdition: '2014' }).ok,
    false,
  )
}

// --- Spell Mastery ----------------------------------------------------------
{
  const magicMissile = spell({ name: 'Волшебная стрела', level: 1 })
  const sleep = spell({ name: 'Усыпление', level: 1 })
  const shield = spell({ name: 'Щит', level: 1, casting_time: 'Реакция' })
  const mirror = spell({ name: 'Отражения', level: 2 })
  const web = spell({ name: 'Паутина', level: 2 })
  const ritualSpell = spell({ name: 'Ритуал', level: 2, casting_time: '1 минута' })
  const known = [magicMissile, sleep, shield, mirror, web, ritualSpell]
  assert.deepEqual(
    masteryCandidates2024(known, 1).map((row) => row.name).sort(),
    ['Волшебная стрела', 'Усыпление'].sort(),
    'only Action spells qualify',
  )
  assert.equal(masteryCandidates2024(known, 2).some((row) => row.id === ritualSpell.id), false)
  assert.ok(validateSpellMasteryPicks2024(known, [magicMissile.id, mirror.id]).ok)
  assert.equal(validateSpellMasteryPicks2024(known, [shield.id]).ok, false, 'reaction not allowed')
  assert.equal(validateSpellMasteryPicks2024(known, [magicMissile.id, sleep.id]).ok, false, 'one per tier')

  const picks = setWizardCapstonePick({ values: {} }, ENTRY, 'spell_mastery', [magicMissile.id, mirror.id])
  const swapped = swapSpellMastery2024({
    known,
    picks,
    classEntryId: ENTRY,
    tier: 1,
    toId: sleep.id,
    wizardLevel: 18,
    rulesEdition: edition,
  })
  assert.ok(swapped.ok, swapped.message)
  assert.equal(swapped.picks.values[`${ENTRY}:spell_mastery`], `${sleep.id},${mirror.id}`)
  assert.equal(
    swapSpellMastery2024({ known, picks, classEntryId: ENTRY, tier: 1, toId: web.id, wizardLevel: 18, rulesEdition: edition }).ok,
    false,
    'same level only',
  )

  const sync = syncWizardCapstoneSpells({ known, featurePicks: picks, classEntryId: ENTRY, edition })
  const locked = sync.known.find((row) => row.id === magicMissile.id)!
  assert.equal(locked.prepared, true)
  assert.equal(locked.prepared_locked, true)
  assert.equal(locked.prepare_source_label, 'Мастерство заклинателя')
  assert.equal(locked.grant_cast, undefined, '2024 mastery has no charge')
  const resynced = syncWizardCapstoneSpells({
    known: sync.known,
    featurePicks: swapped.picks,
    classEntryId: ENTRY,
    edition,
  })
  const released = resynced.known.find((row) => row.id === magicMissile.id)!
  assert.equal(released.prepared_locked, false)
  assert.equal(released.prepared, false, 'replaced mastery spell stops being always prepared')
}

// --- Signature Spells reset on level down ----------------------------------
{
  const wizard = createClassLevel({ name: 'Волшебник', level: 20, catalog_id: 'wizard' })
  const snap = computeProgression2024({
    classes: [wizard],
    subclassSlugByEntryId: { [wizard.id]: 'wizard__evoker' },
  })
  assert.ok(snap.features.some((f) => f.id === 'signature_spells' && f.level === 20))
  assert.ok(snap.features.some((f) => f.id === 'spell_mastery' && f.level === 18))
  const sig = spell({ name: 'Огненный шар', level: 3, prepared: true })
  const picks = setWizardCapstonePick({ values: {} }, wizard.id, 'signature_spells', [sig.id])
  const pinned = syncWizardCapstoneSpells({ known: [sig], featurePicks: picks, classEntryId: wizard.id, edition })
  const pinnedRow = pinned.known[0]
  assert.equal(pinnedRow.grant_cast?.max, 1)
  assert.equal(pinnedRow.grant_cast?.reset, 'short')
  const cleared = syncWizardCapstoneSpells({
    known: pinned.known,
    featurePicks: { values: {} },
    classEntryId: wizard.id,
    edition,
  })
  assert.equal(cleared.known[0].prepared_locked, false)
  assert.equal(cleared.known[0].grant_cast, undefined)
}

// --- Savant: no half price in 2024 -----------------------------------------
{
  const mods = resolveWizardCopyMods2024({ subclassSlug: 'wizard__evoker', wizardLevel: 6 })
  assert.equal(mods.savantSchool, null)
  const known = [
    spell({ name: 'A', level: 1, savant_level: 3, spellbook_acquisition: 'feature' } as never),
    spell({ name: 'B', level: 2, savant_level: 5 } as never),
    spell({ name: 'C', level: 1 }),
  ]
  const trimmed = trimSavantSpellsOnLevelDown2024(known, 4)
  assert.deepEqual(trimmed.map((row) => row.name), ['A', 'C'])
}

// --- Overchannel -----------------------------------------------------------
{
  assert.equal(overchannelNecroticDice2024(1, 3), 0, 'first use is free')
  assert.equal(overchannelNecroticDice2024(2, 3), 6, '2d12 per slot level on 2nd use')
  assert.equal(overchannelNecroticDice2024(3, 1), 3, '+1d12 per level on each extra use')
  assert.equal(overchannelNecroticDice2024(4, 5), 20)
  assert.equal(overchannelNecroticDice2024(2, 9), 10, 'capped at 5th level')

  let resources: SheetResource[] = [
    {
      id: featureResourceId('wizard', 'overchannel', ENTRY),
      name: 'Перегрузка',
      max: 1,
      used: 0,
      reset: 'long',
    },
  ]
  const slots: Record<string, SpellSlotState> = { '3': { max: 2, used: 0 } }
  const use = (slotLevel: number) =>
    applyWizard2024FeatureUse({
      featureId: 'overchannel',
      resourceId: resources[0].id,
      resources,
      classEntryId: ENTRY,
      slots,
      slotLevel,
      rng: () => 0.999,
    })
  const first = use(3)
  assert.ok(first.ok && !first.selfDamage, 'first use no damage')
  resources = first.resources
  const second = use(3)
  assert.equal(second.selfDamage, 72, '6d12 at max roll')
  resources = second.resources
  const third = use(2)
  assert.equal(third.selfDamage, 72, '3d12×2 levels at max roll')
  assert.deepEqual(applySelfDamage2024({ hpCurrent: 30, hpTemp: 10, amount: 25 }), { hpCurrent: 15, hpTemp: 0 })
}

// --- Arcane Ward -----------------------------------------------------------
{
  const ward: SheetResource = {
    id: featureResourceId('wizard', 'arcane_ward', ENTRY),
    name: 'Щит',
    max: 20,
    used: 4,
    reset: 'long',
    track: 'stock',
    wardCreated: true,
  }
  const repaired = applyAbjurationToWard([ward], 3)
  assert.equal(repaired.resources[0].used, 10, '2 x slot level on an abjuration cast')
  const fresh = applyAbjurationToWard([{ ...ward, wardCreated: false, used: 0 }], 1)
  assert.equal(fresh.resources[0].used, 20, 'created at full')
  const slots: Record<string, SpellSlotState> = { '2': { max: 3, used: 0 } }
  const bonus = applyWizard2024FeatureUse({
    featureId: 'arcane_ward',
    resourceId: ward.id,
    resources: [ward],
    classEntryId: ENTRY,
    slots,
    slotLevel: 2,
  })
  assert.ok(bonus.ok)
  assert.equal(bonus.resources[0].used, 8)
  assert.equal(bonus.spendSlotLevel, 2)
  const projected = applyWizard2024FeatureUse({
    featureId: 'projected_ward',
    resourceId: null,
    resources: [ward],
    classEntryId: ENTRY,
    slots,
    amount: 7,
  })
  assert.ok(projected.ok)
  assert.equal(projected.resources[0].used, 0, 'absorbs 4, rest goes to the ally')
}

// --- Subclass pools / Portent / automation modes ---------------------------
{
  const progressionFor = (level: number, sub: string) => {
    const wizard = createClassLevel({ name: 'Волшебник', level, catalog_id: 'wizard' })
    return computeProgression2024({
      classes: [wizard],
      subclassSlugByEntryId: { [wizard.id]: `wizard__${sub}` },
    })
  }
  const portent = (level: number) =>
    progressionFor(level, 'diviner').desiredResources.find((r) => r.id.includes(':portent:'))
  assert.equal(portent(3)?.max, 2)
  assert.equal(portent(13)?.max, 2)
  assert.equal(portent(14)?.max, 3)
  assert.equal(portent(3)?.track, 'stock')
  assert.ok(progressionFor(10, 'diviner').desiredResources.some((r) => r.id.includes('the_third_eye')))
  assert.ok(!progressionFor(9, 'diviner').desiredResources.some((r) => r.id.includes('the_third_eye')))
  const evoker = progressionFor(14, 'evoker')
  const sculpt = evoker.features.find((f) => f.id === 'sculpt_spells')
  assert.equal(sculpt?.automationMode, 'calc', 'sculpt spells is not always_prepared')
  assert.equal(evoker.features.find((f) => f.id === 'potent_cantrip')?.automationMode, 'calc')
  assert.ok(evoker.desiredResources.some((r) => r.id.includes('overchannel')))
}

// --- Expert Divination / Third Eye / flags ---------------------------------
{
  const slots: Record<string, SpellSlotState> = {
    '1': { max: 4, used: 1 },
    '2': { max: 3, used: 0 },
    '3': { max: 3, used: 1 },
    '4': { max: 3, used: 1 },
  }
  const restored = applyExpertDivination2024(slots, 4)
  assert.equal(restored.level, 3, 'highest spent slot below the cast one')
  assert.equal(restored.slots['3'].used, 0)
  assert.equal(applyExpertDivination2024(slots, 1).level, null)
  assert.equal(thirdEyeDarkvisionBonus([]), 0)
  const eye = (activeLabel: string): SheetResource[] => [
    {
      id: featureResourceId('wizard', 'the_third_eye', ENTRY),
      name: 'Третий глаз',
      max: 1,
      used: 1,
      reset: 'short',
      activeLabel,
    },
  ]
  assert.equal(thirdEyeDarkvisionFloor2024(eye('Тёмное зрение 120 фт.')), 120)
  assert.equal(thirdEyeDarkvisionBonus(eye('Тёмное зрение 120 фт.')), 0, '2024 darkvision is not additive')
  assert.equal(thirdEyeDarkvisionFloor2024(eye('Чтение любых языков')), 0)
}

{
  const ctx = wizard2024Context({
    rulesEdition: edition,
    classes: [{ id: ENTRY, name: 'Волшебник', level: 10 }],
    subclassSlugByEntryId: { [ENTRY]: 'wizard__abjurer' },
  })
  const flags = wizard2024Flags(ctx)
  assert.ok(flags.ward && flags.projectedWard && flags.spellBreaker && !flags.spellResistance)
  assert.equal(
    castTimingOverride2024({ name: 'Рассеивание магии' }, flags),
    'bonus',
    'Spell Breaker: Dispel Magic as a bonus action',
  )
  assert.equal(castTimingOverride2024({ name: 'Огненный шар' }, flags), null)
  assert.equal(wizard2024Context({ rulesEdition: '2014', classes: [{ id: ENTRY, name: 'Волшебник', level: 10 }], subclassSlugByEntryId: {} }), null)
  const follow = wizard2024CastFollowUp({
    flags: wizard2024Flags(
      wizard2024Context({
        rulesEdition: edition,
        classes: [{ id: ENTRY, name: 'Волшебник', level: 6 }],
        subclassSlugByEntryId: { [ENTRY]: 'wizard__diviner' },
      }),
    ),
    slots: { '1': { max: 4, used: 1 }, '2': { max: 3, used: 1 } },
    spell: { name: 'Видение невидимого', level: 2, school: 'Прорицание' },
    slotLevel: 2,
    viaSlot: true,
  })
  assert.equal(follow.slots['1'].used, 0, 'Expert Divination refunds the lower slot')
  const free = wizard2024CastFollowUp({
    flags: wizard2024Flags(
      wizard2024Context({
        rulesEdition: edition,
        classes: [{ id: ENTRY, name: 'Волшебник', level: 6 }],
        subclassSlugByEntryId: { [ENTRY]: 'wizard__diviner' },
      }),
    ),
    slots: { '1': { max: 4, used: 1 } },
    spell: { name: 'Видение невидимого', level: 2, school: 'Прорицание' },
    slotLevel: 2,
    viaSlot: false,
  })
  assert.equal(free.slots['1'].used, 1, 'no refund for a free cast')
}

// --- Subclass spells (Spell Breaker, Phantasmal Creatures) -----------------
{
  const resolve = (slug: string) =>
    ({
      abjurer: null,
      counterspell: spell({ name: 'Контрзаклинание', level: 3, casting_time: 'Реакция', catalog_id: 'c1' }),
      'dispel-magic': spell({ name: 'Рассеивание магии', level: 3, catalog_id: 'c2' }),
      'summon-beast': spell({ name: 'Вызов зверя', level: 2, catalog_id: 'c3' }),
      'summon-fey': spell({ name: 'Вызов феи', level: 3, catalog_id: 'c4' }),
      'minor-illusion': spell({ name: 'Малая иллюзия', level: 0, catalog_id: 'c5' }),
    })[slug as 'counterspell'] ?? null
  const abj = wizard2024Context({
    rulesEdition: edition,
    classes: [{ id: ENTRY, name: 'Волшебник', level: 10 }],
    subclassSlugByEntryId: { [ENTRY]: 'wizard__abjurer' },
  })
  const added = syncWizardSubclassSpells2024({ known: [] as W24Spell[], ctx: abj, resolve })
  assert.equal(added.known.length, 2)
  assert.ok(added.known.every((row) => row.prepared && row.prepared_locked && row.spellbook_acquisition === 'feature'))
  const dropped = syncWizardSubclassSpells2024({
    known: added.known,
    ctx: wizard2024Context({
      rulesEdition: edition,
      classes: [{ id: ENTRY, name: 'Волшебник', level: 9 }],
      subclassSlugByEntryId: { [ENTRY]: 'wizard__abjurer' },
    }),
    resolve,
  })
  assert.equal(dropped.known.length, 0, 'level down removes feature spells')
  const ill = wizard2024Context({
    rulesEdition: edition,
    classes: [{ id: ENTRY, name: 'Волшебник', level: 6 }],
    subclassSlugByEntryId: { [ENTRY]: 'wizard__illusionist' },
  })
  const illRows = syncWizardSubclassSpells2024({ known: [] as W24Spell[], ctx: ill, resolve }).known
  assert.deepEqual(illRows.map((row) => row.name).sort(), ['Вызов зверя', 'Вызов феи', 'Малая иллюзия'].sort())
  assert.equal(illRows.find((row) => row.name === 'Вызов феи')?.grant_cast?.reset, 'long')
}

// --- Rest swaps: once per rest cycle ---------------------------------------
{
  let flags = readWizard2024RestSwaps(undefined)
  assert.equal(flags, undefined, 'no flags by default')
  assert.deepEqual(wizard2024RestSwapDone(flags), { memorize: false, cantrip: false, mastery: false })

  flags = markWizard2024RestSwap(flags, 'memorize')
  flags = markWizard2024RestSwap(flags, 'cantrip')
  flags = markWizard2024RestSwap(flags, 'mastery')
  flags = markWizard2024RestSwap(flags, 'cantripFormulas')

  // reopen: flags are read back from the sheet, not reset
  const reopened = readWizard2024RestSwaps(JSON.parse(JSON.stringify(flags)))
  assert.deepEqual(reopened, flags)
  assert.deepEqual(wizard2024RestSwapDone(reopened), { memorize: true, cantrip: true, mastery: true })

  const afterShort = clearWizard2024RestSwaps(reopened, 'short')
  assert.deepEqual(afterShort, { cantrip: true, mastery: true }, 'short rest frees memorize + formulas only')
  assert.deepEqual(wizard2024RestSwapDone(afterShort), { memorize: false, cantrip: true, mastery: true })

  const afterLong = clearWizard2024RestSwaps(reopened, 'long')
  assert.equal(afterLong, undefined, 'long rest clears all swap flags')
  assert.deepEqual(wizard2024RestSwapDone(afterLong), { memorize: false, cantrip: false, mastery: false })

  assert.equal(clearWizard2024RestSwaps({ memorize: true }, 'short'), undefined)
  assert.equal(clearWizard2024RestSwaps(undefined, 'long'), undefined)
  assert.equal(readWizard2024RestSwaps({ memorize: false, foo: true }), undefined, 'false / unknown keys dropped')
}

// --- Sculpt Spells: 1 + spell level creatures -------------------------------
{
  assert.equal(sculptCreatureLimit2024(1), 2)
  assert.equal(sculptCreatureLimit2024(3), 4)
  assert.equal(sculptCreatureLimit2024(9), 10)
  assert.deepEqual(parseSculptCreatureNames('Арн, Бела\nарн; ; Дик'), ['Арн', 'Бела', 'Дик'])
  assert.deepEqual(parseSculptCreatureNames(''), [])

  const base = {
    featureId: 'sculpt_spells',
    resourceId: null,
    resources: [] as SheetResource[],
    classEntryId: ENTRY,
    slots: {} as Record<string, SpellSlotState>,
  }
  const ok = applyWizard2024FeatureUse({ ...base, slotLevel: 3, target: 'Арн, Бела, Дик' })
  assert.equal(ok.ok, true)
  assert.match(ok.message, /защищены: 3 \(лимит 4/)
  assert.match(ok.message, /0 урона/)
  const full = applyWizard2024FeatureUse({ ...base, slotLevel: 1, target: 'А, Б' })
  assert.equal(full.ok, true, '1st level protects exactly 2')
  const over = applyWizard2024FeatureUse({ ...base, slotLevel: 1, target: 'А, Б, В' })
  assert.equal(over.ok, false, 'over the 1 + level limit is refused')
  assert.match(over.message, /не больше 2/)
  const none = applyWizard2024FeatureUse({ ...base, slotLevel: 2 })
  assert.equal(none.ok, true)
  assert.match(none.message, /защищены: 0 \(лимит 3/)
  assert.equal(applyWizard2024FeatureUse({ ...base, slotLevel: 0 }).ok, false)
}

// --- Subclass convenience: refund, resistance, phantasmal HP, illusion range -
{
  const flagsFor = (slug: string, level: number) =>
    wizard2024Flags(
      wizard2024Context({
        rulesEdition: edition,
        classes: [{ id: ENTRY, name: 'Волшебник', level }],
        subclassSlugByEntryId: { [ENTRY]: slug },
      }),
    )
  const abj10 = flagsFor('wizard__abjurer', 10)
  const counter = { name: 'Контрзаклинание', level: 3 }
  assert.deepEqual(
    spellBreakerRefundOffer2024({ flags: abj10, spell: counter, slotLevel: 5, viaSlot: true }),
    { slotLevel: 5 },
  )
  assert.deepEqual(
    spellBreakerRefundOffer2024({ flags: abj10, spell: { name: 'Рассеивание магии', level: 3 }, slotLevel: 3, viaSlot: true }),
    { slotLevel: 3 },
  )
  assert.equal(
    spellBreakerRefundOffer2024({ flags: abj10, spell: { name: 'Огненный шар', level: 3 }, slotLevel: 3, viaSlot: true }),
    null,
    'other spells do not offer a refund',
  )
  assert.equal(spellBreakerRefundOffer2024({ flags: abj10, spell: counter, slotLevel: 3, viaSlot: false }), null)
  assert.equal(
    spellBreakerRefundOffer2024({ flags: flagsFor('wizard__abjurer', 9), spell: counter, slotLevel: 3, viaSlot: true }),
    null,
    'needs level 10',
  )
  assert.equal(
    spellBreakerRefundOffer2024({ flags: flagsFor('wizard__evoker', 10), spell: counter, slotLevel: 3, viaSlot: true }),
    null,
  )

  const abj14 = flagsFor('wizard__abjurer', 14)
  assert.match(spellResistanceSaveNote2024(abj14), /преимущество на спасброски против заклинаний/)
  assert.match(spellResistanceDefenseNote2024(abj14), /урону от заклинаний/)
  assert.equal(spellResistanceSaveNote2024(abj10), '')
  assert.equal(spellResistanceDefenseNote2024(flagsFor('wizard__illusionist', 14)), '')

  const ill6 = flagsFor('wizard__illusionist', 6)
  assert.equal(isPhantasmalFreeCast2024({ flags: ill6, grantLabel: 'Призрачные существа' }), true)
  assert.equal(isPhantasmalFreeCast2024({ flags: ill6, grantLabel: 'Лунное воплощение' }), false)
  assert.equal(
    isPhantasmalFreeCast2024({ flags: flagsFor('wizard__illusionist', 5), grantLabel: 'Призрачные существа' }),
    false,
  )

  const summon = { ...createSheetSpell(), name: 'Призыв духа зверя', level: 2 }
  const full = applySpellCastToCompanions({ companions: [], spell: summon, slotLevel: 2, characterLevel: 6, spellMod: 4 })
  const half = applySpellCastToCompanions({
    companions: [],
    spell: summon,
    slotLevel: 2,
    characterLevel: 6,
    spellMod: 4,
    halfHp: true,
  })
  const fullHp = full?.companions[0]?.stats.hp_max
  assert.ok(fullHp && fullHp > 1, 'template has hit points')
  assert.equal(half?.companions[0]?.stats.hp_max, Math.floor(fullHp / 2), 'free cast has half HP')
  assert.equal(half?.companions[0]?.stats.hp, Math.floor(fullHp / 2))
  assert.match(half?.companions[0]?.notes ?? '', /Призрачные существа/)
  assert.doesNotMatch(full?.companions[0]?.notes ?? '', /Призрачные существа/)

  const ill3 = flagsFor('wizard__illusionist', 3)
  const minor = { name: 'Малая иллюзия', range: '30 фт', school: 'illusion' }
  assert.match(improvedIllusionsRange2024(minor, ill3) ?? '', /30 фт → 90 фт/)
  assert.equal(improvedIllusionsRange2024(minor, flagsFor('wizard__illusionist', 2)), null)
  assert.equal(improvedIllusionsRange2024(minor, flagsFor('wizard__evoker', 6)), null)
  assert.equal(improvedIllusionsRange2024({ ...minor, range: 'Касание' }, ill3), null)
  assert.equal(
    improvedIllusionsRange2024({ name: 'Огненный шар', range: '150 фт', school: 'evocation' }, ill3),
    null,
    'only Illusion spells',
  )
  assert.match(
    improvedIllusionsRange2024({ name: 'Образ', range: '120 feet', school: 'иллюзия' }, ill3) ?? '',
    /120 фт → 180 фт/,
  )
}

console.log('wizard2024Features selfcheck: ok')
