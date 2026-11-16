/** Run: npx tsx --tsconfig tsconfig.app.json src/shared/dnd/warlock2024Features.selfcheck.ts */
import assert from 'node:assert/strict'
import {
  canRepickFiendishResilience2024,
  hasPactOfTheTome2024,
  PACT_TOME_RITUALS_FEATURE_ID_2024,
  readPactTomePicks2024,
  savePactTomePicks2024,
  applyMagicalCunning2024,
  applyWarlock2024FeatureUse,
  arcanumCirclesForWarlockLevel2024,
  celestialResilienceTempHp2024,
  contactPatronAlwaysPrepared2024,
  darkOnesBlessingTempHp2024,
  FALSE_LIFE_MAX_TEMP_HP_2024,
  invocationPickGainAtLevel2024,
  isWarlockClassSlug,
  MAGICAL_CUNNING_NAME_RU,
  CONTACT_PATRON_NAME_RU,
  MYSTIC_ARCANUM_NAME_RU,
  ELDRITCH_MASTER_NAME_RU,
  ELDRITCH_INVOCATIONS_NAME_RU,
  PACT_MAGIC_NAME_RU,
  STEPS_OF_THE_FEY_NAME_RU,
  MISTY_ESCAPE_NAME_RU,
  BEGUILING_DEFENSES_NAME_RU,
  BEWITCHING_MAGIC_NAME_RU,
  AWAKENED_MIND_NAME_RU,
  PSYCHIC_SPELLS_NAME_RU,
  CLAIRVOYANT_COMBATANT_NAME_RU,
  ELDRITCH_HEX_NAME_RU,
  THOUGHT_SHIELD_NAME_RU,
  CREATE_THRALL_NAME_RU,
  DARK_ONES_BLESSING_NAME_RU,
  DARK_ONES_OWN_LUCK_NAME_RU,
  FIENDISH_RESILIENCE_NAME_RU,
  HURL_THROUGH_HELL_NAME_RU,
  HEALING_LIGHT_NAME_RU,
  RADIANT_SOUL_NAME_RU,
  CELESTIAL_RESILIENCE_NAME_RU,
  SEARING_VENGEANCE_NAME_RU,
  validateInvocationReplace2024,
  warlock2024ArcanumCircleFromId,
  warlock2024Context,
  warlock2024UseFeatureId,
  WARLOCK_2024_CARD_BUTTONS,
  type WarlockPactSlots2024,
} from './warlock2024Features'
import type { SheetResource } from './rest'

assert.equal(ELDRITCH_INVOCATIONS_NAME_RU, 'Таинственные воззвания')
assert.equal(PACT_MAGIC_NAME_RU, 'Магия договора')
assert.equal(MAGICAL_CUNNING_NAME_RU, 'Магическая искусность')
assert.equal(CONTACT_PATRON_NAME_RU, 'Связь с покровителем')
assert.equal(MYSTIC_ARCANUM_NAME_RU, 'Таинственный арканум')
assert.equal(ELDRITCH_MASTER_NAME_RU, 'Таинственный мастер')
assert.equal(STEPS_OF_THE_FEY_NAME_RU, 'Шаг феи')
assert.equal(MISTY_ESCAPE_NAME_RU, 'Туманное исчезновение')
assert.equal(BEGUILING_DEFENSES_NAME_RU, 'Чарующая защита')
assert.equal(BEWITCHING_MAGIC_NAME_RU, 'Завораживающая магия')
assert.equal(AWAKENED_MIND_NAME_RU, 'Пробуждённый разум')
assert.equal(PSYCHIC_SPELLS_NAME_RU, 'Психические заклинания')
assert.equal(CLAIRVOYANT_COMBATANT_NAME_RU, 'Провидящий боец')
assert.equal(ELDRITCH_HEX_NAME_RU, 'Мистический сглаз')
assert.equal(THOUGHT_SHIELD_NAME_RU, 'Ментальный щит')
assert.equal(CREATE_THRALL_NAME_RU, 'Порабощение')
assert.equal(DARK_ONES_BLESSING_NAME_RU, 'Благословение темнейшего')
assert.equal(DARK_ONES_OWN_LUCK_NAME_RU, 'Удача темнейшего')
assert.equal(FIENDISH_RESILIENCE_NAME_RU, 'Устойчивость исчадия')
assert.equal(HURL_THROUGH_HELL_NAME_RU, 'Бросок через преисподнюю')
assert.equal(HEALING_LIGHT_NAME_RU, 'Лечащий свет')
assert.equal(RADIANT_SOUL_NAME_RU, 'Сияющая душа')
assert.equal(CELESTIAL_RESILIENCE_NAME_RU, 'Небесная стойкость')
assert.equal(SEARING_VENGEANCE_NAME_RU, 'Опаляющее возмездие')

