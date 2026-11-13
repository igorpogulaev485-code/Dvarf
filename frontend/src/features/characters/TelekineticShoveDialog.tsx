/**
 * O-05: Телекинез — бонусный толчок (состязание хар-ки vs Сила/Ловк. цели).
 */

import { useEffect, useMemo, useState } from 'react'
import type { CombatTarget } from '../lobby/combatTargets'
import {
  patchSeatCombat,
  patchSeatCompanion,
  patchSessionCombatant,
  type SeatCondition,
} from '../../shared/api/lobbies'
import { postSheetRollToSession } from './postSheetRollToSession'
import { useTurnEconomy } from './TurnEconomyContext'
import { Button, Dialog, Field, NumberInput, Stack, Text } from '../../ui'

type Props = {
  open: boolean
  characterId: string
  /** Модификатор заклинательной характеристики. */
  spellAbilityMod: number
  abilityLabel?: string
  onToast?: (message: string) => void
  onClose: () => void
}

function rollD20(mod: number): { total: number; natural: number } {
  const natural = 1 + Math.floor(Math.random() * 20)
  return { natural, total: natural + mod }
}

export function TelekineticShoveDialog({
  open,
  characterId,
  spellAbilityMod,
  abilityLabel = 'хар-ка',
  onToast,
  onClose,
}: Props) {
  const turnEco = useTurnEconomy()
  const [targetId, setTargetId] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<'prone' | 'push'>('prone')
  const [manualCheck, setManualCheck] = useState<number | null>(null)
  const [targetContested, setTargetContested] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const foes = useMemo(
    () => (turnEco?.targets ?? []).filter((t) => !t.is_ally),
    [turnEco?.targets],
  )
  const selected = foes.find((t) => t.id === targetId) ?? null
  const diceOnTable = Boolean(turnEco?.diceOnTable)

  useEffect(() => {
    if (!open) {
      setTargetId(null)
      setOutcome('prone')
      setManualCheck(null)
      setTargetContested(null)
      setBusy(false)
      setError(null)
    }
  }, [open])

  async function applyProne(target: CombatTarget) {
    const sessionId = turnEco?.openSessionId
    if (!sessionId) return
    const condition: SeatCondition = {
      slug: 'prone',
      name: 'Опрокинутый',
      catalog_id: null,
      duration_rounds: null,
      duration_note: null,
    }
    const existing = Array.isArray(target.conditions)
      ? (target.conditions as SeatCondition[])
      : []
    if (existing.some((c) => c.slug === 'prone')) return
    const next = [...existing, condition]
    if (target.kind === 'pc') {
      await patchSeatCombat(sessionId, target.ref_id, { conditions: next })
      return
    }
    if (target.kind === 'companion' && target.companion_id) {
      await patchSeatCompanion(sessionId, target.ref_id, target.companion_id, {
        conditions: next,
      })
      return
    }
    if (target.kind === 'enemy') {
      await patchSessionCombatant(sessionId, target.ref_id, { conditions: next })
    }
  }

  async function resolve() {
    setError(null)
    if (!selected) {
      setError('Выбери цель')
      return
    }
    const gate = turnEco?.canFeature('bonus')
    if (gate && !gate.ok) {
      setError(gate.reason)
      return
    }

    let checkTotal: number
    let natural: number | null = null
    if (diceOnTable) {
      if (manualCheck == null || !Number.isFinite(manualCheck)) {
        setError(`Введи результат проверки (${abilityLabel})`)
        return
      }
      checkTotal = manualCheck
    } else {
      const rolled = rollD20(spellAbilityMod)
      natural = rolled.natural
      checkTotal = rolled.total
    }

    let contested: number
    if (diceOnTable) {
      if (targetContested == null || !Number.isFinite(targetContested)) {
        setError('Введи результат состязания цели (Сила или Ловкость)')
        return
      }
      contested = targetContested
    } else {
      contested = rollD20(0).total
    }

    const success = checkTotal >= contested
    turnEco?.spendFeature('bonus')

    const modeRu =
      outcome === 'prone' ? 'Телекинез: опрокинуть' : 'Телекинез: сдвинуть 5 фт'
    const rollNote = diceOnTable
      ? `${abilityLabel} ${checkTotal} vs ${contested}`
      : `${abilityLabel} ${checkTotal}${natural != null ? ` (к20=${natural}+${spellAbilityMod})` : ''} vs ${contested}`

    setBusy(true)
    try {
      if (success && outcome === 'prone') {
        await applyProne(selected)
      }
      const result = success
        ? outcome === 'prone'
          ? `успех · ${selected.name} опрокинут`
          : `успех · ${selected.name} сдвинут на 5 фт`
        : `провал · ${selected.name}`
      const line = `${modeRu}: ${rollNote} → ${result}`
      onToast?.(line)
      void postSheetRollToSession({
        openSessionId: turnEco?.openSessionId,
        characterId,
        title: modeRu,
        total: checkTotal,
        formula: diceOnTable
          ? null
          : `1к20${spellAbilityMod >= 0 ? '+' : ''}${spellAbilityMod}`,
        breakdown: line,
        physicalDice: diceOnTable,
        targetName: selected.name,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось применить')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      title="Толчок (Телекинез)"
      primaryLabel="Провести"
      secondaryLabel="Отмена"
      busy={busy}
      onPrimary={() => {
        void resolve()
      }}
      onSecondary={onClose}
      size="wide"
    >
      <Stack gap={12}>
        <Text tone="muted">
          Бонусное действие. Видимое существо в 30 фт. Состязание твоей заклинательной
          характеристики против Силы или Ловкости цели. Успех — сбить с ног или сдвинуть на 5 фт.
        </Text>
        {error ? <Text tone="muted">{error}</Text> : null}
        <div className="chip-row" role="group" aria-label="Исход">
          <button
            type="button"
            className={`sheet-chip${outcome === 'prone' ? ' is-on' : ''}`}
            onClick={() => setOutcome('prone')}
          >
            Сбить с ног
          </button>
          <button
            type="button"
            className={`sheet-chip${outcome === 'push' ? ' is-on' : ''}`}
            onClick={() => setOutcome('push')}
          >
            Сдвинуть 5 фт
          </button>
        </div>
        <Field label="Цель">
          {foes.length === 0 ? (
            <Text tone="muted">Нет целей в текущем бою</Text>
          ) : (
            <ul className="combat-target-picker__list">
              {foes.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className={`sheet-chip${targetId === t.id ? ' is-on' : ''}`}
                    onClick={() => setTargetId(t.id)}
                  >
                    {t.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Field>
        {diceOnTable ? (
          <>
            <Field
              label={`Твоя проверка (${abilityLabel} ${spellAbilityMod >= 0 ? '+' : ''}${spellAbilityMod})`}
            >
              <NumberInput
                value={manualCheck}
                onValueChange={setManualCheck}
                placeholder="Сумма"
              />
            </Field>
            <Field label="Состязание цели (Сила или Ловкость)">
              <NumberInput
                value={targetContested}
                onValueChange={setTargetContested}
                placeholder="Сумма цели"
              />
            </Field>
          </>
        ) : null}
        <Button type="button" variant="secondary" onClick={onClose}>
          Отмена
        </Button>
      </Stack>
    </Dialog>
  )
}
