import { useEffect, useMemo, useRef, useState } from 'react'
import { CatalogCombobox } from '../catalog'
import {
  getCharacter,
  updateCharacter,
  type CharacterDetail,
  type RulesEdition,
} from '../../shared/api/characters'
import { ApiRequestError } from '../../shared/api/client'
import {
  getLobby,
  listLobbies,
  transferLobbyInventory,
} from '../../shared/api/lobbies'
import {
  createSheetSyncChannel,
  publishSheetSync,
  type SheetSyncMessage,
} from '../../shared/sync/characterSheetChannel'
import {
  addMulticlassLevel,
  bumpClassLevel,
  formatClassSummary,
  reduceClassLevel,
  totalCharacterLevel,
} from '../../shared/dnd/classLevels'
import { computeArmorClass } from '../../shared/dnd/armor'
import { Button, Dialog, Field, Input, NumberInput, Panel, Stack, Text } from '../../ui'
import {
  AttacksPanel,
  inferAttackRangeKind,
  isAttackRangeKind,
  type WeaponAttack,
} from './AttacksPanel'
import { AttunementPanel } from './AttunementPanel'
import {
  attunementsToSheet,
  readAttunements,
  type AttunementSlot,
} from './attunement'
import {
  classLevelsToSheet,
  readClassLevels,
  type ClassLevelEntry,
} from './classLevels'
import { CombatStickyHeader } from './CombatStickyHeader'
import { InventoryPanel } from './InventoryPanel'
import { LanguagesToolsPanel } from './LanguagesToolsPanel'
import { LevelUpDialog, type LevelUpChoice } from './LevelUpDialog'
import { PlayPanel } from './PlayPanel'
import { SpellsPanel } from './SpellsPanel'
import { TextBlocksPanel } from './TextBlocksPanel'
import {
  ARMOR_PROF_OPTIONS,
  WEAPON_PROF_OPTIONS,
  identityExtrasToSheet,
  readIdentityExtras,
  type IdentityExtras,
} from './identity'
import { applyRaceCatalogToDraft } from './raceEffects'
import {
  equippedArmorPieces,
  inventoryToSheet,
  magicAcBonusFromInventory,
  readInventory,
  type InventoryState,
} from './inventory'
import type { TransferPeer } from './TransferDialog'
import {
  playToSheet,
  readPlay,
  type PlayState,
} from './play'
import {
  readSpells,
  spellsToSheet,
  type SpellsState,
} from './spells'
import {
  readTextBlocks,
  textBlocksToSheet,
  type TextBlock,
} from './textBlocks'
import {
  ABILITY_KEYS,
  ABILITY_LABELS,
  SKILL_DEFS,
  abilityModifier,
  asRecord,
  formatModifier,
  readNullableNumber,
  readNumber,
  type AbilityKey,
} from './sheetTypes'
import { passiveScore, skillModifierFromState } from '../../shared/dnd/passives'
import {
  DEFAULT_ABILITY_SCORE_MAX,
  clampAbilityScore,
  resolveAbilityMaxes,
} from '../../shared/dnd/abilityScoreCaps'

type MinimalSheetEditorProps = {
  character: CharacterDetail
  onSaved: (character: CharacterDetail) => void
  onToast: (message: string) => void
  onRemoteSave?: (message: Extract<SheetSyncMessage, { type: 'sheet-saved' }>) => void
  /** Мастер лобби: только просмотр */
  readOnly?: boolean
}

type Draft = {
  name: string
  raceName: string
  raceCatalogId: string | null
  classes: ClassLevelEntry[]
  identity: IdentityExtras
  abilities: Record<AbilityKey, number>
  /** Потолок характеристики от артефактов (маска: макс 22) */
  abilityMax: Record<AbilityKey, number | null>
  saves: Record<AbilityKey, boolean>
  /** Бонусы спасбросков от артефактов (cloak of protection и т.п.) */
  saveMagic: Record<AbilityKey, number>
  skills: Record<
    string,
    { is_proficient: boolean; is_expertise: boolean; magic_bonus: number }
  >
  hpCurrent: number | null
  hpMax: number | null
  ac: number | null
  speed: number | null
  initiativeOverride: number | null
  inspiration: boolean
  /** Сопр./имм. урона и иммунитеты состояний с артефактов */
  defenses: {
    damage: Array<{ id: string; damage_type: string; mode: string; source_name?: string }>
    conditions: Array<{ id: string; slug: string; name: string; source_name?: string }>
  }
  weapons: WeaponAttack[]
  inventory: InventoryState
  attunements: AttunementSlot[]
  spells: SpellsState
  play: PlayState
  textBlocks: TextBlock[]
}

