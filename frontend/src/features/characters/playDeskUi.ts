import {
  ABILITY_KEYS,
  asRecord,
  type AbilityKey,
} from './sheetTypes'

export type PlayDeskMode = 'combat' | 'explore' | 'social' | 'companions'

export type PlayDeskPanelId =
  | 'identity'
  | 'play'
  | 'attacks'
  | 'abilities'
  | 'inventory'
  | 'attunement'
  | 'features'
  | 'spells'
  | 'companions'
  | 'texts'
  | 'ownership'

export type SheetUiState = {
  abilityOrder: AbilityKey[]
  collapsedAbilities: AbilityKey[]
  deskMode: PlayDeskMode
  /** Side-by-side primary panel + pinned spells (or attacks if spells selected). */
  deskSplit: boolean
}

const DEFAULT_ORDER: AbilityKey[] = [...ABILITY_KEYS]

export function normalizeAbilityOrder(raw: unknown): AbilityKey[] {
  const fromList = Array.isArray(raw)
    ? raw.filter((item): item is AbilityKey =>
        ABILITY_KEYS.includes(item as AbilityKey),
      )
    : []
  const seen = new Set<AbilityKey>()
  const ordered: AbilityKey[] = []
  for (const key of fromList) {
    if (seen.has(key)) continue
    seen.add(key)
    ordered.push(key)
  }
  for (const key of DEFAULT_ORDER) {
    if (!seen.has(key)) ordered.push(key)
  }
  return ordered
}

export function readSheetUi(sheet: Record<string, unknown>): SheetUiState {
  const ui = asRecord(sheet.ui)
  const collapsedRaw = ui.collapsed_abilities
  const collapsed = Array.isArray(collapsedRaw)
    ? collapsedRaw.filter((item): item is AbilityKey =>
        ABILITY_KEYS.includes(item as AbilityKey),
      )
    : []
  const mode = ui.desk_mode
  // Default ON so combat opens like the mockup (attacks + spells).
  const deskSplit = ui.desk_split === false ? false : true
  return {
    abilityOrder: normalizeAbilityOrder(ui.ability_order),
    collapsedAbilities: collapsed,
    deskMode:
      mode === 'explore' || mode === 'social' || mode === 'companions' || mode === 'combat'
        ? mode
        : 'combat',
    deskSplit,
  }
}

export function sheetUiToPatch(ui: SheetUiState): Record<string, unknown> {
  return {
    ability_order: ui.abilityOrder,
    collapsed_abilities: ui.collapsedAbilities,
    desk_mode: ui.deskMode,
    desk_split: ui.deskSplit,
  }
}

/** Secondary panel pinned beside the primary when split is on. */
export function splitSecondaryPanel(active: PlayDeskPanelId): PlayDeskPanelId {
  return active === 'spells' ? 'attacks' : 'spells'
}

export const MODE_DEFAULT_PANEL: Record<PlayDeskMode, PlayDeskPanelId> = {
  combat: 'attacks',
  explore: 'inventory',
  social: 'texts',
  companions: 'companions',
}

/** Skills shown in mode chrome for explore / social scenes. */
export const MODE_SKILL_KEYS: Record<'explore' | 'social', string[]> = {
  explore: ['perception', 'investigation', 'stealth', 'survival', 'athletics'],
  social: ['persuasion', 'deception', 'insight', 'intimidation', 'performance'],
}

export type PlayDeskCompactPanelId =
  | 'attacks'
  | 'spells'
  | 'inventory'
  | 'texts'
  | 'features'
  | 'companions'

export const PLAY_DESK_PANELS: Array<{ id: PlayDeskPanelId; label: string }> = [
  { id: 'attacks', label: 'Атаки' },
  { id: 'abilities', label: 'Характеристики' },
  { id: 'features', label: 'Способности' },
  { id: 'spells', label: 'Заклинания' },
  { id: 'inventory', label: 'Снаряжение' },
  { id: 'attunement', label: 'Настройка' },
  { id: 'companions', label: 'Напарники' },
  { id: 'texts', label: 'Тексты и заметки' },
  { id: 'play', label: 'Состояния и ресурсы' },
  { id: 'identity', label: 'Основное' },
  { id: 'ownership', label: 'Владения' },
]

/** Primary panels for the mode picker (mockup scene list). */
export const MODE_SCENE_PANELS: Record<PlayDeskMode, PlayDeskPanelId[]> = {
  combat: ['attacks', 'features', 'spells', 'inventory', 'companions', 'texts'],
  explore: ['inventory', 'features', 'attacks', 'spells', 'companions', 'texts'],
  social: ['texts', 'features', 'companions', 'spells', 'inventory', 'attacks'],
  companions: ['companions', 'features', 'attacks', 'spells', 'inventory', 'texts'],
}

/** Secondary / edit panels tucked under «Ещё» (desktop). Phone uses full PLAY_DESK_PANELS. */
export const MODE_EXTRA_PANELS: PlayDeskPanelId[] = [
  'abilities',
  'play',
  'identity',
  'attunement',
  'ownership',
]

export const MODE_HINT: Record<PlayDeskMode, string> = {
  combat: 'Бой: атаки, способности, заклинания',
  explore: 'Исследование: снаряжение и проверки',
  social: 'Общение: тексты и социальные навыки',
  companions: 'Напарники: свита и призывы',
}

export function panelLabel(id: PlayDeskPanelId): string {
  return PLAY_DESK_PANELS.find((panel) => panel.id === id)?.label ?? id
}
