import { useEffect, useMemo, useState } from 'react'
import {
  CLASS_ASI_MODE_OPTIONS,
  validateClassAsiPicks,
  type AbilityKey,
  type AppliedClassAsi,
  type ClassAsiModeId,
} from '../../shared/dnd/classAsi'
import { ABILITY_KEYS, ABILITY_LABELS } from './sheetTypes'
import { Button, Dialog, Stack, Text } from '../../ui'

type ClassAsiDialogProps = {
  open: boolean
  className: string
  classLevel: number
  featureId: string
  classEntryId: string
  abilities: Record<AbilityKey, number>
  onConfirm: (entry: AppliedClassAsi) => void
  onSkip: () => void
}

export function ClassAsiDialog({
  open,
  className,
  classLevel,
  featureId,
  classEntryId,
  abilities,
  onConfirm,
  onSkip,
}: ClassAsiDialogProps) {
  const [modeId, setModeId] = useState<ClassAsiModeId>('plus2')
  const [keys, setKeys] = useState<AbilityKey[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setModeId('plus2')
    setKeys([])
    setError(null)
  }, [open, featureId])

  const mode = useMemo(
    () => CLASS_ASI_MODE_OPTIONS.find((row) => row.id === modeId) ?? CLASS_ASI_MODE_OPTIONS[0],
    [modeId],
  )

  function toggleKey(key: AbilityKey) {
    setError(null)
    setKeys((prev) => {
      if (prev.includes(key)) return prev.filter((item) => item !== key)
      const next = [...prev, key]
      const limit = mode?.amounts.length ?? 1
      return next.slice(-limit)
    })
  }

  function confirmScores() {
    const check = validateClassAsiPicks({ modeId, keys, abilities })
    if (!check.ok) {
      setError(check.reason)
      return
    }
    onConfirm({
      classEntryId,
      featureId,
      atClassLevel: classLevel,
      resolution: { kind: 'scores', modeId, keys: [...keys] },
      bonuses: check.bonuses,
    })
  }

  return (
    <Dialog
      open={open}
      title={`Увеличение характеристик · ${className} ${classLevel}`}
      primaryLabel="Применить"
      secondaryLabel="Позже"
      onPrimary={confirmScores}
      onSecondary={onSkip}
      primaryDisabled={keys.length !== (mode?.amounts.length ?? 1)}
    >
      <Stack gap={14}>
        <Text tone="muted">
          +2 к одной характеристике или +1 к двум (максимум 20). Черты появятся здесь, когда
          каталог черт будет готов.
        </Text>

        <div className="chip-row" role="group" aria-label="Вариант ASI">
          {CLASS_ASI_MODE_OPTIONS.map((row) => (
            <Button
              key={row.id}
              type="button"
              variant={modeId === row.id ? 'primary' : 'ghost'}
              onClick={() => {
                setModeId(row.id)
                setKeys([])
                setError(null)
              }}
            >
              {row.labelRu}
            </Button>
          ))}
          <Button type="button" variant="ghost" disabled title="Каталог черт ещё собирается">
            Черта (скоро)
          </Button>
        </div>

        <div className="chip-row" role="group" aria-label="Характеристики">
          {ABILITY_KEYS.map((key) => {
            const selected = keys.includes(key)
            const score = abilities[key]
            return (
              <Button
                key={key}
                type="button"
                variant={selected ? 'primary' : 'ghost'}
                onClick={() => toggleKey(key)}
              >
                {ABILITY_LABELS[key]} {score}
              </Button>
            )
          })}
        </div>

        {error ? <Text tone="danger">{error}</Text> : null}
      </Stack>
    </Dialog>
  )
}
