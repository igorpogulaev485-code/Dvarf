import { useEffect, useMemo, useState } from 'react'
import {
  spendHitDieFromPool,
  totalHitDiceCurrent,
  totalHitDiceMax,
} from '../../shared/dnd/classHitDice'
import {
  HIT_DIE_OPTIONS,
  applyHitDieHeal,
  clampHitDiceCurrent,
  hasBlackBloodHealing,
  rollHitDieFace,
  spendHitDie,
  suggestedHitDieHeal,
  type HitDie,
} from '../../shared/dnd/hitDice'
import {
  hitDieHealWithSong,
  stripMantleCommand,
  stripSpiritSessionSpells,
} from '../../shared/dnd/bardCollege'
import { rollDie } from './deskRolls'
import { finishWizardResourcesOnRest } from '../../shared/dnd/wizardTradition'
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
import {
  buildHitDieHealPreview,
  buildLongRestSummary,
  buildShortRestResourcesSummary,
} from './restSummary'
import type { ActiveEffect } from '../../shared/dnd/activeEffects'
import type { RestResult } from '../../shared/dnd/rest'

type RestKind = 'short' | 'long'

type ConfirmState =
  | {
      kind: 'hit-die'
      amount: number
      beforeHp: number
      nextHp: number
      die: HitDie
      songBonus: number
      blackNote: string
      songNote: string
      poolId: string | null
    }
  | {
      kind: 'short-resources'
      lines: string[]
      result: ReturnType<typeof buildShortRestResourcesSummary>['result']
    }
  | {
      kind: 'long'
      lines: string[]
      result: RestResult & {
        effects?: ActiveEffect[]
        removed_effects?: ActiveEffect[]
      }
    }

