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
  type OwnedFeatEnumSnapshot,
} from '../../shared/dnd/featGrants'
import { AsiChoiceBody } from './AsiChoiceBody'
import { FeatSetupDialog, type FeatSetupResult } from './FeatSetupDialog'
import { Dialog } from '../../ui'

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
  hasMartialWeapons?: boolean
  raceSlug?: string | null
  raceParentSlug?: string | null
  size?: string | null
  characterLevel?: number
  takenFeatSlugs?: string[]
  classSlugs?: string[]
  backgroundSlug?: string | null
  ownedFeatEnums?: OwnedFeatEnumSnapshot[]
  proficientSkills?: string[]
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
  hasMartialWeapons = false,
  raceSlug = null,
  raceParentSlug = null,
  size = null,
  characterLevel = 1,
  takenFeatSlugs = [],
  classSlugs = [],
  backgroundSlug = null,
  ownedFeatEnums = [],
  proficientSkills = [],
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
        <AsiChoiceBody
          uiMode={uiMode}
          modeId={modeId}
          keys={keys}
          abilities={abilities}
          onModeId={(next) => {
            setUiMode('scores')
            setModeId(next)
            setKeys([])
            setError(null)
          }}
          onChooseFeat={() => {
            setUiMode('feat')
            setKeys([])
            setError(null)
          }}
          onToggleKey={toggleKey}
          error={error}
        />
      </Dialog>

      <FeatSetupDialog
        open={featOpen}
        edition={edition}
        title={`Черта · ${className} ${classLevel}`}
        abilities={abilities}
        armor={armor}
        hasSpellcasting={hasSpellcasting}
        hasMartialWeapons={hasMartialWeapons}
        raceSlug={raceSlug}
        raceParentSlug={raceParentSlug}
        size={size}
        characterLevel={characterLevel}
        takenSlugs={takenFeatSlugs}
        classSlugs={classSlugs}
        backgroundSlug={backgroundSlug}
        ownedFeatEnums={ownedFeatEnums}
        proficientSkills={proficientSkills}
        onClose={() => setFeatOpen(false)}
        onConfirm={confirmFeat}
      />
    </>
  )
}
