import { useEffect, useMemo, useState } from 'react'
import {
  FALLBACK_CONDITIONS,
  hasCondition,
  toggleCondition,
  type ConditionRef,
} from '../../shared/dnd/conditions'
import {
  HIT_DIE_OPTIONS,
  applyHitDieHeal,
  clampDeathMarks,
  clampHitDiceCurrent,
  spendHitDie,
  suggestedHitDieHeal,
  type HitDie,
} from '../../shared/dnd/hitDice'
import {
  applyLongRest,
  applyShortRest,
  type ResourceReset,
} from '../../shared/dnd/rest'
import {
  grantStockOnLongRestIfEmpty,
  isFeatureManagedResourceId,
  type DesiredFeatureResource,
} from '../../shared/dnd/featureResources'
import {
  listCatalogEntries,
  type CatalogEntry,
} from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import { Button, Field, Input, NumberInput, Panel, SlotPips, Stack, Text } from '../../ui'
import {
  RESET_LABELS,
  createResource,
  type PlayState,
} from './play'
import type { SpellsState } from './spells'

type PlayPanelProps = {
  edition: RulesEdition
  level: number
  hpCurrent: number | null
  hpMax: number | null
  constitutionMod: number
  play: PlayState
  spells: SpellsState
  /** Feature pools (Wails, soul trinkets…) — synced from class features; not edited here. */
  featureDesiredResources?: DesiredFeatureResource[]
  onPlayChange: (play: PlayState) => void
  onSpellsChange: (spells: SpellsState) => void
  onCombatChange: (patch: { hpCurrent?: number | null }) => void
  onToast: (message: string) => void
}

const RESET_OPTIONS: ResourceReset[] = ['short', 'long', 'manual']

function DeathTrack({
  label,
  value,
  tone,
  onChange,
}: {
  label: string
  value: number
  tone: 'ok' | 'bad'
  onChange: (next: number) => void
}) {
  return (
    <div className="death-track" role="group" aria-label={label}>
      <span className="death-track__label">{label}</span>
      <div className="death-track__pips">
        {Array.from({ length: 3 }, (_, index) => {
          const filled = index < value
          return (
            <button
              key={index}
              type="button"
              className={`death-pip death-pip--${tone}${filled ? ' is-filled' : ''}`}
              aria-pressed={filled}
              aria-label={`${label}: ${index + 1} из 3`}
              onClick={() => onChange(index < value ? index : index + 1)}
            />
          )
        })}
      </div>
    </div>
  )
}

