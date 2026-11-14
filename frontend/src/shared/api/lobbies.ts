import { apiRequest } from './client'

export type LobbyRoleName = 'comaster' | 'observer' | 'lead_today'

export type LobbyRole = {
  id: string
  lobby_id: string
  user_id: string
  role: LobbyRoleName
  session_id: string | null
  assigned_by: string | null
  character_fate: 'waiting' | 'companion' | null
  character_id: string | null
  display_name: string | null
  created_at: string
}

export type LobbySummary = {
  id: string
  name: string
  invite_code: string | null
  is_owner: boolean
  is_comaster?: boolean
  is_observer?: boolean
  role?: string
  member_count: number
  /** L-03: есть незакрытая сессия */
  has_open_session?: boolean
  open_session_id?: string | null
  created_at: string
  updated_at: string
}

export type LobbyMember = {
  id: string
  character_id: string
  user_id: string
  joined_at: string
  character_name: string
  character_level: number
  character_class_name: string | null
  character_race_name: string | null
  hp_current: number | null
  hp_max: number | null
  start_rules_ok?: boolean
  start_rules_waived?: boolean
}

export type SettingSummary = {
  id: string
  lobby_id: string
  name: string
  world_notes: string
  is_extra?: boolean
  deleted_at?: string | null
  created_at: string
  updated_at: string
}

export type SettingPageKind =
  | 'location'
  | 'npc'
  | 'faction'
  | 'quest'
  | 'item_lore'
  | 'note'
  | 'combat'

/** Значения fields: скаляры шаблона или вложенный JSON (W-03 бой). */
export type SettingPageFieldValue = string | number | boolean | null | unknown

export type CombatEstimate = {
  party_levels: number[]
  monster_count: number
  xp_raw: number
  xp_adjusted: number
  unknown_xp_count: number
  thresholds?: Record<string, number> | null
  band?: string | null
  note?: string | null
  breakdown?: Array<Record<string, unknown>>
}

export type WikiCombatPage = {
  id: string
  title: string
  parent_id?: string | null
  parent_title?: string | null
  parent_kind?: SettingPageKind | null
  updated_at?: string | null
}

export type CombatFromWikiPayload = {
  page_id: string
}

export type EncounterWikiPick = {
  wave_index: number
  condition_text?: string | null
  boss_slug?: string | null
  boss_name?: string | null
  boss_xp?: number | null
  pack_slug?: string | null
  pack_name?: string | null
  pack_xp?: number | null
  pack_count?: number
}

export type QuestStatus = 'planned' | 'active' | 'done' | 'failed'

export type SettingPageTemplateField = {
  key: string
  label: string
  type: 'text' | 'long' | 'select' | 'number' | 'url'
  gm_only?: boolean
  options?: string[] | null
}

export type SettingPageTemplate = {
  id: string
  setting_id: string | null
  page_kind: SettingPageKind
  name: string
  body_seed: string
  schema: SettingPageTemplateField[]
  enabled: boolean
  is_system: boolean
}

export type SettingPage = {
  id: string
  setting_id: string
  parent_id: string | null
  title: string
  body: string
  gm_body: string
  sort_order: number
  revealed: boolean
  revealed_at?: string | null
  page_kind: SettingPageKind
  template_id: string | null
  fields: Record<string, SettingPageFieldValue>
  quest_status: QuestStatus | null
  tags: string[]
  deleted_at?: string | null
  created_at: string
  updated_at: string
  media?: LobbyMedia[]
  primary_image?: LobbyMedia | null
  map_image?: LobbyMedia | null
  /** W-03: оценка DMG для страницы «Бой» (только GM). */
  combat_estimate?: CombatEstimate | null
  /** W-04: связь item_lore ↔ артефакт */
  artifact_id?: string | null
}

export type SettingPageLinkKind = 'semantic' | 'mention'
export type SettingPageLinkVisibility = 'all' | 'gm'

export type SettingPageLink = {
  id: string
  from_page_id: string
  to_page_id: string
  from_title: string
  to_title: string
  label: string
  kind: SettingPageLinkKind
  visibility: SettingPageLinkVisibility
  created_at: string
}

export type ArtifactAbilityKind =
  | 'passive'
  | 'resource'
  | 'action'
  | 'trait'
  | 'spell_slot'
  | 'spell'
  | 'companion'
  | 'resistance'
  | 'weapon'
  | 'requirement'
  | 'mode'
  | 'skill'
  | 'tool'
  | 'condition_immunity'
export type ArtifactBonusTarget =
  | 'attack'
  | 'damage'
  | 'ac'
  | 'save'
  | 'ability'
  | 'speed'
  | 'darkvision'
export type ArtifactActionCost = 'action' | 'bonus' | 'reaction' | 'free' | 'special'
export type ArtifactResourceReset = 'short' | 'long' | 'manual' | 'dawn'
export type ArtifactResistMode = 'resistance' | 'immunity' | 'vulnerability'

export type ArtifactAbility = {
  id?: string
  kind: ArtifactAbilityKind
  name: string
  text?: string
  bonus_target?: ArtifactBonusTarget | null
  bonus_value?: number | null
  ability_key?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha' | null
  charges?: number | null
  reset?: ArtifactResourceReset | null
  action_cost?: ArtifactActionCost | null
  slot_level?: number | null
  slot_count?: number | null
  pact_level?: number | null
  spell_name?: string | null
  spell_level?: number | null
  catalog_id?: string | null
  prepared?: boolean | null
  casting_time?: string | null
  range?: string | null
  attack_or_save?: string | null
  damage?: string | null
  concentration?: boolean | null
  companion_name?: string | null
  hp_max?: number | null
  ac?: number | null
  companion_type?: string | null
  damage_type?: string | null
  resist_mode?: ArtifactResistMode | null
  attack_damage?: string | null
  attack_damage_type?: string | null
  attack_ability?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha' | null
  attack_range_kind?: 'melee' | 'ranged' | 'reach' | 'thrown' | null
  ranged?: boolean | null
  magic_bonus?: number | null
  ability?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha' | null
  range_kind?: 'melee' | 'ranged' | 'reach' | 'thrown' | null
  min_score?: number | null
  duration?: string | null
  duration_rounds?: number | null
  active_damage?: string | null
  active_damage_type?: string | null
  advantage?: boolean | null
  max_score?: number | null
  skill_key?: string | null
  tool_name?: string | null
  condition_slug?: string | null
  condition_name?: string | null
  attack_bonus?: number | null
}

