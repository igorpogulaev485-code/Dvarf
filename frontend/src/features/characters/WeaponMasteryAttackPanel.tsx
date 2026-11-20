/**
 * P24-M01: кнопки мастерства оружия после атаки (лист / стол 2024).
 * Паттерн: sheet-chip + лента как у GrappleShove / O-пачек.
 */
import { useMemo, useState } from 'react'
import { Text } from '../../ui'
import {
  TACTICAL_MASTER_OPTIONS,
  applyMasteryProperty,
  hasTacticalMaster,
  masteryPropertyById,
  masteryPropertyNameRu,
  resolveEffectiveMasteryProperty,
  srdWeaponMasteryBySlug,
  type WeaponMasteryId,
  type WeaponMasteryState,
} from '../../shared/dnd/weaponMastery'
import type { ClassLevelEntry } from './classLevels'
import { postSheetRollToSession } from './postSheetRollToSession'

export type WeaponMasteryAttackPanelProps = {
  rulesEdition: string | null | undefined
  classes: ClassLevelEntry[]
  masteryState: WeaponMasteryState
  weaponSlug: string | null | undefined
  weaponName: string
  hit: boolean
  damageDealt: boolean
  attackAbilityMod: number
  proficiencyBonus: number
  damageType?: string | null
  targetName?: string | null
  openSessionId?: string | null
  characterId?: string | null
  nickUsedThisTurn: boolean
  cleaveUsedThisTurn: boolean
  onNickUsed: () => void
  onCleaveUsed: () => void
  onApplyCondition?: (condition: string) => void
  onToast?: (message: string) => void
  onFeedLine?: (line: string) => void
}

export function WeaponMasteryAttackPanel({
  rulesEdition,
  classes,
  masteryState,
  weaponSlug,
  weaponName,
  hit,
  damageDealt,
  attackAbilityMod,
  proficiencyBonus,
  damageType,
  targetName,
  openSessionId,
  characterId,
  nickUsedThisTurn,
  cleaveUsedThisTurn,
  onNickUsed,
  onCleaveUsed,
  onApplyCondition,
  onToast,
  onFeedLine,
}: WeaponMasteryAttackPanelProps) {
  const [substitute, setSubstitute] = useState<WeaponMasteryId | null>(null)
  const [appliedId, setAppliedId] = useState<string | null>(null)
  // Graze needs a miss; desk often mounts the panel before a roll outcome is known.
  const [outcomeHit, setOutcomeHit] = useState(hit)
  const [outcomeDamage, setOutcomeDamage] = useState(damageDealt)

  const tactical = hasTacticalMaster(classes)
  const catalog = srdWeaponMasteryBySlug(weaponSlug)
  const propertyId = useMemo(
    () =>
      resolveEffectiveMasteryProperty({
        weaponSlug: weaponSlug || '',
        known: masteryState.known,
        weaponMastery: catalog?.mastery ?? null,
        tacticalMaster: tactical,
        substitute,
      }),
    [weaponSlug, masteryState.known, catalog?.mastery, tactical, substitute],
  )

  if (String(rulesEdition || '') !== '2024') return null
  if (!propertyId) return null

  const card = masteryPropertyById(propertyId)
  if (!card) return null

  async function apply() {
    const result = applyMasteryProperty(propertyId!, {
      hit: outcomeHit,
      damageDealt: outcomeDamage,
      attackAbilityMod,
      proficiencyBonus,
      damageType,
      nickAlreadyUsed: nickUsedThisTurn,
      cleaveAlreadyUsed: cleaveUsedThisTurn,
    })
    if (!result.applied) {
      onToast?.(result.feedLineRu)
      return
    }
    setAppliedId(propertyId!)
    if (propertyId === 'nick') onNickUsed()
    if (propertyId === 'cleave') onCleaveUsed()
    if (result.effects.condition_on_fail === 'prone') {
      // Topple: UI asks to confirm save fail; for desk we apply prone when chosen.
      onApplyCondition?.('prone')
    }
    const line = `${weaponName}: ${result.feedLineRu}${targetName ? ` → ${targetName}` : ''}`
    onFeedLine?.(line)
    onToast?.(line)
    if (openSessionId && characterId) {
      void postSheetRollToSession({
        openSessionId,
        characterId,
        title: `Мастерство · ${result.nameRu}`,
        total: 0,
        breakdown: line,
        targetName: targetName ?? undefined,
      })
    }
  }

  return (
    <div className="sheet-section" data-testid="weapon-mastery-attack">
      <Text tone="muted">
        Мастерство: <strong>{masteryPropertyNameRu(propertyId)}</strong>
        {substitute ? ` (Тактический мастер → ${masteryPropertyNameRu(substitute)})` : ''}
      </Text>
      {tactical ? (
        <div className="sheet-chip-row" data-testid="weapon-mastery-tactical">
          <button
            type="button"
            className={`sheet-chip${!substitute ? ' is-on' : ''}`}
            onClick={() => setSubstitute(null)}
          >
            {masteryPropertyNameRu(catalog?.mastery)}
          </button>
          {TACTICAL_MASTER_OPTIONS.map((id) => (
            <button
              key={id}
              type="button"
              className={`sheet-chip${substitute === id ? ' is-on' : ''}`}
              onClick={() => setSubstitute(id)}
            >
              {masteryPropertyNameRu(id)}
            </button>
          ))}
        </div>
      ) : null}
      <div className="sheet-chip-row" data-testid="weapon-mastery-outcome">
        <button
          type="button"
          className={`sheet-chip${outcomeHit ? ' is-on' : ''}`}
          data-testid="weapon-mastery-outcome-hit"
          onClick={() => {
            setOutcomeHit(true)
            setOutcomeDamage(true)
          }}
        >
          Попадание
        </button>
        <button
          type="button"
          className={`sheet-chip${!outcomeHit ? ' is-on' : ''}`}
          data-testid="weapon-mastery-outcome-miss"
          onClick={() => {
            setOutcomeHit(false)
            setOutcomeDamage(false)
          }}
        >
          Промах
        </button>
      </div>
      <div className="sheet-chip-row">
        <button
          type="button"
          className={`sheet-chip${appliedId === propertyId ? ' is-on' : ''}`}
          data-testid="weapon-mastery-apply"
          onClick={() => void apply()}
        >
          Применить · {masteryPropertyNameRu(propertyId)}
        </button>
      </div>
      {card.summary_ru ? (
        <div data-testid="weapon-mastery-summary">
          <Text tone="muted">{card.summary_ru}</Text>
        </div>
      ) : null}
    </div>
  )
}
