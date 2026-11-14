import { Link } from 'react-router-dom'
import type {
  SeatCompanion,
  SeatCondition,
  SeatEffect,
  SessionSeat,
} from '../../shared/api/lobbies'
import { Button, Text } from '../../ui'
import { TypedDamageForm, type TypedDamagePayload } from './TypedDamageForm'
import {
  bandFromRatio,
  hpBand,
  hpLabelHero,
  hpRatio,
  type HpBand,
} from './sessionHpBand'
import {
  normalizeVisibilityProfile,
  type VisibilityProfile,
} from './visibilityProfile'
import { TurnEconomyChips } from '../characters/TurnEconomyChips'
import {
  emptyTurnEconomy,
  type TurnEconomyMarkKey,
  type TurnEconomyState,
} from '../../shared/dnd/turnEconomy'

type Props = {
  seat: SessionSeat
  visibility: VisibilityProfile
  sheetLabel?: string
  /** Мастер / владелец видит полные числа даже если игрокам скрыто */
  revealAll?: boolean
  /** Жесты за столом: вдохновение, снятие тега, напарник */
  masterControls?: boolean
  /** Хозяин героя (тратит вдохновение, правит свои спасброски) */
  isOwner?: boolean
  busy?: boolean
  onToggleInspiration?: (next: boolean) => void
  onSpendInspiration?: () => void
  /** Мастер: начислить или снять благочестие (MOT) */
  onAwardPiety?: () => void
  /** Снять состояние с этого персонажа (тап по тегу) */
  onRemoveCondition?: (condition: SeatCondition) => void
  onRemoveEffect?: (effect: SeatEffect) => void
  onClearConcentration?: () => void
  onAddCompanion?: () => void
  onRemoveCompanion?: (companionId: string) => void
  /** C-02: master (or owner) patches companion HP / death saves at the table. */
  onPatchCompanion?: (
    companionId: string,
    patch: {
      hp_current?: number | null
      death_successes?: number | null
      death_fails?: number | null
    },
  ) => void
  onDamage?: (payload: TypedDamagePayload) => void
  onDeathSavesChange?: (successes: number, fails: number) => void
  /** S-02: подсветка «Твой ход» */
  yourTurn?: boolean
  /** T-01 / L-21: чипы экономики хода на карточке */
  showTurnEconomyStub?: boolean
  turnEconomy?: TurnEconomyState | null
  onToggleTurnMark?: (mark: TurnEconomyMarkKey) => void
  onToggleMoved?: () => void
  /** L-21: мастер снимает любые отметки; игрок — только свои незаблокированные */
  turnEconomyAsGm?: boolean
  /** L-21: метка «врасплох» с entry боя */
  surprised?: boolean
  /** S-05: подпись стороны (ведущему — истина) */
  sideLabelText?: string | null
  sideHidden?: boolean
  onSideClick?: () => void
  /** LV-01 P12: «Эффект» на своей карточке у игрока */
  onApplyEffect?: () => void
}