export type SettingArtifact = {
  id: string
  setting_id: string
  name: string
  rarity: string
  description: string
  requires_attunement: boolean
  abilities: ArtifactAbility[]
  attack_damage: string
  attack_damage_type: string
  attack_ability: string
  attack_range_kind: string
  weight_lb: number | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type SettingArtifactCreatePayload = {
  name?: string
  rarity?: string
  description?: string
  requires_attunement?: boolean
  abilities?: ArtifactAbility[]
  attack_damage?: string
  attack_damage_type?: string
  attack_ability?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
  attack_range_kind?: 'melee' | 'ranged' | 'reach' | 'thrown'
  weight_lb?: number | null
  sort_order?: number
}

export type SettingArtifactUpdatePayload = SettingArtifactCreatePayload & {
  clear_weight?: boolean
}

export type ArtifactSetThreshold = {
  pieces: 2 | 3 | 4
  abilities: ArtifactAbility[]
  player_text?: string
}

export type SettingArtifactSet = {
  id: string
  setting_id: string
  name: string
  description: string
  artifact_ids: string[]
  thresholds: ArtifactSetThreshold[]
  sort_order: number
  created_at: string
  updated_at: string
}

export type SettingArtifactSetCreatePayload = {
  name?: string
  description?: string
  artifact_ids?: string[]
  thresholds?: ArtifactSetThreshold[]
  sort_order?: number
}

export type SettingArtifactSetUpdatePayload = SettingArtifactSetCreatePayload

export type KnownLegend = {
  artifact_id: string
  name: string
  description: string
  page_id?: string | null
  primary_image?: LobbyMedia | null
}

export type SettingDetail = SettingSummary & {
  pages: SettingPage[]
  links: SettingPageLink[]
  templates: SettingPageTemplate[]
  /** C9: уникальные теги по видимым страницам */
  all_tags: string[]
  artifacts?: SettingArtifact[]
  /** W-04: сеты — только мастеру */
  artifact_sets?: SettingArtifactSet[]
  /** W-04: известные легенды */
  known_legends?: KnownLegend[]
  is_owner: boolean
  /** W-01: права L-01 */
  can_edit_wiki?: boolean
  can_see_hidden?: boolean
  can_view_lobby?: boolean
  /** W-02: сеттинг в корзине */
  in_trash?: boolean
}

export type SettingPageVersion = {
  id: string
  page_id: string
  setting_id: string
  created_by: string | null
  author_name: string
  snapshot: Record<string, unknown>
  created_at: string
}

export type SettingTrashItem = {
  kind: 'setting' | 'page'
  id: string
  setting_id: string
  title: string
  deleted_at: string | null
  expires_at: string | null
}

export type WikiMentionResolve = {
  query: string
  exact_page_id: string | null
  exact_title: string | null
  similar: Array<{
    id: string
    title: string
    page_kind: SettingPageKind
    score: number
  }>
}

export type SessionSummary = {
  id: string
  lobby_id: string
  setting_id: string | null
  setting_name: string | null
  name: string
  seat_count: number
  /** L-04: персонажи за столом (открытой сессии) */
  seat_character_ids?: string[]
  closed_at?: string | null
  created_at: string
  updated_at: string
}

export type InviteMeta = {
  code: string
  name: string
  valid: boolean
  lobby_id?: string | null
  start?: unknown
  campaign_rules_start?: unknown
}

export type JoinLobbyAction = 'join' | 'transfer' | 'copy'

export type JoinLobbyResult = {
  lobby: LobbyDetail
  cloned_character_id?: string | null
  start_rules_ok?: boolean | null
  start_mismatches?: string[]
}

export type RemoveLobbyMemberPayload = {
  combat_fate?: 'release' | 'retain' | null
  delete_personal_notes?: boolean
}

export type CharacterInOtherLobbyData = {
  other_lobby_id: string
  other_lobby_name: string
  can_transfer: boolean
}

export type LobbyMediaKind = 'journal' | 'wiki' | 'map' | 'other'

export type LobbyMediaUsage = {
  used_bytes: number
  free_bytes: number
  limit_bytes: number
  used_mb: number
  free_mb: number
  limit_mb: number
}

export type LobbyMedia = {
  id: string
  lobby_id: string
  url: string
  preview_url: string
  bytes_on_disk: number
  width: number
  height: number
  type: LobbyMediaKind
  attached_to_id: string | null
  is_primary: boolean
  original_filename: string
  uploaded_by: string
  created_at: string
  updated_at: string
  quota_remaining_bytes?: number | null
}

export type LobbyDetail = {
  id: string
  name: string
  invite_code: string | null
  join_path: string | null
  is_owner: boolean
  is_comaster?: boolean
  is_observer?: boolean
  can_run_session?: boolean
  can_see_hidden?: boolean
  can_edit_wiki?: boolean
  can_manage_journal?: boolean
  can_edit_campaign_rules?: boolean
  can_award?: boolean
  can_delete_lobby?: boolean
  can_change_roles?: boolean
  can_transfer_lobby?: boolean
  can_change_invite_code?: boolean
  can_delete_session?: boolean
  role?: string
  owner_id: string
  /** Owner nick / display name from API (prefer over raw owner_id). */
  owner_display_name?: string | null
  members: LobbyMember[]
  roles?: LobbyRole[]
  settings: SettingSummary[]
  /** W-01: несколько активных сеттингов — выбрать основной */
  settings_need_primary?: boolean
  sessions: SessionSummary[]
  /** JSON профиля видимости; нормализуется на клиенте */
  visibility_profile?: unknown
  /** L-08: правила кампании */
  campaign_rules?: unknown
  /** Квота картинок лобби — только владелец/сомастер */
  media_usage?: LobbyMediaUsage | null
  /** L-06: время последней публикации в дневнике */
  last_journal_published_at?: string | null
  created_at: string
  updated_at: string
}

export type LobbyUpdatePayload = {
  name?: string
  visibility_profile?: unknown
  campaign_rules?: unknown
}

export type SeatCondition = {
  slug: string
  name: string
  catalog_id?: string | null
  duration_rounds?: number | null
  duration_note?: string | null
  started_round?: number | null
}

export type SeatCompanion = {
  id: string
  name: string
  hp_current: number | null
  hp_max: number | null
  ac: number | null
  /** C-02: from stats.dex */
  dex_mod?: number | null
  active?: boolean | null
  initiative_mode?: 'with_master' | 'own_initiative' | string | null
  command_cost?: 'none' | 'action' | 'bonus' | 'reaction' | string | null
  story?: boolean
  kind?: string | null
  role?: string | null
  dodge?: boolean
  death_successes?: number | null
  death_fails?: number | null
  conditions: SeatCondition[]
  type?: string | null
  duration?: string | null
  duration_rounds?: number | null
  attack_bonus?: number | null
  attack_damage?: string | null
  attack_damage_type?: string | null
  attack_range_kind?: string | null
  /** C-03 pack */
  alive_count?: number | null
  member_count?: number | null
  member_hp?: number[] | null
  mounted?: boolean
}

export type SeatConcentration = {
  spell_id: string
  name: string
}

export type SeatEffect = {
  id: string
  name: string
  source_character_id?: string | null
  source_name?: string | null
  linked_concentration?: boolean
  ac_bonus?: number | null
  kind?: string | null
  slug?: string | null
  duration?: {
    unit: string
    value?: number | null
    remaining_rounds?: number | null
    started_round?: number | null
  } | null
}

export type SessionSeat = {
  character_id: string
  character_name: string
  character_level: number
  character_class_name: string | null
  character_race_name: string | null
  hp_current: number | null
  hp_max: number | null
  hp_temp?: number
  hp_band?: string | null
  hp_label?: string | null
  hp_ratio?: number | null
  ac?: number | null
  speed?: number | null
  inspiration?: boolean
  advantage_next_roll?: boolean
  piety_score?: number | null
  piety_god?: string | null
  conditions?: SeatCondition[]
  effects?: SeatEffect[]
  concentration?: SeatConcentration | null
  /** Conc + подготовленные Conc-заклинания с листа кастера */
  effect_suggestions?: string[]
  companions?: SeatCompanion[]
  passive_perception?: number | null
  passive_insight?: number | null
  passive_investigation?: number | null
  dex_mod?: number | null
  initiative_bonus?: number
  initiative_advantage?: boolean
  is_dying?: boolean | null
  death_successes?: number | null
  death_fails?: number | null
  reaction_hint?: string | null
  /** L-21: снимок sheet.combat.turn_economy */
  turn_economy?: Record<string, unknown> | null
  /** L-21: Бдительный / no_surprise_while_conscious */
  surprise_immune?: boolean
  seated_at: string
}

export type CombatantAction = {
  name_ru: string
  text_ru?: string
  name_en?: string | null
  /** S-04 */
  attack_bonus?: number | null
  damage_dice?: string | null
  damage_type?: string | null
  save_dc?: number | null
  save_ability?: string | null
}

export type CombatantMember = {
  id: string
  name: string
  hp_current: number
  hp_max: number
  hp_temp?: number
  hp_band?: string | null
  hp_label?: string | null
  hp_ratio?: number | null
  hp_numbers_hidden?: boolean
  /** S-06 */
  outcome?: string | null
}

export type CombatantStudySnapshot = {
  hp_current: number
  hp_max: number
  at?: string | null
}

export type CombatantPendingStudy = {
  user_id: string
  character_id?: string | null
  character_name?: string | null
  skill: string
  skill_ru: string
  dc: number
  roll_total?: number | null
  status?: string
}

export type SessionCombatant = {
  id: string
  name: string
  /** HP первого живого / условной цели для быстрого урона */
  hp_current: number
  hp_max: number
  hp_band?: string | null
  hp_label?: string | null
  hp_ratio?: number | null
  hp_numbers_hidden?: boolean
  alive_count?: number
  member_count?: number
  ac?: number | null
  speed?: number | null
  cr?: string | null
  catalog_id?: string | null
  slug?: string | null
  source_book?: string | null
  type_ru?: string | null
  custom?: boolean
  conditions?: SeatCondition[]
  effects?: SeatEffect[]
  traits?: CombatantAction[]
  actions?: CombatantAction[]
  bonus_actions?: CombatantAction[]
  reactions?: CombatantAction[]
  legendary_actions?: CombatantAction[]
  members?: CombatantMember[]
  dex_mod?: number | null
  xp?: number | null
  /** Сколько поверженных из пачки уже учтены в раздаче XP. */
  xp_claimed_count?: number
  /** @deprecated используй xp_claimed_count */
  xp_claimed?: boolean
  wave_id?: string | null
  damage_resistances?: string[]
  damage_immunities?: string[]
  damage_vulnerabilities?: string[]
  condition_immunities?: string[]
  statblock_visible?: boolean
  statblock_revealed?: boolean
  studied_by_me?: boolean
  study_snapshot?: CombatantStudySnapshot | null
  pending_study?: CombatantPendingStudy | null
  study_skill?: string | null
  study_skill_ru?: string | null
  suggested_study_dc?: number | null
  reaction_hint?: string | null
  last_damage_note?: string | null
  /** UIKIT-02: «Попадание · 6» / «Промах» on the enemy card. */
  last_strike_label?: string | null
  study_dc?: number | null
  /** S-06: killed | fled | surrendered */
  outcome?: string | null
}

export type CombatEntryKind = 'pc' | 'companion' | 'enemy'

export type CombatSide = {
  id: string
  label: string
}

export type CombatEntry = {
  id: string
  kind: CombatEntryKind | string
  ref_id: string
  companion_id?: string | null
  name: string
  initiative?: number | null
  initiative_pending?: boolean
  dex_mod?: number | null
  wave_id?: string | null
  defer_to_next_round?: boolean
  /** L-21 */
  surprised?: boolean
  alive_count?: number | null
  member_count?: number | null
  member_tones?: string[]
  /** S-05 */
  side?: string
  side_hidden?: boolean
  retained_after_kick?: string | null
}

export type CombatWave = {
  id: string
  index: number
  released: boolean
  condition_text?: string | null
  combatant_ids: string[]
}

export type CombatFallen = {
  id: string
  combatant_id: string
  member_id: string
  name: string
  hp_max: number
}

export type CombatWaveReminder = {
  wave_id: string
  wave_index: number
  condition_text: string
  due: boolean
}

export type SessionCombat = {
  active: boolean
  round: number
  active_index: number
  waiting_reaction?: boolean
  /** S-04 */
  dice_on_table?: boolean
  reaction_character_id?: string | null
  reaction_hint?: string | null
  pending_fumble?: { actor?: string; action_name?: string; target?: string } | null
  entries: CombatEntry[]
  waves?: CombatWave[]
  fallen?: CombatFallen[]
  saved_waves?: CombatWave[]
  wave_reminders?: CombatWaveReminder[]
  /** S-05: реестр сторон */
  sides?: CombatSide[]
  /** S-06: снимок опыта после боя */
  pending_rewards?: PendingRewards | null
  /** S-06: сундук добычи */
  loot_chest?: LootChest | null
  /** W-03: страница «Бой», с которой высадили волны. */
  wiki_combat_page_id?: string | null
}

export type PendingRewards = {
  xp_pool: number
  defeats?: Array<{
    combatant_id?: string
    name?: string
    unclaimed?: number
    xp_each?: number
    total?: number
    outcome?: string | null
  }>
  claim_combatant_ids?: string[]
  participant_character_ids?: string[]
  default_excluded_ids?: string[]
  dead_ids?: string[]
  absent_ids?: string[]
  traitor_ids?: string[]
  party_avg_level?: number
  difficulty?: string | null
  has_humanoids?: boolean
  has_beasts?: boolean
}

export type LootChestItem = {
  id: string
  name: string
  qty: number
  notes?: string | null
  artifact_id?: string | null
  catalog_slug?: string | null
  magic_table?: string | null
}

export type LootChest = {
  on_table: boolean
  items: LootChestItem[]
  coins: { cp?: number; sp?: number; ep?: number; gp?: number; pp?: number }
  log?: Array<{ id: string; who?: string | null; text: string; character_id?: string | null }>
}

export type SessionLorePage = {
  id: string
  title: string
  page_kind: SettingPageKind
  revealed: boolean
  quest_status?: QuestStatus | null
}

export type SessionDetail = {
  id: string
  lobby_id: string
  lobby_name: string
  setting_id: string | null
  setting_name: string | null
  name: string
  is_owner: boolean
  is_comaster?: boolean
  is_observer?: boolean
  can_run_session?: boolean
  can_see_hidden?: boolean
  can_award?: boolean
  can_delete_session?: boolean
  role?: string
  lead_today_user_id?: string | null
  seats: SessionSeat[]
  combatants?: SessionCombatant[]
  combat?: SessionCombat
  lobby_members: LobbyMember[]
  visibility_profile?: unknown
  /** L-08 */
  campaign_rules?: unknown
  /** T3 */
  location_page_id?: string | null
  involved_page_ids?: string[]
  location_page?: SessionLorePage | null
  involved_pages?: SessionLorePage[]
  closed_at?: string | null
  created_at: string
  updated_at: string
}

export type JournalEntryType =
  | 'text'
  | 'chapter'
  | 'setting_link'
  | 'image'
  | 'session_summary'
  | 'quest_status'

export type JournalChapterRef = {
  id: string
  title: string
}

export type JournalEntry = {
  id: string
  lobby_id: string
  author_user_id: string | null
  entry_type: JournalEntryType | string
  title: string
  body: string
  image_url: string | null
  is_draft?: boolean
  chapter_id?: string | null
  chapter_title?: string | null
  media_id?: string | null
  media_url?: string | null
  media_preview_url?: string | null
  has_hidden_segments?: boolean
  setting_id: string | null
  setting_name: string | null
  page_id: string | null
  page_title: string | null
  from_session_id: string | null
  from_session_name: string | null
  created_at: string
  updated_at: string
}

export type JournalPage = {
  items: JournalEntry[]
  total: number
  offset: number
  limit: number
  chapters?: JournalChapterRef[]
  last_journal_published_at?: string | null
}

export type JournalEntryCreatePayload = {
  entry_type: JournalEntryType | string
  title?: string
  body?: string
  image_url?: string | null
  setting_id?: string | null
  page_id?: string | null
  is_draft?: boolean
  chapter_id?: string | null
  media_id?: string | null
  source_note_id?: string | null
  delete_source_note?: boolean
}

export type JournalEntryUpdatePayload = {
  title?: string
  body?: string
  image_url?: string | null
  setting_id?: string | null
  clear_setting?: boolean
  clear_image?: boolean
  page_id?: string | null
  clear_page?: boolean
  is_draft?: boolean
  chapter_id?: string | null
  clear_chapter?: boolean
  media_id?: string | null
  clear_media?: boolean
  reveal_hidden?: boolean
}

export type SessionEvent = {
  id: string
  session_id: string
  event_type: string
  character_id: string | null
  actor_user_id: string | null
  character_name: string | null
  title: string
  formula: string | null
  breakdown: string | null
  total: number | null
  is_master_roll: boolean
  payload: Record<string, unknown>
  created_at: string
}

export async function listLobbies(): Promise<LobbySummary[]> {
  return apiRequest<LobbySummary[]>('/lobbies')
}

export async function createLobby(name?: string): Promise<LobbyDetail> {
  return apiRequest<LobbyDetail>('/lobbies', {
    method: 'POST',
    body: JSON.stringify({ name: name || undefined }),
  })
}

export async function getLobby(id: string): Promise<LobbyDetail> {
  return apiRequest<LobbyDetail>(`/lobbies/${id}`)
}

export async function getLobbyMediaUsage(lobbyId: string): Promise<LobbyMediaUsage> {
  return apiRequest<LobbyMediaUsage>(`/lobbies/${lobbyId}/media/usage`)
}

export async function uploadLobbyMedia(
  lobbyId: string,
  file: File,
  options?: {
    type?: LobbyMediaKind
    attachedToId?: string | null
    isPrimary?: boolean
  },
): Promise<LobbyMedia> {
  const body = new FormData()
  body.append('file', file)
  body.append('type', options?.type ?? 'other')
  if (options?.attachedToId) {
    body.append('attached_to_id', options.attachedToId)
  }
  if (options?.isPrimary) {
    body.append('is_primary', 'true')
  }
  return apiRequest<LobbyMedia>(`/lobbies/${lobbyId}/media`, {
    method: 'POST',
    body,
  })
}

export async function deleteLobbyMedia(
  lobbyId: string,
  mediaId: string,
): Promise<LobbyMediaUsage> {
  return apiRequest<LobbyMediaUsage>(`/lobbies/${lobbyId}/media/${mediaId}`, {
    method: 'DELETE',
  })
}

export async function updateLobby(
  id: string,
  payload: LobbyUpdatePayload,
): Promise<LobbyDetail> {
  return apiRequest<LobbyDetail>(`/lobbies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteLobby(id: string, confirmName: string): Promise<void> {
  await apiRequest<void>(`/lobbies/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ confirm_name: confirmName }),
  })
}

