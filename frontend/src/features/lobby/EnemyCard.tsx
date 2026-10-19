import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { CombatantAction, CombatantMember, SessionCombatant } from '../../shared/api/lobbies'
import { Button, NumberInput, Text } from '../../ui'
import {
  normalizeVisibilityProfile,
  type VisibilityProfile,
} from './visibilityProfile'

type Props = {
  combatant: SessionCombatant
  masterControls?: boolean
  revealAll?: boolean
  visibility?: VisibilityProfile
  busy?: boolean
  /** Раскрыть возможности сразу (активный ход в B4) */
  forceAbilitiesOpen?: boolean
  /** Урон: без memberId — первый живой; с memberId — выбранный в составе */
  onDamage?: (amount: number, memberId?: string) => void
  onRemove?: () => void
  /** T1: сохранить в вики сеттинга сессии */
  canSaveToSetting?: boolean
  onSaveToSetting?: () => void
}

type KitItem = CombatantAction & { kind: string }

function hpTone(current: number, max: number): 'ok' | 'warn' | 'down' {
  if (current <= 0) return 'down'
  if (max > 0 && current / max <= 0.5) return 'warn'
  return 'ok'
}

function hpColorLabel(tone: 'ok' | 'warn' | 'down'): string {
  if (tone === 'ok') return 'Здоров'
  if (tone === 'warn') return 'Ранен'
  return 'Повержен'
}

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
 * Мастер: имена действий/черт всегда на карточке; текст — по раскрытию.
 * HP: цифра + «Нанести урон» / «Вылечить». В пачке цель из «Состава».
 */
