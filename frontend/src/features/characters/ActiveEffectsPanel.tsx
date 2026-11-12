/** Блок «Активные эффекты» на листе цели (B-01 / B-02 / B-03). */
import {
  applyEffectStacking,
  decrementEffectCharges,
  formatEffectRemaining,
  tickAllEffectsOneRound,
  type ActiveEffect,
} from '../../shared/dnd/activeEffects'
import { Button, Stack, Text } from '../../ui'
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
  const rows = applyEffectStacking(effects ?? [])
  if (rows.length === 0) {
    return (
      <div className="active-effects panel" data-testid="active-effects">
        <Text tone="muted">Нет активных эффектов</Text>
      </div>
    )
  }

  const hasHeroism = rows.some((row) => row.slug === 'heroism' && !row.inactive)

  return (
    <div className="active-effects panel" data-testid="active-effects">
      <Text>
        <strong>Активные эффекты</strong>
      </Text>
      <Stack gap={8}>
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
          return (
            <div
              key={effect.id}
              className={`active-effects__row${inactive ? ' is-inactive' : ''}`}
            >
              <div className="active-effects__main">
                <span className={`sheet-chip${inactive ? '' : ' is-on'}`}>{effect.name}</span>
                {from ? (
                  <Text tone="muted" as="span">
                    {from}
                  </Text>
                ) : null}
                {conc ? (
                  <Text tone="muted" as="span">
                    {conc}
                  </Text>
                ) : null}
                {remaining ? (
                  <Text tone="muted" as="span">
                    {remaining}
                  </Text>
                ) : null}
                {charges != null ? (
                  <Text tone="muted" as="span">
                    {mirror
                      ? `двойники: ${charges}`
                      : vitality
                        ? `импульсы: ${charges}`
                        : fortune
                          ? `удача: ${charges}`
                          : `заряды: ${charges}`}
                  </Text>
                ) : null}
                {inactive ? (
                  <Text tone="muted" as="span">
                    {inactive}
                  </Text>
                ) : null}
              </div>
              <div className="chip-row">
                {mirror && !inactive ? (
                  <Button
                    type="button"
                    variant="secondary"
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
                    variant="secondary"
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
                    Лечение 2к6
                  </Button>
                ) : null}
                {blink && !inactive ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const die = 1 + Math.floor(Math.random() * 20)
                      onToast?.(
                        die >= 11
                          ? `Мерцание: ${die} · уход на Эфир до начала следующего хода`
                          : `Мерцание: ${die} · остаётесь на Материальном`,
                      )
                    }}
                  >
                    к20 в конце хода
                  </Button>
                ) : null}
                {fortune && !inactive && (charges ?? 0) > 0 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      onChange(decrementEffectCharges(rows, effect.id, 1))
                      onToast?.(
                        'Благосклонность судьбы: очко удачи потрачено (переброс / запасная кость — по правилу EGW)',
                      )
                    }}
                  >
                    Потратить удачу
                  </Button>
                ) : null}
                {effect.source_character_id &&
                (effect.slug?.startsWith('aura_of_') ||
                  effect.slug === 'exalted_champion') ? (
                  <Button
                    type="button"
                    variant="secondary"
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
                  variant="ghost"
                  onClick={() => {
                    onChange(rows.filter((row) => row.id !== effect.id))
                    onToast?.(`Снят эффект «${effect.name}»`)
                  }}
                >
                  Снять
                </Button>
              </div>
            </div>
          )
        })}
        {hasHeroism && onHeroismTurnStart ? (
          <Button type="button" variant="secondary" onClick={onHeroismTurnStart}>
            Начало хода (Героизм)
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
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
          Следующий раунд
        </Button>
      </Stack>
    </div>
  )
}