export async function rotateLobbyInviteCode(lobbyId: string): Promise<LobbyDetail> {
  return apiRequest<LobbyDetail>(`/lobbies/${lobbyId}/invite-code`, {
    method: 'POST',
  })
}

export async function getLobbyInviteMeta(code: string): Promise<InviteMeta> {
  return apiRequest<InviteMeta>(`/lobbies/invite/${encodeURIComponent(code.trim())}`)
}

export async function joinLobby(
  code: string,
  characterId?: string | null,
  action: JoinLobbyAction = 'join',
  options?: { acknowledgeStartMismatch?: boolean },
): Promise<JoinLobbyResult> {
  return apiRequest<JoinLobbyResult>('/lobbies/join', {
    method: 'POST',
    body: JSON.stringify({
      code,
      character_id: characterId || undefined,
      action,
      acknowledge_start_mismatch: Boolean(options?.acknowledgeStartMismatch),
    }),
  })
}

export async function waiveMemberStartRules(
  lobbyId: string,
  characterId: string,
): Promise<LobbyDetail> {
  return apiRequest<LobbyDetail>(
    `/lobbies/${lobbyId}/members/${characterId}/waive-start-rules`,
    { method: 'POST' },
  )
}

/** Ссылка на пайплайн создания с контекстом лобби (L-16). */
export function createHeroForLobbyHref(opts: {
  lobbyId: string
  code?: string | null
  characterId?: string | null
}): string {
  const params = new URLSearchParams()
  params.set('lobbyId', opts.lobbyId)
  if (opts.code) params.set('code', opts.code)
  const base = opts.characterId
    ? `/characters/create/${opts.characterId}`
    : '/characters/create'
  return `${base}?${params.toString()}`
}

