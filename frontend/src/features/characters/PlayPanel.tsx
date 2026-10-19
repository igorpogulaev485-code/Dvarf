import { useEffect, useMemo, useState } from 'react'
import {
  FALLBACK_CONDITIONS,
  conditionKey,
  conditionLevelLabel,
  conditionMaxLevel,
  conditionStatusToast,
  exhaustionStatusToast,
  hasCondition,
  resolveConditionName,
  setConditionLevel,
  toggleCondition,
  type ConditionRef,
} from '../../shared/dnd/conditions'
import { clampExhaustion } from '../../shared/dnd/rest'
import {
  listCatalogEntries,
  type CatalogEntry,
} from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import {
  Combobox,
  Field,
  Panel,
  Stack,
  Text,
  type ComboboxOption,
} from '../../ui'
import type { PlayState } from './play'

type ConditionOption = {
  slug: string
  name: string
  catalog_id: string | null
  maxLevel: number | null
}

type PlayPanelProps = {
  edition: RulesEdition
  play: PlayState
  onPlayChange: (play: PlayState) => void
  onToast: (message: string) => void
}

export function PlayPanel({
  edition,
  play,
  onPlayChange,
  onToast,
}: PlayPanelProps) {
  const [catalogConditions, setCatalogConditions] = useState<CatalogEntry[]>([])

  useEffect(() => {
    let active = true
    listCatalogEntries({ kind: 'condition', edition })
      .then((items) => {
        if (active) setCatalogConditions(items)
      })
      .catch(() => {
        if (active) setCatalogConditions([])
      })
    return () => {
      active = false
    }
  }, [edition])

  const conditionOptions = useMemo((): ConditionOption[] => {
    const fromCatalog =
      catalogConditions.length > 0
        ? catalogConditions.map((entry) => ({
            slug: entry.slug,
            name: resolveConditionName({
              slug: entry.slug,
              name_ru: entry.name_ru,
              name_en: entry.name_en,
            }),
            catalog_id: entry.id,
            maxLevel: conditionMaxLevel(entry.slug, entry.data),
          }))
        : []

    const bySlug = new Map<string, ConditionOption>(
      fromCatalog.map((item) => [item.slug, item]),
    )
    for (const item of FALLBACK_CONDITIONS) {
      if (!bySlug.has(item.slug)) {
        bySlug.set(item.slug, {
          slug: item.slug,
          name: item.name_ru,
          catalog_id: null,
          maxLevel: item.maxLevel ?? null,
        })
      } else {
        const existing = bySlug.get(item.slug)!
        bySlug.set(item.slug, {
          ...existing,
          name: resolveConditionName({
            slug: item.slug,
            name_ru: existing.name,
            name_en: item.name_en,
          }),
          maxLevel: existing.maxLevel ?? item.maxLevel ?? null,
        })
      }
    }
    return Array.from(bySlug.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  }, [catalogConditions])

  const maxLevelBySlug = useMemo(() => {
    const map = new Map<string, number>()
    for (const option of conditionOptions) {
      if (option.maxLevel != null && option.maxLevel > 0) {
        map.set(option.slug, option.maxLevel)
      }
    }
    return map
  }, [conditionOptions])

  const [conditionQuery, setConditionQuery] = useState('')

  const activeConditions = useMemo(
    () => play.conditions.filter((item) => item.slug !== 'exhaustion'),
    [play.conditions],
  )

  const pickerOptions = useMemo((): ComboboxOption[] => {
    const q = conditionQuery.trim().toLowerCase()
    const available = conditionOptions.filter((option) => {
      if (option.slug === 'exhaustion') {
        return play.exhaustion <= 0
      }
      return !hasCondition(activeConditions, option.catalog_id ?? option.slug)
    })
    const filtered = available
      .filter((option) => !q || option.name.toLowerCase().includes(q) || option.slug.includes(q))
      .map((option) => ({ id: option.catalog_id ?? option.slug, label: option.name }))

    const custom = conditionQuery.trim()
    if (
      custom &&
      !filtered.some((option) => option.label.toLowerCase() === custom.toLowerCase()) &&
      !activeConditions.some((item) => item.name.toLowerCase() === custom.toLowerCase())
    ) {
      filtered.push({ id: `custom:${custom}`, label: custom })
    }
    return filtered
  }, [activeConditions, conditionOptions, conditionQuery, play.exhaustion])

  function patchPlay(patch: Partial<PlayState>) {
    onPlayChange({ ...play, ...patch })
  }

  function setExhaustion(next: number) {
    const level = clampExhaustion(next)
    patchPlay({ exhaustion: level })
    onToast(exhaustionStatusToast(level))
  }

  function addConditionOption(option: ComboboxOption) {
    const preset = conditionOptions.find(
      (item) => (item.catalog_id ?? item.slug) === option.id || item.name === option.label,
    )
    if (preset?.slug === 'exhaustion') {
      if (play.exhaustion <= 0) setExhaustion(1)
      setConditionQuery('')
      return
    }

    const ref: ConditionRef = preset
      ? {
          slug: preset.slug,
          name: preset.name,
          catalog_id: preset.catalog_id,
          level: preset.maxLevel ? 1 : null,
        }
      : {
          slug: option.label.trim().toLowerCase().replace(/\s+/g, '-'),
          name: option.label.trim(),
          catalog_id: null,
          level: null,
        }

    const nextList = toggleCondition(activeConditions, ref).filter(
      (item) => item.slug !== 'exhaustion',
    )
    patchPlay({ conditions: nextList })
    const applied =
      nextList.find((item) => conditionKey(item) === conditionKey(ref)) ?? {
        ...ref,
        level: ref.level ?? (preset?.maxLevel ? 1 : null),
      }
    onToast(conditionStatusToast({ action: 'add', ref: applied }))
    setConditionQuery('')
  }

  function removeCondition(ref: ConditionRef) {
    patchPlay({
      conditions: activeConditions.filter((item) => conditionKey(item) !== conditionKey(ref)),
    })
    onToast(conditionStatusToast({ action: 'remove', ref }))
  }

  function changeConditionLevel(ref: ConditionRef, level: number) {
    const nextList = setConditionLevel(activeConditions, conditionKey(ref), level)
    patchPlay({ conditions: nextList })
    const updated =
      nextList.find((item) => conditionKey(item) === conditionKey(ref)) ?? {
        ...ref,
        level,
      }
    onToast(conditionStatusToast({ action: 'level', ref: updated }))
  }

  return (
    <Panel title="Состояния">
      <Stack gap={14}>
        <Text tone="muted">
          Хиты, временные HP, кости и спасброски смерти — в pad хитов шапки. Отдых — кнопка «Отдых»
          в шапке.
        </Text>

        <div className="multi-pick">
          <Field
            label="Состояния"
            hint="Уровни только у истощения (1–6, PHB) и опьянения (1–5). Остальные — вкл/выкл. Продолжительный отдых −1 истощение."
          >
            <Combobox
              value={conditionQuery}
              options={pickerOptions}
              placeholder="Найти состояние…"
              emptyHint="Введите название и выберите из списка"
              onChange={setConditionQuery}
              onSelectOption={addConditionOption}
            />
          </Field>

          {play.exhaustion > 0 || activeConditions.length > 0 ? (
            <div className="tag-row" aria-label="Активные состояния">
              {play.exhaustion > 0 ? (
                <span className="tag-chip tag-chip--leveled">
                  <span>Истощение</span>
                  <select
                    className="tag-chip__level"
                    aria-label="Уровень истощения"
                    value={play.exhaustion}
                    onChange={(event) => setExhaustion(Number(event.target.value))}
                  >
                    {Array.from({ length: 6 }, (_, index) => index + 1).map((level) => {
                      const stage = conditionLevelLabel('exhaustion', level)
                      return (
                        <option key={level} value={level}>
                          {stage ? `${level} · ${stage}` : level}
                        </option>
                      )
                    })}
                  </select>
                  <button
                    type="button"
                    className="tag-chip__remove"
                    title="Снять"
                    onClick={() => setExhaustion(0)}
                  >
                    ×
                  </button>
                </span>
              ) : null}

              {activeConditions.map((ref) => {
                const max =
                  maxLevelBySlug.get(ref.slug) ?? conditionMaxLevel(ref.slug)
                return (
                  <span key={conditionKey(ref)} className="tag-chip tag-chip--leveled">
                    <span>{resolveConditionName(ref)}</span>
                    {max ? (
                      <select
                        className="tag-chip__level"
                        aria-label={`Уровень: ${resolveConditionName(ref)}`}
                        value={ref.level ?? 1}
                        onChange={(event) =>
                          changeConditionLevel(ref, Number(event.target.value))
                        }
                      >
                        {Array.from({ length: max }, (_, index) => index + 1).map((level) => {
                          const stage = conditionLevelLabel(ref.slug, level)
                          return (
                            <option key={level} value={level}>
                              {stage ? `${level} · ${stage}` : level}
                            </option>
                          )
                        })}
                      </select>
                    ) : null}
                    <button
                      type="button"
                      className="tag-chip__remove"
                      title="Снять"
                      onClick={() => removeCondition(ref)}
                    >
                      ×
                    </button>
                  </span>
                )
              })}
            </div>
          ) : (
            <Text tone="muted" className="multi-pick__empty">
              Нет активных состояний
            </Text>
          )}
        </div>
      </Stack>
    </Panel>
  )
}
