import { useEffect, useMemo, useState } from 'react'
import {
  FALLBACK_CONDITIONS,
  conditionKey,
  conditionMaxLevel,
  hasCondition,
  resolveConditionName,
  setConditionLevel,
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
  clampExhaustion,
} from '../../shared/dnd/rest'
import {
  grantStockOnLongRestIfEmpty,
  type DesiredFeatureResource,
} from '../../shared/dnd/featureResources'
import {
  listCatalogEntries,
  type CatalogEntry,
} from '../../shared/api/catalog'
import type { RulesEdition } from '../../shared/api/characters'
import {
  Button,
  Combobox,
  Field,
  NumberInput,
  Panel,
  SlotPips,
  Stack,
  Text,
  type ComboboxOption,
} from '../../ui'
import { type PlayState } from './play'
import { recoverGrantCastsOnRest, type SpellsState } from './spells'

type ConditionOption = {
  slug: string
  name: string
  catalog_id: string | null
  maxLevel: number | null
}

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

  const conditionOptions = useMemo((): ConditionOption[] => {
    const fromCatalog =
      catalogConditions.length > 0
        ? catalogConditions.map((entry) => ({
            slug: entry.slug,
            name: resolveConditionName({
              slug: entry.slug,
              name_ru: entry.name_ru,
              name_en: entry.name_en,
            }),
            catalog_id: entry.id,
            maxLevel: conditionMaxLevel(entry.slug),
          }))
        : []

    const bySlug = new Map<string, ConditionOption>(
      fromCatalog.map((item) => [item.slug, item]),
    )
    for (const item of FALLBACK_CONDITIONS) {
      if (!bySlug.has(item.slug)) {
        bySlug.set(item.slug, {
          slug: item.slug,
          name: item.name_ru,
          catalog_id: null,
          maxLevel: item.maxLevel ?? null,
        })
      } else {
        const existing = bySlug.get(item.slug)!
        bySlug.set(item.slug, {
          ...existing,
          name: resolveConditionName({
            slug: item.slug,
            name_ru: existing.name,
            name_en: item.name_en,
          }),
          maxLevel: existing.maxLevel ?? item.maxLevel ?? null,
        })
      }
    }
    return Array.from(bySlug.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  }, [catalogConditions])

  const [conditionQuery, setConditionQuery] = useState('')

  const activeConditions = useMemo(
    () => play.conditions.filter((item) => item.slug !== 'exhaustion'),
    [play.conditions],
  )

  const pickerOptions = useMemo((): ComboboxOption[] => {
    const q = conditionQuery.trim().toLowerCase()
    const available = conditionOptions.filter((option) => {
      if (option.slug === 'exhaustion') {
        return play.exhaustion <= 0
      }
      return !hasCondition(activeConditions, option.catalog_id ?? option.slug)
    })
    const filtered = available
      .filter((option) => !q || option.name.toLowerCase().includes(q) || option.slug.includes(q))
      .map((option) => ({ id: option.catalog_id ?? option.slug, label: option.name }))

    const custom = conditionQuery.trim()
    if (
      custom &&
      !filtered.some((option) => option.label.toLowerCase() === custom.toLowerCase()) &&
      !activeConditions.some((item) => item.name.toLowerCase() === custom.toLowerCase())
    ) {
      filtered.push({ id: `custom:${custom}`, label: custom })
    }
    return filtered
  }, [activeConditions, conditionOptions, conditionQuery, play.exhaustion])

  function patchPlay(patch: Partial<PlayState>) {
    onPlayChange({ ...play, ...patch })
  }

  function setExhaustion(next: number) {
    patchPlay({ exhaustion: clampExhaustion(next) })
  }

  function addConditionOption(option: ComboboxOption) {
    const preset = conditionOptions.find(
      (item) => (item.catalog_id ?? item.slug) === option.id || item.name === option.label,
    )
    if (preset?.slug === 'exhaustion') {
      if (play.exhaustion <= 0) setExhaustion(1)
      setConditionQuery('')
      return
    }

    const ref: ConditionRef = preset
      ? {
          slug: preset.slug,
          name: preset.name,
          catalog_id: preset.catalog_id,
          level: preset.maxLevel ? 1 : null,
        }
      : {
          slug: option.label.trim().toLowerCase().replace(/\s+/g, '-'),
          name: option.label.trim(),
          catalog_id: null,
          level: null,
        }

    patchPlay({
      conditions: toggleCondition(
        activeConditions,
        ref,
      ).filter((item) => item.slug !== 'exhaustion'),
    })
    setConditionQuery('')
  }

  function removeCondition(ref: ConditionRef) {
    patchPlay({
      conditions: activeConditions.filter((item) => conditionKey(item) !== conditionKey(ref)),
    })
  }

  function changeConditionLevel(ref: ConditionRef, level: number) {
    patchPlay({
      conditions: setConditionLevel(activeConditions, conditionKey(ref), level),
    })
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
        : 'Сброшены ресурсы со сбросом «короткий» (в текстовых блоках)',
    )
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
    const beforeHp = hpCurrent ?? 0
    const nextHp = applyHitDieHeal({
      hpCurrent,
      hpMax,
      healAmount: amount,
    })
    const nextDice = spendHitDie(play.hitDiceCurrent)
    patchPlay({ hitDiceCurrent: nextDice })
    onCombatChange({ hpCurrent: nextHp })
    onToast(
      `Кость ${play.hitDie}: +${amount} HP (${beforeHp} → ${nextHp}/${hpMax}) · кости ${nextDice}/${hitDiceMax}`,
    )
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
      known: recoverGrantCastsOnRest(spells.known, 'long'),
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
          <div className="play-rest-block__head">
            <Text>
              <strong>Короткий отдых</strong>
            </Text>
            <span className="play-rest-block__count" aria-live="polite">
              кости {play.hitDiceCurrent}/{hitDiceMax}
              {play.hitDie ? ` · ${play.hitDie}` : ''}
            </span>
          </div>
          <Text tone="muted">
            Потрать кость → получишь HP (вверху в шапке). Классовые ресурсы живут в текстовых блоках
            ниже.
          </Text>
          <div className="play-hit-dice">
            <SlotPips
              max={hitDiceMax}
              used={Math.max(0, hitDiceMax - play.hitDiceCurrent)}
              fillMode="available"
              label="Доступные кости хитов"
              summary={`${play.hitDiceCurrent} из ${hitDiceMax} осталось`}
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
                  !play.hitDie
                    ? 'Сначала выбери кость хитов выше'
                    : hpMax == null
                      ? 'Задай максимум HP в шапке листа'
                      : `Среднее ${play.hitDie} + ТЕЛ (${constitutionMod >= 0 ? '+' : ''}${constitutionMod}) · сейчас HP ${hpCurrent ?? '—'}/${hpMax}`
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
                  {play.hitDie && (healAmount ?? suggestedHeal) != null
                    ? `Потратить кость · +${Math.max(0, Math.floor(healAmount ?? suggestedHeal ?? 0))} HP`
                    : 'Потратить кость'}
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

        <div className="multi-pick">
          <Field
            label="Состояния"
            hint="Выберите активные. У истощения и опьянения — уровень на плашке. Продолжительный отдых −1 истощение."
          >
            <Combobox
              value={conditionQuery}
              options={pickerOptions}
              placeholder="Найти состояние…"
              emptyHint="Введите название и выберите из списка"
              onChange={setConditionQuery}
              onSelectOption={addConditionOption}
            />
          </Field>

          {play.exhaustion > 0 || activeConditions.length > 0 ? (
            <div className="tag-row" aria-label="Активные состояния">
              {play.exhaustion > 0 ? (
                <span className="tag-chip tag-chip--leveled">
                  <span>Истощение</span>
                  <select
                    className="tag-chip__level"
                    aria-label="Уровень истощения"
                    value={play.exhaustion}
                    onChange={(event) => setExhaustion(Number(event.target.value))}
                  >
                    {Array.from({ length: 6 }, (_, index) => index + 1).map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="tag-chip__remove"
                    title="Снять"
                    onClick={() => setExhaustion(0)}
                  >
                    ×
                  </button>
                </span>
              ) : null}

              {activeConditions.map((ref) => {
                const max = conditionMaxLevel(ref.slug)
                return (
                  <span key={conditionKey(ref)} className="tag-chip tag-chip--leveled">
                    <span>{resolveConditionName(ref)}</span>
                    {max ? (
                      <select
                        className="tag-chip__level"
                        aria-label={`Уровень: ${resolveConditionName(ref)}`}
                        value={ref.level ?? 1}
                        onChange={(event) =>
                          changeConditionLevel(ref, Number(event.target.value))
                        }
                      >
                        {Array.from({ length: max }, (_, index) => index + 1).map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <button
                      type="button"
                      className="tag-chip__remove"
                      title="Снять"
                      onClick={() => removeCondition(ref)}
                    >
                      ×
                    </button>
                  </span>
                )
              })}
            </div>
          ) : (
            <Text tone="muted" className="multi-pick__empty">
              Нет активных состояний
            </Text>
          )}
        </div>

        <div className="play-rest-block">
          <Text>
            <strong>Отдых целиком</strong>
          </Text>
          <Text tone="muted">
            Продолжительный: полные HP, половина костей, ячейки/pact, ресурсы «короткий» и
            «продолжительный», −1 истощение, сброс спасбросков. Короткий: ресурсы «короткий» и
            pact-ячейки колдуна (обычные ячейки Spellcasting — только после продолжительного).
          </Text>
          <div className="play-rest-actions">
            <Button type="button" onClick={doLongRest}>
              Продолжительный отдых
            </Button>
            <Button type="button" variant="secondary" onClick={doShortRestResources}>
              Короткий отдых
            </Button>
          </div>
          {featureDesiredResources.length > 0 ? (
            <Text tone="muted">
              Классовые пулы ({featureDesiredResources.length}) сбрасываются здесь вместе с
              отдыхом; управление — в блоке умений класса.
            </Text>
          ) : null}
        </div>
      </Stack>
    </Panel>
  )
}
