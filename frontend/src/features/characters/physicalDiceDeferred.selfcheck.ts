/**
 * Static contract for deferred physical-dice paths.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/physicalDiceDeferred.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  divineSmiteEnterOwnFormula,
  formatDivineSmitePhysicalChip,
  hitDieEnterOwnFormula,
} from './physicalDiceDeferred.ts'

const here = dirname(fileURLToPath(import.meta.url))
const attacks = readFileSync(join(here, 'PlayDeskAttacksCompact.tsx'), 'utf8')
const header = readFileSync(join(here, 'PlayDeskHeader.tsx'), 'utf8')
const hpPad = readFileSync(join(here, 'HpPadDialog.tsx'), 'utf8')
const mobile = readFileSync(join(here, 'MobileVitalsBar.tsx'), 'utf8')
const rest = readFileSync(join(here, 'RestDialog.tsx'), 'utf8')
const top = readFileSync(join(here, 'minimalSheet/PlayDeskTop.tsx'), 'utf8')
const rolls = readFileSync(join(here, 'minimalSheet/SheetDialogsRolls.tsx'), 'utf8')
const host = readFileSync(join(here, 'TurnEconomyDeskHost.tsx'), 'utf8')
const layout = readFileSync(join(here, 'minimalSheet/PlayDeskLayout.tsx'), 'utf8')
const companions = readFileSync(join(here, 'CompanionsPanel.tsx'), 'utf8')
const companionsCompact = readFileSync(join(here, 'PlayDeskCompanionsCompact.tsx'), 'utf8')

const spend: Parameters<typeof divineSmiteEnterOwnFormula>[0]['spend'] = {
  label_ru: 'Божественная кара',
  min_slot: 1,
  max_slot: 5,
  dice_base: 2,
  dice_per_slot_above: 1,
  dice_cap: 5,
  dice_size: 8,
}
const smite = divineSmiteEnterOwnFormula({
  spend,
  slotLevel: 1,
  vsUndeadOrFiend: false,
  crit: false,
})
assert.equal(smite.formulaRu, '2к8')
assert.match(smite.formula, /излучением/)
const smiteCrit = divineSmiteEnterOwnFormula({
  spend,
  slotLevel: 1,
  vsUndeadOrFiend: true,
  crit: true,
})
assert.equal(smiteCrit.formulaRu, '6к8') // (2+1 undead) ×2 crit
const chip = formatDivineSmitePhysicalChip({
  total: 11,
  formulaRu: '2к8',
  vsUndeadOrFiend: false,
  crit: false,
})
assert.match(chip.line, /Божественная кара/)
assert.equal(hitDieEnterOwnFormula('к10'), '1к10')
assert.equal(hitDieEnterOwnFormula('d8'), '1к8')

assert.match(attacks, /divineSmiteEnterOwnFormula/)
assert.match(attacks, /title: 'Божественная кара'/)
assert.match(attacks, /title: 'Оружие дыхания'/)
assert.match(attacks, /title: 'Природный удар'/)
assert.match(attacks, /followUpDamage/)
assert.doesNotMatch(
  attacks.slice(
    attacks.indexOf('Природный удар: раз за ход'),
    attacks.indexOf('Природный удар: раз за ход') + 800,
  ),
  /physicalDice: Boolean\(turnEco\?\.diceOnTable\)/,
)

assert.match(header, /title: 'Спас от смерти'/)
assert.match(hpPad, /title: 'Спас от смерти'/)
assert.match(hpPad, /hitDieEnterOwnFormula/)
assert.match(mobile, /title: 'Спас от смерти'/)
assert.match(rest, /hitDieEnterOwnFormula/)
assert.match(top, /title: 'Инициатива'/)
assert.match(rolls, /Героическое вдохновение/)
assert.match(rolls, /physicalDice: physical/)
assert.match(host, /title: 'Инициатива'/)
// Header / HP pad / rest must sit under TurnEconomyDeskHost (React context).
{
  const hostOpen = layout.indexOf('<TurnEconomyDeskHost')
  const hostClose = layout.indexOf('</TurnEconomyDeskHost>')
  const topIdx = layout.indexOf('<PlayDeskTop')
  const rollsIdx = layout.indexOf('<SheetDialogsRolls')
  const resourcesIdx = layout.indexOf('<SheetDialogsResources')
  assert.ok(hostOpen >= 0 && hostClose > hostOpen, 'TurnEconomyDeskHost wraps desk')
  assert.ok(topIdx > hostOpen && topIdx < hostClose, 'PlayDeskTop inside host')
  assert.ok(rollsIdx > hostOpen && rollsIdx < hostClose, 'SheetDialogsRolls inside host')
  assert.ok(
    resourcesIdx > hostOpen && resourcesIdx < hostClose,
    'SheetDialogsResources inside host',
  )
}
assert.match(companions, /diceOnTable && turnEco\.openEnterOwnNumber/)
assert.match(companionsCompact, /diceOnTable && turnEco\.openEnterOwnNumber/)

console.log('physicalDiceDeferred.selfcheck: ok')
