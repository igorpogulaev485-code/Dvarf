/** One ASI block: +2 / +1×2 or a feat. Create wizard and the sheet share this. */

import {
  CLASS_ASI_MODE_OPTIONS,
  type AbilityKey,
  type ClassAsiModeId,
} from '../../shared/dnd/classAsi'
import { Button, Stack, Text } from '../../ui'
import { ABILITY_KEYS, ABILITY_LABELS } from './sheetTypes'

export type AsiChoiceMode = 'scores' | 'feat'

type AsiChoiceBodyProps = {
  uiMode: AsiChoiceMode
  modeId: ClassAsiModeId
  keys: AbilityKey[]
  abilities: Record<AbilityKey, number>
  onModeId: (mode: ClassAsiModeId) => void
  onChooseFeat: () => void
  onToggleKey: (key: AbilityKey) => void
  error: string | null
}

export function AsiChoiceBody({
  uiMode,
  modeId,
  keys,
  abilities,
  onModeId,
  onChooseFeat,
  onToggleKey,
  error,
}: AsiChoiceBodyProps) {
  const mode = CLASS_ASI_MODE_OPTIONS.find((row) => row.id === modeId) ?? CLASS_ASI_MODE_OPTIONS[0]
  return (
    <Stack gap={14}>
      <Text tone="muted">
        +2 к одной характеристике, +1 к двум (максимум 20) или одна черта из каталога.
      </Text>
      <div className="chip-row" role="group" aria-label="Вариант ASI">
        {CLASS_ASI_MODE_OPTIONS.map((row) => (
          <Button
            key={row.id}
            type="button"
            variant={uiMode === 'scores' && modeId === row.id ? 'primary' : 'ghost'}
            onClick={() => onModeId(row.id)}
          >
            {row.labelRu}
          </Button>
        ))}
        <Button
          type="button"
          variant={uiMode === 'feat' ? 'primary' : 'ghost'}
          onClick={onChooseFeat}
        >
          Черта
        </Button>
      </div>
      {uiMode === 'scores' ? (
        <div className="chip-row" role="group" aria-label="Характеристики">
          {ABILITY_KEYS.map((key) => {
            const selected = keys.includes(key)
            return (
              <Button
                key={key}
                type="button"
                variant={selected ? 'primary' : 'ghost'}
                onClick={() => onToggleKey(key)}
              >
                {ABILITY_LABELS[key]} {abilities[key]}
              </Button>
            )
          })}
        </div>
      ) : (
        <Text tone="muted">
          Нажми «Выбрать черту» — откроется каталог. Гранты (навыки, скорость, хиты…) лягут на лист.
        </Text>
      )}
      {error ? <Text tone="danger">{error}</Text> : null}
      {!error && uiMode === 'scores' && mode ? (
        <Text tone="muted">
          Нужно выбрать: {mode.amounts.length} · сейчас {keys.length}
        </Text>
      ) : null}
    </Stack>
  )
}
