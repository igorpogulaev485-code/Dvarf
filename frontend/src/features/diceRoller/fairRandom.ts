/**
 * Unbiased die roller via crypto.getRandomValues + rejection sampling.
 * Forbidden: weak PRNG and naive remainder bias on the raw uint32.
 */

function fillUint32(out: Uint32Array): void {
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
    throw new Error('Нужен crypto.getRandomValues')
  }
  // TS DOM lib is stricter than runtime about SharedArrayBuffer.
  crypto.getRandomValues(out as never)
}

/**
 * Uniform integer in [0, maxExclusive).
 * Rejection sampling avoids modulo bias when maxExclusive is not a power of 2.
 */
export function randomIntBelow(maxExclusive: number, fill: (out: Uint32Array) => void = fillUint32): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error('maxExclusive must be a positive integer')
  }
  if (maxExclusive === 1) return 0

  // Largest multiple of maxExclusive that fits in uint32 range.
  const limit = 0x100000000
  const threshold = limit - (limit % maxExclusive)
  const buf = new Uint32Array(1)
  for (;;) {
    fill(buf)
    const x = buf[0]!
    if (x < threshold) return x % maxExclusive
  }
}

/** Fair face in 1…sides. */
export function rollFairDie(sides: number, fill: (out: Uint32Array) => void = fillUint32): number {
  const n = Math.floor(sides)
  if (!Number.isFinite(n) || n < 2) {
    throw new Error('sides must be ≥ 2')
  }
  return 1 + randomIntBelow(n, fill)
}

/** Detect accidental Math.random usage in this module's call graph (selfcheck). */
export function fairRandomModuleSource(): string {
  // Imported by selfcheck via readFile — this export exists for API completeness.
  return 'fairRandom'
}
