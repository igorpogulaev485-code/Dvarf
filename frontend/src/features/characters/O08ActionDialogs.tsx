/**
 * O-08: Help / Ready confirm dialogs (map-less).
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../ui'
import { acquireBodyScrollLock } from '../../ui/bodyScrollLock'
import type { ReadyKind } from '../../shared/dnd/o08ActionsCoverConditions'
import { READY_TRIGGER_HINT } from '../../shared/dnd/o08ActionsCoverConditions'

type BaseProps = {
  open: boolean
  onClose: () => void
}

export type HelpActionDialogProps = BaseProps & {
  allies: Array<{ id: string; name: string }>
  foes: Array<{ id: string; name: string }>
  onConfirm: (opts: {
    allyId: string
    allyName: string
    foeId: string | null
    foeName: string | null
    forAttack: boolean
  }) => void
}

export function HelpActionDialog({
  open,
  onClose,
  allies,
  foes,
  onConfirm,
}: HelpActionDialogProps) {
  const [allyId, setAllyId] = useState('')
  const [foeId, setFoeId] = useState('')
  const [forAttack, setForAttack] = useState(false)

  useEffect(() => {
    if (!open) return
    setAllyId(allies[0]?.id ?? '')
    setFoeId('')
    setForAttack(false)
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
  }, [open, onClose, allies])

  if (!open) return null

  const ally = allies.find((a) => a.id === allyId) ?? null
  const foe = foes.find((f) => f.id === foeId) ?? null

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
        aria-labelledby="o08-help-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="o08-help-title" className="ui-text ui-dialog__title">
          Помощь
        </h2>
        <p className="ui-text" style={{ marginTop: 0 }}>
          Тратит действие. Союзник получает преимущество на одну проверку или на
          первую атаку по выбранному врагу до начала вашего следующего хода.
        </p>

        <label className="ui-text" style={{ display: 'block', marginTop: 8 }}>
          Союзник
          <select
            className="ui-input"
            value={allyId}
            onChange={(e) => setAllyId(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          >
            {allies.length === 0 ? (
              <option value="">— укажите имя в ленте —</option>
            ) : null}
            {allies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label className="ui-text" style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={forAttack}
            onChange={(e) => setForAttack(e.target.checked)}
          />
          Помощь в атаке (против цели)
        </label>

        {forAttack ? (
          <label className="ui-text" style={{ display: 'block', marginTop: 8 }}>
            Против этой цели (опционально)
            <select
              className="ui-input"
              value={foeId}
              onChange={(e) => setFoeId(e.target.value)}
              style={{ display: 'block', width: '100%', marginTop: 4 }}
            >
              <option value="">— любая / не выбрано —</option>
              {foes.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="chip-row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button
            type="button"
            disabled={!ally && allies.length > 0}
            onClick={() => {
              const name = ally?.name || 'союзник'
              onConfirm({
                allyId: ally?.id || '',
                allyName: name,
                foeId: forAttack ? foe?.id ?? null : null,
                foeName: forAttack ? foe?.name ?? null : null,
                forAttack,
              })
              onClose()
            }}
          >
            Помочь
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export type ReadyActionDialogProps = BaseProps & {
  actionSpells?: Array<{ id: string; name: string; level: number }>
  onConfirm: (opts: {
    trigger: string
    kind: ReadyKind
    spellId: string | null
    spellName: string | null
    spellLevel: number | null
  }) => void
}

const READY_KINDS: Array<{ id: ReadyKind; label: string }> = [
  { id: 'attack', label: 'Атака' },
  { id: 'dash', label: 'Рывок' },
  { id: 'disengage', label: 'Отход' },
  { id: 'dodge', label: 'Уклонение' },
  { id: 'spell', label: 'Заклинание' },
]

export function ReadyActionDialog({
  open,
  onClose,
  actionSpells = [],
  onConfirm,
}: ReadyActionDialogProps) {
  const [trigger, setTrigger] = useState('')
  const [kind, setKind] = useState<ReadyKind>('attack')
  const [spellId, setSpellId] = useState('')

  useEffect(() => {
    if (!open) return
    setTrigger('')
    setKind('attack')
    setSpellId(actionSpells[0]?.id ?? '')
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
  }, [open, onClose, actionSpells])

  if (!open) return null

  const spell = actionSpells.find((s) => s.id === spellId) ?? null
  const canConfirm =
    trigger.trim().length > 0 && (kind !== 'spell' || Boolean(spell))

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
        aria-labelledby="o08-ready-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="o08-ready-title" className="ui-text ui-dialog__title">
          Подготовка
        </h2>
        <p className="ui-text" style={{ marginTop: 0 }}>
          {READY_TRIGGER_HINT} Ячейка заклинания тратится сейчас.
        </p>

        <label className="ui-text" style={{ display: 'block', marginTop: 8 }}>
          Триггер
          <input
            className="ui-input"
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            placeholder="например: враг войдёт в дверь"
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          />
        </label>

        <div className="chip-row" role="group" aria-label="Что готовите" style={{ marginTop: 12 }}>
          {READY_KINDS.map((row) => (
            <button
              key={row.id}
              type="button"
              className={`sheet-chip${kind === row.id ? ' is-on' : ''}`}
              aria-pressed={kind === row.id}
              onClick={() => setKind(row.id)}
            >
              {row.label}
            </button>
          ))}
        </div>

        {kind === 'spell' ? (
          <label className="ui-text" style={{ display: 'block', marginTop: 12 }}>
            Заклинание (время «1 действие»)
            <select
              className="ui-input"
              value={spellId}
              onChange={(e) => setSpellId(e.target.value)}
              style={{ display: 'block', width: '100%', marginTop: 4 }}
            >
              {actionSpells.length === 0 ? (
                <option value="">Нет подходящих заклинаний</option>
              ) : null}
              {actionSpells.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.level > 0 ? ` · ${s.level} ур.` : ' · заговор'}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="chip-row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              onConfirm({
                trigger: trigger.trim(),
                kind,
                spellId: kind === 'spell' ? spell?.id ?? null : null,
                spellName: kind === 'spell' ? spell?.name ?? null : null,
                spellLevel: kind === 'spell' ? spell?.level ?? null : null,
              })
              onClose()
            }}
          >
            Подготовить
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
