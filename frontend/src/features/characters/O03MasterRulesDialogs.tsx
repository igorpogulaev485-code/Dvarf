/**
 * O-03: диалоги вариантов действий DMG/XGE (обезоруживание, метка, пробегание/кувырок,
 * взбирание, распознать заклинание, падение, сутки без отдыха).
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
  fallingDamageFormula,
  fallingDiceCount,
  fallingProne,
  noLongRestDc,
  pickActionOrBonus,
  resolveNoLongRestSave,
  rollFallingDamage,
  type ActionOrBonusPick,
} from '../../shared/dnd/o03DmgActions'
import { postSheetRollToSession } from './postSheetRollToSession'
import { useTurnEconomy } from './TurnEconomyContext'
import { Button, Dialog, Field, Input, NumberInput, Stack, Text } from '../../ui'

function rollD20(mod: number): { total: number; natural: number } {
  const natural = 1 + Math.floor(Math.random() * 20)
  return { natural, total: natural + mod }
}

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
    await patchSeatCombat(sessionId, target.ref_id, { damage: amount, damage_type: 'дробящий' })
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
    await patchSessionCombatant(sessionId, target.ref_id, {
      damage: amount,
      damage_type: 'дробящий',
    })
  }
}

function TargetPicker({
  targets,
  targetId,
  onPick,
}: {
  targets: CombatTarget[]
  targetId: string | null
  onPick: (id: string) => void
}) {
  if (targets.length === 0) {
    return <Text tone="muted">Нет целей в текущем бою (S-04).</Text>
  }
  return (
    <ul className="combat-target-picker__list">
      {targets.map((t) => (
        <li key={t.id}>
          <button
            type="button"
            className={`sheet-chip${targetId === t.id ? ' is-on' : ''}`}
            onClick={() => onPick(t.id)}
          >
            {t.name}
          </button>
        </li>
      ))}
    </ul>
  )
}

/* ——— Обезоруживание ——— */
export function DisarmDialog({
  open,
  characterId,
  attackBonus,
  onToast,
  onClose,
}: {
  open: boolean
  characterId: string
  attackBonus: number
  onToast?: (message: string) => void
  onClose: () => void
}) {
  const turnEco = useTurnEconomy()
  const [targetId, setTargetId] = useState<string | null>(null)
  const [itemName, setItemName] = useState('оружие')
  const [twoHanded, setTwoHanded] = useState(false)
  const [targetLarger, setTargetLarger] = useState(false)
  const [targetSmaller, setTargetSmaller] = useState(false)
  const [manualAtk, setManualAtk] = useState<number | null>(null)
  const [manualDef, setManualDef] = useState<number | null>(null)
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
      setItemName('оружие')
      setTwoHanded(false)
      setTargetLarger(false)
      setTargetSmaller(false)
      setManualAtk(null)
      setManualDef(null)
      setBusy(false)
      setError(null)
    }
  }, [open])

  async function resolve() {
    setError(null)
    if (!selected) {
      setError('Выбери цель')
      return
    }
    const gate = turnEco?.canAttack()
    if (gate && !gate.ok) {
      setError(gate.reason)
      return
    }

    let atkTotal: number
    let atkNatural: number | null = null
    if (diceOnTable) {
      if (manualAtk == null || !Number.isFinite(manualAtk)) {
        setError('Введи результат броска атаки')
        return
      }
      atkTotal = manualAtk
    } else {
      const rolled = rollD20(attackBonus)
      atkNatural = rolled.natural
      atkTotal = rolled.total
      if (twoHanded) {
        const disadvantage = rollD20(attackBonus)
        atkTotal = Math.min(rolled.total, disadvantage.total)
        atkNatural = null
      }
    }

    let defTotal: number
    if (diceOnTable) {
      if (manualDef == null || !Number.isFinite(manualDef)) {
        setError('Введи результат проверки цели (Атлетика или Акробатика)')
        return
      }
      defTotal = manualDef
    } else {
      const base = rollD20(0)
      if (targetLarger) {
        const adv = rollD20(0)
        defTotal = Math.max(base.total, adv.total)
      } else if (targetSmaller) {
        const dis = rollD20(0)
        defTotal = Math.min(base.total, dis.total)
      } else {
        defTotal = base.total
      }
    }

    const success = atkTotal >= defTotal
    turnEco?.spendAttack()
    const item = itemName.trim() || 'предмет'
    const outcome = success
      ? `${selected.name} выронил ${item}`
      : `провал · ${selected.name} удержал ${item}`
    const rollNote = diceOnTable
      ? `атака ${atkTotal} vs ${defTotal}`
      : `атака ${atkTotal}${atkNatural != null ? ` (к20=${atkNatural}+${attackBonus})` : ''} vs ${defTotal}`
    const line = `Обезоруживание${twoHanded ? ' (помеха, двуручное)' : ''}: ${rollNote} → ${outcome}`

    setBusy(true)
    try {
      onToast?.(line)
      void postSheetRollToSession({
        openSessionId: turnEco?.openSessionId,
        characterId,
        title: 'Обезоруживание',
        total: atkTotal,
        formula: diceOnTable ? null : `1к20${attackBonus >= 0 ? '+' : ''}${attackBonus}`,
        breakdown: line,
        physicalDice: diceOnTable,
        targetName: selected.name,
      })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      title="Обезоруживание"
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
          Тратит одну атаку. Успех — цель роняет предмет, <strong>урона нет</strong>. Помеха, если
          предмет в двух руках; цель с преимуществом, если больше атакующего.
        </Text>
        <Field label="Цель">
          <TargetPicker targets={foes} targetId={targetId} onPick={setTargetId} />
        </Field>
        <Field label="Предмет">
          <Input value={itemName} onChange={(e) => setItemName(e.target.value)} />
        </Field>
        <label className="field">
          <input type="checkbox" checked={twoHanded} onChange={(e) => setTwoHanded(e.target.checked)} />{' '}
          Предмет в двух руках (помеха атакующему)
        </label>
        <label className="field">
          <input
            type="checkbox"
            checked={targetLarger}
            onChange={(e) => {
              setTargetLarger(e.target.checked)
              if (e.target.checked) setTargetSmaller(false)
            }}
          />{' '}
          Цель больше атакующего (преимущество цели)
        </label>
        <label className="field">
          <input
            type="checkbox"
            checked={targetSmaller}
            onChange={(e) => {
              setTargetSmaller(e.target.checked)
              if (e.target.checked) setTargetLarger(false)
            }}
          />{' '}
          Цель меньше атакующего (помеха цели)
        </label>
        {diceOnTable ? (
          <>
            <Field label={`Бросок атаки (бонус ${attackBonus >= 0 ? '+' : ''}${attackBonus})`}>
              <NumberInput value={manualAtk} onValueChange={setManualAtk} placeholder="Сумма" />
            </Field>
            <Field label="Проверка цели (Атлетика или Акробатика)">
              <NumberInput value={manualDef} onValueChange={setManualDef} placeholder="Сумма цели" />
            </Field>
          </>
        ) : (
          <Text tone="muted">Броски будут сделаны автоматически.</Text>
        )}
        {error ? <Text>{error}</Text> : null}
        <Button type="button" variant="secondary" onClick={onClose}>
          Закрыть
        </Button>
      </Stack>
    </Dialog>
  )
}