type RestDialogProps = {
  open: boolean
  level: number
  hpCurrent: number | null
  hpMax: number | null
  constitutionMod: number
  play: PlayState
  spells: SpellsState
  featureDesiredResources?: DesiredFeatureResource[]
  /** PHB Song of Rest die, when the bard feature is unlocked. */
  songOfRest?: { sides: number; label: string } | null
  /** Race slug — Verdan Black Blood Healing rerolls 1–2 on Hit Dice. */
  raceSlug?: string | null
  /** S-07 / L-08: суровый реализм — 8 часов / 7 дней. */
  grittyRest?: boolean
  /** S-07: подсветка блока после «Короткий/Долгий отдых» со стола. */
  preferKind?: 'short' | 'long' | null
  onPlayChange: (play: PlayState) => void
  onSpellsChange: (spells: SpellsState) => void
  onCombatChange: (patch: { hpCurrent?: number | null }) => void
  /** Dismiss active self_forms and reset naparnik resources after short/long rest. */
  onCompanionRest?: (kind: 'short' | 'long') => void
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
  songOfRest = null,
  raceSlug = null,
  grittyRest = false,
  preferKind = null,
  onPlayChange,
  onSpellsChange,
  onCombatChange,
  onCompanionRest,
  onToast,
  onClose,
}: RestDialogProps) {
  const blackBlood = hasBlackBloodHealing(raceSlug)
  const pools = play.hitDiceByClass ?? []
  const [spendPoolId, setSpendPoolId] = useState('')
  const [tab, setTab] = useState<RestKind>('short')
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
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
  const [songRoll, setSongRoll] = useState<number | null>(null)

  const healValue = useMemo(() => {
    if (healAmount != null) return healAmount
    return suggestedHeal
  }, [healAmount, suggestedHeal])

  useEffect(() => {
    if (!open) {
      setConfirm(null)
      return
    }
    setConfirm(null)
    setTab(preferKind === 'long' ? 'long' : 'short')
  }, [open, preferKind])

  function patchPlay(partial: Partial<PlayState>) {
    onPlayChange({ ...play, ...partial })
  }

  const hitDiePreview = useMemo(() => {
    if (blackBlood) return null
    const songBonus =
      songOfRest && songRoll != null ? Math.max(0, Math.floor(songRoll)) : 0
    const base = healValue ?? 0
    const amount = hitDieHealWithSong(base, songBonus)
    return buildHitDieHealPreview({
      hpCurrent,
      hpMax,
      healAmount: amount,
    })
  }, [blackBlood, songOfRest, songRoll, healValue, hpCurrent, hpMax])

  function requestHitDieSpend() {
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
      onToast('Задай максимум хитов перед коротким отдыхом')
      return
    }
    const die = activeDie
    if (!die) {
      onToast('Сначала выбери кость хитов')
      return
    }
    const songBonus = songOfRest
      ? Math.max(0, Math.floor(songRoll ?? rollDie(songOfRest.sides)))
      : 0
    const face = blackBlood
      ? rollHitDieFace({
          die,
          constitutionMod,
          blackBloodHealing: true,
        })
      : null
    const baseHeal = face ? face.heal : (healValue ?? 0)
    const amount = hitDieHealWithSong(baseHeal, songBonus)
    const beforeHp = hpCurrent ?? 0
    const healed = applyHitDieHeal({
      hpCurrent,
      hpMax,
      healAmount: amount,
    })
    if (healed == null) {
      onToast('Не удалось посчитать хиты')
      return
    }
    const blackNote = face?.note ? ` · ${face.note}` : ''
    const songNote = songOfRest
      ? ` · Песнь отдыха ${songOfRest.label}: +${songBonus}`
      : ''
    setConfirm({
      kind: 'hit-die',
      amount,
      beforeHp,
      nextHp: healed,
      die,
      songBonus,
      blackNote,
      songNote,
      poolId: pools.length > 0 && activePool ? activePool.classEntryId : null,
    })
  }

  function applyHitDieConfirm(state: Extract<ConfirmState, { kind: 'hit-die' }>) {
    if (state.poolId) {
      const nextPools = spendHitDieFromPool(pools, state.poolId)
      if (!nextPools) {
        onToast('Нет доступных костей этого класса')
        setConfirm(null)
        return
      }
      const pool = pools.find((row) => row.classEntryId === state.poolId)
      onPlayChange(
        withSyncedHitDiceSummary({
          ...play,
          hitDiceByClass: nextPools,
        }),
      )
      onCombatChange({ hpCurrent: state.nextHp })
      onToast(
        `${pool?.className ?? 'Класс'} ${state.die}: +${state.amount} хитов (${state.beforeHp} → ${state.nextHp}/${hpMax})${state.blackNote}${state.songNote}`,
      )
      setConfirm(null)
      return
    }
    const nextDice = spendHitDie(play.hitDiceCurrent)
    patchPlay({ hitDiceCurrent: nextDice })
    onCombatChange({ hpCurrent: state.nextHp })
    onToast(
      `Кость ${state.die}: +${state.amount} хитов (${state.beforeHp} → ${state.nextHp}/${hpMax})${state.blackNote}${state.songNote}`,
    )
    setConfirm(null)
  }

  function requestShortRestResources() {
    const { lines, result } = buildShortRestResourcesSummary({
      resources: play.resources,
      pact_slots: spells.pact_slots,
      effects: play.effects ?? [],
    })
    setConfirm({ kind: 'short-resources', lines, result })
  }

  function applyShortRestConfirm(
    state: Extract<ConfirmState, { kind: 'short-resources' }>,
  ) {
    const result = state.result
    const removed = result.removed_effects?.length ?? 0
    patchPlay({
      resources: finishWizardResourcesOnRest(result.resources, 'short'),
      ...(result.effects ? { effects: result.effects } : {}),
    })
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
    onCompanionRest?.('short')
    onToast(
      spells.pact_slots
        ? `Короткий отдых: ресурсы «короткий» + ячейки договора восстановлены${
            removed ? ` · снято эффектов: ${removed}` : ''
          }`
        : `Сброшены ресурсы со сбросом «короткий»${
            removed ? ` · снято эффектов: ${removed}` : ''
          }`,
    )
    setConfirm(null)
  }

  function requestLongRest() {
    const { lines, result } = buildLongRestSummary({
      resources: play.resources,
      slots: spells.slots,
      pact_slots: spells.pact_slots,
      exhaustion: play.exhaustion,
      hp_current: hpCurrent,
      hp_max: hpMax,
      hp_temp: play.hpTemp,
      hit_dice_current: hitDiceCurrent,
      hit_dice_max: hitDiceMax,
      hit_dice_by_class: pools.length > 0 ? pools : undefined,
      effects: play.effects ?? [],
    })
    setConfirm({ kind: 'long', lines, result })
  }

  function applyLongRestConfirm(state: Extract<ConfirmState, { kind: 'long' }>) {
    const result = state.result
    const resources = finishWizardResourcesOnRest(
      grantStockOnLongRestIfEmpty(result.resources, featureDesiredResources),
      'long',
    )
    const removed = result.removed_effects?.length ?? 0
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
        effects: result.effects ?? play.effects ?? [],
      }),
    )
    if (removed) {
      onToast(`Снято эффектов отдыхом: ${removed}`)
    }
    onSpellsChange({
      ...spells,
      slots: result.slots ?? spells.slots,
      pact_slots: result.pact_slots === undefined ? spells.pact_slots : result.pact_slots,
      known: stripMantleCommand(
        stripSpiritSessionSpells(recoverGrantCastsOnRest(spells.known, 'long')),
      ),
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
    onCompanionRest?.('long')
    const rechargeNote = result.rechargeLines?.length
      ? ` · ${result.rechargeLines.join(' · ')}`
      : ''
    onToast(
      `Продолжительный отдых: хиты, кости, ячейки, ресурсы сброшены${exhaustionNote}${rechargeNote}`,
    )
    setConfirm(null)
    onClose()
  }

  function applyConfirm() {
    if (!confirm) return
    if (confirm.kind === 'hit-die') applyHitDieConfirm(confirm)
    else if (confirm.kind === 'short-resources') applyShortRestConfirm(confirm)
    else applyLongRestConfirm(confirm)
  }

  const confirmTitle =
    confirm?.kind === 'hit-die'
      ? 'Потратить кость хитов?'
      : confirm?.kind === 'short-resources'
        ? 'Сброс коротких ресурсов'
        : confirm?.kind === 'long'
          ? grittyRest
            ? 'Продолжительный отдых (7 дней)'
            : 'Продолжительный отдых'
          : ''

  const confirmLines =
    confirm?.kind === 'hit-die'
      ? [
          `Хиты ${confirm.beforeHp} → ${confirm.nextHp}${hpMax != null ? `/${hpMax}` : ''}`,
          `+${confirm.amount} хитов · кость ${confirm.die}`,
          ...(confirm.songNote ? [confirm.songNote.replace(/^ · /, '')] : []),
          ...(confirm.blackNote ? [confirm.blackNote.replace(/^ · /, '')] : []),
        ]
      : confirm?.kind === 'short-resources' || confirm?.kind === 'long'
        ? confirm.lines
        : []

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
          {grittyRest
            ? 'Суровый реализм: короткий отдых — 8 часов, долгий — 7 дней. Восстановление хитов и ячеек — как обычно.'
            : 'Короткий — кости хитов и сброс ресурсов «короткий». Продолжительный — полные хиты, ячейки, ресурсы и −1 истощение.'}
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
          <Field label="Временные хиты">
            <NumberInput
              min={0}
              emptyValue={0}
              value={play.hpTemp}
              onValueChange={(value) => patchPlay({ hpTemp: Math.max(0, value ?? 0) })}
            />
          </Field>
        </div>

        {confirm ? (
          <div className="play-rest-summary" role="region" aria-label="Сводка отдыха">
            <Text>
              <strong>{confirmTitle}</strong>
            </Text>
            <ul className="play-rest-summary__list">
              {confirmLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <div className="play-rest-actions">
              <Button type="button" variant="secondary" onClick={() => setConfirm(null)}>
                Назад
              </Button>
              <Button type="button" onClick={applyConfirm}>
                Применить
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="play-rest-tabs" role="tablist" aria-label="Вид отдыха">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'short'}
                className={`play-rest-tabs__btn${tab === 'short' ? ' is-on' : ''}`}
                onClick={() => setTab('short')}
              >
                {grittyRest ? 'Короткий (8 ч)' : 'Короткий'}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'long'}
                className={`play-rest-tabs__btn${tab === 'long' ? ' is-on' : ''}`}
                onClick={() => setTab('long')}
              >
                {grittyRest ? 'Продолжительный (7 дн.)' : 'Продолжительный'}
              </button>
            </div>

            {tab === 'short' ? (
              <div
                className={`play-rest-block${preferKind === 'short' ? ' is-focus' : ''}`}
                data-rest-kind="short"
                role="tabpanel"
              >
                <div className="play-rest-block__head">
                  <Text>
                    <strong>
                      {grittyRest ? 'Короткий отдых (8 часов)' : 'Короткий отдых'}
                    </strong>
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
                  {blackBlood ? (
                    <Text tone="muted">
                      Чёрная кровь (вердан): при трате кости хитов выпадение 1 или 2
                      перебрасывается автоматически — результат в сводке перед применением.
                    </Text>
                  ) : null}
                  <Field
                    label={
                      blackBlood ? 'Хиты за кость (бросок)' : 'Хиты за кость'
                    }
                  >
                    <NumberInput
                      min={0}
                      emptyValue={0}
                      value={healValue}
                      onValueChange={(value) => setHealAmount(value ?? 0)}
                      disabled={!activeDie || blackBlood}
                    />
                  </Field>
                  {songOfRest ? (
                    <Field label={`Песнь отдыха ${songOfRest.label}`}>
                      <NumberInput
                        min={1}
                        max={songOfRest.sides}
                        emptyValue={0}
                        value={songRoll}
                        onValueChange={(value) => setSongRoll(value)}
                      />
                    </Field>
                  ) : null}
                  {hitDiePreview && activeDie && hitDiceCurrent > 0 && hpMax != null ? (
                    <p className="play-rest-preview" aria-live="polite">
                      {hitDiePreview.line}
                      {spells.pact_slots && spells.pact_slots.max > 0
                        ? ' · ячейки договора восстановятся при сбросе коротких ресурсов'
                        : ''}
                    </p>
                  ) : null}
                  <div className="play-hit-heal__actions">
                    <Button
                      type="button"
                      disabled={!activeDie || hitDiceCurrent <= 0 || hpMax == null}
                      onClick={requestHitDieSpend}
                    >
                      {activeDie && healValue != null
                        ? `Потратить кость · +${Math.max(0, Math.floor(healValue))} хитов`
                        : 'Потратить кость'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={requestShortRestResources}>
                      Сброс коротких ресурсов
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`play-rest-block${preferKind === 'long' ? ' is-focus' : ''}`}
                data-rest-kind="long"
                role="tabpanel"
              >
                <Text>
                  <strong>
                    {grittyRest
                      ? 'Продолжительный отдых (7 дней)'
                      : 'Продолжительный отдых'}
                  </strong>
                </Text>
                <Text tone="muted">
                  Полные хиты, половина костей, ячейки и ячейки договора, ресурсы, −1 истощение,
                  сброс спасбросков от смерти
                  {grittyRest ? ' · суровый реализм: 7 дней' : ''}. Перед применением — сводка
                  изменений.
                </Text>
                <div className="play-rest-actions">
                  <Button type="button" onClick={requestLongRest}>
                    Сводка и применение…
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Stack>
    </Dialog>
  )
}