function readWeapons(sheet: Record<string, unknown>): WeaponAttack[] {
  const raw = sheet.weapons
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.map((item, index) => {
    const row = asRecord(item)
    const ability = ABILITY_KEYS.includes(row.ability as AbilityKey)
      ? (row.ability as AbilityKey)
      : 'str'
    const sourceKind =
      row.source_kind === 'weapon' || row.source_kind === 'artifact' || row.source_kind === 'custom'
        ? row.source_kind
        : row.catalog_id
          ? 'weapon'
          : 'custom'
    const name = typeof row.name === 'string' ? row.name : ''
    const range_kind = isAttackRangeKind(row.range_kind)
      ? row.range_kind
      : inferAttackRangeKind(name, row)
    const magicRaw = row.magic_bonus
    const magic_bonus =
      typeof magicRaw === 'number' && Number.isFinite(magicRaw) ? Math.floor(magicRaw) : 0
    const reqAbility =
      typeof row.req_ability === 'string' && ABILITY_KEYS.includes(row.req_ability as AbilityKey)
        ? (row.req_ability as AbilityKey)
        : null
    const activationRaw = asRecord(row.activation)
    const activation =
      Object.keys(activationRaw).length > 0
        ? {
            id: typeof activationRaw.id === 'string' ? activationRaw.id : `mode-${index}`,
            name: typeof activationRaw.name === 'string' ? activationRaw.name : 'Активация',
            action_cost:
              typeof activationRaw.action_cost === 'string' ? activationRaw.action_cost : 'bonus',
            duration: typeof activationRaw.duration === 'string' ? activationRaw.duration : '',
            duration_rounds: readNumber(activationRaw.duration_rounds, 10),
            active_damage:
              typeof activationRaw.active_damage === 'string' ? activationRaw.active_damage : '',
            active_damage_type:
              typeof activationRaw.active_damage_type === 'string'
                ? activationRaw.active_damage_type
                : '',
            advantage: activationRaw.advantage !== false,
            resource_id:
              typeof activationRaw.resource_id === 'string' ? activationRaw.resource_id : null,
            base_damage:
              typeof activationRaw.base_damage === 'string' ? activationRaw.base_damage : '',
            base_damage_type:
              typeof activationRaw.base_damage_type === 'string'
                ? activationRaw.base_damage_type
                : '',
            text: typeof activationRaw.text === 'string' ? activationRaw.text : '',
          }
        : null
    return {
      id: typeof row.id === 'string' ? row.id : `weapon-${index}`,
      name,
      catalog_id: typeof row.catalog_id === 'string' ? row.catalog_id : null,
      source_kind: sourceKind,
      ability,
      is_proficient: Boolean(row.is_proficient),
      damage: typeof row.damage === 'string' ? row.damage : '',
      damage_type: typeof row.damage_type === 'string' ? row.damage_type : '',
      range_kind,
      magic_bonus,
      source_item_id: typeof row.source_item_id === 'string' ? row.source_item_id : null,
      req_ability: reqAbility,
      req_score: readNullableNumber(row.req_score),
      activation,
      mode_active: Boolean(row.mode_active),
    }
  })
}

function buildDraft(character: CharacterDetail): Draft {
  const sheet = asRecord(character.sheet)
  const identity = asRecord(sheet.identity)
  const abilitiesRaw = asRecord(sheet.abilities)
  const savesRaw = asRecord(sheet.saves)
  const skillsRaw = asRecord(sheet.skills)
  const combat = asRecord(sheet.combat)

  const abilities = Object.fromEntries(
    ABILITY_KEYS.map((key) => {
      const block = asRecord(abilitiesRaw[key])
      return [key, readNumber(block.score, 10)]
    }),
  ) as Record<AbilityKey, number>

  const abilityMax = Object.fromEntries(
    ABILITY_KEYS.map((key) => {
      const block = asRecord(abilitiesRaw[key])
      const raw = block.max_score
      if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
        return [key, Math.floor(raw)]
      }
      return [key, null]
    }),
  ) as Record<AbilityKey, number | null>

  const saves = Object.fromEntries(
    ABILITY_KEYS.map((key) => {
      const block = asRecord(savesRaw[key])
      return [key, Boolean(block.is_proficient)]
    }),
  ) as Record<AbilityKey, boolean>

  const saveMagic = Object.fromEntries(
    ABILITY_KEYS.map((key) => {
      const block = asRecord(savesRaw[key])
      return [key, readNumber(block.magic_bonus, 0)]
    }),
  ) as Record<AbilityKey, number>

  const skills = Object.fromEntries(
    SKILL_DEFS.map((skill) => {
      const block = asRecord(skillsRaw[skill.key])
      return [
        skill.key,
        {
          is_proficient: Boolean(block.is_proficient),
          is_expertise: Boolean(block.is_expertise),
          magic_bonus: readNumber(block.magic_bonus, 0),
        },
      ]
    }),
  ) as Draft['skills']

  const damageRaw = Array.isArray(combat.damage_resistances) ? combat.damage_resistances : []
  const condImmRaw = Array.isArray(combat.condition_immunities)
    ? combat.condition_immunities
    : []
  const defenses: Draft['defenses'] = {
    damage: damageRaw
      .map((item, index) => {
        const row = asRecord(item)
        const damage_type = typeof row.damage_type === 'string' ? row.damage_type : ''
        if (!damage_type) return null
        return {
          id: typeof row.id === 'string' ? row.id : `dr-${index}`,
          damage_type,
          mode: typeof row.mode === 'string' ? row.mode : 'resistance',
          source_name: typeof row.source_name === 'string' ? row.source_name : undefined,
        }
      })
      .filter((item): item is Draft['defenses']['damage'][number] => item != null),
    conditions: condImmRaw
      .map((item, index) => {
        const row = asRecord(item)
        const name =
          typeof row.name === 'string' && row.name.trim()
            ? row.name.trim()
            : typeof row.slug === 'string'
              ? row.slug
              : ''
        if (!name) return null
        return {
          id: typeof row.id === 'string' ? row.id : `ci-${index}`,
          slug: typeof row.slug === 'string' ? row.slug : name,
          name,
          source_name: typeof row.source_name === 'string' ? row.source_name : undefined,
        }
      })
      .filter((item): item is Draft['defenses']['conditions'][number] => item != null),
  }

  const identityExtras = readIdentityExtras(sheet)
  const classes = readClassLevels(sheet, {
    className: character.class_name ?? '',
    level: character.level,
    subclassName: identityExtras.subclassName,
    classCatalogId:
      typeof identity.class_catalog_id === 'string' ? identity.class_catalog_id : null,
  })
  const level = totalCharacterLevel(classes)

  return {
    name: character.name,
    raceName: character.race_name ?? '',
    raceCatalogId:
      typeof identity.race_catalog_id === 'string' ? identity.race_catalog_id : null,
    classes,
    identity: identityExtras,
    abilities,
    abilityMax,
    saves,
    saveMagic,
    skills,
    hpCurrent: character.hp_current ?? readNullableNumber(combat.hp_current),
    hpMax: character.hp_max ?? readNullableNumber(combat.hp_max),
    ac: readNullableNumber(combat.ac),
    speed: readNullableNumber(combat.speed),
    initiativeOverride: readNullableNumber(combat.initiative),
    inspiration: Boolean(combat.inspiration),
    defenses,
    weapons: readWeapons(sheet),
    inventory: readInventory(sheet),
    attunements: readAttunements(sheet),
    spells: readSpells(sheet),
    play: readPlay(sheet, level),
    textBlocks: readTextBlocks(sheet),
  }
}