/* ——— Метка ——— */
export function MarkDialog({
  open,
  onMark,
  onClose,
}: {
  open: boolean
  onMark: (target: CombatTarget) => void
  onClose: () => void
}) {
  const turnEco = useTurnEconomy()
  const [targetId, setTargetId] = useState<string | null>(null)
  const foes = useMemo(
    () => (turnEco?.targets ?? []).filter((t) => !t.is_ally),
    [turnEco?.targets],
  )
  const selected = foes.find((t) => t.id === targetId) ?? null

  useEffect(() => {
    if (!open) setTargetId(null)
  }, [open])

  return (
    <Dialog
      open={open}
      title="Метка"
      primaryLabel="Пометить"
      secondaryLabel="Отмена"
      onPrimary={() => {
        if (!selected) return
        onMark(selected)
        onClose()
      }}
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Text tone="muted">
          Пометь цель рукопашной атаки. До конца твоего следующего хода провоцированные атаки по
          ней — с преимуществом и без траты реакции (не больше одной в ход).
        </Text>
        <Field label="Цель">
          <TargetPicker targets={foes} targetId={targetId} onPick={setTargetId} />
        </Field>
      </Stack>
    </Dialog>
  )
}

/* ——— Пробегание / Кувырок ——— */
export function OverrunTumbleDialog({
  open,
  mode,
  characterId,
  athleticsMod,
  acrobaticsMod,
  onToast,
  onClose,
}: {
  open: boolean
  mode: 'overrun' | 'tumble'
  characterId: string
  athleticsMod: number
  acrobaticsMod: number
  onToast?: (message: string) => void
  onClose: () => void
}) {
  const turnEco = useTurnEconomy()
  const [targetId, setTargetId] = useState<string | null>(null)
  const [timing, setTiming] = useState<ActionOrBonusPick>('action')
  const [larger, setLarger] = useState(false)
  const [smaller, setSmaller] = useState(false)
  const [manualMine, setManualMine] = useState<number | null>(null)
  const [manualTheirs, setManualTheirs] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const foes = useMemo(
    () => (turnEco?.targets ?? []).filter((t) => !t.is_ally),
    [turnEco?.targets],
  )
  const selected = foes.find((t) => t.id === targetId) ?? null
  const diceOnTable = Boolean(turnEco?.diceOnTable)
  const title = mode === 'overrun' ? 'Пробегание' : 'Кувырок'
  const myMod = mode === 'overrun' ? athleticsMod : acrobaticsMod
  const skillRu = mode === 'overrun' ? 'Атлетика' : 'Акробатика'

  useEffect(() => {
    if (!open) {
      setTargetId(null)
      setLarger(false)
      setSmaller(false)
      setManualMine(null)
      setManualTheirs(null)
      setError(null)
      return
    }
    const actionFree = Boolean(turnEco?.canFeature('action').ok)
    const bonusFree = Boolean(turnEco?.canFeature('bonus').ok)
    const pick = pickActionOrBonus({ actionFree, bonusFree, prefer: 'action' })
    if (pick) setTiming(pick)
  }, [open, turnEco])

  function resolve() {
    setError(null)
    if (!selected) {
      setError('Выбери цель')
      return
    }
    const actionFree = Boolean(turnEco?.canFeature('action').ok)
    const bonusFree = Boolean(turnEco?.canFeature('bonus').ok)
    const pick = pickActionOrBonus({
      actionFree,
      bonusFree,
      prefer: timing,
    })
    if (!pick) {
      setError('Нет свободного действия или бонусного')
      return
    }
    if (pick === 'action') {
      const gate = turnEco?.canFeature('action')
      if (gate && !gate.ok) {
        setError(gate.reason)
        return
      }
    }
    if (pick === 'bonus') {
      const gate = turnEco?.canFeature('bonus')
      if (gate && !gate.ok) {
        setError(gate.reason)
        return
      }
    }

    let mine: number
    if (diceOnTable) {
      if (manualMine == null || !Number.isFinite(manualMine)) {
        setError(`Введи результат ${skillRu}`)
        return
      }
      mine = manualMine
    } else {
      const a = rollD20(myMod)
      if (mode === 'overrun' && larger) {
        const b = rollD20(myMod)
        mine = Math.max(a.total, b.total)
      } else if (mode === 'overrun' && smaller) {
        const b = rollD20(myMod)
        mine = Math.min(a.total, b.total)
      } else {
        mine = a.total
      }
    }

    let theirs: number
    if (diceOnTable) {
      if (manualTheirs == null || !Number.isFinite(manualTheirs)) {
        setError('Введи результат состязания цели')
        return
      }
      theirs = manualTheirs
    } else {
      theirs = rollD20(0).total
    }

    const success = mine >= theirs
    turnEco?.spendFeature(pick)
    const outcome = success
      ? `успех · можно пройти сквозь пространство ${selected.name} (один раз в этот ход)`
      : `провал · ${selected.name}`
    const line = `${title} (${pick === 'action' ? 'действие' : 'бонусное'}): ${skillRu} ${mine} vs ${theirs} → ${outcome}`
    onToast?.(line)
    void postSheetRollToSession({
      openSessionId: turnEco?.openSessionId,
      characterId,
      title,
      total: mine,
      formula: diceOnTable ? null : `1к20${myMod >= 0 ? '+' : ''}${myMod}`,
      breakdown: line,
      physicalDice: diceOnTable,
      targetName: selected.name,
    })
    onClose()
  }

  return (
    <Dialog
      open={open}
      title={title}
      primaryLabel="Провести"
      secondaryLabel="Отмена"
      onPrimary={resolve}
      onSecondary={onClose}
      size="wide"
    >
      <Stack gap={12}>
        <Text tone="muted">
          Действием или бонусным. Успех — пометка в ленте о проходе сквозь пространство цели (без
          карты).
        </Text>
        <div className="chip-row" role="group" aria-label="Отметка">
          {(
            [
              ['action', 'Действие'],
              ['bonus', 'Бонусное'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`sheet-chip${timing === id ? ' is-on' : ''}`}
              disabled={!(turnEco?.canFeature(id).ok)}
              onClick={() => setTiming(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <Field label="Цель">
          <TargetPicker targets={foes} targetId={targetId} onPick={setTargetId} />
        </Field>
        {mode === 'overrun' ? (
          <>
            <label className="field">
              <input
                type="checkbox"
                checked={larger}
                onChange={(e) => {
                  setLarger(e.target.checked)
                  if (e.target.checked) setSmaller(false)
                }}
              />{' '}
              Ты крупнее цели (преимущество)
            </label>
            <label className="field">
              <input
                type="checkbox"
                checked={smaller}
                onChange={(e) => {
                  setSmaller(e.target.checked)
                  if (e.target.checked) setLarger(false)
                }}
              />{' '}
              Ты меньше цели (помеха)
            </label>
          </>
        ) : null}
        {diceOnTable ? (
          <>
            <Field label={`Твоя ${skillRu} (мод. ${myMod >= 0 ? '+' : ''}${myMod})`}>
              <NumberInput value={manualMine} onValueChange={setManualMine} />
            </Field>
            <Field label={`Состязание цели (${skillRu})`}>
              <NumberInput value={manualTheirs} onValueChange={setManualTheirs} />
            </Field>
          </>
        ) : (
          <Text tone="muted">Броски будут сделаны автоматически.</Text>
        )}
        {error ? <Text>{error}</Text> : null}
      </Stack>
    </Dialog>
  )
}

/* ——— Взбирание ——— */
export function ClimbBiggerDialog({
  open,
  characterId,
  athleticsMod,
  acrobaticsMod,
  onToast,
  onClose,
}: {
  open: boolean
  characterId: string
  athleticsMod: number
  acrobaticsMod: number
  onToast?: (message: string) => void
  onClose: () => void
}) {
  const turnEco = useTurnEconomy()
  const [mode, setMode] = useState<'climb' | 'shake'>('climb')
  const [skill, setSkill] = useState<'athletics' | 'acrobatics'>('athletics')
  const [targetId, setTargetId] = useState<string | null>(null)
  const [manualMine, setManualMine] = useState<number | null>(null)
  const [manualTheirs, setManualTheirs] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const foes = useMemo(
    () => (turnEco?.targets ?? []).filter((t) => !t.is_ally),
    [turnEco?.targets],
  )
  const selected = foes.find((t) => t.id === targetId) ?? null
  const diceOnTable = Boolean(turnEco?.diceOnTable)
  const myMod = skill === 'athletics' ? athleticsMod : acrobaticsMod

  useEffect(() => {
    if (!open) {
      setMode('climb')
      setSkill('athletics')
      setTargetId(null)
      setManualMine(null)
      setManualTheirs(null)
      setError(null)
      setBusy(false)
    }
  }, [open])

  async function resolve() {
    setError(null)
    if (!selected) {
      setError('Выбери цель')
      return
    }
    const gate = turnEco?.canFeature('action')
    if (gate && !gate.ok) {
      setError(gate.reason)
      return
    }

    let mine: number
    if (diceOnTable) {
      if (manualMine == null || !Number.isFinite(manualMine)) {
        setError('Введи результат своей проверки')
        return
      }
      mine = manualMine
    } else {
      mine = rollD20(myMod).total
    }
    let theirs: number
    if (diceOnTable) {
      if (manualTheirs == null || !Number.isFinite(manualTheirs)) {
        setError('Введи результат состязания')
        return
      }
      theirs = manualTheirs
    } else {
      theirs = rollD20(0).total
    }

    const success = mine >= theirs
    turnEco?.spendFeature('action')
    const title = mode === 'climb' ? 'Взбирание на большее существо' : 'Сброс с существа'
    let outcome: string
    if (mode === 'climb') {
      outcome = success
        ? `успех · на существе ${selected.name} · атаки по нему с преимуществом`
        : `провал · ${selected.name}`
    } else {
      outcome = success
        ? `успех · ${selected.name} сброшен`
        : `провал · ${selected.name} остаётся на существе`
    }
    const line = `${title}: ${mine} vs ${theirs} → ${outcome}`

    setBusy(true)
    try {
      onToast?.(line)
      void postSheetRollToSession({
        openSessionId: turnEco?.openSessionId,
        characterId,
        title,
        total: mine,
        formula: diceOnTable ? null : `1к20${myMod >= 0 ? '+' : ''}${myMod}`,
        breakdown: line,
        physicalDice: diceOnTable,
        targetName: selected.name,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      title="Взбирание на большее существо"
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
        <div className="chip-row">
          <button
            type="button"
            className={`sheet-chip${mode === 'climb' ? ' is-on' : ''}`}
            onClick={() => setMode('climb')}
          >
            Взбираться
          </button>
          <button
            type="button"
            className={`sheet-chip${mode === 'shake' ? ' is-on' : ''}`}
            onClick={() => setMode('shake')}
          >
            Сбросить
          </button>
        </div>
        <div className="chip-row">
          <button
            type="button"
            className={`sheet-chip${skill === 'athletics' ? ' is-on' : ''}`}
            onClick={() => setSkill('athletics')}
          >
            Атлетика
          </button>
          <button
            type="button"
            className={`sheet-chip${skill === 'acrobatics' ? ' is-on' : ''}`}
            onClick={() => setSkill('acrobatics')}
          >
            Акробатика
          </button>
        </div>
        <Field label="Цель">
          <TargetPicker targets={foes} targetId={targetId} onPick={setTargetId} />
        </Field>
        {diceOnTable ? (
          <>
            <Field label={`Твоя проверка (мод. ${myMod >= 0 ? '+' : ''}${myMod})`}>
              <NumberInput value={manualMine} onValueChange={setManualMine} />
            </Field>
            <Field label="Состязание цели">
              <NumberInput value={manualTheirs} onValueChange={setManualTheirs} />
            </Field>
          </>
        ) : (
          <Text tone="muted">Броски будут сделаны автоматически.</Text>
        )}
        {error ? <Text>{error}</Text> : null}
      </Stack>
    </Dialog>
  )
}

/* ——— Распознать заклинание ——— */
export function IdentifySpellDialog({
  open,
  characterId,
  arcanaMod,
  onToast,
  onClose,
}: {
  open: boolean
  characterId: string
  arcanaMod: number
  onToast?: (message: string) => void
  onClose: () => void
}) {
  const turnEco = useTurnEconomy()
  const [spellLevel, setSpellLevel] = useState(1)
  const [spellName, setSpellName] = useState('')
  const [manualCheck, setManualCheck] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const diceOnTable = Boolean(turnEco?.diceOnTable)

  useEffect(() => {
    if (!open) {
      setSpellLevel(1)
      setSpellName('')
      setManualCheck(null)
      setError(null)
    }
  }, [open])

  function resolve() {
    setError(null)
    const gate = turnEco?.canFeature('reaction')
    if (gate && !gate.ok) {
      setError(gate.reason)
      return
    }
    const level = Math.max(0, Math.min(9, Math.floor(spellLevel)))
    const dc = 15 + level
    let total: number
    if (diceOnTable) {
      if (manualCheck == null || !Number.isFinite(manualCheck)) {
        setError('Введи результат проверки Магии (Анализ)')
        return
      }
      total = manualCheck
    } else {
      total = rollD20(arcanaMod).total
    }
    turnEco?.spendFeature('reaction')
    const success = total >= dc
    const name = spellName.trim() || 'заклинание'
    const outcome = success ? `распознал «${name}»` : 'не распознал'
    const line = `Распознать заклинание: Анализ ${total} vs Сл ${dc} → ${outcome}`
    onToast?.(line)
    void postSheetRollToSession({
      openSessionId: turnEco?.openSessionId,
      characterId,
      title: 'Распознать заклинание',
      total,
      formula: diceOnTable ? null : `1к20${arcanaMod >= 0 ? '+' : ''}${arcanaMod}`,
      breakdown: line,
      physicalDice: diceOnTable,
    })
    onClose()
  }

  return (
    <Dialog
      open={open}
      title="Распознать заклинание"
      primaryLabel="Проверить"
      secondaryLabel="Отмена"
      onPrimary={resolve}
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Text tone="muted">
          Реакция. Проверка Магии (Анализ) Сл 15 + уровень заклинания.
        </Text>
        <Field label="Уровень заклинания">
          <NumberInput
            min={0}
            max={9}
            emptyValue={1}
            value={spellLevel}
            onValueChange={(v) => setSpellLevel(v ?? 1)}
          />
        </Field>
        <Text tone="muted">Сл = {15 + Math.max(0, Math.min(9, Math.floor(spellLevel)))}</Text>
        <Field label="Имя заклинания (при успехе)">
          <Input value={spellName} onChange={(e) => setSpellName(e.target.value)} />
        </Field>
        {diceOnTable ? (
          <Field label={`Анализ (мод. ${arcanaMod >= 0 ? '+' : ''}${arcanaMod})`}>
            <NumberInput value={manualCheck} onValueChange={setManualCheck} />
          </Field>
        ) : (
          <Text tone="muted">Бросок будет сделан автоматически.</Text>
        )}
        {error ? <Text>{error}</Text> : null}
      </Stack>
    </Dialog>
  )
}

/* ——— Падение ——— */
export function FallingDialog({
  open,
  characterId,
  onApplySelfDamage,
  onToast,
  onClose,
}: {
  open: boolean
  characterId: string
  onApplySelfDamage?: (damage: number, prone: boolean) => void
  onToast?: (message: string) => void
  onClose: () => void
}) {
  const turnEco = useTurnEconomy()
  const [feet, setFeet] = useState(30)
  const [targetId, setTargetId] = useState<string | null>('self')
  const [manualTotal, setManualTotal] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const targets = turnEco?.targets ?? []
  const diceOnTable = Boolean(turnEco?.diceOnTable)
  const dice = fallingDiceCount(feet)

  useEffect(() => {
    if (!open) {
      setFeet(30)
      setTargetId('self')
      setManualTotal(null)
      setBusy(false)
      setError(null)
    }
  }, [open])

  async function resolve() {
    setError(null)
    let total: number
    let rolls: number[] = []
    if (diceOnTable) {
      if (manualTotal == null || !Number.isFinite(manualTotal)) {
        setError('Введи сумму урона от падения')
        return
      }
      total = Math.max(0, Math.floor(manualTotal))
    } else {
      const rolled = rollFallingDamage(feet)
      total = rolled.total
      rolls = rolled.rolls
    }
    const prone = fallingProne(total)
    const formula = fallingDamageFormula(feet)
    const rollNote = rolls.length ? ` [${rolls.join('+')}]` : ''
    const line = `Падение ${feet} фт → ${formula}${rollNote} = ${total}${prone ? ' · Опрокинутый' : ''}`

    setBusy(true)
    try {
      if (targetId === 'self' || !targetId) {
        onApplySelfDamage?.(total, prone)
      } else {
        const target = targets.find((t) => t.id === targetId)
        if (target && turnEco?.openSessionId) {
          if (total > 0) await applyHpDamage(turnEco.openSessionId, target, total)
          if (prone) {
            await applyCondition(turnEco.openSessionId, target, 'prone', 'Опрокинутый')
          }
        }
      }
      onToast?.(line)
      void postSheetRollToSession({
        openSessionId: turnEco?.openSessionId,
        characterId,
        title: 'Падение',
        total,
        formula: diceOnTable ? null : formula,
        breakdown: line,
        physicalDice: diceOnTable,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      title="Падение"
      primaryLabel="Применить"
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
          1к6 дробящего за каждые 10 фт, максимум 20к6. При уроне &gt; 0 — «Опрокинутый». По XGE
          существо падает ≈500 фт в первый ход и ещё 500 фт в каждый следующий — без симуляции
          раундов.
        </Text>
        <Field label="Высота (фт)">
          <NumberInput
            min={0}
            emptyValue={0}
            value={feet}
            onValueChange={(v) => setFeet(v ?? 0)}
          />
        </Field>
        <Text tone="muted">
          Формула: {fallingDamageFormula(feet)}
          {dice > 0 ? ` (${dice}к6)` : ''}
        </Text>
        <Field label="Цель">
          <div className="chip-row">
            <button
              type="button"
              className={`sheet-chip${targetId === 'self' ? ' is-on' : ''}`}
              onClick={() => setTargetId('self')}
            >
              Себе
            </button>
            {targets.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`sheet-chip${targetId === t.id ? ' is-on' : ''}`}
                onClick={() => setTargetId(t.id)}
              >
                {t.name}
              </button>
            ))}
          </div>
        </Field>
        {diceOnTable ? (
          <Field label="Сумма урона">
            <NumberInput value={manualTotal} onValueChange={setManualTotal} />
          </Field>
        ) : null}
        {error ? <Text>{error}</Text> : null}
      </Stack>
    </Dialog>
  )
}

/* ——— Сутки без длинного отдыха ——— */
export function NoLongRestDialog({
  open,
  characterId,
  conMod,
  daysAlready,
  onResolved,
  onToast,
  onClose,
}: {
  open: boolean
  characterId: string
  conMod: number
  daysAlready: number
  onResolved: (next: { days: number; exhaustionDelta: number }) => void
  onToast?: (message: string) => void
  onClose: () => void
}) {
  const turnEco = useTurnEconomy()
  const [manualSave, setManualSave] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const diceOnTable = Boolean(turnEco?.diceOnTable)
  const dc = noLongRestDc(daysAlready)

  useEffect(() => {
    if (!open) {
      setManualSave(null)
      setError(null)
    }
  }, [open])

  function resolve() {
    setError(null)
    let total: number
    if (diceOnTable) {
      if (manualSave == null || !Number.isFinite(manualSave)) {
        setError('Введи результат спасброска Телосложения')
        return
      }
      total = manualSave
    } else {
      total = rollD20(conMod).total
    }
    const result = resolveNoLongRestSave({ daysAlready, saveTotal: total })
    const line = `Сутки без длинного отдыха: Тел ${total} vs Сл ${result.dc} → ${
      result.success ? 'успех' : `провал · +1 истощение`
    } (сутки ${result.nextDays})`
    onToast?.(line)
    void postSheetRollToSession({
      openSessionId: turnEco?.openSessionId,
      characterId,
      title: 'Сутки без длинного отдыха',
      total,
      formula: diceOnTable ? null : `1к20${conMod >= 0 ? '+' : ''}${conMod}`,
      breakdown: line,
      physicalDice: diceOnTable,
    })
    onResolved({ days: result.nextDays, exhaustionDelta: result.exhaustionDelta })
    onClose()
  }

  return (
    <Dialog
      open={open}
      title="Сутки без длинного отдыха"
      primaryLabel="Спасбросок"
      secondaryLabel="Отмена"
      onPrimary={resolve}
      onSecondary={onClose}
    >
      <Stack gap={12}>
        <Text tone="muted">
          Спасбросок Телосложения Сл {dc}. При провале +1 степень истощения. Длинный отдых
          сбрасывает счётчик суток.
        </Text>
        <Text tone="muted">Уже учтено суток: {daysAlready}</Text>
        {diceOnTable ? (
          <Field label={`Телосложение (мод. ${conMod >= 0 ? '+' : ''}${conMod})`}>
            <NumberInput value={manualSave} onValueChange={setManualSave} />
          </Field>
        ) : (
          <Text tone="muted">Бросок будет сделан автоматически.</Text>
        )}
        {error ? <Text>{error}</Text> : null}
      </Stack>
    </Dialog>
  )
}
