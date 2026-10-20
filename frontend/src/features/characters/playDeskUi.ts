import { normalizeCombatConsumableFavoriteIds } from './combatConsumables'
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

export type PlayDeskPanelId =
  | 'attacks'
  | 'inventory'
  | 'features'
  | 'spells'
  | 'companions'
  | 'texts'

export type XpHistoryEntry = {
  id: string
  delta: number
  reason: string
  at: string
}

export type RollHistoryEntry = {
  id: string
  text: string
  at: string
}

export type SheetUiState = {
  abilityOrder: AbilityKey[]
  collapsedAbilities: AbilityKey[]
  deskMode: PlayDeskMode
  /** Side-by-side primary panel + pinned spells (or attacks if spells selected). */
  deskSplit: boolean
  /** Inventory item ids pinned into combat «Расходники» (max 3). */
  combatConsumableFavoriteIds: string[]
  /** XP awards / spends with optional «за что». Newest first. */
  xpHistory: XpHistoryEntry[]
  /** Desk dice rolls (attacks, checks, …). Newest first; persisted on the sheet. */
  rollHistory: RollHistoryEntry[]
}

const MAX_XP_HISTORY = 40
const MAX_ROLL_HISTORY = 50

export function isDeskRollToast(message: string): boolean {
  return /\bd20\b|урон\s|\(\d+d\d+/i.test(message)
}

export function normalizeRollHistory(raw: unknown): RollHistoryEntry[] {
  if (!Array.isArray(raw)) return []
  const out: RollHistoryEntry[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const item = row as Record<string, unknown>
    const text = typeof item.text === 'string' ? item.text.trim() : ''
    if (!text) continue
    const at =
      typeof item.at === 'string' && item.at.trim()
        ? item.at
        : new Date().toISOString()
    const id =
      typeof item.id === 'string' && item.id.trim()
        ? item.id
        : `roll-${at}-${out.length}`
    out.push({ id, text, at })
    if (out.length >= MAX_ROLL_HISTORY) break
  }
  return out
}

export function appendRollHistory(
  history: RollHistoryEntry[],
  entry: Omit<RollHistoryEntry, 'id' | 'at'> & { id?: string; at?: string },
): RollHistoryEntry[] {
  const next: RollHistoryEntry = {
    id:
      entry.id ??
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `roll-${Date.now()}`),
    text: entry.text.trim(),
    at: entry.at ?? new Date().toISOString(),
  }
  if (!next.text) return history
  return [next, ...history].slice(0, MAX_ROLL_HISTORY)
}

export function normalizeXpHistory(raw: unknown): XpHistoryEntry[] {
  if (!Array.isArray(raw)) return []
  const out: XpHistoryEntry[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const item = row as Record<string, unknown>
    const delta = typeof item.delta === 'number' ? Math.trunc(item.delta) : 0
    if (!delta) continue
    const reason = typeof item.reason === 'string' ? item.reason.trim() : ''
    const at =
      typeof item.at === 'string' && item.at.trim()
        ? item.at
        : new Date().toISOString()
    const id =
      typeof item.id === 'string' && item.id.trim()
        ? item.id
        : `xp-${at}-${delta}-${out.length}`
    out.push({ id, delta, reason, at })
    if (out.length >= MAX_XP_HISTORY) break
  }
  return out
}

export function appendXpHistory(
  history: XpHistoryEntry[],
  entry: Omit<XpHistoryEntry, 'id' | 'at'> & { id?: string; at?: string },
): XpHistoryEntry[] {
  const next: XpHistoryEntry = {
    id:
      entry.id ??
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `xp-${Date.now()}`),
    delta: Math.trunc(entry.delta),
    reason: entry.reason.trim(),
    at: entry.at ?? new Date().toISOString(),
  }
  return [next, ...history].slice(0, MAX_XP_HISTORY)
}

const DEFAULT_ORDER: AbilityKey[] = [...ABILITY_KEYS]

