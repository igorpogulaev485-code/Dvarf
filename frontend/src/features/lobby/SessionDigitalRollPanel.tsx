import { useState } from 'react'
import { createSessionDigitalRoll } from '../../shared/api/lobbies'
import {
  Button,
  DiceFaces,
  Field,
  Input,
  Stack,
  Text,
  ToggleChip,
} from '../../ui'
import { displayDiceNotation, storageDiceNotation } from '../../shared/dnd/diceNotation'
import { parseFormula } from '../diceRoller/parseFormula'
import type { AdvantageMode } from '../diceRoller/types'

type Props = {
  sessionId: string
  /** Ведущий — может скрытый бросок. */
  canHide?: boolean
  onRolled?: () => void
}

/**
 * Компактная цифровая панель на странице сессии (для ведущего и за столом).
 */
export function SessionDigitalRollPanel({
  sessionId,
  canHide = false,
  onRolled,
}: Props) {
  const [formula, setFormula] = useState('1d20')
  const [title, setTitle] = useState('Бросок')
  const [mode, setMode] = useState<AdvantageMode>('none')
  const [hidden, setHidden] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [last, setLast] = useState<{
    total: number
    formula: string
    dice: Array<{ sides: number; value: number; dropped?: boolean; nat?: '20' | '1' }>
    modifierTotal: number
  } | null>(null)

  const parsed = parseFormula(formula)
  const advDisabled = !(parsed.ok && parsed.singleD20Eligible)
  const canRoll = !busy && parsed.ok && parsed.totalDice > 0 && !(mode !== 'none' && advDisabled)

  async function onRoll() {
    if (!canRoll) return
    setBusy(true)
    setError(null)
    try {
      const event = await createSessionDigitalRoll(sessionId, {
        character_id: null,
        title: title.trim() || 'Бросок',
        formula: formula.trim(),
        mode,
        master_hidden: canHide && hidden,
        category: 'roll',
      })
      const dice = Array.isArray(event.payload?.dice)
        ? (event.payload.dice as Array<{
            sides: number
            value: number
            dropped?: boolean
            nat?: '20' | '1'
          }>)
        : []
      setLast({
        total: event.total ?? 0,
        formula: event.formula || formula,
        dice,
        modifierTotal:
          typeof event.payload?.modifier_total === 'number'
            ? event.payload.modifier_total
            : 0,
      })
      onRolled?.()
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Не удалось бросить'
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack gap={8} className="session-digital-roll" data-testid="session-digital-roll">
      <Text as="h3">Цифровой бросок</Text>
      <Field label="Подпись">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="session-digital-title"
        />
      </Field>
      <Field label="Формула" hint={parsed.ok ? undefined : parsed.message}>
        <Input
          value={displayDiceNotation(formula)}
          onChange={(e) => setFormula(storageDiceNotation(e.target.value))}
          data-testid="session-digital-formula"
        />
      </Field>
      <div className="dice-roller-panel__adv" role="group" aria-label="Режим">
        <ToggleChip
          main="Преимущество"
          checked={mode === 'advantage'}
          disabled={advDisabled}
          onChange={(on) => setMode(on ? 'advantage' : 'none')}
        />
        <ToggleChip
          main="Помеха"
          checked={mode === 'disadvantage'}
          disabled={advDisabled}
          onChange={(on) => setMode(on ? 'disadvantage' : 'none')}
        />
        {canHide ? (
          <ToggleChip
            main="Скрытый бросок"
            rest={hidden ? 'игроки видят заглушку' : 'всем видно'}
            checked={hidden}
            onChange={setHidden}
            data-testid="session-digital-hidden"
          />
        ) : null}
      </div>
      <Button
        variant="primary"
        disabled={!canRoll}
        onClick={() => void onRoll()}
        data-testid="session-digital-submit"
      >
        {busy ? 'Бросаем…' : 'Бросить'}
      </Button>
      {error ? (
        <Text tone="danger" role="alert">
          {error}
        </Text>
      ) : null}
      {last ? (
        <div>
          <Text>
            {last.formula} = <strong>{last.total}</strong>
          </Text>
          <DiceFaces faces={last.dice} modifierTotal={last.modifierTotal} />
        </div>
      ) : null}
    </Stack>
  )
}
