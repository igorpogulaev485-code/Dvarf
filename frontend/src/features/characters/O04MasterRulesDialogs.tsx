/**
 * O-04: диалоги — разрубание, системный шок, незаживающие раны, мораль,
 * очки героя, кость мастерства (ввод с кубиков).
 */
import { useEffect, useMemo, useState } from 'react'
import type { CombatTarget } from '../lobby/combatTargets'
import {
  patchSeatCombat,
  patchSeatCompanion,
  patchSessionCombatant,
  type SeatCondition,
} from '../../shared/api/lobbies'
import {
  LINGERING_INJURIES_TABLE,
  MASSIVE_DAMAGE_DC,
  MORALE_DC,
  MORALE_TRIGGER_HINTS,
  SYSTEM_SHOCK_TABLE,
  cleaveAttackWouldHit,
  heroPointsMaxForLevel,
  lingeringInjuryConditionSlug,
  lookupLingeringInjury,
  lookupSystemShock,
  moraleConditionSlug,
  proficiencyDieSides,
  resolveMoraleSave,
  rollLingeringInjury,
  rollSystemShock,
  triggersMassiveDamage,
  type LingeringInjuryRow,
  type SystemShockRow,
} from '../../shared/dnd/o04DmgAdvanced'
import { postSheetRollToSession } from './postSheetRollToSession'
import { useTurnEconomy } from './TurnEconomyContext'
import { Button, Dialog, Field, NumberInput, Stack, Text } from '../../ui'

async function applyCondition(
  sessionId: string,
  target: CombatTarget,
  slug: string,
  name: string,
  extra?: Partial<SeatCondition>,
) {
  const condition: SeatCondition = {
    slug,
    name,
    catalog_id: null,
    duration_rounds: null,
    duration_note: null,
    ...extra,
  }
  const existing = Array.isArray(target.conditions)
    ? (target.conditions as SeatCondition[])
    : []
  if (existing.some((c) => c.slug === slug)) return
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

async function applyHpDamage(sessionId: string, target: CombatTarget, damage: number) {
  const amount = Math.max(0, Math.floor(damage))
  if (amount <= 0) return
  if (target.kind === 'pc') {
    await patchSeatCombat(sessionId, target.ref_id, { damage: amount })
    return
  }
  if (target.kind === 'companion' && target.companion_id) {
    const cur = target.hp_current
    if (cur == null || !Number.isFinite(cur)) return
    const next = Math.max(0, Math.floor(cur) - amount)
    await patchSeatCompanion(sessionId, target.ref_id, target.companion_id, {
      hp_current: next,
    })
    return
  }
  if (target.kind === 'enemy') {
    await patchSessionCombatant(sessionId, target.ref_id, { damage: amount })
  }
}

function TargetPicker({
  targets,
  targetId,
  onPick,
  note,
}: {
  targets: CombatTarget[]
  targetId: string | null
  onPick: (id: string) => void
  note?: string
}) {
  if (targets.length === 0) {
    return <Text tone="muted">Нет целей боя (S-04).</Text>
  }
  return (
    <div>
      {note ? <Text tone="muted">{note}</Text> : null}
      <div className="chip-row">
        {targets.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`sheet-chip${targetId === t.id ? ' is-on' : ''}`}
            onClick={() => onPick(t.id)}
          >
            {t.name}
            {t.ac != null ? ` · КД ${t.ac}` : ''}
            {t.hp_current != null ? ` · ${t.hp_current}` : ''}
          </button>
        ))}
      </div>
    </div>
  )
}

