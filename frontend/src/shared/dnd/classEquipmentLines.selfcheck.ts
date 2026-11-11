/**
 * Run: npx tsx src/shared/dnd/classEquipmentLines.selfcheck.ts
 */
import {
  CLASS_EQUIPMENT_LINES,
  CLASS_STARTING_EQUIPMENT,
  buildItemsFromEquipmentLines,
  equipmentPackagesFor,
  resolveClassGrantDef,
  validateEquipmentLinePicks,
  type ClassEquipmentLinePick,
  type ClassGrantDef,
} from './classGrants'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const CORE_SLUGS = [
  'barbarian',
  'bard',
  'cleric',
  'druid',
  'fighter',
  'monk',
  'paladin',
  'ranger',
  'rogue',
  'sorcerer',
  'warlock',
  'wizard',
  'artificer',
] as const

for (const slug of CORE_SLUGS) {
  const lines = CLASS_EQUIPMENT_LINES[slug]
  assert(lines && lines.length > 0, `${slug}: must have PHB equipment lines`)
  for (const line of lines) {
    assert(line.options.length > 0, `${slug}/${line.id}: empty options`)
  }
  const packs = CLASS_STARTING_EQUIPMENT[slug] ?? []
  assert(
    packs.every((pack) => pack.id === 'gold' || pack.items.length === 0),
    `${slug}: starting packages should be gold-only when lines exist`,
  )
}

// Cleric: line picks still build shield + symbol + mace path.
const clericLines = CLASS_EQUIPMENT_LINES.cleric!
const clericPicks: Record<string, ClassEquipmentLinePick> = {
  weapon: { optionId: 'mace' },
  armor: { optionId: 'leather' },
  ranged: { optionId: 'any_simple', weaponName: 'Дубинка' },
  pack: { optionId: 'priest' },
  fixed: { optionId: 'shield_symbol' },
}
assert(
  validateEquipmentLinePicks({ lines: clericLines, picks: clericPicks }) === null,
  'cleric line picks valid',
)
const clericItems = buildItemsFromEquipmentLines({ lines: clericLines, picks: clericPicks })
assert(clericItems, 'cleric items built')
assert(
  clericItems.some((row) => row.name === 'Дубинка'),
  'cleric any-simple weapon applied',
)
assert(
  clericItems.some((row) => row.name === 'Щит'),
  'cleric shield applied',
)

// Fighter: two martial weapons + chain.
const fighterLines = CLASS_EQUIPMENT_LINES.fighter!
const fighterPicks: Record<string, ClassEquipmentLinePick> = {
  armor: { optionId: 'chain' },
  weapons: {
    optionId: 'two_martial',
    weaponNames: ['Длинный меч', 'Боевой топор'],
  },
  ranged: { optionId: 'handaxes' },
  pack: { optionId: 'explorer' },
}
assert(
  validateEquipmentLinePicks({ lines: fighterLines, picks: fighterPicks }) === null,
  'fighter two-weapon picks valid',
)
const fighterItems = buildItemsFromEquipmentLines({ lines: fighterLines, picks: fighterPicks })
assert(fighterItems, 'fighter items built')
assert(
  fighterItems.filter((row) => row.name === 'Длинный меч' || row.name === 'Боевой топор')
    .length === 2,
  'fighter two martial weapons applied',
)
assert(
  validateEquipmentLinePicks({
    lines: fighterLines,
    picks: { ...fighterPicks, weapons: { optionId: 'two_martial', weaponNames: ['Длинный меч'] } },
  })?.includes('1/2'),
  'fighter incomplete two-weapon pick blocked',
)

// equipmentPackagesFor hides A/B when lines exist (even if catalog still has them).
const fakeDef = {
  slug: 'fighter',
  labelRu: 'Воин',
  equipment: [
    {
      id: 'a',
      labelRu: 'Вариант A',
      summary: 'legacy pack',
      items: [{ name: 'Кольчуга', qty: 1, armor_kind: 'heavy' as const }],
    },
    {
      id: 'gold',
      labelRu: 'Золото',
      summary: 'gold',
      items: [],
      coinsGp: 125,
    },
  ],
} as ClassGrantDef
const visible = equipmentPackagesFor(fakeDef)
assert(
  visible.every((pack) => pack.id === 'gold'),
  'legacy A/B packs hidden when lines exist',
)

// resolveClassGrantDef still returns a def for known local slug fallbacks.
const local = resolveClassGrantDef({ className: 'Воин', catalogSlug: 'fighter' })
assert(local?.slug === 'fighter', 'local fighter def resolves')

console.log('classEquipmentLines.selfcheck: ok')
