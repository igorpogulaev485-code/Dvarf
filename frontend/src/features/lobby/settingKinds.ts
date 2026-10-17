/** C5: типы страниц сеттинга + подписи. */

export type SettingPageKind =
  | 'location'
  | 'npc'
  | 'faction'
  | 'quest'
  | 'item_lore'
  | 'note'

export type QuestStatus = 'planned' | 'active' | 'done' | 'failed'

export const SETTING_PAGE_KINDS: SettingPageKind[] = [
  'location',
  'npc',
  'faction',
  'quest',
  'item_lore',
  'note',
]

export const SETTING_PAGE_KIND_LABELS: Record<SettingPageKind, string> = {
  location: 'Локация',
  npc: 'НПС',
  faction: 'Фракция',
  quest: 'Квест',
  item_lore: 'Предмет',
  note: 'Заметка',
}

export const QUEST_STATUS_LABELS: Record<QuestStatus, string> = {
  planned: 'План',
  active: 'Активен',
  done: 'Готово',
  failed: 'Провал',
}

export function pageKindLabel(kind: string | undefined | null): string {
  if (!kind) return SETTING_PAGE_KIND_LABELS.note
  return SETTING_PAGE_KIND_LABELS[kind as SettingPageKind] ?? kind
}
