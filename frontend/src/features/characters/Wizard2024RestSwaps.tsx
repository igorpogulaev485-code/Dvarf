/**
 * 2024 Wizard rest swaps: Memorize Spell (short), cantrip swap and Spell Mastery swap (long).
 * Presentational: swap rules live in shared/dnd/wizard2024Features.
 */

import { useEffect, useState } from 'react'
import { Button, Text } from '../../ui'

export type RestSwapOption = { id: string; name: string; hint?: string }

export type Wizard2024RestProps = {
  memorize: { from: RestSwapOption[]; to: RestSwapOption[] } | null
  cantrip: { from: RestSwapOption[]; catalog: RestSwapOption[] } | null
  mastery: Array<{ tier: number; currentName: string; options: RestSwapOption[] }> | null
  onMemorize: (fromId: string, toId: string) => boolean
  onCantrip: (fromId: string, catalogId: string) => boolean
  onMastery: (tier: number, toId: string) => boolean
}

export type Wizard2024RestDone = { memorize: boolean; cantrip: boolean; mastery: boolean }

export const WIZARD_2024_REST_DONE_EMPTY: Wizard2024RestDone = {
  memorize: false,
  cantrip: false,
  mastery: false,
}

function SwapSelect({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string
  value: string
  options: RestSwapOption[]
  disabled: boolean
  onChange: (id: string) => void
}) {
  return (
    <label className="feature-resource__select">
      <span className="sr-only">{label}</span>
      <select
        className="play-select"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((row) => (
          <option key={row.id} value={row.id}>
            {row.name}
            {row.hint ? ` · ${row.hint}` : ''}
          </option>
        ))}
      </select>
    </label>
  )
}

function firstId(options: RestSwapOption[]): string {
  return options[0]?.id ?? ''
}

function pickValid(current: string, options: RestSwapOption[]): string {
  return options.some((row) => row.id === current) ? current : firstId(options)
}

export function Wizard2024RestSwaps({
  kind,
  swaps,
  done,
  onDone,
}: {
  kind: 'short' | 'long'
  swaps: Wizard2024RestProps
  done: Wizard2024RestDone
  onDone: (key: keyof Wizard2024RestDone) => void
}) {
  const [memFrom, setMemFrom] = useState('')
  const [memTo, setMemTo] = useState('')
  const [cantripFrom, setCantripFrom] = useState('')
  const [cantripTo, setCantripTo] = useState('')
  const [masteryTier, setMasteryTier] = useState(0)
  const [masteryTo, setMasteryTo] = useState('')

  const memorize = swaps.memorize
  const cantrip = swaps.cantrip
  const mastery = swaps.mastery
  const tierRow = mastery?.find((row) => row.tier === masteryTier) ?? mastery?.[0] ?? null

  useEffect(() => {
    if (memorize) {
      setMemFrom((prev) => pickValid(prev, memorize.from))
      setMemTo((prev) => pickValid(prev, memorize.to))
    }
    if (cantrip) {
      setCantripFrom((prev) => pickValid(prev, cantrip.from))
      setCantripTo((prev) => pickValid(prev, cantrip.catalog))
    }
    if (mastery?.length) {
      const row = mastery.find((item) => item.tier === masteryTier) ?? mastery[0]
      setMasteryTier(row.tier)
      setMasteryTo((prev) => pickValid(prev, row.options))
    }
  }, [memorize, cantrip, mastery, masteryTier])

  if (kind === 'short') {
    if (!memorize) return null
    return (
      <div className="feature-resource">
        <Text>
          <strong>Запомнить заклинание</strong>
          {done.memorize ? ' · уже заменено за этот отдых' : ''}
        </Text>
        <Text tone="muted">
          После короткого отдыха: замени одно подготовленное заклинание другим из книги.
          Закреплённые (мастерство, фирменные, умения) не меняются.
        </Text>
        {memorize.from.length === 0 || memorize.to.length === 0 ? (
          <Text tone="muted">
            {memorize.from.length === 0
              ? 'Нет подготовленных заклинаний, которые можно заменить.'
              : 'В книге нет неподготовленных заклинаний доступного круга.'}
          </Text>
        ) : (
          <>
            <SwapSelect
              label="Убрать из подготовленных"
              value={memFrom}
              options={memorize.from}
              disabled={done.memorize}
              onChange={setMemFrom}
            />
            <SwapSelect
              label="Подготовить из книги"
              value={memTo}
              options={memorize.to}
              disabled={done.memorize}
              onChange={setMemTo}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={done.memorize || !memFrom || !memTo}
              onClick={() => {
                if (swaps.onMemorize(memFrom, memTo)) onDone('memorize')
              }}
            >
              Заменить
            </Button>
          </>
        )}
      </div>
    )
  }

  return (
    <>
      {cantrip && cantrip.from.length > 0 && cantrip.catalog.length > 0 ? (
        <div className="feature-resource">
          <Text>
            <strong>Сотворение заклинаний: заговор</strong>
            {done.cantrip ? ' · уже заменён за этот отдых' : ''}
          </Text>
          <Text tone="muted">
            После продолжительного отдыха: замени один заговор волшебника другим из списка
            волшебника.
          </Text>
          <SwapSelect
            label="Заменить заговор"
            value={cantripFrom}
            options={cantrip.from}
            disabled={done.cantrip}
            onChange={setCantripFrom}
          />
          <SwapSelect
            label="Новый заговор"
            value={cantripTo}
            options={cantrip.catalog}
            disabled={done.cantrip}
            onChange={setCantripTo}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={done.cantrip || !cantripFrom || !cantripTo}
            onClick={() => {
              if (swaps.onCantrip(cantripFrom, cantripTo)) onDone('cantrip')
            }}
          >
            Заменить заговор
          </Button>
        </div>
      ) : null}
      {mastery && mastery.length > 0 && tierRow ? (
        <div className="feature-resource">
          <Text>
            <strong>Мастерство заклинателя</strong>
            {done.mastery ? ' · уже заменено за этот отдых' : ''}
          </Text>
          <Text tone="muted">
            После продолжительного отдыха: замени одно из двух заклинаний другим того же круга
            из книги (время сотворения — Действие).
          </Text>
          <div className="chip-row">
            {mastery.map((row) => (
              <button
                key={row.tier}
                type="button"
                className={`sheet-chip${tierRow.tier === row.tier ? ' is-on' : ''}`}
                disabled={done.mastery}
                onClick={() => setMasteryTier(row.tier)}
              >
                {row.tier} круг: {row.currentName}
              </button>
            ))}
          </div>
          {tierRow.options.length === 0 ? (
            <Text tone="muted">В книге нет другого подходящего заклинания этого круга.</Text>
          ) : (
            <>
              <SwapSelect
                label="Новое заклинание"
                value={masteryTo}
                options={tierRow.options}
                disabled={done.mastery}
                onChange={setMasteryTo}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={done.mastery || !masteryTo}
                onClick={() => {
                  if (swaps.onMastery(tierRow.tier, masteryTo)) onDone('mastery')
                }}
              >
                Заменить
              </Button>
            </>
          )}
        </div>
      ) : null}
    </>
  )
}
