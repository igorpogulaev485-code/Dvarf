/**
 * npx tsx src/shared/dnd/alignments.selfcheck.ts
 * Run from frontend/.
 */
import {
  ALIGNMENTS,
  alignmentMatchesRequirement,
  alignmentNeedsClarification,
  alignmentSheetLabel,
  recognizeAlignment,
} from './alignments.ts'

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

assert(ALIGNMENTS.length === 10, '9 alignments + unaligned')
assert(ALIGNMENTS[0]?.nameRu === 'Законно-добрый', 'PHB lawful good')
assert(ALIGNMENTS[4]?.nameRu === 'Нейтральный', 'true neutral name')
assert(ALIGNMENTS[9]?.slug === 'unaligned', 'unaligned last')

const cases: Array<[string, string]> = [
  ['Законно-добрый', 'lawful_good'],
  ['законопослушный добрый', 'lawful_good'],
  ['ЗД', 'lawful_good'],
  ['LG', 'lawful_good'],
  ['Lawful Good', 'lawful_good'],
  ['lawful_good', 'lawful_good'],
  ['Истинно нейтральный', 'neutral'],
  ['Нейтральный', 'neutral'],
  ['N', 'neutral'],
  ['TN', 'neutral'],
  ['Хаотично-нейтральный', 'chaotic_neutral'],
  ['без мировоззрения', 'unaligned'],
  ['Unaligned', 'unaligned'],
]
for (const [text, slug] of cases) {
  assert(recognizeAlignment(text) === slug, `${text} → ${slug}`)
}

assert(recognizeAlignment('добрый парень') === null, 'unknown text stays unknown')
assert(
  alignmentNeedsClarification({ alignment: '', alignmentText: 'добрый парень' }),
  'hint when unrecognized',
)
assert(
  alignmentSheetLabel({ alignment: 'lawful_good', alignmentText: '' }) === 'Законно-добрый',
  'slug prints the Russian name',
)
assert(alignmentMatchesRequirement('lawful_good', 'good'), 'lawful good is good')
assert(!alignmentMatchesRequirement('lawful_neutral', 'good'), 'lawful neutral is not good')
assert(alignmentMatchesRequirement('lawful_neutral', 'neutral'), 'gray robe axis')
assert(!alignmentMatchesRequirement('unaligned', 'good'), 'unaligned is not good')

console.log('alignments.selfcheck: ok')
