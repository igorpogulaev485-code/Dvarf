import { readDiceLog, clearDiceLog } from './diceLog'
import { writeOnlyMePref } from './onlyMePref'
import { recordDigitalRoll, shouldPostRollToSession } from './recordDigitalRoll'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

/** Minimal localStorage for Node selfcheck. */
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>()
  ;(globalThis as { localStorage: Storage }).localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, String(v))
    },
    removeItem: (k) => {
      store.delete(k)
    },
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size
    },
  }
}

async function main() {
  const id = 'selfcheck-dice-02b'

  clearDiceLog(id)
  writeOnlyMePref(id, false)

  const result = await recordDigitalRoll({
    characterId: id,
    openSessionId: null,
    title: 'Акробатика',
    expression: '1d20+3',
    total: 14,
    dice: [{ sides: 20, value: 11, dropped: false }],
    modifierTotal: 3,
    advantageMode: 'none',
    toastText: 'Акробатика: 14 (d20:11 +3)',
    category: 'sheet',
    source: 'sheet',
  })
  assert(result.ok, 'offline roll ok')
  const entry = result.entry

  const log = readDiceLog(id)
  assert(log[0]?.id === entry.id, 'journal prepend')
  assert(log[0]?.title === 'Акробатика', 'title stored')
  assert(shouldPostRollToSession(id) === true, 'only-me off → may post')

  writeOnlyMePref(id, true)
  assert(shouldPostRollToSession(id) === false, 'only-me on → skip post')
  writeOnlyMePref(id, false)
  clearDiceLog(id)

  const ghost = 'shell-self'
  clearDiceLog(ghost)
  const quiet = await recordDigitalRoll({
    characterId: ghost,
    openSessionId: 'session-should-not-post',
    ephemeral: true,
    title: 'Свободный бросок',
    expression: '1d20',
    total: 7,
    dice: [{ sides: 20, value: 7, dropped: false }],
    modifierTotal: 0,
  })
  assert(quiet.ok, 'ephemeral ok')
  assert(readDiceLog(ghost).length === 0, 'list roll is not stored')

  console.log('recordDigitalRoll.selfcheck ok')
}

void main()
