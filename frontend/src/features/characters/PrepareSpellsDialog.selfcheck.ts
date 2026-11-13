/** Run: npx tsx src/features/characters/PrepareSpellsDialog.selfcheck.ts */
import { formatNamedPrepareBudgets } from '../../shared/dnd/castProfiles'
import type { SpellLearnBudget } from '../../shared/dnd/casterProgression'
import {
  canPrepareSpell,
  countPreparedLeveledBySlug,
  createSheetSpell,
  setSpellPrepared,
  type SheetSpell,
} from './spells'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const budgets: SpellLearnBudget[] = [
  {
    mode: 'spellbook',
    slug: 'wizard',
    labelRu: 'Волшебник',
    cantrips: 4,
    leveledKnown: 10,
    maxPrepared: 8,
  },
  {
    mode: 'prepared_list',
    slug: 'cleric',
    labelRu: 'Жрец',
    cantrips: 3,
    leveledKnown: null,
    maxPrepared: 9,
  },
  {
    mode: 'prepared_list',
    slug: 'paladin',
    labelRu: 'Паладин',
    cantrips: 0,
    leveledKnown: null,
    maxPrepared: 6,
  },
]

const known: SheetSpell[] = [
  {
    ...createSheetSpell(),
    id: 'w1',
    name: 'Щит',
    level: 1,
    prepared: true,
    class_slug: 'wizard',
    in_spellbook: true,
  },
  {
    ...createSheetSpell(),
    id: 'w2',
    name: 'Туманное облако',
    level: 1,
    prepared: false,
    class_slug: 'wizard',
    in_spellbook: true,
  },
  {
    ...createSheetSpell(),
    id: 'c1',
    name: 'Лечение ран',
    level: 1,
    prepared: true,
    class_slug: 'cleric',
    in_spellbook: true,
  },
]

const bySlug = countPreparedLeveledBySlug(known)
assert(bySlug.wizard === 1, `wizard prepared got ${bySlug.wizard}`)
assert(bySlug.cleric === 1, `cleric prepared got ${bySlug.cleric}`)

const named = formatNamedPrepareBudgets(budgets, bySlug)
assert(
  named === 'подг. Волшебник 1/8 · Жрец 1/9 · Паладин 0/6',
  `U03 named prepare got ${named}`,
)

const wizardCap = budgets.find((row) => row.slug === 'wizard')!.maxPrepared!
assert(
  canPrepareSpell(known, known[1]!, wizardCap, { scopeSlug: 'wizard' }),
  'wizard still under per-class cap',
)
assert(
  !canPrepareSpell(
    [
      ...known,
      ...Array.from({ length: 7 }, (_, i) => ({
        ...createSheetSpell(),
        id: `w-fill-${i}`,
        name: `W${i}`,
        level: 1,
        prepared: true,
        class_slug: 'wizard',
        in_spellbook: true,
      })),
    ],
    known[1]!,
    wizardCap,
    { scopeSlug: 'wizard' },
  ),
  'wizard blocked at per-class cap even if other classes have room',
)

const next = setSpellPrepared(known, 'w2', true, wizardCap, { scopeSlug: 'wizard' })
assert(next.find((row) => row.id === 'w2')?.prepared === true, 'prepare under class cap')

console.log('PrepareSpellsDialog.selfcheck: ok')
