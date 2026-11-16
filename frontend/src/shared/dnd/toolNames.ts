/**
 * Russian names for 2024 tool ids. Old 2024 sheets stored raw ids (`dice-set`);
 * new sheets store names. Used by create labels and the sheet identity reader.
 */

export const TOOL_NAME_RU_BY_SLUG: Readonly<Record<string, string>> = {
  'alchemists-supplies': 'Инструменты алхимика',
  'brewers-supplies': 'Инструменты пивовара',
  'calligraphers-supplies': 'Инструменты каллиграфа',
  'carpenters-tools': 'Инструменты плотника',
  'cartographers-tools': 'Инструменты картографа',
  'cobblers-tools': 'Инструменты сапожника',
  'cooks-utensils': 'Кухонная утварь',
  'glassblowers-tools': 'Инструменты стеклодува',
  'jewelers-tools': 'Инструменты ювелира',
  'leatherworkers-tools': 'Инструменты кожевника',
  'masons-tools': 'Инструменты каменщика',
  'painters-supplies': 'Инструменты художника',
  'potters-tools': 'Инструменты гончара',
  'smiths-tools': 'Инструменты кузнеца',
  'tinkers-tools': 'Инструменты жестянщика',
  'weavers-tools': 'Инструменты ткача',
  'woodcarvers-tools': 'Инструменты резчика по дереву',
  'dice-set': 'Набор игральных костей',
  'dragonchess-set': 'Набор драконьих шахмат',
  'playing-card-set': 'Набор игральных карт',
  'three-dragon-ante-set': 'Набор «Ставка трёх драконов»',
  'gaming-set': 'Игровой набор',
  bagpipes: 'Волынка',
  drum: 'Барабан',
  dulcimer: 'Дульцимер',
  flute: 'Флейта',
  horn: 'Рожок',
  lute: 'Лютня',
  lyre: 'Лира',
  'pan-flute': 'Флейта Пана',
  shawm: 'Шалмей',
  viol: 'Виола да гамба',
  'musical-instrument': 'Музыкальный инструмент',
  'thieves-tools': 'Воровские инструменты',
  'herbalism-kit': 'Набор травника',
  'disguise-kit': 'Набор для грима',
  'forgery-kit': 'Набор фальшивомонетчика',
  'navigators-tools': 'Инструменты навигатора',
  'poisoners-kit': 'Инструменты отравителя',
}

export function toolSlugKey(value: string): string {
  return value.trim().toLowerCase().replace(/[_\s]+/g, '-').replace(/-s-/g, 's-')
}

/** Known 2024 tool slug → RU name; anything else (already Russian, custom) stays as written. */
export function canonicalToolName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return trimmed
  return TOOL_NAME_RU_BY_SLUG[toolSlugKey(trimmed)] ?? trimmed
}
