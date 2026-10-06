/** RU phone helpers: mask display + normalize for API. */

const DIGITS_MAX = 11

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

/** Normalize to 10 national digits (without country code). */
export function toNationalDigits(raw: string): string {
  let digits = digitsOnly(raw)
  if (digits.startsWith('8')) {
    digits = '7' + digits.slice(1)
  }
  if (digits.startsWith('7')) {
    digits = digits.slice(1)
  }
  return digits.slice(0, 10)
}

export function formatPhoneMask(raw: string): string {
  const national = toNationalDigits(raw)
  if (!national) {
    return ''
  }

  const parts = ['+7']
  if (national.length > 0) {
    parts.push(' (', national.slice(0, 3))
  }
  if (national.length >= 3) {
    parts.push(') ', national.slice(3, 6))
  }
  if (national.length >= 6) {
    parts.push('-', national.slice(6, 8))
  }
  if (national.length >= 8) {
    parts.push('-', national.slice(8, 10))
  }
  return parts.join('')
}

/** API value: +7XXXXXXXXXX or null when empty/incomplete. */
export function phoneToApi(raw: string): string | null {
  const national = toNationalDigits(raw)
  if (!national) {
    return null
  }
  if (national.length !== 10) {
    throw new Error('Укажите телефон полностью: +7 (XXX) XXX-XX-XX')
  }
  return `+7${national}`
}

export function phoneFromApi(value: string | null | undefined): string {
  if (!value) {
    return ''
  }
  return formatPhoneMask(value)
}

export function isCompleteOrEmptyPhone(raw: string): boolean {
  const national = toNationalDigits(raw)
  return national.length === 0 || national.length === 10
}

// Keep DIGITS_MAX exported for tests / future input caps.
export { DIGITS_MAX }
