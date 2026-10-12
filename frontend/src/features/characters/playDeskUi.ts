import {
  ABILITY_KEYS,
  asRecord,
  type AbilityKey,
} from './sheetTypes'

/** Top-level scenes on the play desk (no panel dropdown). */
export type PlayDeskMode =
  | 'combat'
  | 'explore'
  | 'social'
  | 'companions'
  | 'features'
  | 'more'

export type PlayDeskPanelId =
  | 'identity'
  | 'play'
  | 'attacks'
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

const PLAY_DESK_MODES: PlayDeskMode[] = [
  'combat',
  'explore',
  'social',
  'companions',
  'features',
  'more',
]

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

function normalizeDeskMode(raw: unknown): PlayDeskMode {
  if (typeof raw === 'string' && PLAY_DESK_MODES.includes(raw as PlayDeskMode)) {
    return raw as PlayDeskMode
  }
  return 'combat'
}

export function readSheetUi(sheet: Record<string, unknown>): SheetUiState {
  const ui = asRecord(sheet.ui)
  const collapsedRaw = ui.collapsed_abilities
  const collapsed = Array.isArray(collapsedRaw)
    ? collapsedRaw.filter((item): item is AbilityKey =>
        ABILITY_KEYS.includes(item as AbilityKey),
      )
    : []
  // Default ON so combat opens like the mockup (attacks + spells).
  const deskSplit = ui.desk_split === false ? false : true
  return {
    abilityOrder: normalizeAbilityOrder(ui.ability_order),
    collapsedAbilities: collapsed,
    deskMode: normalizeDeskMode(ui.desk_mode),
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
  features: 'features',
  more: 'play',
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

/**
 * Panels that belong to each scene (no dropdown — scene picks the primary).
 * Combat keeps spells via split, not as a separate scene switch.
 */
export const MODE_SCENE_PANELS: Record<PlayDeskMode, PlayDeskPanelId[]> = {
  combat: ['attacks', 'spells'],
  explore: ['inventory'],
  social: ['texts'],
  companions: ['companions'],
  features: ['features'],
  more: ['play', 'identity', 'attunement', 'ownership'],
}

/** Dump scene «ЕЩЁ» — former EXTRA panels; rebuild later. */
export const MODE_MORE_PANELS: PlayDeskPanelId[] = [
  'play',
  'identity',
  'attunement',
  'ownership',
]

/** @deprecated use MODE_MORE_PANELS — kept for older imports */
export const MODE_EXTRA_PANELS: PlayDeskPanelId[] = MODE_MORE_PANELS

export const MODE_HINT: Record<PlayDeskMode, string> = {
  combat: 'Бой: атаки + заклинания (split)',
  explore: 'Исследование: снаряжение и проверки',
  social: 'Общение: тексты и социальные навыки',
  companions: 'Напарники: свита и призывы',
  features: 'Способности: умения и ресурсы класса',
  more: 'ЕЩЁ: основное, состояния, настройка, владения — потом разберём',
}

export const MODE_LABELS: Array<{ id: PlayDeskMode; label: string }> = [
  { id: 'combat', label: 'Бой' },
  { id: 'explore', label: 'Исследование' },
  { id: 'social', label: 'Общение' },
  { id: 'companions', label: 'Напарники' },
  { id: 'features', label: 'Способности' },
  { id: 'more', label: 'ЕЩЁ' },
]

export function panelLabel(id: PlayDeskPanelId): string {
  return PLAY_DESK_PANELS.find((panel) => panel.id === id)?.label ?? id
}