function CompanionCard({
  companion,
  masterControls,
  busy,
  onRemove,
  onPatch,
}: {
  companion: SeatCompanion
  masterControls?: boolean
  busy?: boolean
  onRemove?: () => void
  onPatch?: (patch: {
    hp_current?: number | null
    death_successes?: number | null
    death_fails?: number | null
  }) => void
}) {
  const tone = hpBand(companion.hp_current, companion.hp_max)
  const ratio = hpRatio(companion.hp_current, companion.hp_max)
  const hp =
    companion.hp_max != null
      ? `HP ${companion.hp_current ?? 0}/${companion.hp_max}`
      : 'HP —'
  const ac = companion.ac != null ? `КД ${companion.ac}` : null
  const typeBit = companion.type?.trim() || null
  const durationBit = companion.duration?.trim() || null
  const initBit =
    companion.initiative_mode === 'with_master'
      ? 'ход хозяина'
      : companion.initiative_mode === 'own_initiative'
        ? 'своя иниц.'
        : null
  const costBit =
    companion.command_cost === 'action'
      ? 'команда · действие'
      : companion.command_cost === 'bonus'
        ? 'команда · бонусное'
        : companion.command_cost === 'none'
          ? 'команда бесплатно'
          : companion.command_cost === 'reaction'
            ? 'команда · реакция'
            : null
  const attackBit = companion.attack_damage
    ? (() => {
        const bonus = companion.attack_bonus ?? 0
        const sign = bonus >= 0 ? `+${bonus}` : String(bonus)
        const dtype = companion.attack_damage_type?.trim()
        const range =
          companion.attack_range_kind === 'ranged'
            ? 'дальн.'
            : companion.attack_range_kind === 'reach'
              ? 'досяг.'
              : companion.attack_range_kind === 'thrown'
                ? 'метат.'
                : null
        return [sign, companion.attack_damage, dtype, range].filter(Boolean).join(' ')
      })()
    : null
  const showDeath =
    companion.story ||
    (companion.death_successes != null && companion.death_fails != null) ||
    ((companion.hp_current ?? 1) <= 0 && companion.story)

  return (
    <article className={`session-companion-card session-companion-card--${tone}`}>
      <div
        className={`session-hp-bar session-hp-bar--${tone}`}
        style={{ ['--hp-ratio' as string]: String(ratio) }}
        aria-hidden
      />
      <div className="session-companion-card__row">
        <div className="session-companion-card__main">
          <Text as="h4" className="session-companion-card__name">
            {companion.name}
            <span className="session-companion-card__tag">
              {companion.story
                ? 'сюжетный'
                : typeBit || 'напарник'}
            </span>
            {companion.dodge ? (
              <span className="session-companion-card__tag">Уклонение</span>
            ) : null}
            {companion.active === false ? (
              <span className="session-companion-card__tag">
                {(companion.hp_current ?? 1) <= 0 ? 'пал' : 'не призван'}
              </span>
            ) : null}
          </Text>
          <Text tone="muted" className="session-companion-card__stat">
            {hp}
            {ac ? ` · ${ac}` : ''}
            {durationBit ? ` · ${durationBit}` : ''}
          </Text>
          {initBit || costBit ? (
            <Text tone="muted" className="session-companion-card__stat">
              {[initBit, costBit].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
          {attackBit ? (
            <Text tone="muted" className="session-companion-card__stat">
              Атака {attackBit}
            </Text>
          ) : null}
          {showDeath ? (
            <DeathSavePips
              successes={companion.death_successes ?? 0}
              fails={companion.death_fails ?? 0}
              editable={Boolean(masterControls && onPatch)}
              busy={busy}
              onChange={(successes, fails) =>
                onPatch?.({ death_successes: successes, death_fails: fails })
              }
            />
          ) : null}
          {masterControls && onPatch ? (
            <div className="session-companion-card__hp-edit">
              <label>
                ХП
                <input
                  className="ui-input"
                  type="number"
                  min={0}
                  max={9999}
                  disabled={busy}
                  defaultValue={companion.hp_current ?? 0}
                  onBlur={(e) => {
                    const next = Number(e.target.value)
                    if (!Number.isFinite(next)) return
                    if (next === (companion.hp_current ?? 0)) return
                    onPatch({ hp_current: Math.max(0, Math.floor(next)) })
                  }}
                />
              </label>
            </div>
          ) : null}
          {companion.conditions.length > 0 ? (
            <div className="session-table-card__conditions">
              {companion.conditions.map((c) => (
                <span key={c.slug} className="session-condition-tag">
                  {c.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {masterControls && onRemove ? (
          <button
            type="button"
            className="session-companion-card__remove"
            disabled={busy}
            aria-label={`Убрать ${companion.name}`}
            onClick={onRemove}
          >
            ×
          </button>
        ) : null}
      </div>
    </article>
  )
}

function DeathSavePips({
  successes,
  fails,
  editable,
  busy,
  onChange,
}: {
  successes: number
  fails: number
  editable: boolean
  busy?: boolean
  onChange?: (successes: number, fails: number) => void
}) {
  function cycle(kind: 'ok' | 'fail', current: number) {
    if (!editable || !onChange) return
    const next = current >= 3 ? 0 : current + 1
    if (kind === 'ok') onChange(next, fails)
    else onChange(successes, next)
  }
  return (
    <div className="session-death-saves" aria-label="Спасброски от смерти">
      <div className="session-death-saves__row">
        <span className="session-death-saves__label">Успехи</span>
        {[0, 1, 2].map((i) => (
          <button
            key={`ok-${i}`}
            type="button"
            className={`session-death-pip${successes > i ? ' is-on' : ''}`}
            disabled={busy || !editable}
            aria-label={`Успех ${i + 1}`}
            onClick={() => cycle('ok', successes)}
          />
        ))}
      </div>
      <div className="session-death-saves__row">
        <span className="session-death-saves__label">Провалы</span>
        {[0, 1, 2].map((i) => (
          <button
            key={`fail-${i}`}
            type="button"
            className={`session-death-pip is-fail${fails > i ? ' is-on' : ''}`}
            disabled={busy || !editable}
            aria-label={`Провал ${i + 1}`}
            onClick={() => cycle('fail', fails)}
          />
        ))}
      </div>
    </div>
  )
}

/** Полная карточка за столом с учётом профиля видимости лобби. */
export function SessionTableCard({
  seat,
  visibility,
  sheetLabel = 'Лист',
  revealAll = false,
  masterControls = false,
  isOwner = false,
  busy = false,
  onToggleInspiration,
  onSpendInspiration,
  onAwardPiety,
  onRemoveCondition,
  onRemoveEffect,
  onClearConcentration,
  onAddCompanion,
  onRemoveCompanion,
  onPatchCompanion,
  onDamage,
  onDeathSavesChange,
  yourTurn = false,
  showTurnEconomyStub = false,
  turnEconomy = null,
  onToggleTurnMark,
  onToggleMoved,
  turnEconomyAsGm = false,
  surprised = false,
  sideLabelText = null,
  sideHidden = false,
  onSideClick,
  onApplyEffect,
}: Props) {
  const profile = normalizeVisibilityProfile(visibility)
  const fields = profile.fields
  const show = (sectionEnabled: boolean, mode: string) =>
    revealAll || (sectionEnabled && mode !== 'off')

  const showName = revealAll || (fields.identity.enabled && fields.identity.name !== 'off')
  const showRaceClass =
    revealAll || (fields.identity.enabled && fields.identity.race_class !== 'off')
  const showHpSection = revealAll || fields.health.enabled
  const hpMode = revealAll ? 'active' : fields.health.hp
  const showAc = show(fields.combat.enabled, fields.combat.ac)
  const showPassives = show(fields.abilities.enabled, fields.abilities.passives)
  const showInspiration = show(fields.resources.enabled, fields.resources.inspiration)
  const showConditions =
    revealAll || (fields.health.enabled && fields.health.conditions !== 'off')
  const showEffects = showConditions
  const showConcentration =
    revealAll || (fields.resources.enabled && fields.resources.inspiration !== 'off')
  const showPortrait =
    revealAll || (fields.identity.enabled && fields.identity.portrait !== 'off')

  const tone: HpBand =
    (seat.hp_band as HpBand | undefined) ||
    (seat.hp_ratio != null ? bandFromRatio(seat.hp_ratio) : hpBand(seat.hp_current, seat.hp_max))
  const ratio =
    seat.hp_ratio ??
    hpRatio(seat.hp_current, seat.hp_max)
  const colorLabel = seat.hp_label || hpLabelHero(tone)
  const initial = (seat.character_name.trim().charAt(0) || '?').toUpperCase()
  const conditions = seat.conditions ?? []
  const effects = seat.effects ?? []
  const concentration = seat.concentration ?? null
  const companions = seat.companions ?? []

  const hpLabel =
    showHpSection && hpMode !== 'off'
      ? hpMode === 'color_only' && !revealAll
        ? `HP · ${colorLabel}`
        : seat.hp_max != null
          ? `HP ${seat.hp_current ?? 0}/${seat.hp_max}${seat.hp_temp ? ` (+${seat.hp_temp})` : ''}`
          : 'HP —'
      : null

  const atZero = seat.hp_current != null && seat.hp_current <= 0
  // Решение 12.11: спасброски только умирающему и ведущему; API уже режет поля.
  const showDeathSaves =
    atZero && (seat.death_successes != null || seat.death_fails != null)
  const showUnconsciousOnly = atZero && !showDeathSaves && showHpSection

  const hasVitalChips =
    Boolean(hpLabel) ||
    showUnconsciousOnly ||
    (showAc && seat.ac != null) ||
    (showPassives &&
      (seat.passive_perception != null ||
        seat.passive_insight != null ||
        seat.passive_investigation != null))

  const canSpendInspiration =
    (masterControls || isOwner) && Boolean(seat.inspiration) && Boolean(onSpendInspiration)

  return (
    <div
      className={`session-seat-stack${yourTurn ? ' is-your-turn' : ''}`}
      {...(isOwner ? { 'data-onboarding': 'lobby-own-card' } : {})}
    >
      <article className={`session-table-card${yourTurn ? ' is-your-turn' : ''}`}>
        {yourTurn ? (
          <p
            className="session-table-card__your-turn"
            role="status"
            {...(isOwner ? { 'data-onboarding': 'lobby-your-turn' } : {})}
          >
            Твой ход
          </p>
        ) : null}
        {showTurnEconomyStub ? (
          <div
            className="session-table-card__turn-stub"
            aria-label="Экономика хода"
            {...(isOwner ? { 'data-onboarding': 'lobby-turn-chips' } : {})}
          >
            {surprised || turnEconomy?.surprised ? (
              <p className="session-table-card__surprised" role="status">
                врасплох
              </p>
            ) : null}
            <TurnEconomyChips
              state={turnEconomy ?? emptyTurnEconomy()}
              onToggle={(mark) => {
                if (!onToggleTurnMark) return
                onToggleTurnMark(mark)
              }}
              onToggleMoved={onToggleMoved}
              showMovementStub={!onToggleMoved}
              asGm={Boolean(turnEconomyAsGm)}
              readOnly={!onToggleTurnMark}
              className="session-table-card__turn-chips"
              chipClassName="session-turn-chip"
            />
          </div>
        ) : null}
        <div
          className={`session-hp-bar session-hp-bar--${tone}`}
          style={{ ['--hp-ratio' as string]: String(ratio) }}
          title={colorLabel}
          aria-hidden
        />
        <div className="session-table-card__body">
          <div className="session-table-card__top">
            {showPortrait ? (
              <div className="session-table-card__avatar" aria-hidden>
                {initial}
              </div>
            ) : null}
            <div className="session-table-card__identity">
              <div className="session-table-card__meta">
                {showName ? (
                  <Text
                    as="h3"
                    className="session-table-card__name"
                    title={seat.character_name}
                  >
                    {seat.character_name}
                  </Text>
                ) : (
                  <Text as="h3" className="session-table-card__name">
                    Персонаж
                  </Text>
                )}
                {showRaceClass ? (
                  <Text
                    tone="muted"
                    className="session-table-card__sub"
                    title={[
                      `ур. ${seat.character_level}`,
                      seat.character_race_name,
                      seat.character_class_name,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  >
                    ур. {seat.character_level}
                    {[seat.character_race_name, seat.character_class_name]
                      .filter(Boolean)
                      .map((part) => ` · ${part}`)
                      .join('')}
                  </Text>
                ) : null}
              </div>
              {masterControls && showInspiration ? (
                <button
                  type="button"
                  className={`session-insp-toggle${seat.inspiration ? ' is-on' : ''}`}
                  disabled={busy}
                  aria-pressed={Boolean(seat.inspiration)}
                  aria-label="Вдохновение"
                  title="Вдохновение"
                  onClick={() => onToggleInspiration?.(!seat.inspiration)}
                >
                  ★
                </button>
              ) : showInspiration && seat.inspiration ? (
                <span className="session-table-card__insp" title="Вдохновение">
                  ★
                </span>
              ) : null}
            </div>
            <div className="session-table-card__top-actions">
              {masterControls && onAwardPiety ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  disabled={busy}
                  aria-label="Благочестие ±"
                  title={
                    seat.piety_score != null
                      ? `Благочестие: ${seat.piety_score}`
                      : 'Благочестие'
                  }
                  onClick={onAwardPiety}
                >
                  Благочестие ±
                  {seat.piety_score != null ? ` · ${seat.piety_score}` : ''}
                </Button>
              ) : null}
              {masterControls && onSideClick ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  disabled={busy}
                  aria-label="Сторона"
                  title="Сторона в бою"
                  onClick={onSideClick}
                >
                  Сторона
                  {sideLabelText ? ` · ${sideLabelText}` : ''}
                  {sideHidden ? ' · скрыта' : ''}
                </Button>
              ) : sideLabelText ? (
                <span className="session-side-chip" title="Сторона">
                  {sideLabelText}
                </span>
              ) : null}
            </div>
          </div>

          {hasVitalChips ? (
            <div className="session-table-card__stats" aria-label="Характеристики">
              {hpLabel ? (
                <span className={`session-table-card__chip session-table-card__chip--hp is-${tone}`}>
                  {hpLabel}
                </span>
              ) : null}
              {showUnconsciousOnly ? (
                <span className="session-table-card__chip session-table-card__chip--hp is-down">
                  Без сознания
                </span>
              ) : null}
              {showAc && seat.ac != null ? (
                <span className="session-table-card__chip">КД {seat.ac}</span>
              ) : null}
              {showPassives && seat.passive_perception != null ? (
                <span className="session-table-card__chip" title="Пассивная внимательность">
                  👁 {seat.passive_perception}
                </span>
              ) : null}
              {showPassives && seat.passive_insight != null ? (
                <span className="session-table-card__chip" title="Пассивная проницательность">
                  ◎ {seat.passive_insight}
                </span>
              ) : null}
              {showPassives && seat.passive_investigation != null ? (
                <span className="session-table-card__chip" title="Пассивное расследование">
                  ? {seat.passive_investigation}
                </span>
              ) : null}
              {seat.advantage_next_roll ? (
                <span className="session-table-card__chip" title="Преимущество на следующий бросок">
                  Преим. ★
                </span>
              ) : null}
            </div>
          ) : null}

          {showDeathSaves ? (
            <DeathSavePips
              successes={seat.death_successes ?? 0}
              fails={seat.death_fails ?? 0}
              editable={Boolean(masterControls || isOwner)}
              busy={busy}
              onChange={onDeathSavesChange}
            />
          ) : null}

          {seat.reaction_hint ? (
            <p className="ui-text ui-text--muted session-reaction-hint" role="status">
              {seat.reaction_hint}
            </p>
          ) : null}

          {showConcentration && concentration ? (
            <div className="session-table-card__concentration">
              {masterControls && onClearConcentration ? (
                <button
                  type="button"
                  className="session-concentration-tag is-removable"
                  disabled={busy}
                  title="Снять концентрацию (вдохновение не снимается)"
                  onClick={onClearConcentration}
                >
                  Конц. · {concentration.name}
                  <span aria-hidden> ×</span>
                </button>
              ) : (
                <span className="session-concentration-tag">
                  Конц. · {concentration.name}
                </span>
              )}
            </div>
          ) : null}

          {(showConditions && conditions.length > 0) ||
          (showEffects && effects.length > 0) ? (
            <div className="session-table-card__conditions" aria-label="Состояния и эффекты">
              {showConditions
                ? conditions.map((c) =>
                    (masterControls || isOwner) && onRemoveCondition ? (
                      <button
                        key={`c-${c.slug}`}
                        type="button"
                        className="session-condition-tag is-removable"
                        disabled={busy}
                        title="Снять состояние"
                        onClick={() => onRemoveCondition(c)}
                      >
                        {c.name}
                        <span aria-hidden> ×</span>
                      </button>
                    ) : (
                      <span key={`c-${c.slug}`} className="session-condition-tag">
                        {c.name}
                      </span>
                    ),
                  )
                : null}
              {showEffects
                ? effects.map((fx) => {
                    const label = fx.source_name
                      ? `${fx.name} · ${fx.source_name}`
                      : fx.name
                    return (masterControls || isOwner) && onRemoveEffect ? (
                      <button
                        key={`e-${fx.id}`}
                        type="button"
                        className="session-effect-tag is-removable"
                        disabled={busy}
                        title={
                          fx.linked_concentration
                            ? 'Снять эффект (связан с концентрацией)'
                            : 'Снять эффект'
                        }
                        onClick={() => onRemoveEffect(fx)}
                      >
                        {label}
                        {fx.linked_concentration ? (
                          <span className="session-effect-tag__link" aria-hidden>
                            {' '}
                            ⛓
                          </span>
                        ) : null}
                        <span aria-hidden> ×</span>
                      </button>
                    ) : (
                      <span key={`e-${fx.id}`} className="session-effect-tag">
                        {label}
                        {fx.linked_concentration ? (
                          <span className="session-effect-tag__link" aria-hidden>
                            {' '}
                            ⛓
                          </span>
                        ) : null}
                      </span>
                    )
                  })
                : null}
            </div>
          ) : null}

          {masterControls && onDamage ? (
            <div className="session-table-card__damage">
              <Text tone="muted" className="session-typed-damage__hint">
                Урон / лечение со стола
              </Text>
              <TypedDamageForm
                busy={busy}
                onApply={onDamage}
              />
            </div>
          ) : null}

          {companions.length > 0 ? (
            <ul className="session-table-card__companions" aria-label="Напарники">
              {companions.map((companion) => (
                <li key={companion.id}>
                  <CompanionCard
                    companion={companion}
                    masterControls={masterControls}
                    busy={busy}
                    onRemove={
                      onRemoveCompanion
                        ? () => onRemoveCompanion(companion.id)
                        : undefined
                    }
                    onPatch={
                      onPatchCompanion
                        ? (patch) => onPatchCompanion(companion.id, patch)
                        : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          ) : null}

          <div className="session-table-card__actions">
            <Link
              className="ui-button ui-button--ghost ui-button--lg"
              to={`/characters/${seat.character_id}`}
            >
              {sheetLabel}
            </Link>
            {isOwner && onApplyEffect ? (
              <button
                type="button"
                className="ui-button ui-button--ghost ui-button--lg"
                disabled={busy}
                onClick={onApplyEffect}
              >
                Эффект
              </button>
            ) : null}
            {canSpendInspiration ? (
              <button
                type="button"
                className="ui-button ui-button--ghost ui-button--lg"
                disabled={busy}
                title="Преимущество на следующий бросок (до броска)"
                onClick={onSpendInspiration}
              >
                Потратить вдохновение
              </button>
            ) : null}
            {masterControls && onAddCompanion ? (
              <button
                type="button"
                className="ui-button ui-button--ghost ui-button--lg"
                disabled={busy}
                onClick={onAddCompanion}
              >
                + Напарник
              </button>
            ) : null}
          </div>
        </div>
      </article>
    </div>
  )
}
