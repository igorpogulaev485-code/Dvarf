import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { CombatantAction, CombatantMember, SessionCombatant } from '../../shared/api/lobbies'
import { Button, NumberInput, Text } from '../../ui'
import { PackRosterList, memberHpColorLabel, memberHpTone } from './enemyPackRoster'
import { TypedDamageForm, type TypedDamagePayload } from './TypedDamageForm'
import {
  bandFromRatio,
  hpLabelEnemy,
  type HpBand,
} from './sessionHpBand'
import {
  normalizeVisibilityProfile,
  type VisibilityProfile,
} from './visibilityProfile'

type Props = {
  combatant: SessionCombatant
  masterControls?: boolean
  revealAll?: boolean
  visibility?: VisibilityProfile
  /** L-08: КД врагов видно игрокам (дефолт скрыт). Мастер всегда видит. */
  enemiesAcVisible?: boolean
  busy?: boolean
  /** Раскрыть возможности сразу (активный ход в B4) */
  forceAbilitiesOpen?: boolean
  /** Урон с типом; без memberId — первый живой */
  onDamage?: (payload: TypedDamagePayload & { memberId?: string }) => void
  onRemove?: () => void
  /** S-04: клик по действию статблока → диалог атаки */
  onAttackAction?: (action: CombatantAction, kitKind: string) => void
  /** T1: сохранить в вики сеттинга сессии */
  canSaveToSetting?: boolean
  onSaveToSetting?: () => void
  /** G12 / Изучить */
  canStudy?: boolean
  onStudy?: (opts: { rollTotal?: number; dc?: number }) => void
  onResolveStudy?: (success: boolean) => void
  onRevealStatblock?: () => void
  onShareStudy?: () => void
  studyCharacterName?: string | null
  /** S-05 */
  sideLabelText?: string | null
  sideHidden?: boolean
  onSideClick?: () => void
  /** S-06: сбежал / сдался / сброс */
  onOutcome?: (outcome: 'fled' | 'surrendered' | '') => void
  /** L-21: застигнут врасплох (первый ход пропускает) */
  surprised?: boolean
}

type KitItem = CombatantAction & { kind: string }

