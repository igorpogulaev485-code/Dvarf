/** Character gender for create-pipeline + sheet.identity.gender — only М/Ж. */

export const CHARACTER_GENDERS = ['male', 'female'] as const

export type CharacterGender = (typeof CHARACTER_GENDERS)[number]

export const CHARACTER_GENDER_LABELS: Record<CharacterGender, string> = {
  male: 'Мужской',
  female: 'Женский',
}

export function isCharacterGender(value: unknown): value is CharacterGender {
  return value === 'male' || value === 'female'
}

/** Accepts only male/female. Legacy nonbinary/unspecified → null (нужно выбрать заново). */
export function parseCharacterGender(value: unknown): CharacterGender | null {
  return isCharacterGender(value) ? value : null
}

/** Short labels for compact UI (classic physique row). */
export const CHARACTER_GENDER_SHORT: Record<CharacterGender, string> = {
  male: 'М',
  female: 'Ж',
}
