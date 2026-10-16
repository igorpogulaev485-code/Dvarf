import { useMemo, useState } from 'react'
import {
  spendHitDieFromPool,
  totalHitDiceCurrent,
  totalHitDiceMax,
} from '../../shared/dnd/classHitDice'
import {
  HIT_DIE_OPTIONS,
  applyHitDieHeal,
  clampHitDiceCurrent,
  spendHitDie,
  suggestedHitDieHeal,
  type HitDie,
} from '../../shared/dnd/hitDice'
import { applyLongRest, applyShortRest } from '../../shared/dnd/rest'
import {
  grantStockOnLongRestIfEmpty,
  type DesiredFeatureResource,
} from '../../shared/dnd/featureResources'
import { exhaustionStatusToast } from '../../shared/dnd/conditions'
import {
  Button,
  Dialog,
  Field,
  NumberInput,
  SlotPips,
  Stack,
  Text,
} from '../../ui'
import { withSyncedHitDiceSummary, type PlayState } from './play'
import { recoverGrantCastsOnRest, type SpellsState } from './spells'

type RestDialogProps = {
  open: boolean
  level: number
  hpCurrent: number | null
  hpMax: number | null
  constitutionMod: number
  play: PlayState
  spells: SpellsState
  featureDesiredResources?: DesiredFeatureResource[]
  onPlayChange: (play: PlayState) => void
  onSpellsChange: (spells: SpellsState) => void
  onCombatChange: (patch: { hpCurrent?: number | null }) => void
  onToast: (message: string) => void
  onClose: () => void
}