function ActionList({
  title,
  items,
}: {
  title: string
  items: CombatantAction[]
}) {
  if (!items.length) return null
  return (
    <div className="session-enemy-card__block">
      <Text as="h5" className="session-enemy-card__block-title">
        {title}
      </Text>
      <ul className="session-enemy-card__actions-list">
        {items.map((a) => (
          <li key={`${title}-${a.name_ru}`}>
            <strong>{a.name_ru}</strong>
            {a.text_ru ? <span> — {a.text_ru}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ensureMembers(combatant: SessionCombatant): CombatantMember[] {
  if (combatant.members && combatant.members.length > 0) return combatant.members
  return [
    {
      id: `${combatant.id}-solo`,
      name: combatant.name,
      hp_current: combatant.hp_current,
      hp_max: combatant.hp_max,
      hp_band: combatant.hp_band,
      hp_label: combatant.hp_label,
      hp_ratio: combatant.hp_ratio,
      hp_numbers_hidden: combatant.hp_numbers_hidden,
    },
  ]
}

function collectKit(combatant: SessionCombatant): KitItem[] {
  const blocks: { kind: string; items: CombatantAction[] }[] = [
    { kind: 'черта', items: combatant.traits ?? [] },
    { kind: 'действие', items: combatant.actions ?? [] },
    { kind: 'бонус', items: combatant.bonus_actions ?? [] },
    { kind: 'реакция', items: combatant.reactions ?? [] },
    { kind: 'легенд.', items: combatant.legendary_actions ?? [] },
  ]
  const out: KitItem[] = []
  for (const block of blocks) {
    for (const item of block.items) {
      if (!item.name_ru?.trim()) continue
      out.push({ ...item, kind: block.kind })
    }
  }
  return out
}

/**
 * Карточка противника / пачки.
 * G12: до «Показать» / «Изучить» игроку — имя, полоска/подпись, состояния; без КД и статблока.
 */
export function EnemyCard({
  combatant,
  masterControls = false,
  revealAll = false,
  visibility,
  enemiesAcVisible = false,
  busy,
  forceAbilitiesOpen = false,
  onDamage,
  onRemove,
  onAttackAction,
  canSaveToSetting = false,
  onSaveToSetting,
  canStudy = false,
  onStudy,
  onResolveStudy,
  onRevealStatblock,
  onShareStudy,
  sideLabelText = null,
  sideHidden = false,
  onSideClick,
  onOutcome,
  surprised = false,
}: Props) {
  const [abilitiesOpen, setAbilitiesOpen] = useState(forceAbilitiesOpen)
  const [rosterOpen, setRosterOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [focusAbility, setFocusAbility] = useState<string | null>(null)
  const [studyRoll, setStudyRoll] = useState<number | null>(null)
  const [studyDc, setStudyDc] = useState<number | null>(null)
  const profile = normalizeVisibilityProfile(visibility)
  const isMaster = Boolean(masterControls || revealAll)
  const statblockVisible = Boolean(isMaster || combatant.statblock_visible)
  const members = useMemo(() => ensureMembers(combatant), [combatant])
  const kit = useMemo(() => collectKit(combatant), [combatant])
  const isPack = members.length > 1
  const aliveCount =
    combatant.alive_count ?? members.filter((m) => (m.hp_ratio ?? m.hp_current) > 0).length
  const memberCount = combatant.member_count ?? members.length
  const tone: HpBand =
    (combatant.hp_band as HpBand | undefined) ||
    (combatant.hp_ratio != null
      ? bandFromRatio(combatant.hp_ratio)
      : memberHpTone(
          aliveCount <= 0 ? 0 : combatant.hp_current,
          Math.max(1, combatant.hp_max),
        ))
  const ratio =
    combatant.hp_ratio ??
    (aliveCount <= 0 ? 0 : combatant.hp_current / Math.max(1, combatant.hp_max))
  const colorLabel = combatant.hp_label || memberHpColorLabel(tone) || hpLabelEnemy(tone)
  const isDead = aliveCount <= 0
  const numbersHidden = Boolean(combatant.hp_numbers_hidden) && !statblockVisible

  useEffect(() => {
    if (forceAbilitiesOpen) setAbilitiesOpen(true)
  }, [forceAbilitiesOpen])

  useEffect(() => {
    if (!selectedMemberId) return
    const stillThere = members.some((m) => m.id === selectedMemberId)
    if (!stillThere) setSelectedMemberId(null)
  }, [members, selectedMemberId])

  const selectedMember = selectedMemberId
    ? members.find((m) => m.id === selectedMemberId) ?? null
    : null
  const focusMember =
    selectedMember ?? members.find((m) => (m.hp_ratio ?? m.hp_current) > 0) ?? members[0] ?? null

  // G12: точные числа врага — только после открытия статблока (или мастер).
  const showHpNumbers =
    isMaster ||
    (statblockVisible && !numbersHidden && profile.fields.health.hp === 'active')
  const showHpColor = isMaster || profile.fields.health.hp !== 'off'
  // L-08: КД по умолчанию скрыт; видно мастеру, после G12 reveal, или если enemies_ac_visible.
  const showAc =
    combatant.ac != null &&
    (isMaster || enemiesAcVisible || statblockVisible)
  const showSpeed = statblockVisible && combatant.speed != null
  const showConditions =
    isMaster ||
    (profile.fields.health.enabled && profile.fields.health.conditions === 'active')
  const showDefenses =
    statblockVisible &&
    ((combatant.damage_resistances?.length ?? 0) > 0 ||
      (combatant.damage_immunities?.length ?? 0) > 0 ||
      (combatant.damage_vulnerabilities?.length ?? 0) > 0)

  const metaParts = [
    combatant.type_ru,
    isPack ? `${aliveCount}/${memberCount}` : null,
    statblockVisible && combatant.cr ? `CR ${combatant.cr}` : null,
    isMaster && combatant.source_book ? combatant.source_book : null,
    isMaster && combatant.custom ? 'свой НПС' : null,
  ].filter(Boolean)
  const meta = metaParts.join(' · ')

  function applyDamage(payload: TypedDamagePayload) {
    if (!onDamage) return
    const signed = payload.heal ? -payload.amount : payload.amount
    onDamage({
      ...payload,
      amount: Math.abs(signed),
      heal: payload.heal,
      memberId: isPack && selectedMemberId ? selectedMemberId : undefined,
    })
  }

  function openAbility(name: string) {
    setFocusAbility(name)
    setAbilitiesOpen(true)
    setRosterOpen(false)
  }

  function onStudyForm(e: FormEvent) {
    e.preventDefault()
    onStudy?.({
      rollTotal: studyRoll ?? undefined,
      dc: studyDc ?? undefined,
    })
  }

  const pending = combatant.pending_study
  const snap = combatant.study_snapshot

  return (
    <article
      className={`session-enemy-card session-enemy-card--${tone}${
        isMaster ? ' session-enemy-card--master' : ' session-enemy-card--player'
      }${isPack ? ' session-enemy-card--pack' : ''}${
        abilitiesOpen || rosterOpen ? ' is-open' : ''
      }${forceAbilitiesOpen ? ' is-active-turn' : ''}`}
    >
      <div
        className={`session-hp-bar session-hp-bar--${tone}`}
        style={{ ['--hp-ratio' as string]: String(ratio) }}
        title={colorLabel}
        aria-hidden
      />
      <div className="session-enemy-card__top">
        <div className="session-enemy-card__meta">
          <Text as="h4" className="session-enemy-card__name">
            {combatant.name}
            {isPack ? (
              <span className="session-enemy-card__pack-tag">пачка</span>
            ) : null}
            {surprised ? (
              <span className="session-enemy-card__pack-tag" title="Пропустит первый ход">
                врасплох
              </span>
            ) : null}
          </Text>
          {meta ? (
            <Text tone="muted" className="session-enemy-card__sub">
              {meta}
            </Text>
          ) : null}
        </div>
        <div className="session-enemy-card__top-actions">
          {masterControls && onSideClick ? (
            <button
              type="button"
              className="session-side-btn"
              disabled={busy}
              title="Сторона в бою"
              onClick={onSideClick}
            >
              Сторона
              {sideLabelText ? ` · ${sideLabelText}` : ''}
              {sideHidden ? ' · скрыта' : ''}
            </button>
          ) : sideLabelText ? (
            <span className="session-side-chip">{sideLabelText}</span>
          ) : null}
          {masterControls && onRemove ? (
            <button
              type="button"
              className="session-enemy-card__remove"
              disabled={busy}
              title="Убрать со стола"
              onClick={onRemove}
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      {showHpColor || showAc || showSpeed || (isMaster && isDead) ? (
        <div className="session-enemy-card__stats">
          {showHpNumbers && !isDead ? (
            <span className={`session-table-card__chip session-table-card__chip--hp is-${tone}`}>
              {isPack
                ? `Цель · ${focusMember?.name ?? '—'} · HP ${focusMember?.hp_current ?? 0}/${focusMember?.hp_max ?? combatant.hp_max}`
                : `HP ${combatant.hp_current}/${combatant.hp_max}`}
            </span>
          ) : null}
          {showHpNumbers && isDead ? (
            <span className="session-table-card__chip session-table-card__chip--hp is-down">
              HP 0/{combatant.hp_max}
            </span>
          ) : null}
          {!showHpNumbers && showHpColor ? (
            <span className={`session-table-card__chip session-table-card__chip--hp is-${tone}`}>
              {isPack && !isDead
                ? `${aliveCount}/${memberCount} живых · ${colorLabel}`
                : colorLabel}
            </span>
          ) : null}
          {showAc ? (
            <span className="session-table-card__chip">КД {combatant.ac}</span>
          ) : null}
          {showSpeed ? (
            <span className="session-table-card__chip">{combatant.speed} фт</span>
          ) : null}
          {isMaster && isDead ? (
            <span className="session-condition-tag">Мёртв</span>
          ) : null}
        </div>
      ) : null}

      {snap ? (
        <Text tone="muted" className="session-enemy-card__sub">
          Снимок при анализе: {snap.hp_current}/{snap.hp_max}
        </Text>
      ) : null}

      {showDefenses ? (
        <div className="session-enemy-card__defenses" aria-label="Сопротивления">
          {(combatant.damage_resistances ?? []).map((r) => (
            <span key={`r-${r}`} className="session-defense-chip">
              сопр. {r}
            </span>
          ))}
          {(combatant.damage_immunities ?? []).map((r) => (
            <span key={`i-${r}`} className="session-defense-chip is-immune">
              имм. {r}
            </span>
          ))}
          {(combatant.damage_vulnerabilities ?? []).map((r) => (
            <span key={`v-${r}`} className="session-defense-chip is-vuln">
              уязв. {r}
            </span>
          ))}
        </div>
      ) : null}

      {showConditions && (combatant.conditions?.length ?? 0) > 0 ? (
        <div className="session-table-card__conditions" aria-label="Состояния">
          {combatant.conditions!.map((c) => (
            <span key={c.slug} className="session-condition-tag">
              {c.name}
              {c.duration_rounds ? ` · ${c.duration_rounds} раунд.` : ''}
            </span>
          ))}
        </div>
      ) : null}

      {(combatant.effects?.length ?? 0) > 0 && (isMaster || showConditions) ? (
        <div className="session-table-card__conditions" aria-label="Эффекты">
          {combatant.effects!.map((fx) => (
            <span key={fx.id} className="session-effect-tag">
              {fx.name}
              {fx.duration?.remaining_rounds != null
                ? ` · ${fx.duration.remaining_rounds} раунд.`
                : fx.duration?.value != null
                  ? ` · ${fx.duration.value} раунд.`
                  : ''}
            </span>
          ))}
        </div>
      ) : null}

      {combatant.reaction_hint || combatant.last_damage_note ? (
        <p className="ui-text ui-text--muted session-reaction-hint" role="status">
          {[combatant.last_damage_note, combatant.reaction_hint].filter(Boolean).join(' · ')}
        </p>
      ) : null}

      {statblockVisible && kit.length > 0 ? (
        <div className="session-enemy-card__kit" aria-label="Действия и возможности">
          {kit.map((item) => (
            <button
              key={`${item.kind}-${item.name_ru}`}
              type="button"
              className={`session-enemy-kit-chip session-enemy-kit-chip--${item.kind === 'черта' ? 'trait' : item.kind === 'реакция' ? 'reaction' : item.kind === 'легенд.' ? 'legendary' : 'action'}${
                focusAbility === item.name_ru && abilitiesOpen ? ' is-active' : ''
              }`}
              title={
                masterControls && onAttackAction
                  ? `Атака: ${item.name_ru}`
                  : `${item.kind}: ${item.name_ru}`
              }
              disabled={busy}
              onClick={() => {
                if (masterControls && onAttackAction && item.kind !== 'черта') {
                  onAttackAction(item, item.kind)
                  return
                }
                openAbility(item.name_ru)
              }}
            >
              <span className="session-enemy-kit-chip__kind">{item.kind}</span>
              {item.name_ru}
              {masterControls && item.attack_bonus != null ? (
                <span className="session-enemy-kit-chip__bonus">
                  {item.attack_bonus >= 0 ? '+' : ''}
                  {item.attack_bonus}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {masterControls ? (
        <div className="session-enemy-card__hp-controls">
          <TypedDamageForm
            busy={busy || !onDamage}
            disabledDeal={isDead || (selectedMember != null && (selectedMember.hp_ratio ?? selectedMember.hp_current) <= 0)}
            onApply={applyDamage}
          />
          {isPack ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              aria-expanded={rosterOpen}
              onClick={() => {
                setRosterOpen((v) => !v)
                if (!rosterOpen) setAbilitiesOpen(false)
              }}
            >
              {rosterOpen ? 'Свернуть' : 'Состав'}
            </Button>
          ) : null}
          {kit.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setAbilitiesOpen((v) => !v)
                if (!abilitiesOpen) {
                  setRosterOpen(false)
                  setFocusAbility(null)
                }
              }}
            >
              {abilitiesOpen ? 'Свернуть' : 'Текст'}
            </Button>
          ) : null}
          {onRevealStatblock && !combatant.statblock_revealed ? (
            <Button type="button" variant="ghost" disabled={busy} onClick={onRevealStatblock}>
              Показать игрокам
            </Button>
          ) : null}
          {canSaveToSetting && onSaveToSetting ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              title="Создать страницу НПС в сеттинге сессии"
              onClick={onSaveToSetting}
            >
              В сеттинг
            </Button>
          ) : null}
          {onOutcome ? (
            <>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                className={combatant.outcome === 'fled' ? 'is-on' : undefined}
                onClick={() =>
                  onOutcome(combatant.outcome === 'fled' ? '' : 'fled')
                }
              >
                Сбежал
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                className={combatant.outcome === 'surrendered' ? 'is-on' : undefined}
                onClick={() =>
                  onOutcome(combatant.outcome === 'surrendered' ? '' : 'surrendered')
                }
              >
                Сдался
              </Button>
            </>
          ) : null}
        </div>
      ) : (
        <div className="session-enemy-card__hp-controls">
          {isPack ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              aria-expanded={rosterOpen}
              onClick={() => setRosterOpen((v) => !v)}
            >
              {rosterOpen ? 'Свернуть' : 'Состав'}
            </Button>
          ) : null}
          {canStudy && onStudy && !statblockVisible ? (
            <form className="session-study-form" onSubmit={onStudyForm}>
              <Text tone="muted">
                Изучить · {combatant.study_skill_ru ?? 'Анализ'} · СЛ{' '}
                {studyDc ?? combatant.suggested_study_dc ?? 10}
              </Text>
              <NumberInput
                value={studyRoll}
                min={-20}
                max={99}
                integer
                emptyValue={null}
                disabled={busy}
                placeholder="Бросок"
                aria-label="Результат проверки"
                onValueChange={setStudyRoll}
              />
              <NumberInput
                value={studyDc}
                min={1}
                max={40}
                integer
                emptyValue={null}
                disabled={busy}
                placeholder={`СЛ ${combatant.suggested_study_dc ?? 10}`}
                aria-label="СЛ (если задал ведущий)"
                onValueChange={setStudyDc}
              />
              <Button type="submit" variant="secondary" disabled={busy}>
                Изучить
              </Button>
            </form>
          ) : null}
          {combatant.studied_by_me && onShareStudy && !combatant.statblock_revealed ? (
            <Button type="button" variant="ghost" disabled={busy} onClick={onShareStudy}>
              Показать партии
            </Button>
          ) : null}
          {statblockVisible && kit.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setAbilitiesOpen((v) => !v)}
            >
              {abilitiesOpen ? 'Свернуть' : 'Статблок'}
            </Button>
          ) : null}
        </div>
      )}

      {pending && masterControls && onResolveStudy ? (
        <div className="session-study-resolve" role="status">
          <Text>
            «Изучить»: {pending.character_name ?? 'игрок'} · {pending.skill_ru} против СЛ{' '}
            {pending.dc}
            {pending.roll_total != null ? ` · бросок ${pending.roll_total}` : ''}
          </Text>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => onResolveStudy(true)}>
            Успех
          </Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => onResolveStudy(false)}>
            Провал
          </Button>
        </div>
      ) : null}

      {rosterOpen && isPack ? (
        <div className="session-enemy-card__roster" aria-label="Состав пачки">
          {masterControls ? (
            <Text tone="muted" className="session-enemy-card__block-title">
              Выбери, кому урон — затем введи цифру и тип. Без выбора бьёт первого живого.
            </Text>
          ) : null}
          <PackRosterList
            members={members}
            visibility={profile}
            revealExactHp={isMaster}
            statblockVisible={statblockVisible}
            interactive={Boolean(masterControls)}
            selectedMemberId={selectedMemberId}
            busy={busy}
            onSelect={(id) => setSelectedMemberId((prev) => (prev === id ? null : id))}
          />
        </div>
      ) : null}

      {statblockVisible && abilitiesOpen && kit.length > 0 ? (
        <div className="session-enemy-card__details" aria-label="Текст возможностей">
          {focusAbility ? (
            (() => {
              const item = kit.find((k) => k.name_ru === focusAbility)
              if (!item) return null
              return (
                <div className="session-enemy-card__block">
                  <Text as="h5" className="session-enemy-card__block-title">
                    {item.kind} · {item.name_ru}
                  </Text>
                  <Text className="session-enemy-card__ability-text">
                    {item.text_ru || 'Нет описания.'}
                  </Text>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setFocusAbility(null)}
                  >
                    Все возможности
                  </Button>
                </div>
              )
            })()
          ) : (
            <>
              <ActionList title="Черты" items={combatant.traits ?? []} />
              <ActionList title="Действия" items={combatant.actions ?? []} />
              <ActionList title="Бонусные" items={combatant.bonus_actions ?? []} />
              <ActionList title="Реакции" items={combatant.reactions ?? []} />
              <ActionList title="Легендарные" items={combatant.legendary_actions ?? []} />
            </>
          )}
        </div>
      ) : null}
    </article>
  )
}
