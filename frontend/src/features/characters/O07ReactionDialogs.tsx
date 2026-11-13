/**
 * O-07: small confirm dialogs for opportunity attack, counterspell, reaction context.
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../ui'
import { acquireBodyScrollLock } from '../../ui/bodyScrollLock'
import type { OpportunityTrigger } from '../../shared/dnd/o07Reactions'
import {
  WAR_CASTER_OA_SPELL_HINT,
  counterspellAutoSucceeds,
  counterspellCheckDc,
} from '../../shared/dnd/o07Reactions'

type BaseProps = {
  open: boolean
  onClose: () => void
}

export type OpportunityAttackDialogProps = BaseProps & {
  canEnterReach: boolean
  hasSentinel: boolean
  hasWarCaster: boolean
  onConfirm: (opts: {
    trigger: OpportunityTrigger
    targetDisengaged: boolean
    mode: 'weapon' | 'spell'
    targetName: string
  }) => void
}

export function OpportunityAttackDialog({
  open,
  onClose,
  canEnterReach,
  hasSentinel,
  hasWarCaster,
  onConfirm,
}: OpportunityAttackDialogProps) {
  const [trigger, setTrigger] = useState<OpportunityTrigger>('leave')
  const [targetDisengaged, setTargetDisengaged] = useState(false)
  const [mode, setMode] = useState<'weapon' | 'spell'>('weapon')
  const [targetName, setTargetName] = useState('')

  useEffect(() => {
    if (!open) return
    setTrigger('leave')
    setTargetDisengaged(false)
    setMode('weapon')
    setTargetName('')
    const release = acquireBodyScrollLock()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      release()
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const leaveBlocked = trigger === 'leave' && targetDisengaged && !hasSentinel
  const enterBlocked = trigger === 'enter' && targetDisengaged

  return createPortal(
    <div
      className="ui-dialog-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="ui-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="o07-oa-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="o07-oa-title" className="ui-text ui-dialog__title">
          Атака по возможности
        </h2>
        <p className="ui-text" style={{ marginTop: 0 }}>
          Без карты: подтвердите триггер и цель. Тратит реакцию.
        </p>

        <div className="chip-row" role="group" aria-label="Триггер">
          <button
            type="button"
            className={`sheet-chip${trigger === 'leave' ? ' is-on' : ''}`}
            aria-pressed={trigger === 'leave'}
            onClick={() => setTrigger('leave')}
          >
            Вышла из досягаемости
          </button>
          {canEnterReach ? (
            <button
              type="button"
              className={`sheet-chip${trigger === 'enter' ? ' is-on' : ''}`}
              aria-pressed={trigger === 'enter'}
              onClick={() => setTrigger('enter')}
            >
              Вошла в досягаемость
            </button>
          ) : null}
        </div>

        <label className="ui-text" style={{ display: 'block', marginTop: 12 }}>
          Цель (в ленту)
          <input
            className="ui-input"
            value={targetName}
            onChange={(e) => setTargetName(e.target.value)}
            placeholder="Имя существа"
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          />
        </label>

        <label
          className="ui-text"
          style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}
        >
          <input
            type="checkbox"
            checked={targetDisengaged}
            onChange={(e) => setTargetDisengaged(e.target.checked)}
          />
          Цель совершила Отход в этот ход
        </label>
        {leaveBlocked ? (
          <p className="ui-text" style={{ color: 'var(--danger, #b33)' }}>
            Без черты «Страж» провокация на выход при Отходе недоступна.
          </p>
        ) : null}
        {enterBlocked ? (
          <p className="ui-text" style={{ color: 'var(--danger, #b33)' }}>
            Отход снимает провокацию на вход (древковое).
          </p>
        ) : null}
        {trigger === 'leave' && targetDisengaged && hasSentinel ? (
          <p className="ui-text">Страж: Отход не спасает от провокации на выход.</p>
        ) : null}

        {hasWarCaster ? (
          <div className="chip-row" role="group" aria-label="Режим" style={{ marginTop: 12 }}>
            <button
              type="button"
              className={`sheet-chip${mode === 'weapon' ? ' is-on' : ''}`}
              aria-pressed={mode === 'weapon'}
              onClick={() => setMode('weapon')}
            >
              Оружием
            </button>
            <button
              type="button"
              className={`sheet-chip${mode === 'spell' ? ' is-on' : ''}`}
              aria-pressed={mode === 'spell'}
              title={WAR_CASTER_OA_SPELL_HINT}
              onClick={() => setMode('spell')}
            >
              Заклинание
            </button>
          </div>
        ) : null}

        <div className="ui-dialog__actions" style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button
            type="button"
            disabled={leaveBlocked || enterBlocked}
            onClick={() => {
              onConfirm({
                trigger,
                targetDisengaged,
                mode: hasWarCaster ? mode : 'weapon',
                targetName: targetName.trim() || 'цель',
              })
              onClose()
            }}
          >
            Подтвердить
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export type CounterspellDialogProps = BaseProps & {
  spellcastingMod: number
  proficiencyBonus: number
  onConfirm: (opts: {
    targetLevel: number
    slotLevel: number
    enemySpellName: string
    auto: boolean
    checkDc: number
    checkBonus: number
  }) => void
}

export function CounterspellDialog({
  open,
  onClose,
  spellcastingMod,
  proficiencyBonus,
  onConfirm,
}: CounterspellDialogProps) {
  const [targetLevel, setTargetLevel] = useState(1)
  const [slotLevel, setSlotLevel] = useState(3)
  const [enemySpellName, setEnemySpellName] = useState('')

  useEffect(() => {
    if (!open) return
    setTargetLevel(1)
    setSlotLevel(3)
    setEnemySpellName('')
    const release = acquireBodyScrollLock()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      release()
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const auto = counterspellAutoSucceeds(slotLevel, targetLevel)
  const dc = counterspellCheckDc(targetLevel)
  const checkBonus = Math.floor(spellcastingMod) + Math.floor(proficiencyBonus)

  return createPortal(
    <div
      className="ui-dialog-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="ui-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="o07-cs-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="o07-cs-title" className="ui-text ui-dialog__title">
          Контрзаклинание
        </h2>
        <p className="ui-text" style={{ marginTop: 0 }}>
          Реакция · ячейка ≥ 3 круга. Если круг ячейки строго выше круга цели —
          успех без проверки.
        </p>
        <label className="ui-text" style={{ display: 'block' }}>
          Круг чужого заклинания
          <input
            className="ui-input"
            type="number"
            min={0}
            max={9}
            value={targetLevel}
            onChange={(e) => setTargetLevel(Math.max(0, Math.min(9, Number(e.target.value) || 0)))}
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          />
        </label>
        <label className="ui-text" style={{ display: 'block', marginTop: 12 }}>
          Ваша ячейка
          <input
            className="ui-input"
            type="number"
            min={3}
            max={9}
            value={slotLevel}
            onChange={(e) => setSlotLevel(Math.max(3, Math.min(9, Number(e.target.value) || 3)))}
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          />
        </label>
        <label className="ui-text" style={{ display: 'block', marginTop: 12 }}>
          Имя заклинания врага (необязательно)
          <input
            className="ui-input"
            value={enemySpellName}
            onChange={(e) => setEnemySpellName(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          />
        </label>
        <p className="ui-text" style={{ marginTop: 12 }}>
          {auto
            ? `Успех без проверки (ячейка ${slotLevel} > круг ${targetLevel})`
            : `Проверка характеристики заклинателя Сл ${dc} · бонус ${checkBonus >= 0 ? '+' : ''}${checkBonus}`}
        </p>
        <div className="ui-dialog__actions" style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button
            type="button"
            onClick={() => {
              onConfirm({
                targetLevel,
                slotLevel,
                enemySpellName: enemySpellName.trim(),
                auto,
                checkDc: dc,
                checkBonus,
              })
              onClose()
            }}
          >
            Кастануть
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export type NamedTargetDialogProps = BaseProps & {
  title: string
  hint: string
  confirmLabel?: string
  onConfirm: (targetName: string) => void
}

export function NamedTargetDialog({
  open,
  onClose,
  title,
  hint,
  confirmLabel = 'Подтвердить',
  onConfirm,
}: NamedTargetDialogProps) {
  const [targetName, setTargetName] = useState('')

  useEffect(() => {
    if (!open) return
    setTargetName('')
    const release = acquireBodyScrollLock()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      release()
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="ui-dialog-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="ui-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="o07-nt-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="o07-nt-title" className="ui-text ui-dialog__title">
          {title}
        </h2>
        <p className="ui-text" style={{ marginTop: 0 }}>
          {hint}
        </p>
        <label className="ui-text" style={{ display: 'block' }}>
          Цель
          <input
            className="ui-input"
            value={targetName}
            onChange={(e) => setTargetName(e.target.value)}
            placeholder="Имя существа"
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          />
        </label>
        <div className="ui-dialog__actions" style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button
            type="button"
            onClick={() => {
              onConfirm(targetName.trim() || 'цель')
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
