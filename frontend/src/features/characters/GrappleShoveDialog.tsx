/**
 * O-01: PHB Grapple / Shove as a replacement for one Attack action attack.
 * Spends canSpendAttack / spendAttack (Extra Attack still allows further attacks).
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

export type GrappleShoveMode = 'grapple' | 'shove_prone' | 'shove_push' | 'shove_aside'

type Props = {
  open: boolean
  characterId: string
  athleticsMod: number
  /** Known grappling_strike maneuver + free bonus + superiority die available. */
  offerGrapplingStrike?: boolean
  onSpendGrapplingStrike?: () => boolean
  /** O-03: вариант «Толкание в сторону» (dmg_shove_aside). */
  allowShoveAside?: boolean
  /**
   * O-05: по умолчанию тратит атаку (O-01).
   * `bonus` — бонусное (Драчун / Налётчик / Мастер щита).
   * `action` — действие (Борец: опрокинуть схваченного); если уже потрачено снаружи — `none`.
   */
  spendTiming?: 'attack' | 'bonus' | 'action' | 'none'
  /** Ограничить режимы (например только толчки для Мастера щита). */
  allowedModes?: GrappleShoveMode[]
  titleOverride?: string
  onToast?: (message: string) => void
  onClose: () => void
}

function rollD20(mod: number): { total: number; natural: number } {
  const natural = 1 + Math.floor(Math.random() * 20)
  return { natural, total: natural + mod }
}