export async function assignLobbyRole(
  lobbyId: string,
  userId: string,
  role: 'comaster' | 'observer',
): Promise<LobbyDetail> {
  return apiRequest<LobbyDetail>(`/lobbies/${lobbyId}/roles`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, role }),
  })
}

export async function removeLobbyRole(
  lobbyId: string,
  userId: string,
  role?: 'comaster' | 'observer' | null,
): Promise<LobbyDetail> {
  return apiRequest<LobbyDetail>(`/lobbies/${lobbyId}/roles/remove`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, role: role || undefined }),
  })
}

export async function transferLobby(
  lobbyId: string,
  payload: {
    new_owner_user_id: string
    confirm_name: string
    former_owner_fate: 'become_player' | 'leave'
    former_owner_character_id?: string | null
  },
): Promise<LobbyDetail> {
  return apiRequest<LobbyDetail>(`/lobbies/${lobbyId}/transfer`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function assignLeadToday(
  lobbyId: string,
  payload: {
    user_id: string
    session_id: string
    character_fate?: 'waiting' | 'companion'
    character_id?: string | null
  },
): Promise<LobbyDetail> {
  return apiRequest<LobbyDetail>(`/lobbies/${lobbyId}/lead-today`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function clearLeadToday(lobbyId: string, sessionId: string): Promise<LobbyDetail> {
  return apiRequest<LobbyDetail>(`/lobbies/${lobbyId}/lead-today/${sessionId}`, {
    method: 'DELETE',
  })
}

/** @deprecated Состав только через joinLobby(code). Эндпоинт отвечает 400. */
export async function addLobbyMember(lobbyId: string, characterId: string): Promise<LobbyDetail> {
  return apiRequest<LobbyDetail>(`/lobbies/${lobbyId}/members`, {
    method: 'POST',
    body: JSON.stringify({ character_id: characterId }),
  })
}

export type PietyAwardResult = {
  character_id: string
  god: string | null
  score: number
  journal_entry: Record<string, unknown>
}

export async function awardLobbyPiety(
  lobbyId: string,
  payload: { character_id: string; delta: number; comment?: string | null },
): Promise<PietyAwardResult> {
  return apiRequest<PietyAwardResult>(`/lobbies/${lobbyId}/piety`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function syncLobbyInfusionEffects(
  lobbyId: string,
  payload: {
    source_character_id: string
    effects: Array<{
      target_character_id: string
      name: string
      ac_bonus?: number
      slug?: string
      kind?: string
      charges?: number
      mods?: Array<{
        target: string
        op: string
        value?: number
        dice?: string
        condition?: string
        once?: boolean
      }>
    }>
  },
): Promise<{ applied: number; lobby: LobbyDetail }> {
  return apiRequest<{ applied: number; lobby: LobbyDetail }>(
    `/lobbies/${lobbyId}/sync-infusion-effects`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export async function shareLobbyEffect(
  lobbyId: string,
  payload: {
    source_character_id: string
    name: string
    target_character_ids: string[]
    linked_concentration?: boolean
    kind?: string
    slug?: string
    origin?: string
    ac_bonus?: number
    charges?: number
    mods?: Array<{
      target: string
      op: string
      value?: number
      dice?: string
      condition?: string
      once?: boolean
    }>
    duration?: {
      unit: string
      value?: number
      started_at?: string
      started_round?: number
      remaining_rounds?: number
    }
  },
): Promise<{ applied: number; lobby: LobbyDetail }> {
  return apiRequest<{ applied: number; lobby: LobbyDetail }>(
    `/lobbies/${lobbyId}/share-effect`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export async function removeLobbyMember(
  lobbyId: string,
  characterId: string,
  payload?: RemoveLobbyMemberPayload,
): Promise<LobbyDetail> {
  return apiRequest<LobbyDetail>(`/lobbies/${lobbyId}/members/${characterId}`, {
    method: 'DELETE',
    body: JSON.stringify({
      combat_fate: payload?.combat_fate ?? null,
      delete_personal_notes: payload?.delete_personal_notes ?? false,
    }),
  })
}

export async function createSetting(
  lobbyId: string,
  payload: { name?: string; world_notes?: string },
): Promise<SettingSummary> {
  return apiRequest<SettingSummary>(`/lobbies/${lobbyId}/settings`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function choosePrimarySetting(
  lobbyId: string,
  settingId: string,
): Promise<LobbyDetail> {
  return apiRequest<LobbyDetail>(`/lobbies/${lobbyId}/settings/primary`, {
    method: 'POST',
    body: JSON.stringify({ setting_id: settingId }),
  })
}

export async function getSetting(id: string): Promise<SettingDetail> {
  return apiRequest<SettingDetail>(`/settings/${id}`)
}

export async function updateSetting(
  id: string,
  payload: { name?: string; world_notes?: string },
): Promise<SettingSummary> {
  return apiRequest<SettingSummary>(`/settings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteSetting(id: string): Promise<void> {
  await apiRequest<void>(`/settings/${id}`, { method: 'DELETE' })
}

export async function createSettingPage(
  settingId: string,
  payload: {
    title?: string
    body?: string
    gm_body?: string
    parent_id?: string | null
    page_kind?: SettingPageKind
    template_id?: string | null
    fields?: Record<string, SettingPageFieldValue>
    quest_status?: QuestStatus | null
    tags?: string[]
  },
): Promise<SettingDetail> {
  return apiRequest<SettingDetail>(`/settings/${settingId}/pages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function bulkCreateSettingPages(
  settingId: string,
  payload: {
    titles: string[]
    page_kind?: SettingPageKind
    template_id?: string | null
    parent_id?: string | null
    body?: string
  },
): Promise<SettingDetail> {
  return apiRequest<SettingDetail>(`/settings/${settingId}/pages/bulk`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateSettingPage(
  pageId: string,
  payload: {
    title?: string
    body?: string
    gm_body?: string
    parent_id?: string | null
    clear_parent?: boolean
    sort_order?: number
    revealed?: boolean
    reveal_subtree?: boolean
    page_kind?: SettingPageKind
    template_id?: string | null
    clear_template?: boolean
    fields?: Record<string, SettingPageFieldValue>
    quest_status?: QuestStatus | null
    clear_quest_status?: boolean
    create_missing_mentions?: boolean
    tags?: string[]
    expected_updated_at?: string | null
    force_overwrite?: boolean
    /** W-04 */
    artifact_id?: string | null
    clear_artifact?: boolean
  },
): Promise<SettingDetail> {
  return apiRequest<SettingDetail>(`/settings/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteSettingPage(pageId: string): Promise<SettingDetail> {
  return apiRequest<SettingDetail>(`/settings/pages/${pageId}`, {
    method: 'DELETE',
  })
}

export async function restoreSetting(settingId: string): Promise<SettingSummary> {
  return apiRequest<SettingSummary>(`/settings/${settingId}/restore`, { method: 'POST' })
}

export async function purgeSetting(settingId: string): Promise<void> {
  await apiRequest<void>(`/settings/${settingId}/purge`, { method: 'DELETE' })
}

export async function restoreSettingPage(pageId: string): Promise<SettingDetail> {
  return apiRequest<SettingDetail>(`/settings/pages/${pageId}/restore`, { method: 'POST' })
}

export async function purgeSettingPage(pageId: string): Promise<SettingDetail> {
  return apiRequest<SettingDetail>(`/settings/pages/${pageId}/purge`, { method: 'DELETE' })
}

export async function listWikiTrash(lobbyId: string): Promise<{ items: SettingTrashItem[] }> {
  return apiRequest<{ items: SettingTrashItem[] }>(`/lobbies/${lobbyId}/wiki/trash`)
}

export async function listSettingPageVersions(pageId: string): Promise<SettingPageVersion[]> {
  return apiRequest<SettingPageVersion[]>(`/settings/pages/${pageId}/versions`)
}

export async function restoreSettingPageVersion(
  pageId: string,
  versionId: string,
): Promise<SettingDetail> {
  return apiRequest<SettingDetail>(
    `/settings/pages/${pageId}/versions/${versionId}/restore`,
    { method: 'POST' },
  )
}

export async function resolveWikiMention(
  settingId: string,
  title: string,
): Promise<WikiMentionResolve> {
  const q = new URLSearchParams({ title })
  return apiRequest<WikiMentionResolve>(
    `/settings/${settingId}/mentions/resolve?${q.toString()}`,
  )
}

export async function copyWikiPages(
  settingId: string,
  payload: {
    source_page_id: string
    include_subtree?: boolean
    target_parent_id?: string | null
  },
): Promise<SettingDetail> {
  return apiRequest<SettingDetail>(`/settings/${settingId}/pages/copy`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function listSettingPageEditors(
  pageId: string,
): Promise<Array<{ page_id: string; user_id: string; display_name: string }>> {
  return apiRequest(`/settings/pages/${pageId}/editors`)
}

export async function createSettingPageLink(
  pageId: string,
  payload: {
    to_page_id: string
    label?: string
    kind?: SettingPageLinkKind
    visibility?: SettingPageLinkVisibility
    bidirectional?: boolean
    reverse_label?: string | null
  },
): Promise<SettingDetail> {
  return apiRequest<SettingDetail>(`/settings/pages/${pageId}/links`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteSettingPageLink(linkId: string): Promise<SettingDetail> {
  return apiRequest<SettingDetail>(`/settings/page-links/${linkId}`, {
    method: 'DELETE',
  })
}

export async function createSettingArtifact(
  settingId: string,
  payload: SettingArtifactCreatePayload,
): Promise<SettingDetail> {
  return apiRequest<SettingDetail>(`/settings/${settingId}/artifacts`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateSettingArtifact(
  artifactId: string,
  payload: SettingArtifactUpdatePayload,
): Promise<SettingDetail> {
  return apiRequest<SettingDetail>(`/settings/artifacts/${artifactId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function createSettingArtifactSet(
  settingId: string,
  payload: SettingArtifactSetCreatePayload,
): Promise<SettingDetail> {
  return apiRequest<SettingDetail>(`/settings/${settingId}/artifact-sets`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateSettingArtifactSet(
  setId: string,
  payload: SettingArtifactSetUpdatePayload,
): Promise<SettingDetail> {
  return apiRequest<SettingDetail>(`/settings/artifact-sets/${setId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteSettingArtifactSet(setId: string): Promise<SettingDetail> {
  return apiRequest<SettingDetail>(`/settings/artifact-sets/${setId}`, {
    method: 'DELETE',
  })
}

export async function deleteSettingArtifact(artifactId: string): Promise<SettingDetail> {
  return apiRequest<SettingDetail>(`/settings/artifacts/${artifactId}`, {
    method: 'DELETE',
  })
}

export async function createSession(
  lobbyId: string,
  payload: {
    name?: string
    setting_id?: string | null
    /** Кто пришёл — сразу за стол (посещаемость) */
    character_ids?: string[]
  },
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/lobbies/${lobbyId}/sessions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getSession(id: string): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/sessions/${id}`)
}

export async function updateSession(
  id: string,
  payload: {
    name?: string
    setting_id?: string | null
    clear_setting?: boolean
    location_page_id?: string | null
    clear_location_page?: boolean
    involved_page_ids?: string[]
  },
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteSession(id: string): Promise<void> {
  await apiRequest<void>(`/sessions/${id}`, { method: 'DELETE' })
}

export async function seatCharacter(sessionId: string, characterId: string): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/sessions/${sessionId}/seats`, {
    method: 'POST',
    body: JSON.stringify({ character_id: characterId }),
  })
}

export async function unseatCharacter(
  sessionId: string,
  characterId: string,
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/sessions/${sessionId}/seats/${characterId}`, {
    method: 'DELETE',
  })
}

export async function patchSeatCombat(
  sessionId: string,
  characterId: string,
  payload: {
    inspiration?: boolean
    spend_inspiration?: boolean
    conditions?: SeatCondition[]
    effects?: SeatEffect[]
    concentration?: SeatConcentration | null
    clear_concentration?: boolean
    damage?: number
    damage_type?: string | null
    grant_temp_hp?: number
    death_successes?: number
    death_fails?: number
    turn_economy?: {
      action?: boolean
      bonus?: boolean
      reaction?: boolean
      object_interaction?: boolean
      moved?: boolean
    }
  },
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(
    `/sessions/${sessionId}/seats/${characterId}/combat`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
}

export async function addSeatCompanion(
  sessionId: string,
  characterId: string,
  payload: {
    name: string
    hp_current?: number | null
    hp_max?: number | null
    ac?: number | null
    story?: boolean
    bestiary_ref?: string | null
    bestiary_name_ru?: string | null
    initiative_mode?: 'with_master' | 'own_initiative'
    command_cost?: 'none' | 'action' | 'bonus' | 'reaction'
    kind?: string | null
    nature?: string | null
    speed?: number | null
    dex?: number | null
    str?: number | null
    con?: number | null
    actions?: string | null
    notes?: string | null
  },
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(
    `/sessions/${sessionId}/seats/${characterId}/companions`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export async function patchSeatCompanion(
  sessionId: string,
  characterId: string,
  companionId: string,
  payload: {
    name?: string
    hp_current?: number | null
    hp_max?: number | null
    ac?: number | null
    conditions?: SeatCondition[]
    initiative_mode?: 'with_master' | 'own_initiative'
    command_cost?: 'none' | 'action' | 'bonus' | 'reaction'
    active?: boolean
    death_successes?: number | null
    death_fails?: number | null
  },
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(
    `/sessions/${sessionId}/seats/${characterId}/companions/${companionId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
}

export async function deleteSeatCompanion(
  sessionId: string,
  characterId: string,
  companionId: string,
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(
    `/sessions/${sessionId}/seats/${characterId}/companions/${companionId}`,
    { method: 'DELETE' },
  )
}

export async function addSessionCombatants(
  sessionId: string,
  payload: {
    catalog_id?: string | null
    slug?: string | null
    name?: string | null
    hp_max?: number | null
    ac?: number | null
    speed?: number | null
    count?: number
    actions?: CombatantAction[]
    wave_index?: number
    wave_condition_text?: string | null
  },
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/sessions/${sessionId}/combatants`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function patchSessionCombatant(
  sessionId: string,
  combatantId: string,
  payload: {
    hp_current?: number
    hp_max?: number
    ac?: number | null
    name?: string
    damage?: number
    damage_type?: string | null
    grant_temp_hp?: number
    member_id?: string
    member_damages?: { member_id: string; damage: number; damage_type?: string | null }[]
    conditions?: SeatCondition[]
    effects?: SeatEffect[]
    reveal_statblock?: boolean
    /** S-06: killed | fled | surrendered | '' */
    outcome?: string | null
    /** G12: master sets Study DC */
    study_dc?: number | null
  },
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/sessions/${sessionId}/combatants/${combatantId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function studySessionCombatant(
  sessionId: string,
  combatantId: string,
  payload: {
    character_id: string
    roll_total?: number | null
    dc?: number | null
  },
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(
    `/sessions/${sessionId}/combatants/${combatantId}/study`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export async function resolveStudySessionCombatant(
  sessionId: string,
  combatantId: string,
  payload: { success: boolean; user_id?: string | null },
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(
    `/sessions/${sessionId}/combatants/${combatantId}/study/resolve`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export async function shareStudiedSessionCombatant(
  sessionId: string,
  combatantId: string,
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(
    `/sessions/${sessionId}/combatants/${combatantId}/share-study`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}

export async function deleteSessionCombatant(
  sessionId: string,
  combatantId: string,
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/sessions/${sessionId}/combatants/${combatantId}`, {
    method: 'DELETE',
  })
}

export type CombatEntryInput = {
  kind: CombatEntryKind
  ref_id: string
  companion_id?: string | null
  name: string
  initiative?: number | null
  initiative_pending?: boolean
  dex_mod?: number | null
  wave_id?: string | null
  /** L-21: застигнут врасплох при старте боя */
  surprised?: boolean
}

export type CombatWaveInput = {
  index: number
  condition_text?: string | null
  combatant_ids: string[]
  released?: boolean | null
}

export async function startSessionCombat(
  sessionId: string,
  payload: { entries: CombatEntryInput[]; waves?: CombatWaveInput[] },
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/sessions/${sessionId}/combat/start`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function rollSessionCombatInitiative(
  sessionId: string,
  payload: {
    character_id?: string
    entry_id?: string
    kind?: CombatEntryKind
    ref_id?: string
    companion_id?: string | null
    mode?: 'roll' | 'manual'
    value?: number | null
    advantage?: boolean | null
  },
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/sessions/${sessionId}/combat/initiative`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function patchSessionCombat(
  sessionId: string,
  payload: {
    action?:
      | 'next'
      | 'prev'
      | 'end'
      | 'release_wave'
      | 'restore_fallen'
      | 'set_waiting_reaction'
      | 'set_dice_on_table'
      | 'resolve_fumble'
      | 'set_side'
      | 'reveal_side'
      | null
    active_index?: number
    round?: number
    entries?: CombatEntryInput[]
    wave_id?: string
    fallen_id?: string
    restore_hp?: number
    keep_unreleased_waves?: boolean
    summary?: string
    waiting_reaction?: boolean
    dice_on_table?: boolean
    fumble_consequence_id?: string | null
    /** S-05 */
    entry_id?: string
    side?: string
    side_label?: string | null
    side_hidden?: boolean | null
  },
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/sessions/${sessionId}/combat`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export type CombatAttackPayload = {
  attacker_combatant_id: string
  action_name: string
  action_block?: string
  target_kind: 'pc' | 'companion' | 'enemy'
  target_ref_id: string
  target_member_id?: string | null
  companion_id?: string | null
  mode: 'roll' | 'manual' | 'table_hit' | 'table_miss' | 'table_save' | 'table_fail'
  attack_total?: number | null
  attack_natural?: number | null
  damage_total?: number | null
  damage_type?: string | null
  flanking?: boolean
  advantage?: boolean | null
  disadvantage?: boolean | null
  physical_dice?: boolean
}

export type CombatAttackResult = {
  session: SessionDetail
  event?: SessionEvent | null
  hit?: boolean | null
  damage_applied?: number | null
  damage_note?: string | null
  waiting_reaction?: boolean
  fumble_pending?: boolean
  feed_line?: string | null
}

export async function resolveSessionCombatAttack(
  sessionId: string,
  payload: CombatAttackPayload,
): Promise<CombatAttackResult> {
  return apiRequest<CombatAttackResult>(`/sessions/${sessionId}/combat/attack`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function resolveSessionCombatReaction(
  sessionId: string,
  payload: {
    action: 'declare' | 'skip'
    character_id: string
    effect_name?: string | null
  },
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/sessions/${sessionId}/combat/reaction`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export type CombatTargetsResponse = {
  session_id: string
  dice_on_table: boolean
  waiting_reaction: boolean
  targets: Array<{
    id: string
    kind: 'pc' | 'companion' | 'enemy' | string
    ref_id: string
    name: string
    hp_current?: number | null
    hp_max?: number | null
    ac?: number | null
    conditions?: unknown[]
    side: string
    is_ally: boolean
    user_id?: string | null
    companion_id?: string | null
    member_id?: string | null
  }>
}

/** S-04 / T-01: видимые цели боя. */
export async function listSessionCombatTargets(
  sessionId: string,
): Promise<CombatTargetsResponse> {
  return apiRequest<CombatTargetsResponse>(`/sessions/${sessionId}/combat/targets`)
}

export type XpAwardResult = {
  session: SessionDetail
  awarded_each: number
  awarded_total: number
  recipients: string[]
  remainder?: number
  remainder_banked?: number
  xp_remainder?: number
  mode?: string
  leveled_up?: Array<{
    character_id: string
    name: string
    level: number
    experience: number
  }>
  per_recipient?: Record<string, number>
}

export async function awardSessionXp(
  sessionId: string,
  payload: {
    character_ids: string[]
    total_xp?: number | null
    per_character_xp?: number | null
    source?: string
    note?: string | null
    claim_combatant_ids?: string[]
    include_bank?: boolean
    remainder_mode?: 'bank' | 'give'
    remainder_character_id?: string | null
    bonuses?: Array<{ character_id: string; amount: number; reason?: string }>
    milestones?: boolean | null
    clear_pending_rewards?: boolean
  },
): Promise<XpAwardResult> {
  return apiRequest<XpAwardResult>(`/sessions/${sessionId}/xp`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export type SessionRevealPageResult = {
  session: SessionDetail
  event: SessionEvent
  page_id: string
  page_title: string
  revealed: boolean
  reveal_subtree: boolean
  affected_count: number
}

/** T2: раскрыть страницу сеттинга mid-session → лента. */
export async function revealSessionPage(
  sessionId: string,
  payload: {
    page_id: string
    reveal_subtree?: boolean
    revealed?: boolean
  },
): Promise<SessionRevealPageResult> {
  return apiRequest<SessionRevealPageResult>(`/sessions/${sessionId}/reveal-page`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export type SessionQuestStatusResult = {
  session: SessionDetail
  event: SessionEvent
  page_id: string
  page_title: string
  quest_status: QuestStatus
  journal_entry: JournalEntry | null
}

/** T4: статус квеста mid-session → лента + опционально дневник. */
export async function updateSessionQuestStatus(
  sessionId: string,
  payload: {
    page_id: string
    quest_status: QuestStatus
    write_journal?: boolean
    title?: string
    summary?: string
  },
): Promise<SessionQuestStatusResult> {
  return apiRequest<SessionQuestStatusResult>(`/sessions/${sessionId}/quest-status`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export type LootAwardResult = {
  session: SessionDetail
  summary: string
  recipient_names: string[]
}

export async function awardSessionLoot(
  sessionId: string,
  payload: {
    grants: Array<{
      character_id: string
      item?: {
        name?: string
        qty: number
        notes?: string | null
        artifact_id?: string | null
      }
      coins?: {
        cp?: number
        sp?: number
        ep?: number
        gp?: number
        pp?: number
      }
    }>
    note?: string | null
    clear_chest?: boolean
  },
): Promise<LootAwardResult> {
  return apiRequest<LootAwardResult>(`/sessions/${sessionId}/loot`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export type LootChestResult = {
  session: SessionDetail
  chest: LootChest
  summary: string
  meta?: Record<string, unknown>
}

export type LootChestAction =
  | 'set'
  | 'put_on_table'
  | 'award'
  | 'claim'
  | 'split_coins'
  | 'reassign'
  | 'close'
  | 'generate'
  | 'quick_add'
  | 'reroll_item'
  | 'remove_item'

export async function sessionLootChest(
  sessionId: string,
  payload: {
    action: LootChestAction
    items?: Array<{
      id?: string
      name?: string
      qty?: number
      notes?: string | null
      artifact_id?: string | null
      catalog_slug?: string | null
      magic_table?: string | null
    }>
    coins?: { cp?: number; sp?: number; ep?: number; gp?: number; pp?: number }
    grants?: Array<{
      character_id: string
      item?: {
        name?: string
        qty: number
        notes?: string | null
        artifact_id?: string | null
      }
      coins?: {
        cp?: number
        sp?: number
        ep?: number
        gp?: number
        pp?: number
      }
    }>
    note?: string | null
    item_id?: string | null
    qty?: number | null
    character_id?: string | null
    kind?:
      | 'trinkets'
      | 'supplies'
      | 'valuables'
      | 'magic'
      | 'rare_magic'
      | 'legend'
      | 'trophies'
      | null
    difficulty?: 'easy' | 'medium' | 'hard' | 'deadly' | null
    replace?: boolean
    remainder?: 'return' | 'discard'
    seed?: number | null
  },
): Promise<LootChestResult> {
  return apiRequest<LootChestResult>(`/sessions/${sessionId}/loot/chest`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export type InventoryTransferResult = {
  summary: string
  from_character_id: string
  to_character_id: string
  to_character_name: string
}

export async function transferLobbyInventory(
  lobbyId: string,
  payload: {
    from_character_id: string
    to_character_id: string
    item_id?: string | null
    qty?: number | null
    coin_currency?: 'cp' | 'sp' | 'ep' | 'gp' | 'pp' | null
    coin_amount?: number | null
    session_id?: string | null
  },
): Promise<InventoryTransferResult> {
  return apiRequest<InventoryTransferResult>(`/lobbies/${lobbyId}/transfers`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export type InventoryGrantResult = {
  session: SessionDetail
  summary: string
  to_character_id: string
  to_character_name: string
}

/** S-07: мастер выдаёт предмет/монеты «из воздуха» (не сундук). */
export async function grantSessionInventory(
  sessionId: string,
  payload: {
    character_id: string
    item_name?: string | null
    item_qty?: number | null
    coin_currency?: 'cp' | 'sp' | 'ep' | 'gp' | 'pp' | null
    coin_amount?: number | null
  },
): Promise<InventoryGrantResult> {
  return apiRequest<InventoryGrantResult>(`/sessions/${sessionId}/inventory-grants`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export type PartyRestResult = {
  session: SessionDetail
  kind: 'short' | 'long'
  gritty_rest: boolean
  summary: string
  short_label: string
  long_label: string
}

/** S-07: короткий/долгий отдых партии со стола. */
export async function startPartyRest(
  sessionId: string,
  kind: 'short' | 'long',
): Promise<PartyRestResult> {
  return apiRequest<PartyRestResult>(`/sessions/${sessionId}/party-rest`, {
    method: 'POST',
    body: JSON.stringify({ kind }),
  })
}

export type EncounterGenerateDifficulty = 'easy' | 'medium' | 'hard' | 'deadly'
export type EncounterComposition = 'horde' | 'boss' | 'mixed'
export type EncounterWaveProfile = 'even' | 'escalation'
export type EncounterFlyers = 'auto' | 'allow' | 'want' | 'none'
export type EncounterEnemyCasters = 'none' | 'any' | 'several'
export type EncounterRangedBand = 'low' | 'medium' | 'high'

export type EncounterMonsterOption = {
  slug: string
  name_ru: string
  cr: string
  xp: number
  type?: string | null
  subtype?: string | null
  fly?: boolean
  caster?: boolean
}

export type EncounterRoleProposal = {
  role: 'boss' | 'pack'
  options: EncounterMonsterOption[]
  suggested_count: number
}

export type EncounterWaveProposal = {
  wave_index: number
  budget_xp: number
  boss?: EncounterRoleProposal | null
  pack?: EncounterRoleProposal | null
}

export type EncounterPartySummary = {
  member_count: number
  levels: number[]
  party_power: number
  ranged_band: EncounterRangedBand | string
  ranged_band_label: string
  anti_air_ok: boolean
  homebrew_applied: string[]
  override_used: boolean
}

export type EncounterGenerateResult = {
  difficulty: EncounterGenerateDifficulty | string
  party_power: number
  budget_total: number
  anti_air_ok: boolean
  waves: EncounterWaveProposal[]
  notes: string[]
  theme_ids: string[]
  similar: boolean
  environments: string[]
  composition?: EncounterComposition | string
  wave_profile?: EncounterWaveProfile | string
  flyers?: EncounterFlyers | string
  enemy_casters?: EncounterEnemyCasters | string
  flyers_warning?: boolean
  party?: EncounterPartySummary | null
  wiki_save_available?: boolean
  /** W-03: id созданной страницы «Бой», если save_to_wiki. */
  wiki_page_id?: string | null
}

export type EncounterGeneratePayload = {
  difficulty: EncounterGenerateDifficulty
  environments?: string[]
  theme_ids: string[]
  similar?: boolean
  waves?: number
  composition?: EncounterComposition
  wave_profile?: EncounterWaveProfile
  flyers?: EncounterFlyers
  enemy_casters?: EncounterEnemyCasters
  party_count_override?: number | null
  party_level_override?: number | null
  save_to_wiki?: boolean
  parent_page_id?: string | null
  wiki_title?: string | null
  wiki_picks?: EncounterWikiPick[] | null
}

/** G-01: умный генератор боя на живом столе. */
export async function generateSessionEncounter(
  sessionId: string,
  payload: EncounterGeneratePayload,
): Promise<EncounterGenerateResult> {
  return apiRequest<EncounterGenerateResult>(
    `/sessions/${sessionId}/encounters/generate`,
    { method: 'POST', body: JSON.stringify(payload) },
  )
}

/** W-03: высадить страницу «Бой» на стол. 400 combat_already_active если бой идёт. */
export async function startCombatFromWiki(
  sessionId: string,
  pageId: string,
): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/sessions/${sessionId}/combat/from-wiki`, {
    method: 'POST',
    body: JSON.stringify({ page_id: pageId } satisfies CombatFromWikiPayload),
  })
}

/** W-03: список страниц «Бой» сеттинга сессии. */
export async function listSessionWikiCombats(
  sessionId: string,
): Promise<{ pages: WikiCombatPage[] }> {
  return apiRequest<{ pages: WikiCombatPage[] }>(
    `/sessions/${sessionId}/wiki-combats`,
  )
}

function memberDefeatedForXp(member: {
  hp_current: number
  outcome?: string | null
}): boolean {
  const o = (member.outcome || '').toLowerCase()
  if (o === 'fled' || o === 'surrendered') return true
  return member.hp_current <= 0
}

/** Сколько XP ещё не раздано за поверженных в пачке/карточке (S-06: +сбежал/сдался). */
export function unclaimedDefeatXp(combatant: SessionCombatant): {
  dead: number
  claimed: number
  unclaimed: number
  xpEach: number
  total: number
  claimable: boolean
} {
  const xpEach = Math.max(0, combatant.xp ?? 0)
  const members = combatant.members ?? []
  const outcome = (combatant.outcome || '').toLowerCase()
  let dead: number
  if (members.length > 0) {
    dead = members.filter((m) =>
      memberDefeatedForXp({
        hp_current: m.hp_current,
        outcome: (m as { outcome?: string | null }).outcome ?? outcome,
      }),
    ).length
  } else if (outcome === 'fled' || outcome === 'surrendered') {
    dead = 1
  } else {
    dead = combatant.hp_current <= 0 ? 1 : 0
  }
  const claimedRaw =
    typeof combatant.xp_claimed_count === 'number'
      ? combatant.xp_claimed_count
      : combatant.xp_claimed
        ? dead
        : 0
  const claimed = Math.max(0, Math.min(dead, claimedRaw))
  const unclaimed = Math.max(0, dead - claimed)
  const claimable = unclaimed > 0 && xpEach > 0
  return {
    dead,
    claimed,
    unclaimed,
    xpEach,
    total: claimable ? unclaimed * xpEach : 0,
    claimable,
  }
}

/** @deprecated L-03: внешний QR снят — используйте InviteQr. */
export function lobbyQrUrl(inviteCode: string): string {
  // Заглушка без сети (не api.qrserver.com).
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><text x="12" y="90" font-size="12">QR ${inviteCode}</text></svg>`,
  )}`
}

export async function listSessionEvents(
  sessionId: string,
  opts?: { rollsOnly?: boolean; feedFilter?: 'all' | 'combat' | 'rolls' },
): Promise<SessionEvent[]> {
  const params = new URLSearchParams()
  if (opts?.rollsOnly) params.set('rolls_only', 'true')
  if (opts?.feedFilter && opts.feedFilter !== 'all') {
    params.set('feed_filter', opts.feedFilter)
  }
  const q = params.toString() ? `?${params.toString()}` : ''
  return apiRequest<SessionEvent[]>(`/sessions/${sessionId}/events${q}`)
}

export async function createSessionRoll(
  sessionId: string,
  payload: {
    character_id?: string | null
    title: string
    formula?: string | null
    breakdown?: string | null
    total: number
    is_master_roll?: boolean
    physical_dice?: boolean
    is_hidden?: boolean
    category?: string | null
    used_inspiration?: boolean
    advantage?: boolean
  },
): Promise<SessionEvent> {
  return apiRequest<SessionEvent>(`/sessions/${sessionId}/rolls`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function sessionWsUrl(sessionId: string, accessToken: string): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const host = window.location.host
  return `${proto}://${host}/sessions/${sessionId}/ws?token=${encodeURIComponent(accessToken)}`
}

export async function listJournal(
  lobbyId: string,
  opts?: { offset?: number; limit?: number; q?: string; chapterId?: string | null },
): Promise<JournalPage> {
  const params = new URLSearchParams()
  if (opts?.offset != null) params.set('offset', String(opts.offset))
  if (opts?.limit != null) params.set('limit', String(opts.limit))
  if (opts?.q) params.set('q', opts.q)
  if (opts?.chapterId) params.set('chapter_id', opts.chapterId)
  const q = params.toString()
  return apiRequest<JournalPage>(`/lobbies/${lobbyId}/journal${q ? `?${q}` : ''}`)
}

export async function createJournalEntry(
  lobbyId: string,
  payload: JournalEntryCreatePayload,
): Promise<JournalEntry> {
  return apiRequest<JournalEntry>(`/lobbies/${lobbyId}/journal`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateJournalEntry(
  entryId: string,
  payload: JournalEntryUpdatePayload,
): Promise<JournalEntry> {
  return apiRequest<JournalEntry>(`/journal/${entryId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteJournalEntry(entryId: string): Promise<void> {
  await apiRequest<void>(`/journal/${entryId}`, { method: 'DELETE' })
}

export async function closeSession(
  sessionId: string,
  payload: { title?: string; summary?: string; write_journal?: boolean },
): Promise<{ session: SessionDetail; journal_entry: JournalEntry | null }> {
  return apiRequest(`/sessions/${sessionId}/close`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
