/** Run: npx tsx --tsconfig tsconfig.app.json src/shared/dnd/monk2024Features.selfcheck.ts */
import assert from 'node:assert/strict'
import {
  applyMonk2024FeatureUse,
  bodyAndMindAbilityBonus2024,
  findFocusResource,
  flurryStrikeCount2024,
  focusPointsMax2024,
  focusSaveDc2024,
  martialArtsDie2024,
  monk2024Context,
  MONKS_FOCUS_NAME_RU,
  FOCUS_POINTS_NAME_RU,
  FLURRY_OF_BLOWS_NAME_RU,
  PATIENT_DEFENSE_NAME_RU,
  STEP_OF_THE_WIND_NAME_RU,
  UNCANNY_METABOLISM_NAME_RU,
  DEFLECT_ATTACKS_NAME_RU,
  STUNNING_STRIKE_NAME_RU,
  EVASION_NAME_RU,
  ACROBATIC_MOVEMENT_NAME_RU,
  HEIGHTENED_FOCUS_NAME_RU,
  SELF_RESTORATION_NAME_RU,
  DEFLECT_ENERGY_NAME_RU,
  DISCIPLINED_SURVIVOR_NAME_RU,
  PERFECT_FOCUS_NAME_RU,
  SUPERIOR_DEFENSE_NAME_RU,
  BODY_AND_MIND_NAME_RU,
  SLOW_FALL_NAME_RU,
  EMPOWERED_STRIKES_NAME_RU,
  patientDefenseTempHpDice2024,
  spendFocusPoints,
  returnFocusPoints,
  unarmoredMovementBonusFt2024,
} from './monk2024Features'
import type { SheetResource } from './rest'

assert.equal(FOCUS_POINTS_NAME_RU, 'Очки сосредоточенности')
assert.equal(MONKS_FOCUS_NAME_RU, 'Монашеская сосредоточенность')
assert.equal(FLURRY_OF_BLOWS_NAME_RU, 'Шквал ударов')
assert.equal(PATIENT_DEFENSE_NAME_RU, 'Терпеливая защита')
assert.equal(STEP_OF_THE_WIND_NAME_RU, 'Поступь ветра')
assert.equal(UNCANNY_METABOLISM_NAME_RU, 'Феноменальный метаболизм')
assert.equal(DEFLECT_ATTACKS_NAME_RU, 'Отражение атак')
assert.equal(STUNNING_STRIKE_NAME_RU, 'Ошеломляющий удар')
assert.equal(EVASION_NAME_RU, 'Увёртливость')
assert.equal(ACROBATIC_MOVEMENT_NAME_RU, 'Движение акробата')
assert.equal(HEIGHTENED_FOCUS_NAME_RU, 'Повышенная сосредоточенность')
assert.equal(SELF_RESTORATION_NAME_RU, 'Восстановление себя')
assert.equal(DEFLECT_ENERGY_NAME_RU, 'Отражение энергии')
assert.equal(DISCIPLINED_SURVIVOR_NAME_RU, 'Дисциплина сохранения')
assert.equal(PERFECT_FOCUS_NAME_RU, 'Полная сосредоточенность')
assert.equal(SUPERIOR_DEFENSE_NAME_RU, 'Совершенная защита')
assert.equal(BODY_AND_MIND_NAME_RU, 'Тело и разум')
assert.equal(SLOW_FALL_NAME_RU, 'Медленное падение')
assert.equal(EMPOWERED_STRIKES_NAME_RU, 'Усиленные удары')

assert.equal(martialArtsDie2024(1), '1к6')
assert.equal(martialArtsDie2024(4), '1к6')
assert.equal(martialArtsDie2024(5), '1к8')
assert.equal(martialArtsDie2024(10), '1к8')
assert.equal(martialArtsDie2024(11), '1к10')
assert.equal(martialArtsDie2024(16), '1к10')
assert.equal(martialArtsDie2024(17), '1к12')
assert.equal(martialArtsDie2024(20), '1к12')

assert.equal(unarmoredMovementBonusFt2024(1), 0)
assert.equal(unarmoredMovementBonusFt2024(2), 10)
assert.equal(unarmoredMovementBonusFt2024(5), 10)
assert.equal(unarmoredMovementBonusFt2024(6), 15)
assert.equal(unarmoredMovementBonusFt2024(10), 20)
assert.equal(unarmoredMovementBonusFt2024(14), 25)
assert.equal(unarmoredMovementBonusFt2024(18), 30)

assert.equal(flurryStrikeCount2024(9), 2)
assert.equal(flurryStrikeCount2024(10), 3)

assert.equal(focusPointsMax2024(1), 0)
assert.equal(focusPointsMax2024(2), 2)
assert.equal(focusPointsMax2024(11), 11)
assert.equal(focusPointsMax2024(20), 20)

assert.deepEqual(bodyAndMindAbilityBonus2024(19), { dex: 0, wis: 0, cap: 0 })
assert.deepEqual(bodyAndMindAbilityBonus2024(20), { dex: 4, wis: 4, cap: 25 })

assert.equal(focusSaveDc2024(3, 4), 15)
assert.equal(patientDefenseTempHpDice2024(9), null)
assert.equal(patientDefenseTempHpDice2024(10), '2к8')
assert.equal(patientDefenseTempHpDice2024(17), '2к12')

