/**
 * P24-M02a+: опции при атаке / канале / ярости / метамагии на столе 2024.
 */
import { useMemo, useState } from 'react'
import { Text } from '../../ui'
import {
  BRUTAL_STRIKE_2024,
  CUNNING_STRIKE_2024,
  METAMAGIC_2024,
  applyMetamagicSpend2024,
  parseSneakAttackDice,
  resolveBrutalStrike2024,
  resolveCunningStrike2024,
  resolveDivineSenseChannel2024,
  resolveRageExtend2024,
  type ClassOptions2024State,
} from '../../shared/dnd/edition2024ClassOptions'
import { normalizeClassSlug2024 } from '../../shared/dnd/edition2024Classes'
import type { ClassLevelEntry } from './classLevels'
import { postSheetRollToSession } from './postSheetRollToSession'

export type ClassOptions2024CombatPanelProps = {
  rulesEdition: string | null | undefined
  classes: ClassLevelEntry[]
  options: ClassOptions2024State
  onOptionsChange: (next: ClassOptions2024State) => void
  /** Sneak attack scale e.g. "3d6" from class_progress scales. */
  sneakAttackScale?: string | null
  dexMod?: number
  proficiencyBonus?: number
  hasPoisonersKit?: boolean
  channelRemaining?: number
  onSpendChannel?: (n: number) => void
  sorceryPointsMax?: number
  sorceryPointsUsed?: number
  onSpendSorcery?: (newUsed: number) => void
  openSessionId?: string | null
  characterId?: string | null
  onToast?: (message: string) => void
  onFeedLine?: (line: string) => void
}

function levelOf(classes: ClassLevelEntry[], slug: string): number {
  return classes.reduce((sum, row) => {
    const s = normalizeClassSlug2024(row.catalog_id || row.name)
    return s === slug ? sum + Math.max(0, row.level || 0) : sum
  }, 0)
}