assert.equal(isWarlockClassSlug('warlock'), true)
assert.equal(isWarlockClassSlug('Колдун'), true)
assert.equal(isWarlockClassSlug('sorcerer'), false)
assert.equal(warlock2024Context({ rulesEdition: '2014', warlockLevel: 5 }), null)
assert.equal(warlock2024Context({ rulesEdition: '2024', warlockLevel: 20 })?.hasEldritchMaster, true)
assert.deepEqual(warlock2024Context({ rulesEdition: '2024', warlockLevel: 13 })?.arcanumCircles, [6, 7])

// Magical Cunning: half (round up) vs full at 20.
{
  const pact: WarlockPactSlots2024 = { max: 3, used: 3, level: 2 }
  const half = applyMagicalCunning2024({ warlockLevel: 5, pact, cunningUsed: 0, cunningMax: 1 })
  assert.equal(half.ok, true)
  if (half.ok) {
    assert.equal(half.restored, 2)
    assert.equal(half.pact.used, 1)
  }
  const partial = applyMagicalCunning2024({
    warlockLevel: 5,
    pact: { max: 4, used: 1, level: 2 },
    cunningUsed: 0,
    cunningMax: 1,
  })
  assert.equal(partial.ok && partial.restored, 1)
  const full = applyMagicalCunning2024({
    warlockLevel: 20,
    pact: { max: 4, used: 4, level: 5 },
    cunningUsed: 0,
    cunningMax: 1,
  })
  assert.equal(full.ok && full.restored, 4)
  assert.equal(full.ok && full.pact.used, 0)
  assert.equal(
    applyMagicalCunning2024({ warlockLevel: 5, pact, cunningUsed: 1, cunningMax: 1 }).ok,
    false,
  )
  assert.equal(
    applyMagicalCunning2024({
      warlockLevel: 5,
      pact: { max: 2, used: 0, level: 1 },
      cunningUsed: 0,
      cunningMax: 1,
    }).ok,
    false,
  )
  assert.equal(
    applyMagicalCunning2024({ warlockLevel: 5, pact: null, cunningUsed: 0, cunningMax: 1 }).ok,
    false,
  )
}

const pool = (poolId: string, max = 1, used = 0): SheetResource => ({
  id: `feat:warlock:${poolId}:${poolId}`,
  name: poolId,
  max,
  used,
  reset: 'long',
})
const base = { classEntryId: 'entry1', resourceId: null as string | null }

// Magical Cunning via apply (resources + pact_slots).
{
  const res = applyWarlock2024FeatureUse({
    ...base,
    featureId: 'magical_cunning',
    resources: [pool('magical_cunning')],
    warlockLevel: 2,
    pactSlots: { max: 2, used: 2, level: 1 },
  })
  assert.equal(res.ok, true)
  assert.equal(res.pact_slots?.used, 1)
  assert.equal(res.resources[0]!.used, 1)
  const again = applyWarlock2024FeatureUse({
    ...base,
    featureId: 'magical-cunning',
    resources: res.resources,
    warlockLevel: 2,
    pactSlots: res.pact_slots ?? null,
  })
  assert.equal(again.ok, false)
}

// Contact Patron.
assert.deepEqual(contactPatronAlwaysPrepared2024(8), [])
assert.deepEqual(contactPatronAlwaysPrepared2024(9), ['contact-other-plane'])
{
  const res = applyWarlock2024FeatureUse({
    ...base,
    featureId: 'contact-patron',
    resources: [pool('contact_patron')],
    warlockLevel: 9,
    pactSlots: null,
  })
  assert.equal(res.ok, true)
  assert.equal(res.resources[0]!.used, 1)
  assert.match(res.message, /автоматически успешен/)
}

