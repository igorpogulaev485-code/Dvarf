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
import { Combobox, Dialog, Field, Text, type ComboboxOption } from '../../ui'
import type { PlayState } from './play'

type HotConditionsDialogProps = {
  open: boolean
  edition: RulesEdition
  play: PlayState
  onPlayChange: (play: PlayState) => void
  onToast: (message: string) => void
  onClose: () => void
}

type ConditionOption = {
  slug: string
  name: string
  catalog_id: string | null
  maxLevel: number | null
}

export function HotConditionsDialog({
  open,
  edition,
  play,
  onPlayChange,
  onToast,
  onClose,
}: HotConditionsDialogProps) {
  const [catalogConditions, setCatalogConditions] = useState<CatalogEntry[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) return
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
  }, [edition, open])

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
          maxLevel: existing.maxLevel ?? item.maxLevel ?? null,
        })
      }
    }
    return Array.from(bySlug.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  }, [catalogConditions])

  const activeConditions = useMemo(
    () => play.conditions.filter((item) => item.slug !== 'exhaustion'),
    [play.conditions],
  )

  const pickerOptions = useMemo((): ComboboxOption[] => {
    const q = query.trim().toLowerCase()
    return conditionOptions
      .filter((option) => {
        if (option.slug === 'exhaustion') return play.exhaustion <= 0
        return !hasCondition(activeConditions, option.catalog_id ?? option.slug)
      })
      .filter((option) => !q || option.name.toLowerCase().includes(q) || option.slug.includes(q))
      .map((option) => ({ id: option.catalog_id ?? option.slug, label: option.name }))
  }, [activeConditions, conditionOptions, play.exhaustion, query])

  const exhaustionStage =
    play.exhaustion > 0 ? conditionLevelLabel('exhaustion', play.exhaustion) : null

  function patchPlay(patch: Partial<PlayState>) {
    onPlayChange({ ...play, ...patch })
  }

  function setExhaustion(next: number) {
    const level = clampExhaustion(next)
    patchPlay({ exhaustion: level })
    onToast(exhaustionStatusToast(level))
  }

  function addOption(option: ComboboxOption) {
    const preset = conditionOptions.find(
      (item) => (item.catalog_id ?? item.slug) === option.id || item.name === option.label,
    )
    if (preset?.slug === 'exhaustion') {
      if (play.exhaustion <= 0) setExhaustion(1)
      setQuery('')
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
      nextList.find((item) => conditionKey(item) === conditionKey(ref)) ?? ref
    onToast(conditionStatusToast({ action: 'add', ref: applied }))
    setQuery('')
  }

  return (
    <Dialog
      open={open}
      title="Состояния"
      primaryLabel="Готово"
      onPrimary={onClose}
      secondaryLabel="Закрыть"
      onSecondary={onClose}
    >
      <div className="hot-conditions">
        <Text tone="muted">
          Кликай в hot, чтобы менять состояния во время игры. Истощение — с пояснением, как
          отыгрывает.
        </Text>

        <div className="hot-conditions__exhaustion">
          <div className="hot-conditions__exh-head">
            <strong>Истощение</strong>
            <select
              className="play-select"
              aria-label="Уровень истощения"
              value={play.exhaustion}
              onChange={(event) => setExhaustion(Number(event.target.value))}
            >
              <option value={0}>нет</option>
              {Array.from({ length: 6 }, (_, index) => index + 1).map((level) => {
                const stage = conditionLevelLabel('exhaustion', level)
                return (
                  <option key={level} value={level}>
                    {stage ? `${level} · ${stage}` : level}
                  </option>
                )
              })}
            </select>
          </div>
          {exhaustionStage ? (
            <p className="hot-conditions__exh-stage">
              Сейчас: уровень {play.exhaustion} — <strong>{exhaustionStage}</strong>
            </p>
          ) : (
            <p className="hot-conditions__exh-stage">Нет истощения</p>
          )}
        </div>

        <Field label="Добавить состояние">
          <Combobox
            value={query}
            options={pickerOptions}
            placeholder="Найти состояние…"
            emptyHint="Введите название"
            onChange={setQuery}
            onSelectOption={addOption}
          />
        </Field>

        {activeConditions.length > 0 ? (
          <div className="tag-row" aria-label="Активные состояния">
            {activeConditions.map((ref) => {
              const max = conditionMaxLevel(ref.slug)
              return (
                <span key={conditionKey(ref)} className="tag-chip tag-chip--leveled">
                  <span>{resolveConditionName(ref)}</span>
                  {max ? (
                    <select
                      className="tag-chip__level"
                      value={ref.level ?? 1}
                      onChange={(event) => {
                        const nextList = setConditionLevel(
                          activeConditions,
                          conditionKey(ref),
                          Number(event.target.value),
                        )
                        patchPlay({ conditions: nextList })
                        const updated =
                          nextList.find((item) => conditionKey(item) === conditionKey(ref)) ??
                          ref
                        onToast(conditionStatusToast({ action: 'level', ref: updated }))
                      }}
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
                    onClick={() => {
                      patchPlay({
                        conditions: activeConditions.filter(
                          (item) => conditionKey(item) !== conditionKey(ref),
                        ),
                      })
                      onToast(conditionStatusToast({ action: 'remove', ref }))
                    }}
                  >
                    ×
                  </button>
                </span>
              )
            })}
          </div>
        ) : (
          <Text tone="muted">Нет активных состояний (кроме истощения выше)</Text>
        )}
      </div>
    </Dialog>
  )
}
