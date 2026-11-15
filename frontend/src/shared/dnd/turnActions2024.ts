/**
 * SRD 5.2.1 turn actions dictionary for rules_edition=2024.
 * Extends 2014 set with Magic / Study / Influence / Utilize; Hide uses DC 15.
 * Does not rewrite 2014 buttons — callers branch on edition.
 */

export type TurnActionId2024 =
  | 'attack'
  | 'dash'
  | 'disengage'
  | 'dodge'
  | 'help'
  | 'hide'
  | 'ready'
  | 'search'
  | 'study'
  | 'influence'
  | 'utilize'
  | 'magic'

export type TurnActionDef2024 = {
  id: TurnActionId2024
  labelRu: string
  /** Maps to turnEconomy actionSpentAs when applicable. */
  spentAs?: 'attack' | 'cast' | 'feature' | 'search' | 'magic' | 'study' | 'influence' | 'utilize'
  hintRu: string
}

export const HIDE_DC_2024 = 15

export const TURN_ACTIONS_2024: TurnActionDef2024[] = [
  {
    id: 'attack',
    labelRu: 'Атака',
    spentAs: 'attack',
    hintRu: 'Атака оружием или безоружным ударом (урон / захват / толчок).',
  },
  {
    id: 'dash',
    labelRu: 'Рывок',
    hintRu: 'Дополнительное перемещение, равное скорости.',
  },
  {
    id: 'disengage',
    labelRu: 'Отход',
    hintRu: 'Перемещение не провоцирует атаки.',
  },
  {
    id: 'dodge',
    labelRu: 'Уклонение',
    hintRu: 'Атаки по вам с помехой; спас Ловкости с преимуществом (если видите атакующего).',
  },
  {
    id: 'help',
    labelRu: 'Помощь',
    hintRu: 'Дать союзнику преимущество на проверку или следующую атаку.',
  },
  {
    id: 'hide',
    labelRu: 'Прятаться',
    hintRu: `Проверка Скрытности против Сл ${HIDE_DC_2024}; нужны укрытие/тьма и вне линии зрения врагов.`,
  },
  {
    id: 'ready',
    labelRu: 'Подготовка',
    hintRu: 'Подготовить действие или реакцию на триггер.',
  },
  {
    id: 'search',
    labelRu: 'Поиск',
    spentAs: 'search',
    hintRu: 'Проверка Мудрости (например, Внимательность), чтобы что-то найти.',
  },
  {
    id: 'study',
    labelRu: 'Изучение',
    spentAs: 'study',
    hintRu: 'Проверка Интеллекта: вспомнить, изучить источник, разобраться.',
  },
  {
    id: 'influence',
    labelRu: 'Влияние',
    spentAs: 'influence',
    hintRu: 'Повлиять на существо (убеждение, обман, запугивание и т. п.).',
  },
  {
    id: 'utilize',
    labelRu: 'Использование',
    spentAs: 'utilize',
    hintRu: 'Использовать предмет, требующий действия.',
  },
  {
    id: 'magic',
    labelRu: 'Магия',
    spentAs: 'magic',
    hintRu: 'Наложить заклинание со временем «действие» или активировать свойство, требующее действия «Магия».',
  },
]

export function turnActionLabel2024(id: TurnActionId2024): string {
  return TURN_ACTIONS_2024.find((row) => row.id === id)?.labelRu ?? id
}

/** Cast with casting time «action» is a Magic action (needed for Action Surge later). */
export function castingTimeIsMagicAction(
  castingTimeUnit: string | null | undefined,
): boolean {
  const u = String(castingTimeUnit ?? '')
    .trim()
    .toLowerCase()
  return u === 'action' || u === 'действие' || u === '1 action'
}

export type HideCheck2024 = {
  dc: number
  ability: 'dex'
  skill: 'stealth'
  requiresCoverOrObscurement: true
  outOfEnemySight: true
}

export function hideCheck2024(): HideCheck2024 {
  return {
    dc: HIDE_DC_2024,
    ability: 'dex',
    skill: 'stealth',
    requiresCoverOrObscurement: true,
    outOfEnemySight: true,
  }
}

/** Unarmed Strike options in 2024 (damage / grapple / shove). */
export type UnarmedStrikeOption2024 = 'damage' | 'grapple' | 'shove'

export const UNARMED_STRIKE_OPTIONS_2024: Array<{
  id: UnarmedStrikeOption2024
  labelRu: string
}> = [
  { id: 'damage', labelRu: 'Урон' },
  { id: 'grapple', labelRu: 'Захват' },
  { id: 'shove', labelRu: 'Толчок' },
]