export function EnemyCard({
  combatant,
  masterControls = false,
  revealAll = false,
  visibility,
  busy,
  forceAbilitiesOpen = false,
  onDamage,
  onRemove,
  canSaveToSetting = false,
  onSaveToSetting,
}: Props) {
  const [abilitiesOpen, setAbilitiesOpen] = useState(forceAbilitiesOpen)
  const [rosterOpen, setRosterOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [hpDelta, setHpDelta] = useState<number | null>(null)
  const [focusAbility, setFocusAbility] = useState<string | null>(null)
  const profile = normalizeVisibilityProfile(visibility)
  const isMaster = Boolean(masterControls || revealAll)
  const members = useMemo(() => ensureMembers(combatant), [combatant])
  const kit = useMemo(() => collectKit(combatant), [combatant])
  const isPack = members.length > 1
  const aliveCount =
    combatant.alive_count ?? members.filter((m) => m.hp_current > 0).length
  const memberCount = combatant.member_count ?? members.length
  const tone = hpTone(
    aliveCount <= 0 ? 0 : combatant.hp_current,
    Math.max(1, combatant.hp_max),
  )
  const isDead = aliveCount <= 0

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
    selectedMember ?? members.find((m) => m.hp_current > 0) ?? members[0] ?? null

  const showHpNumbers = isMaster || profile.fields.health.hp === 'active'
  const showHpColor = isMaster || profile.fields.health.hp !== 'off'
  const showAc = isMaster && combatant.ac != null
  const showSpeed = isMaster && combatant.speed != null
  const showConditions =
    isMaster ||
    (profile.fields.health.enabled && profile.fields.health.conditions === 'active')

  const metaParts = [
    combatant.type_ru,
    isPack ? `${aliveCount}/${memberCount}` : null,
    isMaster && combatant.cr ? `CR ${combatant.cr}` : null,
    isMaster && combatant.source_book ? combatant.source_book : null,
    isMaster && combatant.custom ? 'свой НПС' : null,
  ].filter(Boolean)
  const meta = metaParts.join(' · ')

  const hasAmount = hpDelta != null && hpDelta > 0
  const canDeal =
    !busy &&
    hasAmount &&
    !isDead &&
    !(selectedMember != null && selectedMember.hp_current <= 0)
  /** Лечение: и раненому, и с 0 HP (поднять / особые черты). */
  const canHeal = !busy && hasAmount

  function applyHpChange(amount: number) {
    if (!onDamage || amount === 0) return
    if (isPack && selectedMemberId) {
      onDamage(amount, selectedMemberId)
    } else {
      onDamage(amount)
    }
    setHpDelta(null)
  }

  function onDamageForm(event: FormEvent) {
    event.preventDefault()
    if (canDeal && hpDelta != null) applyHpChange(hpDelta)
  }

  function onHpKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (canDeal && hpDelta != null) applyHpChange(hpDelta)
    }
  }

  function openAbility(name: string) {
    setFocusAbility(name)
    setAbilitiesOpen(true)
    setRosterOpen(false)
  }

  return (
    <article
      className={`session-enemy-card session-enemy-card--${tone}${
        isMaster ? ' session-enemy-card--master' : ' session-enemy-card--player'
      }${isPack ? ' session-enemy-card--pack' : ''}${
        abilitiesOpen || rosterOpen ? ' is-open' : ''
      }${forceAbilitiesOpen ? ' is-active-turn' : ''}`}
    >
      <div className="session-enemy-card__top">
        <div className="session-enemy-card__meta">
          <Text as="h4" className="session-enemy-card__name">
            {combatant.name}
            {isPack ? (
              <span className="session-enemy-card__pack-tag">пачка</span>
            ) : null}
          </Text>
          {meta ? (
            <Text tone="muted" className="session-enemy-card__sub">
              {meta}
            </Text>
          ) : null}
        </div>
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
                ? `${aliveCount}/${memberCount} живых`
                : hpColorLabel(tone)}
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

      {showConditions && (combatant.conditions?.length ?? 0) > 0 ? (
        <div className="session-table-card__conditions" aria-label="Состояния">
          {combatant.conditions!.map((c) => (
            <span key={c.slug} className="session-condition-tag">
              {c.name}
            </span>
          ))}
        </div>
      ) : null}

      {isMaster && kit.length > 0 ? (
        <div className="session-enemy-card__kit" aria-label="Действия и возможности">
          {kit.map((item) => (
            <button
              key={`${item.kind}-${item.name_ru}`}
              type="button"
              className={`session-enemy-kit-chip session-enemy-kit-chip--${item.kind === 'черта' ? 'trait' : item.kind === 'реакция' ? 'reaction' : item.kind === 'легенд.' ? 'legendary' : 'action'}${
                focusAbility === item.name_ru && abilitiesOpen ? ' is-active' : ''
              }`}
              title={`${item.kind}: ${item.name_ru}`}
              disabled={busy}
              onClick={() => openAbility(item.name_ru)}
            >
              <span className="session-enemy-kit-chip__kind">{item.kind}</span>
              {item.name_ru}
            </button>
          ))}
        </div>
      ) : null}

      {masterControls ? (
        <div className="session-enemy-card__hp-controls">
          <form className="session-enemy-card__damage" onSubmit={onDamageForm}>
            <NumberInput
              className="session-enemy-card__damage-input"
              value={hpDelta}
              min={1}
              max={9999}
              integer
              emptyValue={null}
              disabled={busy}
              placeholder="Число"
              aria-label="Количество HP"
              onValueChange={setHpDelta}
              onKeyDown={onHpKeyDown}
            />
            <Button type="submit" variant="secondary" disabled={!canDeal}>
              Нанести урон
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={!canHeal}
              title="Вернуть столько HP (не выше максимума)"
              onClick={() => {
                if (canHeal && hpDelta != null) applyHpChange(-hpDelta)
              }}
            >
              Вылечить
            </Button>
          </form>
          {isPack ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
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
        </div>
      ) : null}

      {masterControls && rosterOpen && isPack ? (
        <div className="session-enemy-card__roster" aria-label="Состав пачки">
          <Text tone="muted" className="session-enemy-card__block-title">
            Выбери, кому урон — затем введи цифру и «Нанести урон». Без выбора бьёт
            первого живого.
          </Text>
          <ul className="session-enemy-roster">
            {members.map((m) => {
              const mTone = hpTone(m.hp_current, m.hp_max)
              const mDead = m.hp_current <= 0
              const selected = selectedMemberId === m.id
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    className={`session-enemy-roster__row${mDead ? ' is-dead' : ''}${
                      selected ? ' is-selected' : ''
                    }`}
                    disabled={busy}
                    onClick={() =>
                      setSelectedMemberId((prev) => (prev === m.id ? null : m.id))
                    }
                  >
                    <div className="session-enemy-roster__who">
                      <span className="session-enemy-roster__name">{m.name}</span>
                      <span
                        className={`session-table-card__chip session-table-card__chip--hp is-${mTone}`}
                      >
                        HP {m.hp_current}/{m.hp_max}
                      </span>
                      {mDead ? (
                        <span className="session-condition-tag">Мёртв</span>
                      ) : null}
                      {selected && !mDead ? (
                        <span className="session-enemy-roster__pick">цель</span>
                      ) : null}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {isMaster && abilitiesOpen && kit.length > 0 ? (
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
