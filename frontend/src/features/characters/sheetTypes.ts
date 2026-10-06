export const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const
export type AbilityKey = (typeof ABILITY_KEYS)[number]

export const ABILITY_LABELS: Record<AbilityKey, string> = {
  str: 'СИЛ',
  dex: 'ЛОВ',
  con: 'ТЕЛ',
  int: 'ИНТ',
  wis: 'МУД',
  cha: 'ХАР',
}

export const SKILL_DEFS: Array<{ key: string; label: string; base: AbilityKey }> = [
  { key: 'acrobatics', label: 'Акробатика', base: 'dex' },
  { key: 'animal_handling', label: 'Уход за животными', base: 'wis' },
  { key: 'arcana', label: 'Магия', base: 'int' },
  { key: 'athletics', label: 'Атлетика', base: 'str' },
  { key: 'deception', label: 'Обман', base: 'cha' },
  { key: 'history', label: 'История', base: 'int' },
  { key: 'insight', label: 'Проницательность', base: 'wis' },
  { key: 'intimidation', label: 'Запугивание', base: 'cha' },
  { key: 'investigation', label: 'Анализ', base: 'int' },
  { key: 'medicine', label: 'Медицина', base: 'wis' },
  { key: 'nature', label: 'Природа', base: 'int' },
  { key: 'perception', label: 'Внимательность', base: 'wis' },
  { key: 'performance', label: 'Выступление', base: 'cha' },
  { key: 'persuasion', label: 'Убеждение', base: 'cha' },
  { key: 'religion', label: 'Религия', base: 'int' },
  { key: 'sleight_of_hand', label: 'Ловкость рук', base: 'dex' },
  { key: 'stealth', label: 'Скрытность', base: 'dex' },
  { key: 'survival', label: 'Выживание', base: 'wis' },
]

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function readNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function readNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