assert.equal(monk2024Context({ rulesEdition: '2014', monkLevel: 5 }), null)
assert.ok(monk2024Context({ rulesEdition: '2024', monkLevel: 5 }))

function focusRow(used: number, max = 10): SheetResource {
  return {
    id: 'feat:monk:focus_points:entry1',
    name: FOCUS_POINTS_NAME_RU,
    max,
    used,
    reset: 'short',
  }
}

{
  const free = applyMonk2024FeatureUse({
    featureId: 'patient-defense',
    resourceId: null,
    resources: [focusRow(0)],
    classEntryId: 'entry1',
    monkLevel: 5,
    mode: 'free',
  })
  assert.equal(free.ok, true)
  assert.equal(free.focusCost ?? 0, 0)
  assert.equal(findFocusResource(free.resources)?.used, 0)

  const paid = applyMonk2024FeatureUse({
    featureId: 'patient-defense',
    resourceId: null,
    resources: [focusRow(0)],
    classEntryId: 'entry1',
    monkLevel: 10,
    mode: 'paid',
  })
  assert.equal(paid.ok, true)
  assert.equal(paid.focusCost, 1)
  assert.equal(paid.diceExpression, '2к8')
  assert.equal(findFocusResource(paid.resources)?.used, 1)
}

{
  const freeStep = applyMonk2024FeatureUse({
    featureId: 'step-of-the-wind',
    resourceId: null,
    resources: [focusRow(0)],
    classEntryId: 'entry1',
    monkLevel: 5,
    mode: 'free',
  })
  assert.equal(freeStep.ok, true)
  assert.equal(freeStep.focusCost ?? 0, 0)

  const paidStep = applyMonk2024FeatureUse({
    featureId: 'step-of-the-wind',
    resourceId: null,
    resources: [focusRow(0)],
    classEntryId: 'entry1',
    monkLevel: 10,
    mode: 'paid',
    choice: 'creature',
    target: 'союзник',
  })
  assert.equal(paidStep.ok, true)
  assert.equal(paidStep.focusCost, 1)
  assert.match(paidStep.message, /союзник/)
}

{
  const flurry = applyMonk2024FeatureUse({
    featureId: 'flurry-of-blows',
    resourceId: null,
    resources: [focusRow(0, 10)],
    classEntryId: 'entry1',
    monkLevel: 10,
  })
  assert.equal(flurry.ok, true)
  assert.equal(flurry.strikeCount, 3)
  assert.equal(flurry.focusCost, 1)

  const freeFlurry = applyMonk2024FeatureUse({
    featureId: 'flurry-of-blows',
    resourceId: null,
    resources: [focusRow(0, 10)],
    classEntryId: 'entry1',
    monkLevel: 17,
    cloakOfShadowsActive: true,
  })
  assert.equal(freeFlurry.ok, true)
  assert.equal(freeFlurry.focusCost, 0)
  assert.equal(findFocusResource(freeFlurry.resources)?.used, 0)
}

{
  // Level rollback thresholds: die / movement / flurry / focus max / body-and-mind
  assert.equal(martialArtsDie2024(4), '1к6')
  assert.notEqual(martialArtsDie2024(5), martialArtsDie2024(4))
  assert.equal(unarmoredMovementBonusFt2024(5), 10)
  assert.equal(unarmoredMovementBonusFt2024(6), 15)
  assert.equal(flurryStrikeCount2024(9), 2)
  assert.equal(flurryStrikeCount2024(10), 3)
  assert.equal(focusPointsMax2024(1), 0)
  assert.equal(focusPointsMax2024(2), 2)
  assert.equal(bodyAndMindAbilityBonus2024(19).dex, 0)
  assert.equal(bodyAndMindAbilityBonus2024(20).dex, 4)
}

{
  const spent = spendFocusPoints([focusRow(2, 8)], 'entry1', 3)
  assert.equal(spent.ok, true)
  if (spent.ok) {
    assert.equal(spent.focusUsed, 5)
    const back = returnFocusPoints(spent.resources, 'entry1', 2)
    assert.equal(back.ok, true)
    if (back.ok) assert.equal(back.focusUsed, 3)
  }
}

{
  const burst = applyMonk2024FeatureUse({
    featureId: 'elemental-burst',
    resourceId: null,
    resources: [focusRow(0, 10)],
    classEntryId: 'entry1',
    monkLevel: 6,
    choice: 'fire',
  })
  assert.equal(burst.ok, true)
  assert.equal(burst.focusCost, 2)
  assert.equal(findFocusResource(burst.resources)?.used, 2)
}

{
  const perfectBlocked = applyMonk2024FeatureUse({
    featureId: 'perfect-focus',
    resourceId: null,
    resources: [focusRow(8, 15)],
    classEntryId: 'entry1',
    monkLevel: 15,
    metabolismUsed: true,
  })
  assert.equal(perfectBlocked.ok, false)

  const perfectOk = applyMonk2024FeatureUse({
    featureId: 'perfect-focus',
    resourceId: null,
    resources: [focusRow(13, 15)], // remaining 2
    classEntryId: 'entry1',
    monkLevel: 15,
    metabolismUsed: false,
  })
  assert.equal(perfectOk.ok, true)
  assert.equal(findFocusResource(perfectOk.resources)?.used, 11) // remaining 4
}

console.log('monk2024Features selfcheck: ok')
