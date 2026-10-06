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
  createSheetSyncChannel,
  publishSheetSync,
  type SheetSyncMessage,
} from '../../shared/sync/characterSheetChannel'
import { Button, Dialog, Field, Input, NumberInput, Panel, Stack, Text } from '../../ui'
import { AttacksPanel, type WeaponAttack } from './AttacksPanel'
import { CombatStickyHeader } from './CombatStickyHeader'
import { InventoryPanel } from './InventoryPanel'
import { SpellsPanel } from './SpellsPanel'
import { TextBlocksPanel } from './TextBlocksPanel'
import {
  inventoryToSheet,
  readInventory,
  type InventoryState,
} from './inventory'
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

type MinimalSheetEditorProps = {
  character: CharacterDetail
  onSaved: (character: CharacterDetail) => void
  onToast: (message: string) => void
  onRemoteSave?: (message: Extract<SheetSyncMessage, { type: 'sheet-saved' }>) => void
}

type Draft = {
  name: string
  level: number
  raceName: string
  className: string
  raceCatalogId: string | null
  classCatalogId: string | null
  abilities: Record<AbilityKey, number>
  saves: Record<AbilityKey, boolean>
  skills: Record<string, { is_proficient: boolean; is_expertise: boolean }>
  hpCurrent: number | null
  hpMax: number | null
  ac: number | null
  speed: number | null
  initiativeOverride: number | null
  inspiration: boolean
  weapons: WeaponAttack[]
  inventory: InventoryState
  spells: SpellsState
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
    return {
      id: typeof row.id === 'string' ? row.id : `weapon-${index}`,
      name: typeof row.name === 'string' ? row.name : '',
      catalog_id: typeof row.catalog_id === 'string' ? row.catalog_id : null,
      source_kind: sourceKind,
      ability,
      is_proficient: Boolean(row.is_proficient),
      damage: typeof row.damage === 'string' ? row.damage : '',
      damage_type: typeof row.damage_type === 'string' ? row.damage_type : '',
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

  const saves = Object.fromEntries(
    ABILITY_KEYS.map((key) => {
      const block = asRecord(savesRaw[key])
      return [key, Boolean(block.is_proficient)]
    }),
  ) as Record<AbilityKey, boolean>

  const skills = Object.fromEntries(
    SKILL_DEFS.map((skill) => {
      const block = asRecord(skillsRaw[skill.key])
      return [
        skill.key,
        {
          is_proficient: Boolean(block.is_proficient),
          is_expertise: Boolean(block.is_expertise),
        },
      ]
    }),
  ) as Draft['skills']

  return {
    name: character.name,
    level: character.level,
    raceName: character.race_name ?? '',
    className: character.class_name ?? '',
    raceCatalogId:
      typeof identity.race_catalog_id === 'string' ? identity.race_catalog_id : null,
    classCatalogId:
      typeof identity.class_catalog_id === 'string' ? identity.class_catalog_id : null,
    abilities,
    saves,
    skills,
    hpCurrent: character.hp_current ?? readNullableNumber(combat.hp_current),
    hpMax: character.hp_max ?? readNullableNumber(combat.hp_max),
    ac: readNullableNumber(combat.ac),
    speed: readNullableNumber(combat.speed),
    initiativeOverride: readNullableNumber(combat.initiative),
    inspiration: Boolean(combat.inspiration),
    weapons: readWeapons(sheet),
    inventory: readInventory(sheet),
    spells: readSpells(sheet),
    textBlocks: readTextBlocks(sheet),
  }
}

function cycleSkill(state: { is_proficient: boolean; is_expertise: boolean }) {
  if (!state.is_proficient && !state.is_expertise) {
    return { is_proficient: true, is_expertise: false }
  }
  if (state.is_proficient && !state.is_expertise) {
    return { is_proficient: true, is_expertise: true }
  }
  return { is_proficient: false, is_expertise: false }
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
}: MinimalSheetEditorProps) {
  const [baseCharacter, setBaseCharacter] = useState(character)
  const [draft, setDraft] = useState(() => buildDraft(character))
  const [sheetVersion, setSheetVersion] = useState(character.sheet_version)
  const [saving, setSaving] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflictOpen, setConflictOpen] = useState(false)
  const channelRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    setBaseCharacter(character)
    setDraft(buildDraft(character))
    setSheetVersion(character.sheet_version)
    setConflictOpen(false)
    setError(null)
  }, [character])

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
    () => 2 + Math.floor((Math.max(draft.level, 1) - 1) / 4),
    [draft.level],
  )

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

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const sheet = structuredClone(asRecord(baseCharacter.sheet))
      const identity = asRecord(sheet.identity)
      const abilities = asRecord(sheet.abilities)
      const saves = asRecord(sheet.saves)
      const skills = asRecord(sheet.skills)
      const combat = asRecord(sheet.combat)

      identity.race_catalog_id = draft.raceCatalogId
      identity.class_catalog_id = draft.classCatalogId
      sheet.identity = identity

      for (const key of ABILITY_KEYS) {
        abilities[key] = { ...asRecord(abilities[key]), score: draft.abilities[key] }
        saves[key] = {
          ...asRecord(saves[key]),
          is_proficient: draft.saves[key],
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
        }
      }
      sheet.skills = skills

      combat.hp_current = draft.hpCurrent
      combat.hp_max = draft.hpMax
      combat.ac = draft.ac
      combat.speed = draft.speed
      combat.initiative = draft.initiativeOverride
      combat.inspiration = draft.inspiration
      sheet.combat = combat
      sheet.weapons = draft.weapons
      Object.assign(sheet, inventoryToSheet(draft.inventory))
      Object.assign(sheet, spellsToSheet(draft.spells))
      Object.assign(sheet, textBlocksToSheet(draft.textBlocks))

      const updated = await updateCharacter(baseCharacter.id, {
        sheet_version: sheetVersion,
        name: draft.name.trim() || 'Новый персонаж',
        level: draft.level,
        race_name: draft.raceName.trim() || null,
        class_name: draft.className.trim() || null,
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
      onToast('Лист сохранён')
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'sheet_version_conflict') {
        setConflictOpen(true)
        setError(null)
      } else {
        setError(err instanceof ApiRequestError ? err.message : 'Не удалось сохранить лист')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack gap={16}>
      <CombatStickyHeader
        name={draft.name}
        raceName={draft.raceName}
        className={draft.className}
        level={draft.level}
        abilities={draft.abilities}
        hpCurrent={draft.hpCurrent}
        hpMax={draft.hpMax}
        ac={draft.ac}
        speed={draft.speed}
        initiativeOverride={draft.initiativeOverride}
        inspiration={draft.inspiration}
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
            <Field label="Уровень" htmlFor="sheet-level">
              <NumberInput
                id="sheet-level"
                min={1}
                max={30}
                emptyValue={1}
                value={draft.level}
                onValueChange={(level) =>
                  setDraft((prev) => ({
                    ...prev,
                    level: level ?? 1,
                  }))
                }
              />
            </Field>
            <Field label="Бонус мастерства">
              <Input value={formatModifier(proficiencyBonus)} readOnly />
            </Field>
          </div>
          <Field label="Раса" htmlFor="sheet-race" hint="Можно ввести своё или выбрать из списка">
            <CatalogCombobox
              id="sheet-race"
              kind="race"
              edition={baseCharacter.rules_edition as RulesEdition}
              value={draft.raceName}
              placeholder="Начните вводить расу"
              onChange={(value, selected) =>
                setDraft((prev) => ({
                  ...prev,
                  raceName: value,
                  raceCatalogId: selected?.id ?? null,
                }))
              }
            />
          </Field>
          <Field label="Класс" htmlFor="sheet-class" hint="Мультикласс — в backlog; пока один класс">
            <CatalogCombobox
              id="sheet-class"
              kind="class"
              edition={baseCharacter.rules_edition as RulesEdition}
              value={draft.className}
              placeholder="Начните вводить класс"
              onChange={(value, selected) =>
                setDraft((prev) => ({
                  ...prev,
                  className: value,
                  classCatalogId: selected?.id ?? null,
                }))
              }
            />
          </Field>
        </Stack>
      </Panel>

      <Panel title="Характеристики">
        <div className="ability-grid">
          {ABILITY_KEYS.map((key) => {
            const score = draft.abilities[key]
            return (
              <label key={key} className="ability-card">
                <span className="ability-card__label">{ABILITY_LABELS[key]}</span>
                <NumberInput
                  min={1}
                  max={30}
                  emptyValue={10}
                  value={score}
                  onValueChange={(next) =>
                    setDraft((prev) => ({
                      ...prev,
                      abilities: {
                        ...prev.abilities,
                        [key]: next ?? 10,
                      },
                    }))
                  }
                />
                <span className="ability-card__mod">{formatModifier(abilityModifier(score))}</span>
              </label>
            )
          })}
        </div>
      </Panel>

      <AttacksPanel
        edition={baseCharacter.rules_edition as RulesEdition}
        weapons={draft.weapons}
        abilities={draft.abilities}
        proficiencyBonus={proficiencyBonus}
        onChange={(weapons) => setDraft((prev) => ({ ...prev, weapons }))}
      />

      <InventoryPanel
        edition={baseCharacter.rules_edition as RulesEdition}
        inventory={draft.inventory}
        strengthScore={draft.abilities.str}
        onChange={(inventory) => setDraft((prev) => ({ ...prev, inventory }))}
      />

      <SpellsPanel
        edition={baseCharacter.rules_edition as RulesEdition}
        spells={draft.spells}
        abilities={draft.abilities}
        proficiencyBonus={proficiencyBonus}
        onChange={(spells) => setDraft((prev) => ({ ...prev, spells }))}
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
                abilityModifier(draft.abilities[key]) + (draft.saves[key] ? proficiencyBonus : 0),
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
            const mod =
              abilityModifier(draft.abilities[skill.base]) +
              (state.is_expertise
                ? proficiencyBonus * 2
                : state.is_proficient
                  ? proficiencyBonus
                  : 0)
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
                  {ABILITY_LABELS[skill.base]} · {skillMark(state)} · {formatModifier(mod)}
                </span>
              </button>
            )
          })}
        </div>
        <Text tone="muted">Клик: нет → владение → экспертиза → нет</Text>
      </Panel>

      <TextBlocksPanel
        blocks={draft.textBlocks}
        onChange={(textBlocks) => setDraft((prev) => ({ ...prev, textBlocks }))}
      />

      {error ? <Text tone="danger">{error}</Text> : null}

      <div className="sheet-actions">
        <Button onClick={() => void handleSave()} disabled={saving || reloading}>
          {saving ? 'Сохраняем…' : 'Сохранить лист'}
        </Button>
        <Text tone="muted">
          Редакция {baseCharacter.rules_edition} · v{sheetVersion}
        </Text>
      </div>

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
    </Stack>
  )
}
