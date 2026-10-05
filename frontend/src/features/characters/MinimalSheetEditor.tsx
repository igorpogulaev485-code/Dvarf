import { useMemo, useState } from 'react'
import { CatalogCombobox } from '../catalog'
import {
  updateCharacter,
  type CharacterDetail,
  type RulesEdition,
} from '../../shared/api/characters'
import { ApiRequestError } from '../../shared/api/client'
import { Button, Field, Input, NumberInput, Panel, Stack, Text } from '../../ui'
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
}: MinimalSheetEditorProps) {
  const [draft, setDraft] = useState(() => buildDraft(character))
  const [sheetVersion, setSheetVersion] = useState(character.sheet_version)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const proficiencyBonus = useMemo(
    () => 2 + Math.floor((Math.max(draft.level, 1) - 1) / 4),
    [draft.level],
  )

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const sheet = structuredClone(asRecord(character.sheet))
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
      sheet.combat = combat

      const updated = await updateCharacter(character.id, {
        sheet_version: sheetVersion,
        name: draft.name.trim() || 'Новый персонаж',
        level: draft.level,
        race_name: draft.raceName.trim() || null,
        class_name: draft.className.trim() || null,
        hp_current: draft.hpCurrent,
        hp_max: draft.hpMax,
        sheet,
      })
      setSheetVersion(updated.sheet_version)
      setDraft(buildDraft(updated))
      onSaved(updated)
      onToast('Лист сохранён')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Не удалось сохранить лист')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack gap={16}>
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
              edition={character.rules_edition as RulesEdition}
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
              edition={character.rules_edition as RulesEdition}
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

      <Panel title="Бой">
        <div className="sheet-grid sheet-grid--4">
          <Field label="HP сейчас" htmlFor="sheet-hp-current">
            <NumberInput
              id="sheet-hp-current"
              value={draft.hpCurrent}
              onValueChange={(hpCurrent) => setDraft((prev) => ({ ...prev, hpCurrent }))}
            />
          </Field>
          <Field label="HP макс" htmlFor="sheet-hp-max">
            <NumberInput
              id="sheet-hp-max"
              value={draft.hpMax}
              onValueChange={(hpMax) => setDraft((prev) => ({ ...prev, hpMax }))}
            />
          </Field>
          <Field label="КД" htmlFor="sheet-ac">
            <NumberInput
              id="sheet-ac"
              value={draft.ac}
              onValueChange={(ac) => setDraft((prev) => ({ ...prev, ac }))}
            />
          </Field>
          <Field label="Скорость" htmlFor="sheet-speed">
            <NumberInput
              id="sheet-speed"
              value={draft.speed}
              onValueChange={(speed) => setDraft((prev) => ({ ...prev, speed }))}
            />
          </Field>
        </div>
      </Panel>

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

      {error ? <Text tone="danger">{error}</Text> : null}

      <div className="sheet-actions">
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'Сохраняем…' : 'Сохранить лист'}
        </Button>
        <Text tone="muted">Редакция {character.rules_edition}</Text>
      </div>
    </Stack>
  )
}
