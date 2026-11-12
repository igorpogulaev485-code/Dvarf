/**
 * S-02 selfcheck: подписи группы и pending-инициатива в очереди.
 * Run: npx tsx frontend/src/features/lobby/sessionCombatS02.selfcheck.ts
 */

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function groupLabel(name: string, alive: number, members: number): string {
  if (members > 1 && alive > 0) return `${name} ×${alive}`
  if (members > 1) return `${name} ×0`
  return name
}

assert(groupLabel('Гоблины', 4, 4) === 'Гоблины ×4', 'group ×4')
assert(groupLabel('Гоблины', 3, 4) === 'Гоблины ×3', 'group ×3 after fallen')
assert(groupLabel('Огр', 1, 1) === 'Огр', 'solo name')

function sortKey(e: {
  initiative: number | null
  initiative_pending?: boolean
  dex_mod?: number | null
  name: string
}): [number, number, number, string] {
  const pending = Boolean(e.initiative_pending) || e.initiative == null
  const init = pending ? -999 : -(e.initiative ?? 0)
  const dex = typeof e.dex_mod === 'number' ? -e.dex_mod : 99
  return [pending ? 1 : 0, init, dex, e.name]
}

const rows = [
  { name: 'Ждём', initiative: null as number | null, initiative_pending: true, dex_mod: 2 },
  { name: 'Быстрый', initiative: 18, initiative_pending: false, dex_mod: 3 },
  { name: 'Медленный', initiative: 5, initiative_pending: false, dex_mod: 1 },
].sort((a, b) => {
  const ka = sortKey(a)
  const kb = sortKey(b)
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] < kb[i]) return -1
    if (ka[i] > kb[i]) return 1
  }
  return 0
})

assert(rows[0].name === 'Быстрый', 'high init first')
assert(rows[1].name === 'Медленный', 'low init second')
assert(rows[2].name === 'Ждём', 'pending last')

console.log('sessionCombatS02.selfcheck: ok')
