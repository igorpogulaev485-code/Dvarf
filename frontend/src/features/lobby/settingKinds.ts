/** C5: типы страниц сеттинга + подписи. */

export type SettingPageKind =
  | 'location'
  | 'npc'
  | 'faction'
  | 'quest'
  | 'item_lore'
  | 'note'
  | 'combat'

/** Игрок в режиме чтения никогда не видит «Бой». */
export type SettingReaderPageKind = Exclude<SettingPageKind, 'combat'>

export type QuestStatus = 'planned' | 'active' | 'done' | 'failed'

export const SETTING_PAGE_KINDS: SettingPageKind[] = [
  'location',
  'npc',
  'faction',
  'quest',
  'item_lore',
  'note',
  'combat',
]

export const SETTING_PAGE_KIND_LABELS: Record<SettingPageKind, string> = {
  location: 'Локация',
  npc: 'НПС',
  faction: 'Фракция',
  quest: 'Квест',
  item_lore: 'Предмет',
  note: 'Заметка',
  combat: 'Бой',
}

/** W-01: подписи оглавления игрока (режим чтения). Без combat. */
export const SETTING_PAGE_KIND_READER_LABELS: Record<SettingReaderPageKind, string> = {
  location: 'Места',
  npc: 'Люди',
  faction: 'Фракции',
  quest: 'Квесты',
  item_lore: 'Предметы',
  note: 'Заметки',
}

export const SETTING_READER_KIND_ORDER: SettingReaderPageKind[] = [
  'location',
  'npc',
  'faction',
  'quest',
  'item_lore',
  'note',
]

export const TEMPLATE_CARD_KINDS: SettingPageKind[] = ['npc', 'location', 'item_lore']

/** W-03: страница «Бой» только под локацией или квестом. */
export const COMBAT_PARENT_KINDS: SettingPageKind[] = ['location', 'quest']

export const QUEST_STATUS_LABELS: Record<QuestStatus, string> = {
  planned: 'План',
  active: 'Активен',
  done: 'Готово',
  failed: 'Провал',
}

/** RU-подпись статуса квеста; неизвестный ключ — без сырого английского. */
export function questStatusLabel(status: string | null | undefined): string {
  if (!status) return ''
  return QUEST_STATUS_LABELS[status as QuestStatus] ?? 'Статус неизвестен'
}

export function pageKindLabel(kind: string | undefined | null): string {
  if (!kind) return SETTING_PAGE_KIND_LABELS.note
  return SETTING_PAGE_KIND_LABELS[kind as SettingPageKind] ?? kind
}
