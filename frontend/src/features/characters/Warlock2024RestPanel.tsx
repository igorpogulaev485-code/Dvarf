/**
 * 2024 Warlock rest panel: Pact of the Tome re-pick (Book of Shadows) and
 * Fiendish Resilience damage type. Edition branch only; UI kit only.
 */

import { useEffect, useMemo, useState } from 'react'
import { Button, Field, Input, Select, Stack, Text, ToggleChip } from '../../ui'
import { getFeaturePick, setFeaturePick, type FeaturePicksState } from '../../shared/dnd/featurePicks'
import {
  BOOK_OF_SHADOWS_NAME_RU,
  canRepickFiendishResilience2024,
  FIENDISH_RESILIENCE_NAME_RU,
  FIENDISH_RESILIENCE_PICK_ID_2024,
  FIENDISH_RESILIENCE_TYPES_2024,
  hasPactOfTheTome2024,
  PACT_TOME_CANTRIPS_LIMIT_2024,
  PACT_TOME_RITUALS_LIMIT_2024,
  readPactTomePicks2024,
  savePactTomePicks2024,
} from '../../shared/dnd/warlock2024Features'

export type WarlockRestOption = { id: string; name: string }

export type Warlock2024RestPanelProps = {
  kind: 'short' | 'long'
  classEntryId: string
  warlockLevel: number
  subclassSlug: string | null
  invocations: string[]
  featurePicks: FeaturePicksState
  onFeaturePicksChange: (picks: FeaturePicksState) => void
  cantripOptions: WarlockRestOption[]
  ritualOptions: WarlockRestOption[]
  onToast: (message: string) => void
}

const VISIBLE_LIMIT = 60

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index])
}

function nameOf(options: WarlockRestOption[], id: string): string {
  return options.find((row) => row.id === id)?.name ?? id
}

function PickList({
  label,
  limit,
  selected,
  options,
  onToggle,
}: {
  label: string
  limit: number
  selected: string[]
  options: WarlockRestOption[]
  onToggle: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = q
      ? options.filter(
          (row) => row.name.toLowerCase().includes(q) || row.id.toLowerCase().includes(q),
        )
      : options
    const chosen = rows.filter((row) => selected.includes(row.id))
    const rest = rows.filter((row) => !selected.includes(row.id))
    return [...chosen, ...rest]
  }, [options, query, selected])
  const full = selected.length >= limit

  return (
    <Stack gap={8}>
      <Text>
        <strong>{label}</strong> · {selected.length}/{limit}
        {selected.length > 0 ? `: ${selected.map((id) => nameOf(options, id)).join(', ')}` : ''}
      </Text>
      {options.length === 0 ? (
        <Text tone="muted">Справочник заклинаний не загружен.</Text>
      ) : (
        <>
          <Field label="Поиск">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Название…"
            />
          </Field>
          <div className="chip-row" role="group" aria-label={label}>
            {filtered.slice(0, VISIBLE_LIMIT).map((row) => {
              const on = selected.includes(row.id)
              return (
                <ToggleChip
                  key={row.id}
                  main={row.name}
                  checked={on}
                  disabled={!on && full}
                  onChange={() => onToggle(row.id)}
                />
              )
            })}
          </div>
          {filtered.length > VISIBLE_LIMIT ? (
            <Text tone="muted">Показаны первые {VISIBLE_LIMIT} — уточни поиск.</Text>
          ) : null}
        </>
      )}
    </Stack>
  )
}

function toggleId(list: string[], id: string, limit: number): string[] {
  if (list.includes(id)) return list.filter((item) => item !== id)
  if (list.length >= limit) return list
  return [...list, id]
}

