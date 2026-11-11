import {
  appendConsumableSpendLog,
  formatConsumableSpendToast,
  formatConsumableUndoToast,
  markConsumableSpendUndone,
  MAX_CONSUMABLE_SPEND_LOG,
} from './consumableSpend'

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

const toast1 = formatConsumableSpendToast('Болты арбалета', 1, 17)
assert(toast1.includes('Болты арбалета'), 'toast must name item')
assert(toast1.includes('осталось 17'), 'toast must show remaining')

const toastEmpty = formatConsumableSpendToast('Зелье', 2, 0)
assert(toastEmpty.includes('кончилось'), 'zero remaining → кончилось')

assert(
  formatConsumableUndoToast('Болты арбалета', 1).includes('Вернули 1'),
  'undo toast',
)

let log = appendConsumableSpendLog([], {
  id: 'a',
  itemId: 'i1',
  name: 'Болты',
  amount: 1,
  atMs: 1,
})
log = appendConsumableSpendLog(log, {
  id: 'b',
  itemId: 'i1',
  name: 'Болты',
  amount: 2,
  atMs: 2,
})
assert(log[0]?.id === 'b', 'newest first')
assert(log.length === 2, 'two entries')

for (let i = 0; i < MAX_CONSUMABLE_SPEND_LOG + 3; i += 1) {
  log = appendConsumableSpendLog(log, {
    id: `x${i}`,
    itemId: 'i',
    name: 'X',
    amount: 1,
    atMs: i,
  })
}
assert(log.length === MAX_CONSUMABLE_SPEND_LOG, 'cap log length')

log = markConsumableSpendUndone(log, log[0]!.id)
assert(log[0]?.undone === true, 'mark undone')

console.log('consumableSpend.selfcheck ok')
