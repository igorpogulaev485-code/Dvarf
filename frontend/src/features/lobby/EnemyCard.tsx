import { useMemo, useState } from 'react'
import type { CombatantMember, SessionCombatant } from '../../shared/api/lobbies'
import { Button, Text } from '../../ui'
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
  /** Урон: без memberId — первый живой; с memberId — выбранный в составе */
  onDamage?: (amount: number, memberId?: string) => void
  onRemove?: () => void
}

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
  items: { name_ru: string; text_ru?: string }[]
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

/**
 * Карточка противника / пачки.
 * Быстрый −1/−5 → первый живой. «Состав» → урон каждому по имени.
 */
export function EnemyCard({
  combatant,
  masterControls = false,
  revealAll = false,
  visibility,
  busy,
  onDamage,
  onRemove,
}: Props) {
  const [statsOpen, setStatsOpen] = useState(false)
  const [rosterOpen, setRosterOpen] = useState(false)
  const profile = normalizeVisibilityProfile(visibility)
  const isMaster = Boolean(masterControls || revealAll)
  const members = useMemo(() => ensureMembers(combatant), [combatant])
  const isPack = members.length > 1
  const aliveCount =
    combatant.alive_count ?? members.filter((m) => m.hp_current > 0).length
  const memberCount = combatant.member_count ?? members.length
  const tone = hpTone(
    aliveCount <= 0 ? 0 : combatant.hp_current,
    Math.max(1, combatant.hp_max),
  )
  const isDead = aliveCount <= 0

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

  return (
    <article
      className={`session-enemy-card session-enemy-card--${tone}${
        isMaster ? ' session-enemy-card--master' : ' session-enemy-card--player'
      }${isPack ? ' session-enemy-card--pack' : ''}${statsOpen || rosterOpen ? ' is-open' : ''}`}
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
              {isPack ? 'Цель ' : ''}HP {combatant.hp_current}/{combatant.hp_max}
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

      {masterControls ? (
        <div className="session-enemy-card__hp-controls">
          <Button
            type="button"
            variant="secondary"
            disabled={busy || isDead}
            title={isPack ? 'Урон первому живому' : 'Урон'}
            onClick={() => onDamage?.(1)}
          >
            −1
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || isDead}
            title={isPack ? 'Урон первому живому' : 'Урон'}
            onClick={() => onDamage?.(5)}
          >
            −5
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            title={isPack ? 'Лечение первому (или первому в списке)' : 'Лечение'}
            onClick={() => onDamage?.(-1)}
          >
            +1
          </Button>
          {isPack ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setRosterOpen((v) => !v)
                if (!rosterOpen) setStatsOpen(false)
              }}
            >
              {rosterOpen ? 'Свернуть' : 'Состав'}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setStatsOpen((v) => !v)
              if (!statsOpen) setRosterOpen(false)
            }}
          >
            {statsOpen ? 'Свернуть' : 'Статы'}
          </Button>
        </div>
      ) : null}

      {masterControls && rosterOpen && isPack ? (
        <div className="session-enemy-card__roster" aria-label="Состав пачки">
          <Text tone="muted" className="session-enemy-card__block-title">
            Кому урон — отметь бойца; −1/−5 бьют выбранного в строке.
          </Text>
          <ul className="session-enemy-roster">
            {members.map((m) => {
              const mTone = hpTone(m.hp_current, m.hp_max)
              const mDead = m.hp_current <= 0
              return (
                <li
                  key={m.id}
                  className={`session-enemy-roster__row${mDead ? ' is-dead' : ''}`}
                >
                  <div className="session-enemy-roster__who">
                    <span className="session-enemy-roster__name">{m.name}</span>
                    <span
                      className={`session-table-card__chip session-table-card__chip--hp is-${mTone}`}
                    >
                      HP {m.hp_current}/{m.hp_max}
                    </span>
                    {mDead ? <span className="session-condition-tag">Мёртв</span> : null}
                  </div>
                  <div className="session-enemy-roster__dmg">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy || mDead}
                      onClick={() => onDamage?.(1, m.id)}
                    >
                      −1
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy || mDead}
                      onClick={() => onDamage?.(5, m.id)}
                    >
                      −5
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => onDamage?.(-1, m.id)}
                    >
                      +1
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {masterControls && statsOpen ? (
        <div className="session-enemy-card__details">
          <ActionList title="Черты" items={combatant.traits ?? []} />
          <ActionList title="Действия" items={combatant.actions ?? []} />
          <ActionList title="Бонусные" items={combatant.bonus_actions ?? []} />
          <ActionList title="Реакции" items={combatant.reactions ?? []} />
          <ActionList title="Легендарные" items={combatant.legendary_actions ?? []} />
          {!combatant.traits?.length &&
          !combatant.actions?.length &&
          !combatant.reactions?.length ? (
            <Text tone="muted">Нет блоков действий на карточке.</Text>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
