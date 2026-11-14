/**
 * CMB-02: which turn-action chip belongs to Действие / Бонусное / Реакция.
 * Economy gates stay in turnEconomy / o0* modules — this is UI grouping only.
 */

export type TurnActionGroupId = 'action' | 'bonus' | 'reaction'

export type TurnActionTier = 'personal' | 'common' | 'more' | 'info'

export type TurnActionCatalogRow = {
  id: string
  label: string
  group: TurnActionGroupId
  /** Same control may appear in two groups (e.g. Хитрое действие). */
  alsoGroup?: TurnActionGroupId
  tier: TurnActionTier
  /** When alsoGroup is set — label shown inside that group. */
  alsoLabel?: string
}

/**
 * Canonical map for selfcheck + report «кнопка → группа».
 * Visibility still depends on character feats / master flags at render time.
 */
export const TURN_ACTION_CATALOG: TurnActionCatalogRow[] = [
  // —— personal / class ——
  {
    id: 'cunning_hide',
    label: 'Хитрое действие: Засада',
    group: 'bonus',
    tier: 'personal',
  },
  {
    id: 'cunning_disengage',
    label: 'Хитрое действие: Отход',
    group: 'bonus',
    tier: 'personal',
  },
  {
    id: 'cunning_dash',
    label: 'Хитрое действие: Рывок',
    group: 'bonus',
    tier: 'personal',
  },
  { id: 'steady_aim', label: 'Точное прицеливание', group: 'bonus', tier: 'personal' },
  { id: 'two_weapon', label: 'Атака вторым оружием', group: 'bonus', tier: 'personal' },
  { id: 'ki_fueled', label: 'Атака на ци', group: 'bonus', tier: 'personal' },
  /** Mark that enables GWM bonus attack — shown in Бонусное (not a spend). */
  { id: 'gwm_finish', label: 'Добивание (0 хитов)', group: 'bonus', tier: 'personal' },
  { id: 'gwm_bonus', label: 'Атака Мастера большого оружия', group: 'bonus', tier: 'personal' },
  { id: 'charger_attack', label: 'Налётчик: Удар (+5)', group: 'bonus', tier: 'personal' },
  { id: 'charger_shove', label: 'Налётчик: Толчок', group: 'bonus', tier: 'personal' },
  { id: 'crossbow_bonus', label: 'Выстрел ручным арбалетом', group: 'bonus', tier: 'personal' },
  { id: 'tavern_grapple', label: 'Захват (Драчун)', group: 'bonus', tier: 'personal' },
  { id: 'healer_stabilize', label: 'Целитель: Стабилизировать', group: 'action', tier: 'personal' },
  { id: 'healer_heal', label: 'Целитель: Лечить', group: 'action', tier: 'personal' },
  { id: 'grappler_pin', label: 'Опрокинуть схваченного', group: 'action', tier: 'personal' },
  { id: 'shield_shove', label: 'Толчок щитом', group: 'bonus', tier: 'personal' },
  { id: 'telekinetic', label: 'Толчок (Телекинез)', group: 'bonus', tier: 'personal' },
  { id: 'orcish_fury', label: 'Атака Орочьей ярости', group: 'bonus', tier: 'personal' },
  { id: 'polearm_bonus', label: 'Конец древка (к4)', group: 'bonus', tier: 'personal' },
  { id: 'uncanny_dodge', label: 'Увёртливость', group: 'reaction', tier: 'personal' },
  { id: 'interception', label: 'Перехват', group: 'reaction', tier: 'personal' },
  { id: 'protection', label: 'Защита', group: 'reaction', tier: 'personal' },
  { id: 'chain_attack', label: 'Атака фамильяра', group: 'bonus', tier: 'personal' },
  { id: 'chain_resist', label: 'Сопр. фамильяра', group: 'reaction', tier: 'personal' },
  { id: 'talisman_rebuke', label: 'Порицание талисмана', group: 'reaction', tier: 'personal' },
  { id: 'sentinel', label: 'Страж: атака', group: 'reaction', tier: 'personal' },
  { id: 'mage_slayer', label: 'Убийца магов', group: 'reaction', tier: 'personal' },
  { id: 'riposte', label: 'Ответный удар', group: 'reaction', tier: 'personal' },
  { id: 'parry', label: 'Парирование', group: 'reaction', tier: 'personal' },
  { id: 'breath', label: 'Оружие дыхания', group: 'action', tier: 'personal' },
  { id: 'mark', label: 'Метка', group: 'action', tier: 'personal' },
  {
    id: 'mark_opp',
    label: 'Провоцированная по метке',
    group: 'reaction',
    tier: 'personal',
  },

  // —— common PHB ——
  { id: 'search', label: 'Поиск', group: 'action', tier: 'common' },
  { id: 'hide', label: 'Засада', group: 'action', tier: 'common' },
  { id: 'dash', label: 'Рывок', group: 'action', tier: 'common' },
  { id: 'disengage', label: 'Отход', group: 'action', tier: 'common' },
  { id: 'dodge', label: 'Уклонение', group: 'action', tier: 'common' },
  { id: 'help', label: 'Помощь', group: 'action', tier: 'common' },
  { id: 'ready', label: 'Подготовка', group: 'action', tier: 'common' },
  { id: 'stabilize', label: 'Стабилизировать', group: 'action', tier: 'common' },
  { id: 'grapple_shove', label: 'Захват / Толчок', group: 'action', tier: 'common' },
  { id: 'disarm', label: 'Обезоруживание', group: 'action', tier: 'common' },
  { id: 'opportunity', label: 'Атака по возможности', group: 'reaction', tier: 'common' },
  { id: 'ready_fire', label: 'Сработало', group: 'reaction', tier: 'common' },
  { id: 'cast_reaction', label: 'Кастануть реакцией', group: 'reaction', tier: 'common' },

  // —— DMG optional «ещё» ——
  {
    id: 'overrun',
    label: 'Пробегание',
    group: 'action',
    alsoGroup: 'bonus',
    tier: 'more',
  },
  {
    id: 'tumble',
    label: 'Кувырок',
    group: 'action',
    alsoGroup: 'bonus',
    tier: 'more',
  },
  { id: 'climb', label: 'Взбирание', group: 'action', tier: 'more' },
  { id: 'falling', label: 'Падение', group: 'action', tier: 'more' },
  { id: 'injury', label: 'Бросок раны', group: 'action', tier: 'more' },
  { id: 'morale', label: 'Проверка морали', group: 'action', tier: 'more' },
  { id: 'hero', label: 'Очко героя', group: 'action', tier: 'more' },
  { id: 'identify_spell', label: 'Распознать заклинание', group: 'reaction', tier: 'more' },
  { id: 'no_long_rest', label: '24 ч без отдыха', group: 'action', tier: 'more' },

  // —— info (not actions) ——
  { id: 'blind_sight', label: 'Слепое зрение 10 фт', group: 'action', tier: 'info' },
  { id: 'devils_sight', label: 'Дьявольское зрение 120 фт', group: 'action', tier: 'info' },
]

export const TURN_GROUP_LABELS: Record<TurnActionGroupId, string> = {
  action: 'Действие',
  bonus: 'Бонусное',
  reaction: 'Реакция',
}

export const TURN_GROUP_EMPTY_HINT: Record<TurnActionGroupId, string> = {
  action: 'Нет действий',
  bonus: 'Нет бонусных действий',
  reaction: 'Нет реакций',
}

export function catalogRowsForGroup(group: TurnActionGroupId): TurnActionCatalogRow[] {
  return TURN_ACTION_CATALOG.filter(
    (row) => row.group === group || row.alsoGroup === group,
  )
}

/** Rogue 5: «Хитрое действие» — только бонусное (общие Рывок/Отход/Засада остаются в Действии). */
export function cunningActionGroups(): TurnActionGroupId[] {
  return ['bonus']
}