// Arcanum circles.
assert.deepEqual(arcanumCirclesForWarlockLevel2024(10), [])
assert.deepEqual(arcanumCirclesForWarlockLevel2024(11), [6])
assert.deepEqual(arcanumCirclesForWarlockLevel2024(13), [6, 7])
assert.deepEqual(arcanumCirclesForWarlockLevel2024(15), [6, 7, 8])
assert.deepEqual(arcanumCirclesForWarlockLevel2024(17), [6, 7, 8, 9])
assert.equal(warlock2024ArcanumCircleFromId('mystic_arcanum_8'), 8)
assert.equal(warlock2024UseFeatureId('mystic_arcanum_9'), 'mystic-arcanum')
{
  const resources = [pool('mystic_arcanum_6'), pool('mystic_arcanum_7')]
  const cast = applyWarlock2024FeatureUse({
    ...base,
    featureId: 'mystic_arcanum_7',
    resources,
    warlockLevel: 13,
    pactSlots: null,
  })
  assert.equal(cast.ok, true)
  assert.equal(cast.resources[1]!.used, 1)
  assert.equal(cast.resources[0]!.used, 0)
  const back = applyWarlock2024FeatureUse({
    ...base,
    featureId: 'mystic-arcanum',
    circle: 7,
    mode: 'return',
    resources: cast.resources,
    warlockLevel: 13,
    pactSlots: null,
  })
  assert.equal(back.ok && back.resources[1]!.used, 0)
  const locked = applyWarlock2024FeatureUse({
    ...base,
    featureId: 'mystic_arcanum_8',
    resources,
    warlockLevel: 13,
    pactSlots: null,
  })
  assert.equal(locked.ok, false)
}

// Dark One's Blessing / Celestial Resilience.
assert.equal(darkOnesBlessingTempHp2024({ chaMod: 3, warlockLevel: 5 }), 8)
assert.equal(darkOnesBlessingTempHp2024({ chaMod: -5, warlockLevel: 3 }), 1)
assert.deepEqual(celestialResilienceTempHp2024({ chaMod: 3, warlockLevel: 6 }), { self: 9, allies: 6 })

// Healing Light cap.
{
  const resources = [pool('healing_light', 6, 0)]
  const ok = applyWarlock2024FeatureUse({
    ...base,
    featureId: 'healing-light',
    resources,
    warlockLevel: 5,
    chaMod: 3,
    amount: 3,
    pactSlots: null,
  })
  assert.equal(ok.ok, true)
  assert.equal(ok.resources[0]!.used, 3)
  assert.equal(ok.diceExpression, '3к6')
  const over = applyWarlock2024FeatureUse({
    ...base,
    featureId: 'healing-light',
    resources,
    warlockLevel: 5,
    chaMod: 2,
    amount: 3,
    pactSlots: null,
  })
  assert.equal(over.ok, false)
}

// Steps of the Fey modes by level.
{
  const resources = [pool('steps_of_the_fey', 3, 0)]
  const input = { ...base, featureId: 'steps-of-the-fey', resources, pactSlots: null }
  assert.equal(applyWarlock2024FeatureUse({ ...input, warlockLevel: 3, mode: 'refreshing' }).ok, true)
  assert.equal(applyWarlock2024FeatureUse({ ...input, warlockLevel: 3, mode: 'provoking' }).ok, true)
  assert.equal(applyWarlock2024FeatureUse({ ...input, warlockLevel: 3, mode: 'concealing' }).ok, false)
  assert.equal(applyWarlock2024FeatureUse({ ...input, warlockLevel: 6, mode: 'terrifying' }).ok, true)
}

// Recover with pact slot.
{
  const spent = [pool('hurl_through_hell', 1, 1)]
  const res = applyWarlock2024FeatureUse({
    ...base,
    featureId: 'hurl-through-hell',
    mode: 'recover',
    resources: spent,
    warlockLevel: 14,
    pactSlots: { max: 3, used: 1, level: 5 },
  })
  assert.equal(res.ok, true)
  assert.equal(res.pact_slots?.used, 2)
  assert.equal(res.resources[0]!.used, 0)
  const none = applyWarlock2024FeatureUse({
    ...base,
    featureId: 'hurl-through-hell',
    mode: 'recover',
    resources: spent,
    warlockLevel: 14,
    pactSlots: { max: 3, used: 3, level: 5 },
  })
  assert.equal(none.ok, false)
}