function BookOfShadows({
  classEntryId,
  featurePicks,
  onFeaturePicksChange,
  cantripOptions,
  ritualOptions,
  onToast,
}: Pick<
  Warlock2024RestPanelProps,
  | 'classEntryId'
  | 'featurePicks'
  | 'onFeaturePicksChange'
  | 'cantripOptions'
  | 'ritualOptions'
  | 'onToast'
>) {
  const saved = useMemo(
    () => readPactTomePicks2024(featurePicks, classEntryId),
    [featurePicks, classEntryId],
  )
  const [cantrips, setCantrips] = useState(saved.cantrips)
  const [rituals, setRituals] = useState(saved.rituals)
  const [skipped, setSkipped] = useState(false)

  useEffect(() => {
    setCantrips(saved.cantrips)
    setRituals(saved.rituals)
  }, [saved])

  const dirty = !sameList(cantrips, saved.cantrips) || !sameList(rituals, saved.rituals)
  const ready =
    cantrips.length === PACT_TOME_CANTRIPS_LIMIT_2024 &&
    rituals.length === PACT_TOME_RITUALS_LIMIT_2024

  function apply() {
    const next = savePactTomePicks2024(featurePicks, classEntryId, cantrips, rituals)
    if (!next) {
      onToast(
        `${BOOK_OF_SHADOWS_NAME_RU}: нужно ${PACT_TOME_CANTRIPS_LIMIT_2024} заговора и ${PACT_TOME_RITUALS_LIMIT_2024} ритуала`,
      )
      return
    }
    onFeaturePicksChange(next)
    setSkipped(false)
    onToast(
      `${BOOK_OF_SHADOWS_NAME_RU}: ${cantrips.map((id) => nameOf(cantripOptions, id)).join(', ')} · ${rituals
        .map((id) => nameOf(ritualOptions, id))
        .join(', ')}`,
    )
  }

  function skip() {
    setCantrips(saved.cantrips)
    setRituals(saved.rituals)
    setSkipped(true)
    onToast(`${BOOK_OF_SHADOWS_NAME_RU}: набор не менялся`)
  }

  return (
    <div className="feature-resource" data-testid="warlock-2024-rest-tome">
      <Text>
        <strong>{BOOK_OF_SHADOWS_NAME_RU}</strong>
      </Text>
      <Text tone="muted">
        После отдыха замени набор: {PACT_TOME_CANTRIPS_LIMIT_2024} заговора из списков любого класса
        и {PACT_TOME_RITUALS_LIMIT_2024} ритуала 1 круга (любой класс, метка «ритуал»).
      </Text>
      {skipped && !dirty ? (
        <Text tone="muted">
          Оставлен прежний набор: {saved.cantrips.map((id) => nameOf(cantripOptions, id)).join(', ') || '—'}
          {' · '}
          {saved.rituals.map((id) => nameOf(ritualOptions, id)).join(', ') || '—'}
        </Text>
      ) : (
        <Stack gap={12}>
          <PickList
            label="Заговоры"
            limit={PACT_TOME_CANTRIPS_LIMIT_2024}
            selected={cantrips}
            options={cantripOptions}
            onToggle={(id) =>
              setCantrips((prev) => toggleId(prev, id, PACT_TOME_CANTRIPS_LIMIT_2024))
            }
          />
          <PickList
            label="Ритуалы 1 круга"
            limit={PACT_TOME_RITUALS_LIMIT_2024}
            selected={rituals}
            options={ritualOptions}
            onToggle={(id) => setRituals((prev) => toggleId(prev, id, PACT_TOME_RITUALS_LIMIT_2024))}
          />
        </Stack>
      )}
      <div className="play-rest-actions">
        <Button type="button" disabled={!ready || !dirty} onClick={apply}>
          Применить набор
        </Button>
        <Button type="button" variant="secondary" onClick={skip}>
          Пропустить
        </Button>
      </div>
    </div>
  )
}

function FiendishResilience({
  classEntryId,
  featurePicks,
  onFeaturePicksChange,
  onToast,
}: Pick<
  Warlock2024RestPanelProps,
  'classEntryId' | 'featurePicks' | 'onFeaturePicksChange' | 'onToast'
>) {
  const current = getFeaturePick(featurePicks, classEntryId, FIENDISH_RESILIENCE_PICK_ID_2024)
  const currentRow = FIENDISH_RESILIENCE_TYPES_2024.find((row) => row.id === current) ?? null
  const [choice, setChoice] = useState(current ?? FIENDISH_RESILIENCE_TYPES_2024[0].id)

  useEffect(() => {
    if (current) setChoice(current)
  }, [current])

  function apply() {
    const row = FIENDISH_RESILIENCE_TYPES_2024.find((item) => item.id === choice)
    if (!row) return
    onFeaturePicksChange(
      setFeaturePick(featurePicks, classEntryId, FIENDISH_RESILIENCE_PICK_ID_2024, row.id),
    )
    onToast(`${FIENDISH_RESILIENCE_NAME_RU}: сопротивление урону «${row.nameRu}»`)
  }

  return (
    <div className="feature-resource" data-testid="warlock-2024-rest-fiend">
      <Text>
        <strong>{FIENDISH_RESILIENCE_NAME_RU}</strong>
        {currentRow ? ` · сейчас: ${currentRow.nameRu}` : ' · тип не выбран'}
      </Text>
      <Text tone="muted">
        После отдыха выбери тип урона (кроме силового) — сопротивление действует до следующей смены.
      </Text>
      <Field label="Тип урона">
        <Select value={choice} onChange={(event) => setChoice(event.target.value)}>
          {FIENDISH_RESILIENCE_TYPES_2024.map((row) => (
            <option key={row.id} value={row.id}>
              {row.nameRu}
            </option>
          ))}
        </Select>
      </Field>
      <div className="play-rest-actions">
        <Button type="button" disabled={choice === current} onClick={apply}>
          Применить
        </Button>
      </div>
    </div>
  )
}

export function Warlock2024RestPanel(props: Warlock2024RestPanelProps) {
  const hasTome = hasPactOfTheTome2024(props.invocations)
  const hasFiend = canRepickFiendishResilience2024({
    subclassSlug: props.subclassSlug,
    warlockLevel: props.warlockLevel,
  })
  if (!hasTome && !hasFiend) return null
  return (
    <div data-rest-warlock-2024={props.kind}>
      <Stack gap={12}>
        {hasTome ? <BookOfShadows {...props} /> : null}
        {hasFiend ? <FiendishResilience {...props} /> : null}
      </Stack>
    </div>
  )
}