/** O04-1: перенос остатка урона на вторую цель в 5 фт. */
export function CleaveDialog({
  open,
  characterId,
  overflow,
  attackTotal,
  /** Исключить исходную цель (id). */
  excludeTargetId,
  onToast,
  onClose,
}: {
  open: boolean
  characterId: string
  overflow: number
  attackTotal: number | null
  excludeTargetId?: string | null
  onToast?: (msg: string) => void
  onClose: () => void
}) {
  const turnEco = useTurnEconomy()
  const [targetId, setTargetId] = useState<string | null>(null)
  const [within5, setWithin5] = useState(true)
  const [busy, setBusy] = useState(false)

  const foes = useMemo(
    () =>
      (turnEco?.targets ?? []).filter(
        (t) => !t.is_ally && t.id !== excludeTargetId,
      ),
    [turnEco?.targets, excludeTargetId],
  )

  useEffect(() => {
    if (!open) return
    setTargetId(null)
    setWithin5(true)
  }, [open, overflow])

  const eligible = useMemo(() => {
    if (attackTotal == null) return foes
    return foes.filter((t) => cleaveAttackWouldHit(attackTotal, t.ac ?? null))
  }, [foes, attackTotal])

  const selected = eligible.find((t) => t.id === targetId) ?? null

  async function apply() {
    if (!selected || overflow <= 0 || !within5) return
    const sessionId = turnEco?.openSessionId
    if (!sessionId) {
      onToast?.('Нет активной сессии')
      return
    }
    setBusy(true)
    try {
      await applyHpDamage(sessionId, selected, overflow)
      const line = `Разрубание · остаток ${overflow} → ${selected.name}${
        attackTotal != null ? ` (бросок ${attackTotal} ≥ КД ${selected.ac ?? '?'})` : ''
      }`
      onToast?.(line)
      void postSheetRollToSession({
        openSessionId: sessionId,
        characterId,
        title: 'Разрубание',
        total: overflow,
        breakdown: line,
      })
      onClose()
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Не удалось перенести урон')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      title="Разрубание"
      primaryLabel={busy ? '…' : 'Перенести остаток'}
      onPrimary={() => void apply()}
      primaryDisabled={busy || !selected || !within5 || overflow <= 0}
      secondaryLabel="Пропустить"
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Text>
          Остаток урона: <strong>{overflow}</strong>. Выберите другое существо в 5 фт (и в
          досягаемости), по которому исходный бросок атаки попал бы.
        </Text>
        <label className="campaign-rule-row">
          <input
            type="checkbox"
            checked={within5}
            onChange={(e) => setWithin5(e.target.checked)}
          />
          <span>Цель в 5 фт и в досягаемости</span>
        </label>
        <TargetPicker
          targets={eligible}
          targetId={targetId}
          onPick={setTargetId}
          note={
            attackTotal != null
              ? `Бросок атаки ${attackTotal} — показаны цели, по которым он попал бы (КД ≤ броска).`
              : 'Подтвердите цель вручную (бросок атаки неизвестен).'
          }
        />
        {eligible.length === 0 ? (
          <Text tone="muted">Нет целей, по которым исходный бросок попал бы.</Text>
        ) : null}
      </Stack>
    </Dialog>
  )
}

/** O04-2: спас Сл 15 + таблица системного шока. */
export function MassiveDamageDialog({
  open,
  characterId,
  targetLabel,
  damage,
  hpMax,
  conMod,
  diceOnTable,
  onApplyShock,
  onFailedSave,
  onToast,
  onClose,
}: {
  open: boolean
  characterId?: string | null
  targetLabel: string
  damage: number
  hpMax: number | null
  conMod: number
  diceOnTable?: boolean
  onApplyShock: (row: SystemShockRow, roll: number) => void
  /** Провал спаса — для крючка незаживающих ран. */
  onFailedSave?: () => void
  onToast?: (msg: string) => void
  onClose: () => void
}) {
  const [manualSave, setManualSave] = useState<number | null>(null)
  const [manualShock, setManualShock] = useState<number | null>(null)
  const [phase, setPhase] = useState<'save' | 'shock' | 'done'>('save')
  const [saveTotal, setSaveTotal] = useState<number | null>(null)
  const [shockResult, setShockResult] = useState<{ roll: number; row: SystemShockRow } | null>(
    null,
  )

  useEffect(() => {
    if (!open) return
    setManualSave(null)
    setManualShock(null)
    setPhase('save')
    setSaveTotal(null)
    setShockResult(null)
  }, [open, damage])

  const qualifies = triggersMassiveDamage({ enabled: true, damage, hpMax })

  function rollSave() {
    if (diceOnTable) {
      if (manualSave == null) {
        onToast?.('Введите результат спасброска Телосложения')
        return
      }
      const total = Math.floor(manualSave)
      setSaveTotal(total)
      finishSave(total)
      return
    }
    const natural = 1 + Math.floor(Math.random() * 20)
    const total = natural + conMod
    setSaveTotal(total)
    onToast?.(
      `Массивный урон · ${targetLabel}: спас Тел ${natural}${conMod >= 0 ? '+' : ''}${conMod}=${total} против Сл ${MASSIVE_DAMAGE_DC}`,
    )
    if (characterId) {
      void postSheetRollToSession({
        characterId,
        title: `Массивный урон · спас Тел · ${targetLabel}`,
        total,
        formula: `1d20${conMod >= 0 ? '+' : ''}${conMod}`,
      })
    }
    finishSave(total)
  }

  function finishSave(total: number) {
    if (total >= MASSIVE_DAMAGE_DC) {
      setPhase('done')
      onToast?.(`Массивный урон · ${targetLabel}: спасен (Сл ${MASSIVE_DAMAGE_DC})`)
      return
    }
    onFailedSave?.()
    setPhase('shock')
  }

  function rollShock() {
    let result: { roll: number; row: SystemShockRow }
    if (diceOnTable) {
      if (manualShock == null) {
        onToast?.('Введите к10 системного шока')
        return
      }
      const roll = Math.max(1, Math.min(10, Math.floor(manualShock)))
      result = { roll, row: lookupSystemShock(roll) }
    } else {
      result = rollSystemShock()
    }
    setShockResult(result)
    onApplyShock(result.row, result.roll)
    onToast?.(
      `Системный шок · ${targetLabel}: к10=${result.roll} · ${result.row.nameRu}. ${result.row.effectRu}`,
    )
    if (characterId) {
      void postSheetRollToSession({
        characterId,
        title: `Системный шок · ${targetLabel}`,
        total: result.roll,
        breakdown: result.row.nameRu,
      })
    }
    setPhase('done')
  }

  return (
    <Dialog
      open={open}
      title="Массивный урон"
      primaryLabel={
        phase === 'save' ? 'Спасбросок Тел' : phase === 'shock' ? 'Бросок шока' : 'Готово'
      }
      onPrimary={() => {
        if (phase === 'save') rollSave()
        else if (phase === 'shock') rollShock()
        else onClose()
      }}
      secondaryLabel="Закрыть"
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Text>
          {targetLabel}: урон <strong>{damage}</strong>
          {hpMax != null ? ` (половина макс. ${Math.ceil(hpMax / 2)} из ${hpMax})` : ''}.
          {!qualifies ? ' Порог не достигнут — диалог справочный.' : null}
        </Text>
        <Text tone="muted">Спасбросок Телосложения Сл {MASSIVE_DAMAGE_DC}.</Text>
        {diceOnTable && phase === 'save' ? (
          <Field label="Результат спаса (с кубиков)">
            <NumberInput
              min={1}
              max={40}
              emptyValue={null}
              value={manualSave}
              onValueChange={(v) => setManualSave(v)}
            />
          </Field>
        ) : null}
        {saveTotal != null ? (
          <Text>
            Итог спаса: {saveTotal} —{' '}
            {saveTotal >= MASSIVE_DAMAGE_DC ? 'успех' : 'провал → системный шок'}
          </Text>
        ) : null}
        {phase === 'shock' ? (
          <>
            <Text tone="muted">Таблица «Системный шок» (к10):</Text>
            <ul className="campaign-rules-summary">
              {SYSTEM_SHOCK_TABLE.map((row) => (
                <li key={`${row.min}-${row.max}`}>
                  {row.min === row.max ? row.min : `${row.min}–${row.max}`}: {row.effectRu}
                </li>
              ))}
            </ul>
            {diceOnTable ? (
              <Field label="к10 (с кубиков)">
                <NumberInput
                  min={1}
                  max={10}
                  emptyValue={null}
                  value={manualShock}
                  onValueChange={(v) => setManualShock(v)}
                />
              </Field>
            ) : null}
          </>
        ) : null}
        {shockResult ? (
          <Text>
            к10={shockResult.roll}: <strong>{shockResult.row.nameRu}</strong> —{' '}
            {shockResult.row.effectRu}
          </Text>
        ) : null}
      </Stack>
    </Dialog>
  )
}

/** O04-3: таблица незаживающих ран. */
export function LingeringInjuryDialog({
  open,
  characterId,
  reason,
  diceOnTable,
  onApplyInjury,
  onToast,
  onClose,
}: {
  open: boolean
  characterId?: string | null
  reason: string
  diceOnTable?: boolean
  onApplyInjury: (row: LingeringInjuryRow, roll: number) => void
  onToast?: (msg: string) => void
  onClose: () => void
}) {
  const [manual, setManual] = useState<number | null>(null)
  const [result, setResult] = useState<{ roll: number; row: LingeringInjuryRow } | null>(null)

  useEffect(() => {
    if (!open) return
    setManual(null)
    setResult(null)
  }, [open, reason])

  function roll() {
    let next: { roll: number; row: LingeringInjuryRow }
    if (diceOnTable) {
      if (manual == null) {
        onToast?.('Введите к20 незаживающей раны')
        return
      }
      const rollN = Math.max(1, Math.min(20, Math.floor(manual)))
      next = { roll: rollN, row: lookupLingeringInjury(rollN) }
    } else {
      next = rollLingeringInjury()
    }
    setResult(next)
    onApplyInjury(next.row, next.roll)
    onToast?.(
      `Незаживающая рана (${reason}): к20=${next.roll} · ${next.row.nameRu}. ${next.row.effectRu}`,
    )
    if (characterId) {
      void postSheetRollToSession({
        characterId,
        title: `Незаживающая рана · ${reason}`,
        total: next.roll,
        breakdown: next.row.nameRu,
      })
    }
  }

  return (
    <Dialog
      open={open}
      title="Незаживающие раны"
      primaryLabel={result ? 'Готово' : 'Бросок к20'}
      onPrimary={() => {
        if (result) onClose()
        else roll()
      }}
      secondaryLabel="Закрыть"
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Text>
          Повод: <strong>{reason}</strong>
        </Text>
        <Text tone="muted">Таблица DMG 2014 (к20):</Text>
        <ul className="campaign-rules-summary">
          {LINGERING_INJURIES_TABLE.map((row) => (
            <li key={row.key}>
              {row.min === row.max ? row.min : `${row.min}–${row.max}`}: {row.nameRu}
            </li>
          ))}
        </ul>
        {diceOnTable && !result ? (
          <Field label="к20 (с кубиков)">
            <NumberInput
              min={1}
              max={20}
              emptyValue={null}
              value={manual}
              onValueChange={(v) => setManual(v)}
            />
          </Field>
        ) : null}
        {result ? (
          <Text>
            к20={result.roll}: <strong>{result.row.nameRu}</strong> — {result.row.effectRu}
          </Text>
        ) : null}
      </Stack>
    </Dialog>
  )
}

/** O04-4: проверка морали (только враги). */
export function MoraleCheckDialog({
  open,
  sessionId: sessionIdProp,
  enemies: enemiesProp,
  diceOnTable: diceOnTableProp,
  onToast,
  onClose,
}: {
  open: boolean
  /** Со стола мастера — без TurnEconomy. */
  sessionId?: string | null
  enemies?: CombatTarget[]
  diceOnTable?: boolean
  onToast?: (msg: string) => void
  onClose: () => void
}) {
  const turnEco = useTurnEconomy()
  const enemies = useMemo(() => {
    if (enemiesProp) return enemiesProp.filter((t) => t.kind === 'enemy' || !t.is_ally)
    return (turnEco?.targets ?? []).filter((t) => t.kind === 'enemy')
  }, [enemiesProp, turnEco?.targets])
  const diceOnTable = diceOnTableProp ?? Boolean(turnEco?.diceOnTable)
  const sessionId = sessionIdProp || turnEco?.openSessionId || ''
  const [selected, setSelected] = useState<string[]>([])
  const [hints, setHints] = useState<Record<string, boolean>>({})
  const [wisMod, setWisMod] = useState(0)
  const [manualSave, setManualSave] = useState<number | null>(null)
  const [overwhelming, setOverwhelming] = useState(false)
  const [surrenderInstead, setSurrenderInstead] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setSelected(enemies.map((e) => e.id))
    setHints({})
    setWisMod(0)
    setManualSave(null)
    setOverwhelming(false)
    setSurrenderInstead(false)
  }, [open, enemies])

  function toggleEnemy(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function runCheck() {
    const targets = enemies.filter((e) => selected.includes(e.id))
    if (!targets.length) {
      onToast?.('Выберите врагов')
      return
    }
    if (!sessionId) {
      onToast?.('Нет активной сессии')
      return
    }
    setBusy(true)
    try {
      let total: number
      if (diceOnTable) {
        if (manualSave == null) {
          onToast?.('Введите результат спаса Мудрости')
          setBusy(false)
          return
        }
        total = Math.floor(manualSave)
      } else {
        const natural = 1 + Math.floor(Math.random() * 20)
        total = natural + wisMod
        onToast?.(
          `Мораль: спас Мдр ${natural}${wisMod >= 0 ? '+' : ''}${wisMod}=${total} против Сл ${MORALE_DC}`,
        )
      }
      const resolved = resolveMoraleSave({
        saveTotal: total,
        overwhelming,
      })
      let outcome = resolved.outcome
      if (!resolved.success && surrenderInstead) outcome = 'surrender'
      const slug = moraleConditionSlug(outcome)
      const label =
        outcome === 'flee' ? 'Бежит' : outcome === 'surrender' ? 'Сдаётся' : 'Держится'
      const hintText = MORALE_TRIGGER_HINTS.filter((h) => hints[h.id])
        .map((h) => h.labelRu)
        .join('; ')
      for (const t of targets) {
        if (slug) {
          await applyCondition(sessionId, t, slug, label, {
            duration_note: hintText || 'Проверка морали DMG',
          })
        }
      }
      const names = targets.map((t) => t.name).join(', ')
      onToast?.(
        resolved.success
          ? `Мораль · ${names}: держатся (спас ${total} ≥ Сл ${resolved.dc})`
          : `Мораль · ${names}: ${label.toLowerCase()} (спас ${total} < Сл ${resolved.dc}${
              overwhelming ? ', подавляющее превосходство' : ''
            })`,
      )
      onClose()
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Ошибка проверки морали')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      title="Проверка морали"
      primaryLabel={busy ? '…' : 'Спас Мудрости'}
      onPrimary={() => void runCheck()}
      primaryDisabled={busy || selected.length === 0}
      secondaryLabel="Отмена"
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Text tone="muted">
          Только враги/НПС. Спасбросок Мудрости Сл {MORALE_DC}. Провал — бежит (или сдаётся, если
          отмечено). Игроков этим правилом не гоняем.
        </Text>
        <div>
          <Text tone="muted">Поводы (подсказки, не автодетект)</Text>
          <Stack gap={4}>
            {MORALE_TRIGGER_HINTS.map((h) => (
              <label key={h.id} className="campaign-rule-row">
                <input
                  type="checkbox"
                  checked={Boolean(hints[h.id])}
                  onChange={(e) =>
                    setHints((prev) => ({ ...prev, [h.id]: e.target.checked }))
                  }
                />
                <span>{h.labelRu}</span>
              </label>
            ))}
          </Stack>
        </div>
        <label className="campaign-rule-row">
          <input
            type="checkbox"
            checked={overwhelming}
            onChange={(e) => setOverwhelming(e.target.checked)}
          />
          <span>Подавляющее превосходство (автопровал / как помеха по решению мастера)</span>
        </label>
        <label className="campaign-rule-row">
          <input
            type="checkbox"
            checked={surrenderInstead}
            onChange={(e) => setSurrenderInstead(e.target.checked)}
          />
          <span>При провале — «сдаётся», а не «бежит»</span>
        </label>
        <Field label="Модификатор Мудрости вожака / группы">
          <NumberInput
            min={-5}
            max={10}
            emptyValue={0}
            value={wisMod}
            onValueChange={(v) => setWisMod(v ?? 0)}
          />
        </Field>
        {diceOnTable ? (
          <Field label="Результат спаса (с кубиков)">
            <NumberInput
              min={1}
              max={40}
              emptyValue={null}
              value={manualSave}
              onValueChange={(v) => setManualSave(v)}
            />
          </Field>
        ) : null}
        <div>
          <Text tone="muted">Враги</Text>
          <div className="chip-row">
            {enemies.map((e) => (
              <button
                key={e.id}
                type="button"
                className={`sheet-chip${selected.includes(e.id) ? ' is-on' : ''}`}
                onClick={() => toggleEnemy(e.id)}
              >
                {e.name}
              </button>
            ))}
          </div>
          {enemies.length === 0 ? <Text tone="muted">Нет врагов на столе.</Text> : null}
        </div>
      </Stack>
    </Dialog>
  )
}

/** O04-5: трата очка героя. */
export function HeroPointSpendDialog({
  open,
  remaining,
  level,
  isDying,
  diceOnTable,
  onSpendD6,
  onStabilizeOrDeathSuccess,
  onToast,
  onClose,
}: {
  open: boolean
  remaining: number
  level: number
  isDying: boolean
  diceOnTable?: boolean
  onSpendD6: (d6: number) => void
  onStabilizeOrDeathSuccess: (mode: 'stabilize' | 'death_success') => void
  onToast?: (msg: string) => void
  onClose: () => void
}) {
  const [manualD6, setManualD6] = useState<number | null>(null)
  const max = heroPointsMaxForLevel(level)

  useEffect(() => {
    if (!open) return
    setManualD6(null)
  }, [open])

  function spendD6() {
    if (remaining <= 0) {
      onToast?.('Нет очков героя')
      return
    }
    let d6: number
    if (diceOnTable) {
      if (manualD6 == null) {
        onToast?.('Введите к6')
        return
      }
      d6 = Math.max(1, Math.min(6, Math.floor(manualD6)))
    } else {
      d6 = 1 + Math.floor(Math.random() * 6)
    }
    onSpendD6(d6)
    onToast?.(`Очко героя: +${d6} (к6) к броску d20 · осталось ${remaining - 1}`)
    onClose()
  }

  return (
    <Dialog
      open={open}
      title="Очки героя"
      primaryLabel="Закрыть"
      onPrimary={onClose}
      secondaryLabel="Отмена"
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Text>
          Запас: <strong>{remaining}</strong> / {max} (уровень {level}).
        </Text>
        <Text tone="muted">
          После броска атаки, проверки или спасброска, но до объявления исхода — добавить 1к6 к
          d20. Либо автоматически стабилизировать умирающего / успех на спасброске от смерти.
        </Text>
        {diceOnTable ? (
          <Field label="к6 (с кубиков)">
            <NumberInput
              min={1}
              max={6}
              emptyValue={null}
              value={manualD6}
              onValueChange={(v) => setManualD6(v)}
            />
          </Field>
        ) : null}
        <div className="chip-row">
          <Button type="button" disabled={remaining <= 0} onClick={spendD6}>
            +1к6 к d20
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={remaining <= 0 || !isDying}
            onClick={() => {
              onStabilizeOrDeathSuccess('stabilize')
              onToast?.(`Очко героя: стабилизация · осталось ${remaining - 1}`)
              onClose()
            }}
          >
            Стабилизировать
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={remaining <= 0 || !isDying}
            onClick={() => {
              onStabilizeOrDeathSuccess('death_success')
              onToast?.(`Очко героя: успех на спасброске от смерти · осталось ${remaining - 1}`)
              onClose()
            }}
          >
            Успех спасброска от смерти
          </Button>
        </div>
      </Stack>
    </Dialog>
  )
}

/** O04-7: ввод кости мастерства в режиме «Кубики на столе». */
export function ProficiencyDieDialog({
  open,
  proficiencyBonus,
  onConfirm,
  onClose,
}: {
  open: boolean
  proficiencyBonus: number
  onConfirm: (roll: number) => void
  onClose: () => void
}) {
  const sides = proficiencyDieSides(proficiencyBonus) ?? 4
  const [value, setValue] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    setValue(null)
  }, [open, sides])

  return (
    <Dialog
      open={open}
      title="Кость мастерства"
      primaryLabel="Подставить"
      onPrimary={() => {
        if (value == null) return
        onConfirm(Math.max(1, Math.min(sides, Math.floor(value))))
      }}
      primaryDisabled={value == null}
      secondaryLabel="Отмена"
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Text>
          БМ {proficiencyBonus} → бросьте <strong>к{sides}</strong> и введите результат.
        </Text>
        <Field label={`к${sides}`}>
          <NumberInput
            min={1}
            max={sides}
            emptyValue={null}
            value={value}
            onValueChange={(v) => setValue(v)}
          />
        </Field>
      </Stack>
    </Dialog>
  )
}

export {
  applyCondition,
  applyHpDamage,
  lingeringInjuryConditionSlug,
}
