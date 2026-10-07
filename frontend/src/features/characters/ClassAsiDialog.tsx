import { useEffect, useMemo, useState } from 'react'
import type { RulesEdition } from '../../shared/api/characters'
import {
  CLASS_ASI_MODE_OPTIONS,
  validateClassAsiPicks,
  type AbilityKey,
  type AppliedClassAsi,
  type ClassAsiModeId,
} from '../../shared/dnd/classAsi'
import {
  newFeatGrantId,
  type ArmorProfKey,
  type AppliedFeatGrant,
} from '../../shared/dnd/featGrants'
import { ABILITY_KEYS, ABILITY_LABELS } from './sheetTypes'
import { FeatSetupDialog, type FeatSetupResult } from './FeatSetupDialog'
import { Button, Dialog, Stack, Text } from '../../ui'

type ClassAsiDialogProps = {
  open: boolean
  edition: RulesEdition
  className: string
  classLevel: number
  featureId: string
  classEntryId: string
  abilities: Record<AbilityKey, number>
  armor: Partial<Record<ArmorProfKey, boolean>>
  hasSpellcasting: boolean
  takenFeatSlugs?: string[]
  onConfirm: (entry: AppliedClassAsi, featGrant?: AppliedFeatGrant) => void
  onSkip: () => void
}

type UiMode = 'scores' | 'feat'

export function ClassAsiDialog({
  open,
  edition,
  className,
  classLevel,
  featureId,
  classEntryId,
  abilities,
  armor,
  hasSpellcasting,
  takenFeatSlugs = [],
  onConfirm,
  onSkip,
}: ClassAsiDialogProps) {
  const [uiMode, setUiMode] = useState<UiMode>('scores')
  const [modeId, setModeId] = useState<ClassAsiModeId>('plus2')
  const [keys, setKeys] = useState<AbilityKey[]>([])
  const [error, setError] = useState<string | null>(null)
  const [featOpen, setFeatOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setUiMode('scores')
    setModeId('plus2')
    setKeys([])
    setError(null)
    setFeatOpen(false)
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

  function confirmFeat(result: FeatSetupResult) {
    const grantId = newFeatGrantId()
    const featGrant: AppliedFeatGrant = {
      id: grantId,
      featCatalogId: result.entry.id,
      slug: result.entry.slug,
      nameRu: result.entry.name_ru,
      source: {
        kind: 'asi',
        classEntryId,
        featureId,
        atClassLevel: classLevel,
      },
      applied: result.applied,
      picks: result.picks,
    }
    // Ability bonuses live on the feat grant ledger (avoid double-apply via class_asi).
    onConfirm(
      {
        classEntryId,
        featureId,
        atClassLevel: classLevel,
        resolution: {
          kind: 'feat',
          featCatalogId: result.entry.id,
          featSlug: result.entry.slug,
          featGrantId: grantId,
        },
        bonuses: {},
      },
      featGrant,
    )
    setFeatOpen(false)
  }

  return (
    <>
      <Dialog
        open={open && !featOpen}
        title={`Увеличение характеристик · ${className} ${classLevel}`}
        primaryLabel={uiMode === 'scores' ? 'Применить' : 'Выбрать черту'}
        secondaryLabel="Позже"
        onPrimary={() => {
          if (uiMode === 'feat') {
            setFeatOpen(true)
            return
          }
          confirmScores()
        }}
        onSecondary={onSkip}
        primaryDisabled={
          uiMode === 'scores' && keys.length !== (mode?.amounts.length ?? 1)
        }
      >
        <Stack gap={14}>
          <Text tone="muted">
            +2 к одной характеристике, +1 к двум (максимум 20) или одна черта из каталога PHB.
          </Text>

          <div className="chip-row" role="group" aria-label="Вариант ASI">
            {CLASS_ASI_MODE_OPTIONS.map((row) => (
              <Button
                key={row.id}
                type="button"
                variant={uiMode === 'scores' && modeId === row.id ? 'primary' : 'ghost'}
                onClick={() => {
                  setUiMode('scores')
                  setModeId(row.id)
                  setKeys([])
                  setError(null)
                }}
              >
                {row.labelRu}
              </Button>
            ))}
            <Button
              type="button"
              variant={uiMode === 'feat' ? 'primary' : 'ghost'}
              onClick={() => {
                setUiMode('feat')
                setKeys([])
                setError(null)
              }}
            >
              Черта
            </Button>
          </div>

          {uiMode === 'scores' ? (
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
          ) : (
            <Text tone="muted">
              Нажми «Выбрать черту» — откроется каталог. Гранты (навыки, скорость, хиты…) лягут на
              лист автоматически.
            </Text>
          )}

          {error ? <Text tone="danger">{error}</Text> : null}
        </Stack>
      </Dialog>

      <FeatSetupDialog
        open={featOpen}
        edition={edition}
        title={`Черта · ${className} ${classLevel}`}
        abilities={abilities}
        armor={armor}
        hasSpellcasting={hasSpellcasting}
        takenSlugs={takenFeatSlugs}
        onClose={() => setFeatOpen(false)}
        onConfirm={confirmFeat}
      />
    </>
  )
}
