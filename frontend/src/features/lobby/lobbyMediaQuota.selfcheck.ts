/**
 * L-02 selfcheck: подпись квоты картинок лобби.
 * Run: npx tsx frontend/src/features/lobby/lobbyMediaQuota.selfcheck.ts
 */

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function formatMb(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(1).replace(/\.0$/, '')
}

function quotaLabel(usedMb: number, limitMb: number): string {
  return `Занято ${formatMb(usedMb)} из ${formatMb(limitMb)} МБ`
}

assert(quotaLabel(0, 200) === 'Занято 0 из 200 МБ', 'empty quota')
assert(quotaLabel(12.5, 200) === 'Занято 12.5 из 200 МБ', 'fractional used')
assert(quotaLabel(200, 200) === 'Занято 200 из 200 МБ', 'full quota')

console.log('lobbyMediaQuota.selfcheck: ok')
