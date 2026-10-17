/** Character gender for create-pipeline + sheet.identity.gender */

export const CHARACTER_GENDERS = ['male', 'female', 'nonbinary', 'unspecified'] as const

export type CharacterGender = (typeof CHARACTER_GENDERS)[number]

export const CHARACTER_GENDER_LABELS: Record<CharacterGender, string> = {
  male: 'Мужской',
  female: 'Женский',
  nonbinary: 'Небинарный',
  unspecified: 'Не указан',
}

export function isCharacterGender(value: unknown): value is CharacterGender {
  return typeof value === 'string' && (CHARACTER_GENDERS as readonly string[]).includes(value)
}

export function parseCharacterGender(value: unknown): CharacterGender | null {
  return isCharacterGender(value) ? value : null
}

/** Short labels for compact UI (classic physique row). */
export const CHARACTER_GENDER_SHORT: Record<CharacterGender, string> = {
  male: 'М',
  female: 'Ж',
  nonbinary: 'Нб',
  unspecified: '—',
}