// Fiendish Resilience / Armor of Shadows / Fiendish Vigor.
{
  const res = applyWarlock2024FeatureUse({
    ...base,
    featureId: 'fiendish-resilience',
    choice: 'fire',
    resources: [],
    warlockLevel: 6,
    pactSlots: null,
    featurePicks: { values: {} },
  })
  assert.equal(res.ok, true)
  assert.equal(res.featurePicks?.values['entry1:fiendish_resilience'], 'fire')
  assert.equal(
    applyWarlock2024FeatureUse({
      ...base,
      featureId: 'fiendish-resilience',
      choice: 'force',
      resources: [],
      warlockLevel: 6,
      pactSlots: null,
    }).ok,
    false,
  )
  const armor = applyWarlock2024FeatureUse({
    ...base,
    featureId: 'armor-of-shadows',
    resources: [],
    warlockLevel: 1,
    pactSlots: null,
    featurePicks: { values: {} },
  })
  assert.equal(armor.featurePicks?.values['entry1:armor_of_shadows'], 'on')
  assert.deepEqual(armor.activeLabels, ['Доспех теней'])
  const off = applyWarlock2024FeatureUse({
    ...base,
    featureId: 'armor-of-shadows',
    resources: [],
    warlockLevel: 1,
    pactSlots: null,
    featurePicks: armor.featurePicks,
  })
  assert.equal(off.featurePicks?.values['entry1:armor_of_shadows'], undefined)
  const vigor = applyWarlock2024FeatureUse({
    ...base,
    featureId: 'fiendish-vigor',
    resources: [],
    warlockLevel: 2,
    pactSlots: null,
  })
  assert.equal(vigor.tempHp, FALSE_LIFE_MAX_TEMP_HP_2024)
}

// Invocation pick gains.
assert.equal(invocationPickGainAtLevel2024(1), 1)
assert.equal(invocationPickGainAtLevel2024(2), 2)
assert.equal(invocationPickGainAtLevel2024(3), 0)
assert.equal(invocationPickGainAtLevel2024(5), 2)
assert.equal(invocationPickGainAtLevel2024(7), 1)
assert.equal(invocationPickGainAtLevel2024(18), 1)

// Replace validation.
{
  const known = ['pact-of-the-blade', 'thirsting-blade', 'devils-sight']
  const strip = validateInvocationReplace2024({ known, removeId: 'pact-of-the-blade' })
  assert.equal(strip.ok, false)
  if (!strip.ok) assert.deepEqual(strip.blockedBy, ['thirsting-blade'])
  const chain = validateInvocationReplace2024({
    known: [...known, 'devouring-blade'],
    removeId: 'thirsting-blade',
  })
  assert.equal(chain.ok, false)
  assert.equal(validateInvocationReplace2024({ known, removeId: 'devils-sight' }).ok, true)
  assert.equal(
    validateInvocationReplace2024({
      known: ['pact-of-the-tome', 'devils-sight'],
      removeId: 'devils-sight',
      addId: 'thirsting-blade',
      warlockLevel: 5,
    }).ok,
    false,
  )
}

for (const id of [
  'magical-cunning',
  'contact-patron',
  'mystic-arcanum',
  'mystic_arcanum_6',
  'eldritch-master',
  'steps-of-the-fey',
  'misty-escape',
  'beguiling-defenses',
  'bewitching-magic',
  'awakened-mind',
  'clairvoyant-combatant',
  'healing-light',
  'dark-ones-own-luck',
  'dark-ones-blessing',
  'fiendish-resilience',
  'hurl-through-hell',
  'searing-vengeance',
  'celestial-resilience',
  'armor-of-shadows',
  'fiendish-vigor',
]) {
  assert.ok(WARLOCK_2024_CARD_BUTTONS[id], `button for ${id}`)
  assert.ok(warlock2024UseFeatureId(id), `route for ${id}`)
}

assert.equal(hasPactOfTheTome2024(['pact-of-the-tome', 'devils-sight']), true)
assert.equal(hasPactOfTheTome2024(['pact-of-the-blade']), false)
assert.equal(hasPactOfTheTome2024(undefined), false)
assert.equal(PACT_TOME_RITUALS_FEATURE_ID_2024, 'pact_tome_rituals')

const tomePicks = { values: {} }
assert.equal(savePactTomePicks2024(tomePicks, 'w1', ['a', 'b'], ['x', 'y']), null)
assert.equal(savePactTomePicks2024(tomePicks, 'w1', ['a', 'b', 'c'], ['x']), null)
const savedTome = savePactTomePicks2024(tomePicks, 'w1', ['a', 'b', 'c'], ['x', 'y'])
assert.ok(savedTome)
assert.deepEqual(readPactTomePicks2024(savedTome, 'w1'), {
  cantrips: ['a', 'b', 'c'],
  rituals: ['x', 'y'],
})
assert.equal(savedTome.values['w1:pact_tome_rituals'], 'x,y')

assert.equal(
  canRepickFiendishResilience2024({ subclassSlug: 'warlock__fiend-patron', warlockLevel: 10 }),
  true,
)
assert.equal(
  canRepickFiendishResilience2024({ subclassSlug: 'warlock__fiend-patron', warlockLevel: 9 }),
  false,
)
assert.equal(
  canRepickFiendishResilience2024({ subclassSlug: 'warlock__archfey-patron', warlockLevel: 12 }),
  false,
)

console.log('warlock2024Features.selfcheck: ok')