const PLAY_DESK_MODES: PlayDeskMode[] = [
  'combat',
  'explore',
  'social',
  'companions',
  'features',
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
  // Legacy ЕЩЁ scene → combat; identity lives in avatar dialog now.
  if (raw === 'more') return 'combat'
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
    combatConsumableFavoriteIds: normalizeCombatConsumableFavoriteIds(
      ui.combat_consumable_favorites,
    ),
    xpHistory: normalizeXpHistory(ui.xp_history),
    rollHistory: normalizeRollHistory(ui.roll_history),
  }
}

export function sheetUiToPatch(ui: SheetUiState): Record<string, unknown> {
  return {
    ability_order: ui.abilityOrder,
    collapsed_abilities: ui.collapsedAbilities,
    desk_mode: ui.deskMode,
    desk_split: ui.deskSplit,
    combat_consumable_favorites: ui.combatConsumableFavoriteIds,
    xp_history: ui.xpHistory,
    roll_history: ui.rollHistory,
  }
}

export const MODE_DEFAULT_PANEL: Record<PlayDeskMode, PlayDeskPanelId> = {
  combat: 'attacks',
  explore: 'inventory',
  social: 'texts',
  companions: 'companions',
  features: 'features',
}

/** Scenes that keep spells pinned beside the primary panel. */
export const MODE_SPELL_SPLIT: PlayDeskMode[] = ['combat', 'explore', 'social']

export function modeUsesSpellSplit(mode: PlayDeskMode): boolean {
  return MODE_SPELL_SPLIT.includes(mode)
}

/**
 * Secondary panel when split is on.
 * Combat/explore/social: always pin spells (or the scene primary if spells is focused).
 */
export function splitSecondaryPanel(
  mode: PlayDeskMode,
  active: PlayDeskPanelId,
): PlayDeskPanelId | null {
  if (!modeUsesSpellSplit(mode)) return null
  const primary = MODE_DEFAULT_PANEL[mode]
  return active === 'spells' ? primary : 'spells'
}

/** Skills shown in mode chrome for combat / explore / social scenes. */
export const MODE_SKILL_KEYS: Record<'combat' | 'explore' | 'social', string[]> = {
  combat: ['athletics', 'acrobatics', 'stealth', 'perception', 'investigation', 'medicine'],
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
  { id: 'companions', label: 'Напарники' },
  { id: 'texts', label: 'Тексты и заметки' },
]

/**
 * Panels that belong to each scene (no dropdown — scene picks the primary).
 * Combat / explore / social pin spells via split.
 */
export const MODE_SCENE_PANELS: Record<PlayDeskMode, PlayDeskPanelId[]> = {
  combat: ['attacks', 'spells'],
  explore: ['inventory', 'spells'],
  social: ['texts', 'spells'],
  companions: ['companions'],
  features: ['features'],
}

export const MODE_HINT: Record<PlayDeskMode, string> = {
  combat: 'Сцена боя: атаки и заклинания рядом',
  explore: 'Сцена исследования: снаряжение под рукой',
  social: 'Сцена общения: тексты и роль',
  companions: 'Сцена напарников: спутники и призывы',
  features: 'Сцена способностей: что умеет герой',
}

export const MODE_LABELS: Array<{ id: PlayDeskMode; label: string }> = [
  { id: 'combat', label: 'Бой' },
  { id: 'explore', label: 'Исследование' },
  { id: 'social', label: 'Общение' },
  { id: 'companions', label: 'Напарники' },
  { id: 'features', label: 'Способности' },
]

/** Short labels under Bottom Scene Nav icons (<960). aria-label stays full. */
export const MODE_SHORT_LABELS: Record<PlayDeskMode, string> = {
  combat: 'Бой',
  explore: 'Исслед.',
  social: 'Общение',
  companions: 'Напарн.',
  features: 'Способн.',
}

export function panelLabel(id: PlayDeskPanelId): string {
  return PLAY_DESK_PANELS.find((panel) => panel.id === id)?.label ?? id
}
