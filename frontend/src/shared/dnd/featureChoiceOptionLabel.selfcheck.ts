/**
 * Selfcheck: feature choice labels resolve RU catalogs (infusions/metamagic/…).
 * Run: npx tsx src/shared/dnd/featureChoiceOptionLabel.selfcheck.ts
 */

import { featureChoiceOptionLabel } from './featureChoiceOptionLabel'
import { infusionById } from './artificerInfusions'
import { metamagicById } from './sorcererMetamagic'
import { invocationById } from './warlockInvocations'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const enhanced = infusionById('enhanced_defense')
assert(enhanced, 'enhanced_defense infusion exists')
const infusionRu = featureChoiceOptionLabel('enhanced_defense')
assert(
  infusionRu === enhanced!.nameRu,
  `infusion label expected ${enhanced!.nameRu}, got ${infusionRu}`,
)
assert(
  !infusionRu.includes('_'),
  `infusion must not show snake_case id, got ${infusionRu}`,
)

const twin = metamagicById('twinned')
assert(twin, 'twinned metamagic exists')
const metaRu = featureChoiceOptionLabel('twinned')
assert(metaRu === twin!.nameRu, `metamagic label expected ${twin!.nameRu}, got ${metaRu}`)

const agonizing = invocationById('agonizing_blast')
assert(agonizing, 'agonizing_blast invocation exists')
const invRu = featureChoiceOptionLabel('agonizing_blast')
assert(
  invRu === agonizing!.nameRu,
  `invocation label expected ${agonizing!.nameRu}, got ${invRu}`,
)

const fromPack = featureChoiceOptionLabel('custom_opt', {
  option_labels_ru: { custom_opt: 'Кастомный вариант' },
})
assert(fromPack === 'Кастомный вариант', 'pack option_labels_ru wins')

const unknown = featureChoiceOptionLabel('totally_unknown_option_xyz')
assert(unknown === 'totally_unknown_option_xyz', 'unknown falls back to id')

console.log('featureChoiceOptionLabel.selfcheck: ok')