export function GrappleShoveDialog({
  open,
  characterId,
  athleticsMod,
  offerGrapplingStrike = false,
  onSpendGrapplingStrike,
  allowShoveAside = false,
  spendTiming = 'attack',
  allowedModes,
  titleOverride,
  onToast,
  onClose,
}: Props) {
  const turnEco = useTurnEconomy()
  const modes: GrappleShoveMode[] = allowedModes?.length
    ? allowedModes
    : allowShoveAside
      ? ['grapple', 'shove_prone', 'shove_push', 'shove_aside']
      : ['grapple', 'shove_prone', 'shove_push']
  const [mode, setMode] = useState<GrappleShoveMode>(modes[0] ?? 'grapple')
  const [targetId, setTargetId] = useState<string | null>(null)
  const [targetContested, setTargetContested] = useState<number | null>(null)
  const [useGrapplingStrike, setUseGrapplingStrike] = useState(false)
  const [strikeDieBonus, setStrikeDieBonus] = useState<number | null>(null)
  const [manualAth, setManualAth] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const targets = turnEco?.targets ?? []
  const foes = useMemo(() => targets.filter((t) => !t.is_ally), [targets])
  const selected = foes.find((t) => t.id === targetId) ?? null
  const diceOnTable = Boolean(turnEco?.diceOnTable)

  useEffect(() => {
    if (!open) {
      setMode(modes[0] ?? 'grapple')
      setTargetId(null)
      setTargetContested(null)
      setUseGrapplingStrike(false)
      setStrikeDieBonus(null)
      setManualAth(null)
      setBusy(false)
      setError(null)
    }
  }, [open, modes[0]])

  async function applyCondition(target: CombatTarget, slug: 'grappled' | 'prone', name: string) {
    const sessionId = turnEco?.openSessionId
    if (!sessionId) return
    const condition: SeatCondition = {
      slug,
      name,
      catalog_id: null,
      duration_rounds: null,
      duration_note: null,
    }
    if (target.kind === 'pc') {
      const existing = Array.isArray(target.conditions)
        ? (target.conditions as SeatCondition[])
        : []
      if (existing.some((c) => c.slug === slug)) return
      await patchSeatCombat(sessionId, target.ref_id, {
        conditions: [...existing, condition],
      })
      return
    }
    if (target.kind === 'companion' && target.companion_id) {
      const existing = Array.isArray(target.conditions)
        ? (target.conditions as SeatCondition[])
        : []
      if (existing.some((c) => c.slug === slug)) return
      await patchSeatCompanion(sessionId, target.ref_id, target.companion_id, {
        conditions: [...existing, condition],
      })
      return
    }
    if (target.kind === 'enemy') {
      const existing = Array.isArray(target.conditions)
        ? (target.conditions as SeatCondition[])
        : []
      if (existing.some((c) => c.slug === slug)) return
      await patchSessionCombatant(sessionId, target.ref_id, {
        conditions: [...existing, condition],
      })
    }
  }

  async function resolve() {
    setError(null)
    if (!selected) {
      setError('Выбери цель')
      return
    }
    const gate =
      spendTiming === 'bonus'
        ? turnEco?.canFeature('bonus')
        : spendTiming === 'action'
          ? turnEco?.canFeature('action')
          : spendTiming === 'none'
            ? { ok: true as const }
            : turnEco?.canAttack()
    if (gate && !gate.ok) {
      setError(gate.reason)
      return
    }

    let strikeBonus = 0
    if (useGrapplingStrike && mode === 'grapple' && spendTiming === 'attack') {
      if (!onSpendGrapplingStrike?.()) {
        setError('Не удалось потратить бонусное и кость превосходства для «Атаки с захватом»')
        return
      }
      if (diceOnTable) {
        if (strikeDieBonus == null || !Number.isFinite(strikeDieBonus)) {
          setError('Введи результат кости превосходства')
          return
        }
        strikeBonus = strikeDieBonus
      } else {
        strikeBonus = 1 + Math.floor(Math.random() * 8)
      }
    }

    let athTotal: number
    let athNatural: number | null = null
    const shoveAsideDisadvantage = mode === 'shove_aside'
    if (diceOnTable) {
      if (manualAth == null || !Number.isFinite(manualAth)) {
        setError(
          shoveAsideDisadvantage
            ? 'Введи результат Атлетики с помехой (меньшее из двух)'
            : 'Введи результат проверки Атлетики',
        )
        return
      }
      athTotal = manualAth + strikeBonus
    } else if (shoveAsideDisadvantage) {
      const a = rollD20(athleticsMod)
      const b = rollD20(athleticsMod)
      const picked = a.total <= b.total ? a : b
      athNatural = picked.natural
      athTotal = picked.total + strikeBonus
    } else {
      const rolled = rollD20(athleticsMod)
      athNatural = rolled.natural
      athTotal = rolled.total + strikeBonus
    }

    let contested: number
    if (diceOnTable) {
      if (targetContested == null || !Number.isFinite(targetContested)) {
        setError('Введи результат состязания цели (Атлетика или Акробатика)')
        return
      }
      contested = targetContested
    } else {
      contested = rollD20(0).total
    }

    const success = athTotal >= contested
    if (spendTiming === 'bonus') turnEco?.spendFeature('bonus')
    else if (spendTiming === 'action') turnEco?.spendFeature('action')
    else if (spendTiming === 'attack') turnEco?.spendAttack()

    const modeRu =
      mode === 'grapple'
        ? 'Захват'
        : mode === 'shove_prone'
          ? 'Толчок (сбить с ног)'
          : mode === 'shove_aside'
            ? 'Толкание в сторону'
            : 'Толчок (на 5 фт)'
    const strikeNote = useGrapplingStrike
      ? ` · Атака с захватом (+${strikeBonus})`
      : ''
    const timingNote =
      spendTiming === 'bonus'
        ? ' · бонусное'
        : spendTiming === 'action'
          ? ' · действие'
          : ''
    const disadvNote = shoveAsideDisadvantage ? ' (помеха)' : ''
    const rollNote = diceOnTable
      ? `Атлетика ${athTotal}${disadvNote} vs ${contested}`
      : `Атлетика ${athTotal}${disadvNote}${athNatural != null ? ` (к20=${athNatural}+${athleticsMod})` : ''} vs ${contested}`

    setBusy(true)
    try {
      if (success) {
        if (mode === 'grapple') {
          await applyCondition(selected, 'grappled', 'Схваченный')
        } else if (mode === 'shove_prone') {
          await applyCondition(selected, 'prone', 'Опрокинутый')
        }
      }
      const outcome = success
        ? mode === 'shove_push'
          ? `успех · ${selected.name} оттолкнут на 5 фт`
          : mode === 'shove_aside'
            ? `успех · ${selected.name} смещён на 5 фт`
            : `успех · ${selected.name}`
        : `провал · ${selected.name}`
      const line = `${modeRu}${strikeNote}${timingNote}: ${rollNote} → ${outcome}`
      onToast?.(line)
      void postSheetRollToSession({
        openSessionId: turnEco?.openSessionId,
        characterId,
        title: modeRu,
        total: athTotal,
        formula: diceOnTable ? null : `1к20${athleticsMod >= 0 ? '+' : ''}${athleticsMod}`,
        breakdown: line,
        physicalDice: diceOnTable,
        targetName: selected.name,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось применить состояние')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      title={titleOverride ?? 'Захват / Толчок'}
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
          {spendTiming === 'bonus'
            ? 'Тратит бонусное действие. '
            : spendTiming === 'action' || spendTiming === 'none'
              ? 'Тратит действие. '
              : 'Тратит одну атаку из действия «Атака» (не всё действие). '}
          Цель не более чем на одну категорию больше и в досягаемости; нужна свободная рука для
          захвата. Состязание Сила (Атлетика) против Атлетики или Акробатики цели.
        </Text>

        <div className="chip-row" role="group" aria-label="Режим">
          {(
            [
              ['grapple', 'Захват'],
              ['shove_prone', 'Толчок: сбить с ног'],
              ['shove_push', 'Толчок: на 5 фт'],
              ...(allowShoveAside
                ? ([['shove_aside', 'Толкание в сторону']] as Array<
                    [GrappleShoveMode, string]
                  >)
                : []),
            ] as Array<[GrappleShoveMode, string]>
          ).filter(([id]) => modes.includes(id))
            .map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`sheet-chip${mode === id ? ' is-on' : ''}`}
                onClick={() => setMode(id)}
              >
                {label}
              </button>
            ))}
        </div>
        {mode === 'shove_aside' ? (
          <Text tone="muted">
            Атлетика атакующего с помехой. Успех — цель смещается на 5 фт в другое пространство в
            досягаемости (не «сбит с ног» и не «от себя»).
          </Text>
        ) : null}

        <Field label="Цель">
          {foes.length === 0 ? (
            <Text tone="muted">Нет целей в текущем бою (S-04).</Text>
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

        {mode === 'grapple' && offerGrapplingStrike ? (
          <label className="field">
            <input
              type="checkbox"
              checked={useGrapplingStrike}
              onChange={(e) => setUseGrapplingStrike(e.target.checked)}
            />{' '}
            Атака с захватом (бонусное + кость превосходства к Атлетике)
          </label>
        ) : null}

        {diceOnTable ? (
          <>
            <Field label={`Твоя Атлетика (мод. ${athleticsMod >= 0 ? '+' : ''}${athleticsMod})`}>
              <NumberInput
                value={manualAth}
                onValueChange={setManualAth}
                placeholder="Сумма с кубиков"
              />
            </Field>
            {useGrapplingStrike ? (
              <Field label="Кость превосходства">
                <NumberInput
                  value={strikeDieBonus}
                  onValueChange={setStrikeDieBonus}
                  placeholder="Результат кости"
                />
              </Field>
            ) : null}
            <Field label="Состязание цели (Атлетика или Акробатика)">
              <NumberInput
                value={targetContested}
                onValueChange={setTargetContested}
                placeholder="Сумма цели"
              />
            </Field>
          </>
        ) : (
          <Text tone="muted">
            Бросок Атлетики ({athleticsMod >= 0 ? '+' : ''}
            {athleticsMod}) и состязание цели будут брошены автоматически.
          </Text>
        )}

        {error ? <Text>{error}</Text> : null}
        <Button type="button" variant="secondary" onClick={onClose}>
          Закрыть
        </Button>
      </Stack>
    </Dialog>
  )
}