function cycleSkill(state: {
  is_proficient: boolean
  is_expertise: boolean
  magic_bonus: number
}) {
  if (!state.is_proficient && !state.is_expertise) {
    return { ...state, is_proficient: true, is_expertise: false }
  }
  if (state.is_proficient && !state.is_expertise) {
    return { ...state, is_proficient: true, is_expertise: true }
  }
  return { ...state, is_proficient: false, is_expertise: false }
}

function skillMark(state: { is_proficient: boolean; is_expertise: boolean }) {
  if (state.is_expertise) return 'Эксп.'
  if (state.is_proficient) return 'Влад.'
  return '—'
}

export function MinimalSheetEditor({
  character,
  onSaved,
  onToast,
  onRemoteSave,
  readOnly = false,
}: MinimalSheetEditorProps) {
  const [baseCharacter, setBaseCharacter] = useState(character)
  const [draft, setDraft] = useState(() => buildDraft(character))
  const [sheetVersion, setSheetVersion] = useState(character.sheet_version)
  const [saving, setSaving] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflictOpen, setConflictOpen] = useState(false)
  const [levelUpOpen, setLevelUpOpen] = useState(false)
  const [transferPeers, setTransferPeers] = useState<TransferPeer[]>([])
  const [transferBusy, setTransferBusy] = useState(false)
  const channelRef = useRef<BroadcastChannel | null>(null)

  const characterLevel = useMemo(
    () => totalCharacterLevel(draft.classes),
    [draft.classes],
  )
  const classSummary = useMemo(
    () => formatClassSummary(draft.classes),
    [draft.classes],
  )
  const primaryClass = draft.classes[0]

  useEffect(() => {
    setBaseCharacter(character)
    setDraft(buildDraft(character))
    setSheetVersion(character.sheet_version)
    setConflictOpen(false)
    setError(null)
  }, [character])

  useEffect(() => {
    if (readOnly) {
      setTransferPeers([])
      return
    }
    let active = true
    void (async () => {
      try {
        const lobbies = await listLobbies()
        const peers: TransferPeer[] = []
        await Promise.all(
          lobbies.map(async (lobby) => {
            const detail = await getLobby(lobby.id)
            if (!detail.members.some((m) => m.character_id === character.id)) return
            for (const m of detail.members) {
              if (m.character_id === character.id) continue
              peers.push({
                lobby_id: detail.id,
                lobby_name: detail.name,
                character_id: m.character_id,
                character_name: m.character_name,
              })
            }
          }),
        )
        if (active) setTransferPeers(peers)
      } catch {
        if (active) setTransferPeers([])
      }
    })()
    return () => {
      active = false
    }
  }, [character.id, readOnly])

  const onRemoteSaveRef = useRef(onRemoteSave)
  useEffect(() => {
    onRemoteSaveRef.current = onRemoteSave
  }, [onRemoteSave])

  useEffect(() => {
    const channel = createSheetSyncChannel((message) => {
      if (message.type !== 'sheet-saved') {
        return
      }
      if (message.characterId !== character.id) {
        return
      }
      onRemoteSaveRef.current?.(message)
    })
    channelRef.current = channel
    publishSheetSync(channel, {
      type: 'sheet-opened',
      characterId: character.id,
      sheetVersion: character.sheet_version,
    })
    return () => {
      channel?.close()
      channelRef.current = null
    }
    // Channel is per open character; avoid reconnect on every local save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id])

  const proficiencyBonus = useMemo(
    () => 2 + Math.floor((Math.max(characterLevel, 1) - 1) / 4),
    [characterLevel],
  )

  function patchClass(classId: string, patch: Partial<ClassLevelEntry>) {
    setDraft((prev) => ({
      ...prev,
      classes: prev.classes.map((row) =>
        row.id === classId ? { ...row, ...patch } : row,
      ),
      identity:
        prev.classes[0]?.id === classId && patch.subclass_name !== undefined
          ? { ...prev.identity, subclassName: patch.subclass_name }
          : prev.identity,
    }))
  }

  function applyLevelUp(choice: LevelUpChoice) {
    setDraft((prev) => {
      if (totalCharacterLevel(prev.classes) >= 20) return prev
      const nextClasses =
        choice.type === 'same'
          ? bumpClassLevel(prev.classes, choice.classId)
          : addMulticlassLevel(prev.classes, {
              name: choice.name,
              catalog_id: choice.catalog_id,
            })
      const nextLevel = totalCharacterLevel(nextClasses)
      return {
        ...prev,
        classes: nextClasses,
        play: {
          ...prev.play,
          hitDiceCurrent: Math.min(prev.play.hitDiceCurrent + 1, nextLevel),
        },
      }
    })
    setLevelUpOpen(false)
    onToast(
      choice.type === 'same'
        ? 'Уровень класса +1'
        : `Мультикласс: ${choice.name.trim()} 1`,
    )
  }

  const attunedItemIds = useMemo(
    () =>
      new Set(
        draft.attunements
          .map((s) => s.item_id)
          .filter((id): id is string => Boolean(id)),
      ),
    [draft.attunements],
  )

  // Live sources only (class/archetype + active inventory). Baked sheet.max_score
  // is written on save from this resolve — so unequipping an artifact drops the cap.
  const abilityCeilings = useMemo(
    () =>
      resolveAbilityMaxes({
        classes: draft.classes,
        inventoryItems: draft.inventory.items,
        attunedItemIds,
      }),
    [draft.classes, draft.inventory.items, attunedItemIds],
  )

  const passives = useMemo(() => {
    const modFor = (skillKey: string) => {
      const def = SKILL_DEFS.find((skill) => skill.key === skillKey)
      if (!def) return 0
      const state = draft.skills[skillKey]
      return skillModifierFromState({
        abilityMod: abilityModifier(draft.abilities[def.base]),
        proficiencyBonus,
        isProficient: state.is_proficient,
        isExpertise: state.is_expertise,
        magicBonus: state.magic_bonus,
      })
    }
    return {
      perception: passiveScore(modFor('perception')),
      investigation: passiveScore(modFor('investigation')),
      insight: passiveScore(modFor('insight')),
    }
  }, [draft.abilities, draft.skills, proficiencyBonus])

  const armorClass = useMemo(() => {
    const pieces = equippedArmorPieces(draft.inventory.items)
    const base = computeArmorClass({
      dexMod: abilityModifier(draft.abilities.dex),
      armor: pieces.armor,
      shield: pieces.shield,
    })
    const magicAc = magicAcBonusFromInventory(draft.inventory.items, attunedItemIds)
    if (!magicAc) return base
    const sign = magicAc >= 0 ? `+${magicAc}` : String(magicAc)
    return {
      ac: base.ac + magicAc,
      summary: `${base.summary} · магия ${sign}`,
    }
  }, [draft.abilities.dex, attunedItemIds, draft.inventory.items])

  function patchIdentity(patch: Partial<IdentityExtras>) {
    setDraft((prev) => ({ ...prev, identity: { ...prev.identity, ...patch } }))
  }

  async function reloadFromServer() {
    setReloading(true)
    setError(null)
    try {
      const fresh = await getCharacter(baseCharacter.id)
      setBaseCharacter(fresh)
      setDraft(buildDraft(fresh))
      setSheetVersion(fresh.sheet_version)
      setConflictOpen(false)
      onSaved(fresh)
      onToast('Лист обновлён с сервера')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось обновить лист')
    } finally {
      setReloading(false)
    }
  }

  async function handleSave(opts?: { quiet?: boolean }): Promise<boolean> {
    if (readOnly) return false
    setSaving(true)
    setError(null)
    try {
      const sheet = structuredClone(asRecord(baseCharacter.sheet))
      const identity = asRecord(sheet.identity)
      const abilities = asRecord(sheet.abilities)
      const saves = asRecord(sheet.saves)
      const skills = asRecord(sheet.skills)
      const combat = asRecord(sheet.combat)

      const primary = draft.classes[0]
      const totalLevel = totalCharacterLevel(draft.classes)
      const summary = formatClassSummary(draft.classes)
      const identityForSave = {
        ...draft.identity,
        subclassName: primary?.subclass_name ?? draft.identity.subclassName,
      }
      const identityExtras = identityExtrasToSheet(identityForSave)
      identity.race_catalog_id = draft.raceCatalogId
      identity.class_catalog_id = primary?.catalog_id ?? null
      Object.assign(identity, identityExtras.identityPatch)
      sheet.identity = identity
      Object.assign(sheet, classLevelsToSheet(draft.classes))

      for (const key of ABILITY_KEYS) {
        const ceiling = abilityCeilings[key]?.max ?? DEFAULT_ABILITY_SCORE_MAX
        const row: Record<string, unknown> = {
          ...asRecord(abilities[key]),
          score: clampAbilityScore(draft.abilities[key], ceiling),
        }
        if (ceiling > DEFAULT_ABILITY_SCORE_MAX) {
          row.max_score = ceiling
        } else {
          delete row.max_score
        }
        abilities[key] = row
        saves[key] = {
          ...asRecord(saves[key]),
          is_proficient: draft.saves[key],
          magic_bonus: draft.saveMagic[key] || 0,
        }
      }
      sheet.abilities = abilities
      sheet.saves = saves

      for (const skill of SKILL_DEFS) {
        const current = asRecord(skills[skill.key])
        skills[skill.key] = {
          ...current,
          base_stat: skill.base,
          is_proficient: draft.skills[skill.key].is_proficient,
          is_expertise: draft.skills[skill.key].is_expertise,
          magic_bonus: draft.skills[skill.key].magic_bonus || 0,
        }
      }
      sheet.skills = skills

      combat.hp_current = draft.hpCurrent
      combat.hp_max = draft.hpMax
      combat.ac = draft.ac
      combat.speed = draft.speed
      combat.initiative = draft.initiativeOverride
      combat.inspiration = draft.inspiration
      combat.darkvision = identityExtras.combatPatch.darkvision
      const playSheet = playToSheet(draft.play)
      combat.conditions = playSheet.combatPatch.conditions
      combat.exhaustion = playSheet.combatPatch.exhaustion
      combat.hp_temp = playSheet.combatPatch.hp_temp
      combat.hit_die = playSheet.combatPatch.hit_die
      combat.hp_dice_current = playSheet.combatPatch.hp_dice_current
      combat.is_dying = playSheet.combatPatch.is_dying
      combat.death_successes = playSheet.combatPatch.death_successes
      combat.death_fails = playSheet.combatPatch.death_fails
      combat.concentration = playSheet.combatPatch.concentration
      combat.damage_resistances = draft.defenses.damage
      combat.condition_immunities = draft.defenses.conditions
      sheet.combat = combat
      const proficiency = asRecord(sheet.proficiency)
      proficiency.armor = identityExtras.proficiencyPatch.armor
      proficiency.weapons = identityExtras.proficiencyPatch.weapons
      proficiency.languages = identityExtras.proficiencyPatch.languages
      proficiency.tools = identityExtras.proficiencyPatch.tools
      sheet.proficiency = proficiency
      sheet.weapons = draft.weapons
      sheet.resources = playSheet.resources
      Object.assign(sheet, inventoryToSheet(draft.inventory))
      Object.assign(sheet, attunementsToSheet(draft.attunements))
      Object.assign(sheet, spellsToSheet(draft.spells))
      Object.assign(sheet, textBlocksToSheet(draft.textBlocks))

      const updated = await updateCharacter(baseCharacter.id, {
        sheet_version: sheetVersion,
        name: draft.name.trim() || 'Новый персонаж',
        level: totalLevel,
        race_name: draft.raceName.trim() || null,
        class_name: summary || primary?.name.trim() || null,
        hp_current: draft.hpCurrent,
        hp_max: draft.hpMax,
        sheet,
      })
      setBaseCharacter(updated)
      setSheetVersion(updated.sheet_version)
      setDraft(buildDraft(updated))
      onSaved(updated)
      publishSheetSync(channelRef.current, {
        type: 'sheet-saved',
        characterId: updated.id,
        sheetVersion: updated.sheet_version,
      })
      if (!opts?.quiet) onToast('Лист сохранён')
      return true
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'sheet_version_conflict') {
        setConflictOpen(true)
        setError(null)
      } else {
        setError(err instanceof ApiRequestError ? err.message : 'Не удалось сохранить лист')
      }
      return false
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack gap={16}>
      {readOnly ? (
        <div className="sheet-banner" role="status">
          <Text>
            Режим просмотра: вы мастер лобби. Редактировать лист может только владелец персонажа.
          </Text>
        </div>
      ) : null}

      <fieldset className="sheet-readonly-fieldset" disabled={readOnly}>
      <Stack gap={16}>
      <CombatStickyHeader
        name={draft.name}
        raceName={draft.raceName}
        className={classSummary || primaryClass?.name || ''}
        level={characterLevel}
        abilities={draft.abilities}
        hpCurrent={draft.hpCurrent}
        hpMax={draft.hpMax}
        hpTemp={draft.play.hpTemp}
        acOverride={draft.ac}
        autoAc={armorClass.ac}
        acHint={armorClass.summary}
        speed={draft.speed}
        initiativeOverride={draft.initiativeOverride}
        inspiration={draft.inspiration}
        exhaustion={draft.play.exhaustion}
        isDying={draft.play.isDying}
        deathSuccesses={draft.play.deathSuccesses}
        deathFails={draft.play.deathFails}
        conditionNames={draft.play.conditions.map((item) => item.name)}
        concentration={draft.play.concentration}
        onClearConcentration={() =>
          setDraft((prev) => ({
            ...prev,
            play: { ...prev.play, concentration: null },
          }))
        }
        onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
      />

      <Panel title="Основное">
        <Stack gap={12}>
          <Field label="Имя" htmlFor="sheet-name">
            <Input
              id="sheet-name"
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
          </Field>
          <div className="sheet-grid sheet-grid--2">
            <Field
              label="Уровень персонажа"
              hint="Сумма уровней классов. +1 — этот класс или мультикласс."
            >
              <div className="languages-tools-add">
                <Input value={String(characterLevel)} readOnly />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={characterLevel >= 20}
                  onClick={() => setLevelUpOpen(true)}
                >
                  +1 уровень
                </Button>
              </div>
            </Field>
            <Field label="Опыт (XP)" htmlFor="sheet-xp">
              <NumberInput
                id="sheet-xp"
                min={0}
                emptyValue={0}
                value={draft.identity.experience}
                onValueChange={(experience) =>
                  patchIdentity({ experience: experience ?? 0 })
                }
              />
            </Field>
          </div>
          <Field label="Бонус мастерства">
            <Input value={formatModifier(proficiencyBonus)} readOnly />
          </Field>
          <div className="sheet-grid sheet-grid--2">
            <Field
              label="Раса"
              htmlFor="sheet-race"
              hint="Выбор из каталога подставляет скорость, ТЗ, языки и блок особенностей"
            >
              <CatalogCombobox
                id="sheet-race"
                kind="race"
                edition={baseCharacter.rules_edition as RulesEdition}
                value={draft.raceName}
                placeholder="Начните вводить расу"
                onChange={(value, selected) => {
                  if (!selected) {
                    setDraft((prev) => ({
                      ...prev,
                      raceName: value,
                      raceCatalogId: null,
                    }))
                    return
                  }
                  let toast: string | null = null
                  setDraft((prev) => {
                    const applied = applyRaceCatalogToDraft({
                      selected,
                      identity: prev.identity,
                      textBlocks: prev.textBlocks,
                      previousRaceLanguages: prev.identity.raceAppliedLanguages,
                    })
                    if (!applied) {
                      return {
                        ...prev,
                        raceName: selected.name_ru,
                        raceCatalogId: selected.id,
                      }
                    }
                    toast = `Раса «${selected.name_ru}»: ${applied.summary}`
                    return {
                      ...prev,
                      raceName: selected.name_ru,
                      raceCatalogId: selected.id,
                      speed: applied.speed,
                      identity: applied.identity,
                      textBlocks: applied.textBlocks,
                    }
                  })
                  if (toast) onToast(toast)
                }}
              />
            </Field>
            <Field label="Размер" htmlFor="sheet-size">
              <select
                id="sheet-size"
                className="play-select"
                value={draft.identity.size || 'medium'}
                onChange={(event) => patchIdentity({ size: event.target.value })}
              >
                <option value="tiny">Крошечный</option>
                <option value="small">Маленький</option>
                <option value="medium">Средний</option>
                <option value="large">Большой</option>
                <option value="huge">Огромный</option>
                <option value="gargantuan">Громадный</option>
              </select>
            </Field>
          </div>
          <div>
            <Text tone="muted">Классы</Text>
            <Stack gap={10}>
              {draft.classes.map((row, index) => (
                <div key={row.id} className="inventory-card">
                  <div className="sheet-grid sheet-grid--2">
                    <Field
                      label={draft.classes.length > 1 ? `Класс ${index + 1}` : 'Класс'}
                      hint={index === 0 ? 'Основной для карточки персонажа' : undefined}
                    >
                      <CatalogCombobox
                        kind="class"
                        edition={baseCharacter.rules_edition as RulesEdition}
                        value={row.name}
                        placeholder="Начните вводить класс"
                        onChange={(value, selected) =>
                          patchClass(row.id, {
                            name: value,
                            catalog_id: selected?.id ?? null,
                          })
                        }
                      />
                    </Field>
                    <Field label="Уровней в классе">
                      <div className="languages-tools-add">
                        <Input value={String(row.level)} readOnly />
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={draft.classes.length === 1 && row.level <= 1}
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              classes: reduceClassLevel(prev.classes, row.id),
                            }))
                          }
                        >
                          −1
                        </Button>
                      </div>
                    </Field>
                  </div>
                  <Field label="Подкласс" hint="У этого класса">
                    <Input
                      value={row.subclass_name}
                      placeholder="Например: Школа воплощения"
                      onChange={(event) =>
                        patchClass(row.id, { subclass_name: event.target.value })
                      }
                    />
                  </Field>
                </div>
              ))}
            </Stack>
            <Text tone="muted">
              Итого: {classSummary || 'класс не выбран'} · при повышении уровня можно взять другой
              класс (мультикласс).
            </Text>
          </div>
          <div className="sheet-grid sheet-grid--2">
            <Field label="Предыстория" htmlFor="sheet-background">
              <Input
                id="sheet-background"
                value={draft.identity.background}
                placeholder="Солдат, мудрец…"
                onChange={(event) => patchIdentity({ background: event.target.value })}
              />
            </Field>
            <Field label="Мировоззрение" htmlFor="sheet-alignment">
              <Input
                id="sheet-alignment"
                value={draft.identity.alignment}
                placeholder="Нейтральный добрый…"
                onChange={(event) => patchIdentity({ alignment: event.target.value })}
              />
            </Field>
          </div>
        </Stack>
      </Panel>

      <Panel title="Пассивные чувства">
        <Stack gap={12}>
          <div className="passive-grid">
            <div className="passive-card">
              <span className="passive-card__label">Внимательность</span>
              <strong>{passives.perception}</strong>
            </div>
            <div className="passive-card">
              <span className="passive-card__label">Анализ</span>
              <strong>{passives.investigation}</strong>
            </div>
            <div className="passive-card">
              <span className="passive-card__label">Проницательность</span>
              <strong>{passives.insight}</strong>
            </div>
          </div>
          <Field label="Тёмное зрение, фт" htmlFor="sheet-darkvision" hint="0 = нет">
            <NumberInput
              id="sheet-darkvision"
              min={0}
              emptyValue={0}
              value={draft.identity.darkvision}
              onValueChange={(darkvision) =>
                patchIdentity({ darkvision: darkvision ?? 0 })
              }
            />
          </Field>
          <Text tone="muted">Пассивы = 10 + модификатор навыка (с учётом владения/экспертизы).</Text>
        </Stack>
      </Panel>

      <Panel title="Владения снаряжением">
        <Stack gap={12}>
          <div>
            <Text tone="muted">Доспехи</Text>
            <div className="chip-row">
              {ARMOR_PROF_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`sheet-chip${draft.identity.armor[option.key] ? ' is-on' : ''}`}
                  onClick={() =>
                    patchIdentity({
                      armor: {
                        ...draft.identity.armor,
                        [option.key]: !draft.identity.armor[option.key],
                      },
                    })
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Text tone="muted">Оружие</Text>
            <div className="chip-row">
              {WEAPON_PROF_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`sheet-chip${draft.identity.weapons[option.key] ? ' is-on' : ''}`}
                  onClick={() =>
                    patchIdentity({
                      weapons: {
                        ...draft.identity.weapons,
                        [option.key]: !draft.identity.weapons[option.key],
                      },
                    })
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </Stack>
      </Panel>

      <LanguagesToolsPanel
        languages={draft.identity.languages}
        tools={draft.identity.tools}
        onChange={(patch) => patchIdentity(patch)}
      />

      <Panel title="Характеристики">
        <div className="ability-grid">
          {ABILITY_KEYS.map((key) => {
            const score = draft.abilities[key]
            const resolved = abilityCeilings[key]
            const max = resolved?.max ?? DEFAULT_ABILITY_SCORE_MAX
            const sourceHint =
              resolved?.raised && resolved.sources[0]
                ? resolved.sources[0]
                : null
            return (
              <label key={key} className="ability-card">
                <span className="ability-card__label">{ABILITY_LABELS[key]}</span>
                <NumberInput
                  min={1}
                  max={max}
                  emptyValue={10}
                  value={score}
                  onValueChange={(next) =>
                    setDraft((prev) => ({
                      ...prev,
                      abilities: {
                        ...prev.abilities,
                        [key]: clampAbilityScore(next ?? 10, max),
                      },
                    }))
                  }
                />
                <span className="ability-card__mod">
                  {formatModifier(abilityModifier(score))}
                </span>
                {resolved?.raised ? (
                  <span
                    className="ability-card__cap"
                    title={sourceHint ?? undefined}
                  >
                    макс {max}
                    {sourceHint ? ` · ${sourceHint}` : ''}
                  </span>
                ) : null}
              </label>
            )
          })}
        </div>
        <Text tone="muted" className="ability-grid-hint">
          Потолок 20 по правилам; выше — от класса, архетипа или артефакта.
          Временные эффекты на столе не поднимают этот лимит.
        </Text>
      </Panel>

      <PlayPanel
        edition={baseCharacter.rules_edition as RulesEdition}
        characterId={baseCharacter.id}
        characterName={draft.name}
        level={characterLevel}
        hpCurrent={draft.hpCurrent}
        hpMax={draft.hpMax}
        constitutionMod={abilityModifier(draft.abilities.con)}
        play={draft.play}
        spells={draft.spells}
        onPlayChange={(play) => setDraft((prev) => ({ ...prev, play }))}
        onSpellsChange={(spells) => setDraft((prev) => ({ ...prev, spells }))}
        onCombatChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
        onToast={onToast}
      />

      <AttacksPanel
        edition={baseCharacter.rules_edition as RulesEdition}
        weapons={draft.weapons}
        abilities={draft.abilities}
        proficiencyBonus={proficiencyBonus}
        resources={draft.play.resources}
        onChange={(weapons) => setDraft((prev) => ({ ...prev, weapons }))}
        onResourcesChange={(resources) =>
          setDraft((prev) => ({
            ...prev,
            play: { ...prev.play, resources },
          }))
        }
      />

      <InventoryPanel
        edition={baseCharacter.rules_edition as RulesEdition}
        inventory={draft.inventory}
        strengthScore={draft.abilities.str}
        onChange={(inventory) => setDraft((prev) => ({ ...prev, inventory }))}
        transferPeers={readOnly ? [] : transferPeers}
        transferBusy={transferBusy || saving}
        onTransfer={
          readOnly
            ? undefined
            : (payload) => {
                void (async () => {
                  setTransferBusy(true)
                  setError(null)
                  try {
                    const saved = await handleSave({ quiet: true })
                    if (!saved) return
                    const result = await transferLobbyInventory(payload.lobby_id, {
                      from_character_id: baseCharacter.id,
                      to_character_id: payload.to_character_id,
                      item_id: payload.item_id,
                      qty: payload.qty,
                      coin_currency: payload.coin_currency,
                      coin_amount: payload.coin_amount,
                    })
                    const fresh = await getCharacter(baseCharacter.id)
                    setBaseCharacter(fresh)
                    setSheetVersion(fresh.sheet_version)
                    setDraft(buildDraft(fresh))
                    onSaved(fresh)
                    onToast(result.summary)
                  } catch (err) {
                    setError(
                      err instanceof ApiRequestError
                        ? err.message
                        : 'Не удалось передать',
                    )
                  } finally {
                    setTransferBusy(false)
                  }
                })()
              }
        }
      />

      <AttunementPanel
        attunements={draft.attunements}
        inventoryItems={draft.inventory.items}
        onChange={(attunements) => setDraft((prev) => ({ ...prev, attunements }))}
      />

      <SpellsPanel
        edition={baseCharacter.rules_edition as RulesEdition}
        characterId={baseCharacter.id}
        className={classSummary || primaryClass?.name || ''}
        level={characterLevel}
        classes={draft.classes}
        spells={draft.spells}
        abilities={draft.abilities}
        proficiencyBonus={proficiencyBonus}
        onChange={(spells) => setDraft((prev) => ({ ...prev, spells }))}
        onConcentrationChange={(concentration) =>
          setDraft((prev) => ({
            ...prev,
            play: { ...prev.play, concentration },
          }))
        }
        onToast={onToast}
      />

      <Panel title="Спасброски">
        <div className="chip-row">
          {ABILITY_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={`sheet-chip${draft.saves[key] ? ' is-on' : ''}`}
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  saves: { ...prev.saves, [key]: !prev.saves[key] },
                }))
              }
            >
              {ABILITY_LABELS[key]}{' '}
              {formatModifier(
                abilityModifier(draft.abilities[key]) +
                  (draft.saves[key] ? proficiencyBonus : 0) +
                  (draft.saveMagic[key] || 0),
              )}
            </button>
          ))}
        </div>
        <Text tone="muted">Нажми, чтобы включить/выключить владение</Text>
      </Panel>

      <Panel title="Навыки">
        <div className="skill-list">
          {SKILL_DEFS.map((skill) => {
            const state = draft.skills[skill.key]
            const mod = skillModifierFromState({
              abilityMod: abilityModifier(draft.abilities[skill.base]),
              proficiencyBonus,
              isProficient: state.is_proficient,
              isExpertise: state.is_expertise,
              magicBonus: state.magic_bonus,
            })
            const magicHint =
              state.magic_bonus !== 0
                ? ` · маг. ${formatModifier(state.magic_bonus)}`
                : ''
            return (
              <button
                key={skill.key}
                type="button"
                className={`skill-row${state.is_proficient ? ' is-on' : ''}${state.is_expertise ? ' is-expert' : ''}`}
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    skills: {
                      ...prev.skills,
                      [skill.key]: cycleSkill(prev.skills[skill.key]),
                    },
                  }))
                }
              >
                <span>{skill.label}</span>
                <span className="skill-row__meta">
                  {ABILITY_LABELS[skill.base]} · {skillMark(state)}
                  {magicHint} · {formatModifier(mod)}
                </span>
              </button>
            )
          })}
        </div>
        <Text tone="muted">Клик: нет → владение → экспертиза → нет</Text>
      </Panel>

      {draft.defenses.damage.length > 0 || draft.defenses.conditions.length > 0 ? (
        <Panel title="Защиты от артефактов">
          {draft.defenses.damage.length > 0 ? (
            <div style={{ marginBottom: 8 }}>
              <Text tone="muted">Урон</Text>
              <div className="chip-row" style={{ marginTop: 6 }}>
                {draft.defenses.damage.map((item) => {
                  const mode =
                    item.mode === 'immunity'
                      ? 'имм.'
                      : item.mode === 'vulnerability'
                        ? 'уязв.'
                        : 'сопр.'
                  return (
                    <span key={item.id} className="sheet-chip is-on">
                      {mode} {item.damage_type}
                      {item.source_name ? ` · ${item.source_name}` : ''}
                    </span>
                  )
                })}
              </div>
            </div>
          ) : null}
          {draft.defenses.conditions.length > 0 ? (
            <div>
              <Text tone="muted">Иммунитет к состояниям</Text>
              <div className="chip-row" style={{ marginTop: 6 }}>
                {draft.defenses.conditions.map((item) => (
                  <span key={item.id} className="sheet-chip is-on">
                    {item.name}
                    {item.source_name ? ` · ${item.source_name}` : ''}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </Panel>
      ) : null}

      <TextBlocksPanel
        blocks={draft.textBlocks}
        onChange={(textBlocks) => setDraft((prev) => ({ ...prev, textBlocks }))}
      />

      {error ? <Text tone="danger">{error}</Text> : null}

      {!readOnly ? (
        <div className="sheet-actions">
          <Button onClick={() => void handleSave()} disabled={saving || reloading}>
            {saving ? 'Сохраняем…' : 'Сохранить лист'}
          </Button>
          <Text tone="muted">
            Редакция {baseCharacter.rules_edition} · v{sheetVersion}
          </Text>
        </div>
      ) : (
        <Text tone="muted">
          Редакция {baseCharacter.rules_edition} · v{sheetVersion} · только просмотр
        </Text>
      )}
      </Stack>
      </fieldset>

      {!readOnly ? (
        <>
          <Dialog
            open={conflictOpen}
            title="Конфликт версий листа"
            primaryLabel={reloading ? 'Обновляем…' : 'Обновить лист'}
            secondaryLabel="Оставить мои правки"
            busy={reloading}
            onPrimary={() => void reloadFromServer()}
            onSecondary={() => setConflictOpen(false)}
          >
            <Text>
              Этот персонаж уже сохранён в другой вкладке или на другом устройстве. Если обновить лист,
              локальные несохранённые правки пропадут. Можно оставить свои правки на экране и
              перенести их вручную.
            </Text>
          </Dialog>

          <LevelUpDialog
            open={levelUpOpen}
            edition={baseCharacter.rules_edition as RulesEdition}
            classes={draft.classes}
            onConfirm={applyLevelUp}
            onClose={() => setLevelUpOpen(false)}
          />
        </>
      ) : null}
    </Stack>
  )
}
