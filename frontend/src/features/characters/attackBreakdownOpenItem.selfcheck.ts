/** Run: npx tsx src/features/characters/attackBreakdownOpenItem.selfcheck.ts */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const here = dirname(fileURLToPath(import.meta.url))
const dialog = readFileSync(join(here, 'AttackBonusBreakdownDialog.tsx'), 'utf8')
const compact = readFileSync(join(here, 'PlayDeskAttacksCompact.tsx'), 'utf8')

assert(dialog.includes('Открыть предмет'), 'breakdown has open-item action')
assert(dialog.includes('onOpenItem'), 'breakdown accepts onOpenItem')
assert(compact.includes('inventoryItemId: attack.inventory_item_id'), 'compact passes item id')
assert(
  compact.includes("title: `Атака: ${attack.name}`") &&
    compact.includes('setEnterNumberOpen(true)'),
  'dice-on-table without combat opens enter-own-number',
)

console.log('attackBreakdownOpenItem.selfcheck: ok')