export function RestDialog({
  open,
  level,
  hpCurrent,
  hpMax,
  constitutionMod,
  play,
  spells,
  featureDesiredResources = [],
  onPlayChange,
  onSpellsChange,
  onCombatChange,
  onToast,
  onClose,
}: RestDialogProps) {
  const pools = play.hitDiceByClass ?? []
  const [spendPoolId, setSpendPoolId] = useState('')
  const activePool =
    pools.find((row) => row.classEntryId === spendPoolId) ??
    pools.find((row) => row.current > 0) ??
    pools[0] ??
    null
  const activeDie: HitDie | null = activePool?.die ?? play.hitDie
  const hitDiceCurrent =
    pools.length > 0 ? totalHitDiceCurrent(pools) : play.hitDiceCurrent
  const hitDiceMax =
    pools.length > 0 ? Math.max(1, totalHitDiceMax(pools)) : Math.max(1, Math.floor(level))
  const suggestedHeal =
    activeDie != null ? suggestedHitDieHeal(activeDie, constitutionMod) : null
  const [healAmount, setHealAmount] = useState<number | null>(null)

  const healValue = useMemo(() => {
    if (healAmount != null) return healAmount
    return suggestedHeal
  }, [healAmount, suggestedHeal])

  function patchPlay(partial: Partial<PlayState>) {
    onPlayChange({ ...play, ...partial })
  }

  function doShortRestResources() {
    const result = applyShortRest({
      resources: play.resources,
      pact_slots: spells.pact_slots,
    })
    patchPlay({ resources: result.resources })
    const known = recoverGrantCastsOnRest(spells.known, 'short')
    const spellsTouched =
      result.pact_slots !== undefined || known !== spells.known
    if (spellsTouched) {
      onSpellsChange({
        ...spells,
        ...(result.pact_slots !== undefined ? { pact_slots: result.pact_slots } : {}),
        known,
      })
    }
    onToast(
      spells.pact_slots
        ? 'Короткий отдых: ресурсы «короткий» + pact-ячейки восстановлены'
        : 'Сброшены ресурсы со сбросом «короткий»',
    )
  }

  function spendHitDieOnShortRest() {
    if (pools.length > 0) {
      if (!activePool || activePool.current <= 0) {
        onToast('Нужна кость хитов и хотя бы 1 доступная')
        return
      }
    } else if (!play.hitDie || play.hitDiceCurrent <= 0) {
      onToast('Нужна кость хитов и хотя бы 1 доступная')
      return
    }
    if (hpMax == null) {
      onToast('Задай максимум HP перед коротким отдыхом')
      return
    }
    const die = activeDie
    if (!die) {
      onToast('Сначала выбери кость хитов')
      return
    }
    const amount = Math.max(0, Math.floor(healValue ?? 0))
    const beforeHp = hpCurrent ?? 0
    const nextHp = applyHitDieHeal({
      hpCurrent,
      hpMax,
      healAmount: amount,
    })
    if (pools.length > 0 && activePool) {
      const nextPools = spendHitDieFromPool(pools, activePool.classEntryId)
      if (!nextPools) {
        onToast('Нет доступных костей этого класса')
        return
      }
      onPlayChange(
        withSyncedHitDiceSummary({
          ...play,
          hitDiceByClass: nextPools,
        }),
      )
      onCombatChange({ hpCurrent: nextHp })
      onToast(
        `${activePool.className} ${die}: +${amount} HP (${beforeHp} → ${nextHp}/${hpMax})`,
      )
      return
    }
    const nextDice = spendHitDie(play.hitDiceCurrent)
    patchPlay({ hitDiceCurrent: nextDice })
    onCombatChange({ hpCurrent: nextHp })
    onToast(`Кость ${die}: +${amount} HP (${beforeHp} → ${nextHp}/${hpMax})`)
  }

  function doLongRest() {
    const result = applyLongRest({
      resources: play.resources,
      slots: spells.slots,
      pact_slots: spells.pact_slots,
      exhaustion: play.exhaustion,
      hp_max: hpMax,
      hit_dice_current: hitDiceCurrent,
      hit_dice_max: hitDiceMax,
      hit_dice_by_class: pools.length > 0 ? pools : undefined,
    })
    const resources = grantStockOnLongRestIfEmpty(
      result.resources,
      featureDesiredResources,
    )
    onPlayChange(
      withSyncedHitDiceSummary({
        ...play,
        resources,
        exhaustion: result.exhaustion ?? play.exhaustion,
        hpTemp: result.hp_temp ?? 0,
        hitDiceCurrent: result.hit_dice_current ?? hitDiceCurrent,
        hitDiceByClass: result.hit_dice_by_class ?? pools,
        isDying: false,
        deathSuccesses: 0,
        deathFails: 0,
        concentration: null,
      }),
    )
    onSpellsChange({
      ...spells,
      slots: result.slots ?? spells.slots,
      pact_slots: result.pact_slots === undefined ? spells.pact_slots : result.pact_slots,
      known: recoverGrantCastsOnRest(spells.known, 'long'),
    })
    if (result.hp_current !== undefined) {
      onCombatChange({ hpCurrent: result.hp_current })
    }
    const nextExhaustion = result.exhaustion ?? play.exhaustion
    const exhaustionNote =
      nextExhaustion !== play.exhaustion
        ? ` · ${exhaustionStatusToast(nextExhaustion)}`
        : play.exhaustion > 0
          ? ' · −1 истощение'
          : ''
    onToast(
      `Продолжительный отдых: HP, кости, ячейки, ресурсы сброшены${exhaustionNote}`,
    )
    onClose()
  }

  return (
    <Dialog
      open={open}
      title="Отдых"
      size="wide"
      primaryLabel="Закрыть"
      onPrimary={onClose}
      secondaryLabel="Отмена"
      onSecondary={onClose}
    >
      <Stack gap={14}>
        <Text tone="muted">
          Короткий — кости хитов и сброс ресурсов «короткий». Продолжительный — полные HP, ячейки,
          ресурсы и −1 истощение.
        </Text>

        <div className="sheet-grid sheet-grid--2">
          {pools.length === 0 ? (
            <Field label="Кость хитов">
              <select
                className="play-select"
                value={play.hitDie ?? ''}
                onChange={(event) =>
                  patchPlay({
                    hitDie: (event.target.value || null) as HitDie | null,
                  })
                }
              >
                <option value="">не задано</option>
                {HIT_DIE_OPTIONS.map((die) => (
                  <option key={die} value={die}>
                    {die}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Потратить кость класса">
              <select
                className="play-select"
                value={activePool?.classEntryId ?? ''}
                onChange={(event) => setSpendPoolId(event.target.value)}
              >
                {pools.map((pool) => (
                  <option key={pool.classEntryId} value={pool.classEntryId}>
                    {pool.className} · {pool.die} · {pool.current}/{pool.max}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Временные HP">
            <NumberInput
              min={0}
              emptyValue={0}
              value={play.hpTemp}
              onValueChange={(value) => patchPlay({ hpTemp: Math.max(0, value ?? 0) })}
            />
          </Field>
        </div>

        <div className="play-rest-block">
          <div className="play-rest-block__head">
            <Text>
              <strong>Короткий отдых</strong>
            </Text>
            <span className="play-rest-block__count">
              кости {hitDiceCurrent}/{hitDiceMax}
              {activeDie ? ` · ${activeDie}` : ''}
            </span>
          </div>
          {pools.length > 0 ? (
            <div className="play-hit-dice">
              {pools.map((pool) => (
                <div key={pool.classEntryId} className="play-hit-dice__pool">
                  <Text>
                    <strong>
                      {pool.className} · {pool.die}
                    </strong>{' '}
                    {pool.current}/{pool.max}
                  </Text>
                  <SlotPips
                    max={Math.max(1, pool.max)}
                    used={Math.max(0, pool.max - pool.current)}
                    fillMode="available"
                    label={`Кости ${pool.className}`}
                    summary={`${pool.current} из ${pool.max}`}
                    onChange={(used) => {
                      const nextPools = pools.map((row) =>
                        row.classEntryId === pool.classEntryId
                          ? {
                              ...row,
                              current: clampHitDiceCurrent(pool.max - used, pool.max),
                            }
                          : row,
                      )
                      onPlayChange(
                        withSyncedHitDiceSummary({
                          ...play,
                          hitDiceByClass: nextPools,
                        }),
                      )
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <SlotPips
              max={Math.max(1, hitDiceMax)}
              used={Math.max(0, hitDiceMax - hitDiceCurrent)}
              fillMode="available"
              label="Доступные кости хитов"
              summary={`${hitDiceCurrent} из ${hitDiceMax}`}
              onChange={(used) =>
                patchPlay({
                  hitDiceCurrent: clampHitDiceCurrent(hitDiceMax - used, hitDiceMax),
                })
              }
            />
          )}
          <div className="play-hit-heal">
            <Field label="HP за кость">
              <NumberInput
                min={0}
                emptyValue={0}
                value={healValue}
                onValueChange={(value) => setHealAmount(value ?? 0)}
                disabled={!activeDie}
              />
            </Field>
            <div className="play-hit-heal__actions">
              <Button
                type="button"
                disabled={!activeDie || hitDiceCurrent <= 0 || hpMax == null}
                onClick={spendHitDieOnShortRest}
              >
                {activeDie && healValue != null
                  ? `Потратить кость · +${Math.max(0, Math.floor(healValue))} HP`
                  : 'Потратить кость'}
              </Button>
              <Button type="button" variant="secondary" onClick={doShortRestResources}>
                Сброс коротких ресурсов
              </Button>
            </div>
          </div>
        </div>

        <div className="play-rest-block">
          <Text>
            <strong>Продолжительный отдых</strong>
          </Text>
          <Text tone="muted">
            Полные HP, половина костей, ячейки/pact, ресурсы, −1 истощение, сброс спасбросков от
            смерти.
          </Text>
          <div className="play-rest-actions">
            <Button type="button" onClick={doLongRest}>
              Продолжительный отдых
            </Button>
          </div>
        </div>
      </Stack>
    </Dialog>
  )
}
