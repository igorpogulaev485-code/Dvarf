/** Language / tool proficiency lists for the digital sheet (2014 presets + custom). */

export const LANGUAGE_PRESETS = [
  'Общий',
  'Дварфийский',
  'Эльфийский',
  'Великаний',
  'Гномий',
  'Гоблинский',
  'Полуросликов',
  'Орочий',
  'Бездны',
  'Небесный',
  'Драконий',
  'Глубинная речь',
  'Инфернальный',
  'Первичный',
  'Сильван',
  'Подземный',
] as const

export const TOOL_PRESETS = [
  'Воровские инструменты',
  'Набор травника',
  'Набор целителя',
  'Набор отравителя',
  'Инструменты кузнеца',
  'Инструменты плотника',
  'Инструменты кожевника',
  'Инструменты резчика',
  'Инструменты ювелира',
  'Инструменты стеклодува',
  'Инструменты ткача',
  'Инструменты гончара',
  'Инструменты пивовара',
  'Инструменты каллиграфа',
  'Инструменты картографа',
  'Инструменты навигатора',
  'Музыкальный инструмент',
  'Игровой набор',
  'Транспорт (наземный)',
  'Транспорт (водный)',
] as const

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function readNameList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of raw) {
    const name =
      typeof item === 'string'
        ? normalizeName(item)
        : typeof item === 'object' && item != null && typeof (item as { name?: unknown }).name === 'string'
          ? normalizeName((item as { name: string }).name)
          : ''
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(name)
  }
  return result
}

export function toggleNameInList(list: string[], name: string): string[] {
  const normalized = normalizeName(name)
  if (!normalized) return list
  const key = normalized.toLowerCase()
  const exists = list.some((item) => item.toLowerCase() === key)
  if (exists) return list.filter((item) => item.toLowerCase() !== key)
  return [...list, normalized]
}

export function addCustomName(list: string[], name: string): string[] {
  const normalized = normalizeName(name)
  if (!normalized) return list
  const key = normalized.toLowerCase()
  if (list.some((item) => item.toLowerCase() === key)) return list
  return [...list, normalized]
}

export function isNameSelected(list: string[], name: string): boolean {
  const key = name.trim().toLowerCase()
  return list.some((item) => item.toLowerCase() === key)
}
