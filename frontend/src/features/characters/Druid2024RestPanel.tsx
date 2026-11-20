/**
 * 2024 Druid rest panel: Natural Recovery (Land, short rest), terrain change (Land, long rest)
 * and replacing exactly one known Wild Shape form (long rest). Edition branch only.
 */

import { useEffect, useMemo, useState } from 'react'
import { Button, Select, Stack, Text } from '../../ui'
import { KnownFormsPicker } from './KnownFormsPicker'
import type { KnownForm } from './knownForms'
import type { FeaturePicksState } from '../../shared/dnd/featurePicks'
import { getFeaturePick, setFeaturePick } from '../../shared/dnd/featurePicks'
import {
  DRUID_SUBCLASS_SLUGS_2024,
  isCountedKnownForm2024,
  KNOWN_FORM_SWAPPED_PICK_ID_2024,
  knownFormSwapped2024,
  knownFormsBudget2024,
  LAND_TERRAIN_PICK_ID_2024,
  LAND_TERRAINS_2024,
  landTerrainNameRu2024,
  WILD_SHAPE_MIN_LEVEL_2024,
} from '../../shared/dnd/druid2024Features'

export type Druid2024RestPanelProps = {
  kind: 'short' | 'long'
  classEntryId: string
  druidLevel: number
  subclassSlug: string | null
  featurePicks: FeaturePicksState
  onFeaturePicksChange: (picks: FeaturePicksState) => void
  /** Current `class_options_2024.land_choice`, kept in sync with the terrain pick. */
  landChoice: string | null
  onLandChoiceChange: (terrain: string) => void
  knownForms: KnownForm[]
  onKnownFormsChange: (forms: KnownForm[]) => void
  naturalRecovery: { id: string; used: number; max: number } | null
  onOpenNaturalRecovery: (resourceId: string) => void
  onToast: (message: string) => void
}

function formKey(form: KnownForm): string {
  return form.bestiary_slug || form.bestiary_ref || form.id
}

export function Druid2024RestPanel({
  kind,
  classEntryId,
  druidLevel,
  subclassSlug,
  featurePicks,
  onFeaturePicksChange,
  landChoice,
  onLandChoiceChange,
  knownForms,
  onKnownFormsChange,
  naturalRecovery,
  onOpenNaturalRecovery,
  onToast,
}: Druid2024RestPanelProps) {
  const isLand = subclassSlug === DRUID_SUBCLASS_SLUGS_2024.land
  const currentTerrain = useMemo(
    () => (getFeaturePick(featurePicks, classEntryId, LAND_TERRAIN_PICK_ID_2024) ?? landChoice ?? '').toLowerCase(),
    [featurePicks, classEntryId, landChoice],
  )
  const [terrain, setTerrain] = useState(currentTerrain)
  useEffect(() => setTerrain(currentTerrain), [currentTerrain])

  const hasForms = druidLevel >= WILD_SHAPE_MIN_LEVEL_2024
  const budget = knownFormsBudget2024(druidLevel)
  const swapped = knownFormSwapped2024(featurePicks, classEntryId)
  const [draftForms, setDraftForms] = useState<KnownForm[]>(knownForms)
  const [swapOpen, setSwapOpen] = useState(false)
  useEffect(() => {
    if (!swapOpen) setDraftForms(knownForms)
  }, [knownForms, swapOpen])

  const original = knownForms.filter(isCountedKnownForm2024)
  const edited = draftForms.filter(isCountedKnownForm2024)
  const removed = original.filter((row) => !edited.some((e) => formKey(e) === formKey(row)))
  const added = edited.filter((row) => !original.some((o) => formKey(o) === formKey(row)))
  const canApplySwap = removed.length === 1 && added.length === 1

  if (kind === 'short') {
    if (!isLand || !naturalRecovery) return null
    const left = Math.max(0, naturalRecovery.max - naturalRecovery.used)
    return (
      <div data-testid="p24-druid-rest-short">
        <Stack gap={8}>
          <Text>
            <strong>Естественное восстановление</strong> · {left}/{naturalRecovery.max} (раз в долгий
            отдых). После этого короткого отдыха можно вернуть потраченные ячейки заклинаний: сумма
            уровней не больше половины уровня друида, ячейки 6+ не возвращаются.
          </Text>
          <div className="play-rest-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={left <= 0}
              onClick={() => onOpenNaturalRecovery(naturalRecovery.id)}
            >
              Естественное восстановление: выбрать ячейки
            </Button>
          </div>
        </Stack>
      </div>
    )
  }

  const showTerrain = isLand && druidLevel >= 3
  if (!showTerrain && !hasForms) return null

  return (
    <div data-testid="p24-druid-rest-long">
      <Stack gap={12}>
        {showTerrain ? (
          <Stack gap={6}>
            <Text>
              <strong>Заклинания круга (Земля)</strong>: в долгий отдых можно выбрать другую местность
              {currentTerrain ? ` · сейчас: ${landTerrainNameRu2024(currentTerrain)}` : ''}.
            </Text>
            <Select value={terrain} onChange={(event) => setTerrain(event.target.value)}>
              <option value="">Выбери местность</option>
              {LAND_TERRAINS_2024.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.nameRu}
                </option>
              ))}
            </Select>
            <div className="play-rest-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={!terrain || terrain === currentTerrain}
                onClick={() => {
                  onFeaturePicksChange(
                    setFeaturePick(featurePicks, classEntryId, LAND_TERRAIN_PICK_ID_2024, terrain),
                  )
                  onLandChoiceChange(terrain)
                  onToast(`Местность: ${landTerrainNameRu2024(terrain)}`)
                }}
              >
                Сменить местность
              </Button>
            </div>
          </Stack>
        ) : null}
        {hasForms ? (
          <Stack gap={6}>
            <Text>
              <strong>Известные облики</strong> · {original.length}/{budget}. В долгий отдых можно
              заменить ровно один.
              {swapped ? ' Замена в этот отдых уже сделана.' : ''}
            </Text>
            {!swapped && !swapOpen ? (
              <div className="play-rest-actions">
                <Button type="button" variant="secondary" onClick={() => setSwapOpen(true)}>
                  Заменить известный облик
                </Button>
              </div>
            ) : null}
            {!swapped && swapOpen ? (
              <Stack gap={8}>
                <KnownFormsPicker
                  druidLevel={druidLevel}
                  subclassSlug={subclassSlug}
                  budget={budget}
                  forms={draftForms}
                  onChange={setDraftForms}
                  replaceOne
                  onToast={onToast}
                />
                <Text tone="muted">
                  Забыто: {removed.length}/1 · выучено: {added.length}/1
                </Text>
                <div className="play-rest-actions">
                  <Button
                    type="button"
                    disabled={!canApplySwap}
                    onClick={() => {
                      onKnownFormsChange(draftForms)
                      onFeaturePicksChange(
                        setFeaturePick(
                          featurePicks,
                          classEntryId,
                          KNOWN_FORM_SWAPPED_PICK_ID_2024,
                          'on',
                        ),
                      )
                      setSwapOpen(false)
                      onToast(`Облик заменён: ${removed[0]?.name_ru} → ${added[0]?.name_ru}`)
                    }}
                  >
                    Применить замену
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setDraftForms(knownForms)
                      setSwapOpen(false)
                    }}
                  >
                    Отмена
                  </Button>
                </div>
              </Stack>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
    </div>
  )
}