export function PlayPanel({
  edition,
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
}: PlayPanelProps) {
  const [catalogConditions, setCatalogConditions] = useState<CatalogEntry[]>([])
  const hitDiceMax = Math.max(1, Math.floor(level))
  const manualResources = useMemo(
    () => play.resources.filter((row) => !isFeatureManagedResourceId(row.id)),
    [play.resources],
  )
  const featureResourceCount = play.resources.length - manualResources.length
  const suggestedHeal = play.hitDie
    ? suggestedHitDieHeal(play.hitDie, constitutionMod)
    : null
  const [healAmount, setHealAmount] = useState<number | null>(null)

  useEffect(() => {
    setHealAmount(suggestedHeal)
  }, [suggestedHeal])

  useEffect(() => {
    let active = true
    listCatalogEntries({ kind: 'condition', edition })
      .then((items) => {
        if (active) setCatalogConditions(items)
      })
      .catch(() => {
        if (active) setCatalogConditions([])
      })
    return () => {
      active = false
    }
  }, [edition])

  const conditionOptions = useMemo(() => {
    if (catalogConditions.length > 0) {
      return catalogConditions.map((entry) => ({
        slug: entry.slug,
        name: entry.name_ru,
        catalog_id: entry.id,
      }))
    }
    return FALLBACK_CONDITIONS.map((item) => ({
      slug: item.slug,
      name: item.name_ru,
      catalog_id: null as string | null,
    }))
  }, [catalogConditions])

  function patchPlay(patch: Partial<PlayState>) {
    onPlayChange({ ...play, ...patch })
  }

  function setExhaustion(next: number) {
    patchPlay({ exhaustion: next })
  }

  function toggle(ref: ConditionRef) {
    patchPlay({ conditions: toggleCondition(play.conditions, ref) })
  }

  function updateResource(id: string, patch: Partial<PlayState['resources'][number]>) {
    patchPlay({
      resources: play.resources.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    })
  }

  function addResource() {
    patchPlay({ resources: [...play.resources, createResource({ name: 'Ресурс' })] })
  }

  function removeResource(id: string) {
    patchPlay({ resources: play.resources.filter((item) => item.id !== id) })
  }

  function doShortRestResources() {
    const result = applyShortRest({ resources: play.resources })
    patchPlay({ resources: result.resources })
    onToast('Короткий отдых: сброшены ресурсы «короткий»')
  }

  function spendHitDieOnShortRest() {
    if (!play.hitDie || play.hitDiceCurrent <= 0) {
      onToast('Нужна кость хитов и хотя бы 1 доступная')
      return
    }
    if (hpMax == null) {
      onToast('Задай максимум HP перед коротким отдыхом')
      return
    }
    const amount = Math.max(0, Math.floor(healAmount ?? suggestedHeal ?? 0))
    const nextHp = applyHitDieHeal({
      hpCurrent,
      hpMax,
      healAmount: amount,
    })
    patchPlay({ hitDiceCurrent: spendHitDie(play.hitDiceCurrent) })
    onCombatChange({ hpCurrent: nextHp })
    onToast(`Короткий отдых: +${amount} HP (${play.hitDie})`)
  }

  function doLongRest() {
    const result = applyLongRest({
      resources: play.resources,
      slots: spells.slots,
      pact_slots: spells.pact_slots,
      exhaustion: play.exhaustion,
      hp_max: hpMax,
      hit_dice_current: play.hitDiceCurrent,
      hit_dice_max: hitDiceMax,
    })
    const resources = grantStockOnLongRestIfEmpty(
      result.resources,
      featureDesiredResources,
    )
    onPlayChange({
      ...play,
      resources,
      exhaustion: result.exhaustion ?? play.exhaustion,
      hpTemp: result.hp_temp ?? 0,
      hitDiceCurrent: result.hit_dice_current ?? play.hitDiceCurrent,
      isDying: false,
      deathSuccesses: 0,
      deathFails: 0,
      concentration: null,
    })
    onSpellsChange({
      ...spells,
      slots: result.slots ?? spells.slots,
      pact_slots: result.pact_slots === undefined ? spells.pact_slots : result.pact_slots,
    })
    if (result.hp_current !== undefined) {
      onCombatChange({ hpCurrent: result.hp_current })
    }
    onToast(
      'Продолжительный отдых: HP, кости, ячейки, ресурсы, −1 истощение, спасброски сброшены',
    )
  }

  return (
    <Panel title="Состояния и ресурсы">
      <Stack gap={14}>
        <div className="sheet-grid sheet-grid--2">
          <Field label="Временные HP">
            <NumberInput
              min={0}
              emptyValue={0}
              value={play.hpTemp}
              onValueChange={(value) => patchPlay({ hpTemp: Math.max(0, value ?? 0) })}
            />
          </Field>
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
        </div>

        <div className="play-rest-block">
          <Text>
            <strong>Короткий отдых</strong>
          </Text>
          <Text tone="muted">
            За короткий отдых можно потратить кости хитов (HP) и сбросить ресурсы со сбросом
            «короткий». Кости: {play.hitDiceCurrent} / {hitDiceMax}
            {play.hitDie ? ` (${play.hitDie})` : ''}.
          </Text>
          <div className="play-hit-dice">
            <SlotPips
              max={hitDiceMax}
              used={Math.max(0, hitDiceMax - play.hitDiceCurrent)}
              label="Потраченные кости хитов"
              onChange={(used) =>
                patchPlay({
                  hitDiceCurrent: clampHitDiceCurrent(hitDiceMax - used, hitDiceMax),
                })
              }
            />
            <div className="play-hit-heal">
              <Field
                label="HP за кость"
                hint={
                  play.hitDie
                    ? `Среднее ${play.hitDie} + ТЕЛ (${constitutionMod >= 0 ? '+' : ''}${constitutionMod})`
                    : 'Сначала выбери кость хитов выше'
                }
              >
                <NumberInput
                  min={0}
                  emptyValue={0}
                  value={healAmount}
                  onValueChange={(value) => setHealAmount(value ?? 0)}
                  disabled={!play.hitDie}
                />
              </Field>
              <div className="play-hit-heal__actions">
                <Button
                  type="button"
                  disabled={
                    !play.hitDie || play.hitDiceCurrent <= 0 || hpMax == null
                  }
                  onClick={spendHitDieOnShortRest}
                >
                  Потратить кость
                </Button>
                <Button type="button" variant="secondary" onClick={doShortRestResources}>
                  Сбросить короткие ресурсы
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="play-death">
          <div className="play-death__head">
            <Text>Спасброски от смерти</Text>
            <button
              type="button"
              className={`combat-chip${play.isDying ? ' is-on' : ''}`}
              aria-pressed={play.isDying}
              onClick={() =>
                patchPlay({
                  isDying: !play.isDying,
                  deathSuccesses: play.isDying ? 0 : play.deathSuccesses,
                  deathFails: play.isDying ? 0 : play.deathFails,
                })
              }
            >
              При смерти
            </button>
          </div>
          <div className={`play-death__tracks${play.isDying ? '' : ' is-dim'}`}>
            <DeathTrack
              label="Успехи"
              value={play.deathSuccesses}
              tone="ok"
              onChange={(next) =>
                patchPlay({
                  isDying: true,
                  deathSuccesses: clampDeathMarks(next),
                })
              }
            />
            <DeathTrack
              label="Провалы"
              value={play.deathFails}
              tone="bad"
              onChange={(next) =>
                patchPlay({
                  isDying: true,
                  deathFails: clampDeathMarks(next),
                })
              }
            />
          </div>
          {hpCurrent != null && hpCurrent <= 0 && !play.isDying ? (
            <Text tone="muted">HP ≤ 0 — включи «При смерти», если идёт стабилизация.</Text>
          ) : null}
        </div>

        <div>
          <Text tone="muted">Состояния — чипы вкл/выкл</Text>
          <div className="chip-row play-conditions">
            {conditionOptions.map((option) => {
              const key = option.catalog_id ?? option.slug
              const on =
                hasCondition(play.conditions, key) || hasCondition(play.conditions, option.slug)
              return (
                <button
                  key={key}
                  type="button"
                  className={`sheet-chip${on ? ' is-on' : ''}`}
                  onClick={() => toggle(option)}
                >
                  {option.name}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <Text tone="muted">Истощение 0–6 (продолжительный отдых −1)</Text>
          <div className="exhaustion-track" role="group" aria-label="Уровень истощения">
            {Array.from({ length: 7 }, (_, nextLevel) => (
              <button
                key={nextLevel}
                type="button"
                className={`exhaustion-pip${play.exhaustion === nextLevel ? ' is-on' : ''}${play.exhaustion > nextLevel ? ' is-filled' : ''}`}
                aria-pressed={play.exhaustion === nextLevel}
                aria-label={`Истощение ${nextLevel}`}
                onClick={() => setExhaustion(nextLevel)}
              >
                {nextLevel}
              </button>
            ))}
          </div>
        </div>

        <div className="play-rest-block">
          <Text>
            <strong>Продолжительный отдых</strong>
          </Text>
          <Text tone="muted">
            Полные HP, половина костей хитов, ячейки и pact, ресурсы «короткий»/«продолжительный»,
            −1 истощение, сброс спасбросков от смерти.
          </Text>
          <div className="play-rest-actions">
            <Button type="button" onClick={doLongRest}>
              Продолжительный отдых
            </Button>
          </div>
        </div>

        <Stack gap={10}>
          <div className="play-resources-head">
            <Text>Ограниченные ресурсы</Text>
            <Button type="button" onClick={addResource}>
              + ресурс
            </Button>
          </div>
          {featureResourceCount > 0 ? (
            <Text tone="muted">
              Классовые пулы ({featureResourceCount}): умения на листе (вопли, частицы души…). Сброс
              на отдыхе учитывается и здесь.
            </Text>
          ) : null}
          {manualResources.length === 0 ? (
            <Text tone="muted">
              Например: ярость, превосходство, ки — пипсы и сброс на отдыхе.
            </Text>
          ) : (
            manualResources.map((resource) => (
              <div key={resource.id} className="play-resource">
                <div className="sheet-grid sheet-grid--2">
                  <Field label="Название">
                    <Input
                      value={resource.name}
                      onChange={(event) =>
                        updateResource(resource.id, { name: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Макс">
                    <NumberInput
                      min={0}
                      max={20}
                      emptyValue={0}
                      value={resource.max}
                      onValueChange={(value) =>
                        updateResource(resource.id, {
                          max: value ?? 0,
                          used: Math.min(resource.used, value ?? 0),
                        })
                      }
                    />
                  </Field>
                </div>
                <SlotPips
                  max={resource.max}
                  used={resource.used}
                  label={`${resource.name || 'Ресурс'}: потрачено`}
                  onChange={(used) => updateResource(resource.id, { used })}
                />
                <div className="play-resource__meta">
                  <label className="play-resource__reset">
                    Сброс
                    <select
                      value={resource.reset}
                      onChange={(event) =>
                        updateResource(resource.id, {
                          reset: event.target.value as ResourceReset,
                        })
                      }
                    >
                      {RESET_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {RESET_LABELS[option]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => removeResource(resource.id)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))
          )}
        </Stack>
      </Stack>
    </Panel>
  )
}
