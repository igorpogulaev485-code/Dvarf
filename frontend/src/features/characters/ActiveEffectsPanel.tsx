/** Блок «Активные эффекты» на листе цели (B-01). */
import {
  applyEffectStacking,
  formatEffectRemaining,
  tickAllEffectsOneRound,
  type ActiveEffect,
} from '../../shared/dnd/activeEffects'
import { Button, Stack, Text } from '../../ui'

type Props = {
  effects: ActiveEffect[]
  onChange: (effects: ActiveEffect[]) => void
  onToast?: (message: string) => void
}

export function ActiveEffectsPanel({ effects, onChange, onToast }: Props) {
  const rows = applyEffectStacking(effects ?? [])
  if (rows.length === 0) {
    return (
      <div className="active-effects panel" data-testid="active-effects">
        <Text tone="muted">Нет активных эффектов</Text>
      </div>
    )
  }

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
                {inactive ? (
                  <Text tone="muted" as="span">
                    {inactive}
                  </Text>
                ) : null}
              </div>
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
          )
        })}
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
