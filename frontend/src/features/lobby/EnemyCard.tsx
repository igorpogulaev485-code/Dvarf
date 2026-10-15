import { useState } from 'react'
import type { SessionCombatant } from '../../shared/api/lobbies'
import { Button, Text } from '../../ui'

type Props = {
  combatant: SessionCombatant
  masterControls?: boolean
  busy?: boolean
  onDamage?: (amount: number) => void
  onRemove?: () => void
}

function hpTone(current: number, max: number): 'ok' | 'warn' | 'down' {
  if (current <= 0) return 'down'
  if (max > 0 && current / max <= 0.5) return 'warn'
  return 'ok'
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

export function EnemyCard({ combatant, masterControls, busy, onDamage, onRemove }: Props) {
  const [open, setOpen] = useState(false)
  const tone = hpTone(combatant.hp_current, combatant.hp_max)
  const meta = [
    combatant.type_ru,
    combatant.cr ? `CR ${combatant.cr}` : null,
    combatant.source_book,
    combatant.custom ? 'свой НПС' : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <article className={`session-enemy-card session-enemy-card--${tone}`}>
      <div className="session-enemy-card__top">
        <div className="session-enemy-card__meta">
          <Text as="h4" className="session-enemy-card__name">
            {combatant.name}
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

      <div className="session-enemy-card__stats">
        <span className={`session-table-card__chip session-table-card__chip--hp is-${tone}`}>
          HP {combatant.hp_current}/{combatant.hp_max}
        </span>
        {combatant.ac != null ? (
          <span className="session-table-card__chip">КД {combatant.ac}</span>
        ) : null}
        {combatant.speed != null ? (
          <span className="session-table-card__chip">{combatant.speed} фт</span>
        ) : null}
      </div>

      {(combatant.conditions?.length ?? 0) > 0 ? (
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
            disabled={busy}
            onClick={() => onDamage?.(1)}
          >
            −1
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => onDamage?.(5)}
          >
            −5
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => onDamage?.(-1)}
          >
            +1
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Свернуть' : 'Статы'}
          </Button>
        </div>
      ) : (
        <div className="session-enemy-card__hp-controls">
          <Button type="button" variant="ghost" onClick={() => setOpen((v) => !v)}>
            {open ? 'Свернуть' : 'Статы'}
          </Button>
        </div>
      )}

      {open ? (
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
