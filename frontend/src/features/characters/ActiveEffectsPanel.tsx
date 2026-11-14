/** Блок «Активные эффекты» на листе цели (B-01 / B-02 / B-03). */
import { useState } from 'react'
import {
  applyEffectStacking,
  decrementEffectCharges,
  formatEffectRemaining,
  tickAllEffectsOneRound,
  type ActiveEffect,
} from '../../shared/dnd/activeEffects'
import { Button } from '../../ui'
import { rollDamage } from './deskRolls'

type Props = {
  effects: ActiveEffect[]
  onChange: (effects: ActiveEffect[]) => void
  onToast?: (message: string) => void
  /** Heroism: grant temp HP equal to caster mod at start of turn. */
  onHeroismTurnStart?: () => void
}

export function ActiveEffectsPanel({
  effects,
  onChange,
  onToast,
  onHeroismTurnStart,
}: Props) {
  const [expandedEffectId, setExpandedEffectId] = useState<string | null>(null)
  const rows = applyEffectStacking(effects ?? [])
  // SC-01: empty effects → render nothing (no empty muted placeholder).
  if (rows.length === 0) {
    return null
  }

  const hasHeroism = rows.some((row) => row.slug === 'heroism' && !row.inactive)

  return (
    <div className="active-effects active-effects--strip" data-testid="active-effects">
      <div className="active-effects__chips" role="list" aria-label="Активные эффекты">
        {rows.map((effect) => {
          const remaining = formatEffectRemaining(effect)
          const from = effect.source_name
            ? `от ${effect.source_name}`
            : effect.source_character_id
              ? 'от союзника'
              : null
          const conc = effect.linked_concentration
            ? `концентрация${effect.source_name ? `: ${effect.source_name}` : ''}`
            : null
          const inactive = effect.inactive
            ? effect.inactive_reason || 'не действует (одноимённый)'
            : null
          const charges =
            typeof effect.charges === 'number' ? effect.charges : null
          const mirror = effect.slug === 'mirror_image'
          const vitality = effect.slug === 'aura_of_vitality'
          const blink = effect.slug === 'blink'
          const fortune = effect.slug === 'fortunes_favor'
          const meta = [
            from,
            conc,
            remaining,
            charges != null
              ? mirror
                ? `двойники ${charges}`
                : vitality
                  ? `импульсы ${charges}`
                  : fortune
                    ? `удача ${charges}`
                    : `заряды ${charges}`
              : null,
            inactive,
          ]
            .filter(Boolean)
            .join(' · ')

          const chipLabel = [effect.name, meta].filter(Boolean).join(' · ')

          return (
            <div
              key={effect.id}
              className={`active-effects__chip${inactive ? ' is-inactive' : ''}`}
              role="listitem"
            >
              <button
                type="button"
                className={`active-effects__chip-text${
                  expandedEffectId === effect.id ? ' is-expanded' : ' is-clamped'
                }`}
                title={
                  expandedEffectId === effect.id
                    ? 'Свернуть'
                    : `Полный текст: ${chipLabel}. Нажми, чтобы раскрыть`
                }
                aria-expanded={expandedEffectId === effect.id}
                onClick={() =>
                  setExpandedEffectId((prev) =>
                    prev === effect.id ? null : effect.id,
                  )
                }
              >
                <strong>{effect.name}</strong>
                {meta ? <span className="active-effects__chip-meta"> · {meta}</span> : null}
              </button>
              <span className="active-effects__chip-actions">
                {mirror && !inactive ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const next = decrementEffectCharges(rows, effect.id, 1)
                      onChange(next)
                      const left = next.find((row) => row.id === effect.id)?.charges
                      onToast?.(
                        left == null
                          ? 'Отражения: двойники исчерпаны'
                          : `Отражения: двойники ${left}`,
                      )
                    }}
                  >
                    −1
                  </Button>
                ) : null}
                {vitality && !inactive ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const rolled = rollDamage('2d6')
                      const next = decrementEffectCharges(rows, effect.id, 1)
                      onChange(next)
                      onToast?.(
                        rolled
                          ? `Аура живучести: +${rolled.total} хитов (${rolled.detail})`
                          : 'Аура живучести: 2к6 хитов',
                      )
                    }}
                  >
                    2к6
                  </Button>
                ) : null}
                {blink && !inactive ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const die = 1 + Math.floor(Math.random() * 20)
                      onToast?.(
                        die >= 11
                          ? `Мерцание: ${die} · уход на Эфир до начала следующего хода`
                          : `Мерцание: ${die} · остаётесь на Материальном`,
                      )
                    }}
                  >
                    к20
                  </Button>
                ) : null}
                {fortune && !inactive && (charges ?? 0) > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onChange(decrementEffectCharges(rows, effect.id, 1))
                      onToast?.(
                        'Благосклонность судьбы: очко удачи потрачено (переброс / запасная кость — по правилу EGW)',
                      )
                    }}
                  >
                    Удача
                  </Button>
                ) : null}
                {effect.source_character_id &&
                (effect.slug?.startsWith('aura_of_') ||
                  effect.slug === 'exalted_champion') ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const next = rows.map((row) => {
                        if (row.id !== effect.id) return row
                        const on = Boolean(row.inactive)
                        return {
                          ...row,
                          inactive: on ? false : true,
                          inactive_reason: on ? null : 'вне ауры',
                        }
                      })
                      onChange(next)
                      const nowOn = next.find((row) => row.id === effect.id)
                      onToast?.(
                        nowOn && !nowOn.inactive
                          ? `${effect.name}: в ауре`
                          : `${effect.name}: вне ауры`,
                      )
                    }}
                  >
                    {effect.inactive ? 'В ауре' : 'Вне ауры'}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={`Снять «${effect.name}»`}
                  title="Снять"
                  onClick={() => {
                    onChange(rows.filter((row) => row.id !== effect.id))
                    onToast?.(`Снят эффект «${effect.name}»`)
                  }}
                >
                  ×
                </Button>
              </span>
            </div>
          )
        })}
        {hasHeroism && onHeroismTurnStart ? (
          <Button type="button" size="sm" variant="secondary" onClick={onHeroismTurnStart}>
            Героизм
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          title="Сменить раунд: таймеры эффектов −1 (полный ход — в сцене Бой)"
          aria-label="Раунд минус 1 — уменьшить таймеры эффектов"
          onClick={() => {
            const next = tickAllEffectsOneRound(rows)
            onChange(next)
            onToast?.(
              next.length < rows.length
                ? 'Раунд: часть эффектов истекла'
                : 'Раунд: таймеры эффектов −1',
            )
          }}
        >
          Раунд −1
        </Button>
      </div>
    </div>
  )
}
