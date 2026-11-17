/** Run: npx tsx --tsconfig tsconfig.app.json src/shared/dnd/bardicInspirationTarget2024.selfcheck.ts */
import assert from 'node:assert/strict'
import {
  buildBuffEffect,
  formatEffectChipFace,
  listRollDieChips,
} from './activeEffects'
import * as target from './bardicInspirationTarget2024'

/* 2014 duration + auto chips unchanged */
{
  const bi2014 = buildBuffEffect({
    slug: 'bardic_inspiration',
    name: 'Бардовское вдохновение',
    option: '1к8',
    edition: '2014',
  })!
  assert.equal(bi2014.duration.unit, 'minutes')
  assert.equal(bi2014.duration.value, 10)
  const chips = listRollDieChips([bi2014], 'check')
  assert.ok(chips.some((c) => c.dice === '1d8'), '2014 BI auto-adds to check')
  assert.ok(
    !chips.some((c) => String(c.condition || '') === 'after_failed_d20'),
    '2014 has no after_failed_d20 condition on chips',
  )
}

/* 2024: 1 hour, after-fail condition, die on chip face, no auto roll chip */
{
  const bi2024 = buildBuffEffect({
    slug: 'bardic_inspiration',
    name: 'Бардовское вдохновение',
    option: '1к10',
    edition: '2024',
  })!
  assert.equal(bi2024.duration.unit, 'hours')
  assert.equal(bi2024.duration.value, 1)
  assert.ok(
    (bi2024.mods ?? []).some(
      (m) => String(m.condition || '') === target.BI_AFTER_FAILED_D20_CONDITION,
    ),
    '2024 BI mods carry after_failed_d20',
  )
  assert.equal(listRollDieChips([bi2024], 'check').length, 0, '2024 BI not auto-rolled')
  assert.equal(listRollDieChips([bi2024], 'attack').length, 0)
  assert.equal(listRollDieChips([bi2024], 'save').length, 0)
  assert.match(formatEffectChipFace(bi2024), /1к10/)
  assert.equal(target.bardicInspirationDieFromEffect(bi2024), '1d10')
  assert.equal(target.bardicDieLabelRu('1d10'), '1к10')
}

/* Valor 2024: AC + damage modes on the same granted die */
{
  const valor = buildBuffEffect({
    slug: 'bardic_inspiration',
    option: '1к6',
    edition: '2024',
    combatInspiration: true,
  })!
  assert.equal(target.bardicInspirationAllowsCombatAc(valor), true)
  assert.equal(target.bardicInspirationAllowsCombatDamage(valor), true)
  assert.equal(listRollDieChips([valor], 'damage').length, 0, 'Valor damage is panel spend')
}

/* Spend after fail: roll + consume */
{
  const bi = buildBuffEffect({
    slug: 'bardic_inspiration',
    option: '1d8',
    edition: '2024',
  })!
  const spent = target.spendBardicInspirationOnTarget({
    effects: [bi],
    mode: 'after_fail',
    rng: () => 0.99, // face = sides
  })
  assert.equal(spent.ok, true)
  assert.equal(spent.face, 8)
  assert.equal(spent.dieLabelRu, '1к8')
  assert.equal(spent.effects.length, 0)
  assert.match(spent.feedLineRu ?? '', /Тесту к20/)
}

/* Combat AC spend */
{
  const bi = buildBuffEffect({
    slug: 'bardic_inspiration',
    option: '1d12',
    edition: '2024',
    combatInspiration: true,
  })!
  const spent = target.spendBardicInspirationOnTarget({
    effects: [bi],
    mode: 'combat_ac',
    rng: () => 0,
  })
  assert.equal(spent.ok, true)
  assert.equal(spent.face, 1)
  assert.equal(spent.effects.length, 0)
}

/* Non-valor cannot spend combat modes */
{
  const bi = buildBuffEffect({
    slug: 'bardic_inspiration',
    option: '1d6',
    edition: '2024',
    combatInspiration: false,
  })!
  assert.equal(
    target.spendBardicInspirationOnTarget({ effects: [bi], mode: 'combat_damage' }).ok,
    false,
  )
}

/* findSpendable skips inactive */
{
  const bi = buildBuffEffect({
    slug: 'bardic_inspiration',
    option: '1d6',
    edition: '2024',
  })!
  bi.inactive = true
  assert.equal(target.findSpendableBardicInspirationEffect([bi]), null)
}

console.log('bardicInspirationTarget2024.selfcheck ok')