export function ClassOptions2024CombatPanel({
  rulesEdition,
  classes,
  options,
  onOptionsChange,
  sneakAttackScale,
  dexMod = 0,
  proficiencyBonus = 2,
  hasPoisonersKit = false,
  channelRemaining = 0,
  onSpendChannel,
  sorceryPointsMax = 0,
  sorceryPointsUsed = 0,
  onSpendSorcery,
  openSessionId,
  characterId,
  onToast,
  onFeedLine,
}: ClassOptions2024CombatPanelProps) {
  const [cunningPick, setCunningPick] = useState<string[]>([])
  const [brutalPick, setBrutalPick] = useState<string[]>([])
  const [reckless, setReckless] = useState(false)
  const [hasAdv, setHasAdv] = useState(true)

  if (String(rulesEdition || '') !== '2024') return null

  const rogueLv = levelOf(classes, 'rogue')
  const barbLv = levelOf(classes, 'barbarian')
  const paladinLv = levelOf(classes, 'paladin')
  const sorcererLv = levelOf(classes, 'sorcerer')

  const sneakDice = useMemo(
    () => parseSneakAttackDice(sneakAttackScale || (rogueLv >= 5 ? `${Math.ceil(rogueLv / 2)}d6` : '0')),
    [sneakAttackScale, rogueLv],
  )

  async function announce(title: string, line: string) {
    onFeedLine?.(line)
    onToast?.(line)
    if (openSessionId && characterId) {
      void postSheetRollToSession({
        openSessionId,
        characterId,
        title,
        total: 0,
        breakdown: line,
      })
    }
  }

  function togglePick(list: string[], id: string, max: number): string[] {
    if (list.includes(id)) return list.filter((x) => x !== id)
    if (list.length >= max) return list
    return [...list, id]
  }

  const show =
    rogueLv >= 5 ||
    barbLv >= 1 ||
    (paladinLv >= 3 && channelRemaining >= 0) ||
    (sorcererLv >= 2 && options.metamagic.length > 0)
  if (!show) return null

  return (
    <div className="feature-resource" data-testid="class-options-2024-combat">
      {rogueLv >= 5 ? (
        <div data-testid="cunning-strike-panel">
          <Text as="h3">Хитрый удар ({sneakDice}d6)</Text>
          <div className="sheet-chip-row">
            {CUNNING_STRIKE_2024.filter((r) => r.minLevel <= rogueLv).map((row) => (
              <button
                key={row.id}
                type="button"
                className={`sheet-chip${cunningPick.includes(row.id) ? ' is-on' : ''}`}
                title={row.summaryRu}
                onClick={() =>
                  setCunningPick(
                    togglePick(cunningPick, row.id, rogueLv >= 11 ? 2 : 1),
                  )
                }
              >
                {row.nameRu} ·{row.costDice}d6
              </button>
            ))}
          </div>
          <button
            type="button"
            className="sheet-chip"
            disabled={!cunningPick.length}
            onClick={() => {
              const result = resolveCunningStrike2024({
                optionIds: cunningPick,
                rogueLevel: rogueLv,
                sneakAttackDice: sneakDice,
                dexMod,
                proficiencyBonus,
                hasPoisonersKit,
              })
              if (!result.ok) {
                onToast?.(result.reasonRu)
                return
              }
              void announce('Хитрый удар', result.feedLineRu)
            }}
          >
            Применить
          </button>
        </div>
      ) : null}

      {barbLv >= 1 ? (
        <div data-testid="rage-brutal-panel">
          <Text as="h3">Ярость / Жестокий удар</Text>
          <div className="sheet-chip-row">
            <button
              type="button"
              className={`sheet-chip${options.rage.active ? ' is-on' : ''}`}
              onClick={() => {
                if (options.rage.active) {
                  onOptionsChange({
                    ...options,
                    rage: { ...options.rage, active: false, rounds_extended: 0 },
                  })
                  void announce('Ярость', 'Ярость окончена')
                  return
                }
                const next = {
                  ...options,
                  rage: { active: true, rounds_extended: 0, max_minutes: 10 },
                }
                onOptionsChange(next)
                void announce(
                  'Ярость',
                  'Ярость начата (до конца следующего хода; продление атакой/спасом/бонусным)',
                )
              }}
            >
              {options.rage.active ? 'Завершить ярость' : 'Начать ярость'}
            </button>
            {options.rage.active ? (
              <>
                <button
                  type="button"
                  className="sheet-chip"
                  onClick={() => {
                    const result = resolveRageExtend2024({
                      active: options.rage.active,
                      roundsExtended: options.rage.rounds_extended,
                      reason: 'attack',
                    })
                    if (!result.ok) {
                      onToast?.(result.reasonRu)
                      return
                    }
                    onOptionsChange({
                      ...options,
                      rage: {
                        ...options.rage,
                        rounds_extended: result.roundsExtended,
                      },
                    })
                    void announce('Ярость', result.feedLineRu)
                  }}
                >
                  Продлить (атака)
                </button>
                <button
                  type="button"
                  className="sheet-chip"
                  onClick={() => {
                    const result = resolveRageExtend2024({
                      active: options.rage.active,
                      roundsExtended: options.rage.rounds_extended,
                      reason: 'bonus',
                    })
                    if (!result.ok) {
                      onToast?.(result.reasonRu)
                      return
                    }
                    onOptionsChange({
                      ...options,
                      rage: {
                        ...options.rage,
                        rounds_extended: result.roundsExtended,
                      },
                    })
                    void announce('Ярость', result.feedLineRu)
                  }}
                >
                  Продлить (бонусное)
                </button>
              </>
            ) : null}
          </div>

          {barbLv >= 9 ? (
            <>
              <label className="sheet-chip-row">
                <button
                  type="button"
                  className={`sheet-chip${reckless ? ' is-on' : ''}`}
                  onClick={() => setReckless((v) => !v)}
                >
                  Безрассудная атака
                </button>
                <button
                  type="button"
                  className={`sheet-chip${hasAdv ? ' is-on' : ''}`}
                  onClick={() => setHasAdv((v) => !v)}
                >
                  Есть преимущество (откажусь)
                </button>
              </label>
              <div className="sheet-chip-row">
                {BRUTAL_STRIKE_2024.filter((r) => r.minLevel <= barbLv).map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className={`sheet-chip${brutalPick.includes(row.id) ? ' is-on' : ''}`}
                    title={row.summaryRu}
                    onClick={() =>
                      setBrutalPick(
                        togglePick(brutalPick, row.id, barbLv >= 17 ? 2 : 1),
                      )
                    }
                  >
                    {row.nameRu}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="sheet-chip"
                disabled={!brutalPick.length}
                onClick={() => {
                  const result = resolveBrutalStrike2024({
                    optionIds: brutalPick,
                    barbarianLevel: barbLv,
                    recklessUsed: reckless,
                    attackHasAdvantage: hasAdv,
                    attackHasDisadvantage: false,
                  })
                  if (!result.ok) {
                    onToast?.(result.reasonRu)
                    return
                  }
                  void announce('Жестокий удар', result.feedLineRu)
                }}
              >
                Жестокий удар
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {paladinLv >= 3 ? (
        <div data-testid="divine-sense-panel" data-feature-id="divine-sense">
          <Text as="h3">Проведение · Божественное чувство</Text>
          <button
            type="button"
            className="sheet-chip"
            data-feature-id="divine-sense"
            onClick={() => {
              const result = resolveDivineSenseChannel2024(channelRemaining)
              if (!result.ok) {
                onToast?.(result.reasonRu)
                return
              }
              onSpendChannel?.(result.spendChannel)
              void announce('Божественное чувство', result.feedLineRu)
            }}
          >
            Божественное чувство (−1 Проведение)
          </button>
        </div>
      ) : null}

      {sorcererLv >= 2 && options.metamagic.length > 0 ? (
        <div data-testid="metamagic-spend-panel">
          <Text as="h3">
            Метамагия ({Math.max(0, sorceryPointsMax - sorceryPointsUsed)} очк.)
          </Text>
          <div className="sheet-chip-row">
            {METAMAGIC_2024.filter((r) => options.metamagic.includes(r.id)).map((row) => (
              <button
                key={row.id}
                type="button"
                className="sheet-chip"
                title={row.summaryRu}
                onClick={() => {
                  const result = applyMetamagicSpend2024({
                    known: options.metamagic,
                    optionId: row.id,
                    sorceryPointsMax,
                    sorceryPointsUsed,
                  })
                  if (!result.ok) {
                    onToast?.(result.reasonRu)
                    return
                  }
                  onSpendSorcery?.(result.newUsed)
                  void announce('Метамагия', result.feedLineRu)
                }}
              >
                {row.nameRu} ·{row.cost}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
