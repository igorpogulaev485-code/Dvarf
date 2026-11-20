import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Dialog, Field, NumberInput, Stack, Text } from '../../ui'
import {
  parseDamageExpression,
  type BonusDiePart,
  type DeskRollMode,
} from './deskRolls'

export type EnterOwnNumberMode = 'total' | 'd20' | 'formula'

export type EnterOwnNumberConfirm = {
  total: number
  d20?: number
  d20Secondary?: number
  faces?: number[]
  bonusValues?: number[]
  physical_dice: true
  breakdown?: string
}

type Props = {
  open: boolean
  title?: string
  /** Подпись поля: итог, выпавшее на d20, или грани формулы урона/лечения. */
  mode?: EnterOwnNumberMode
  modifier?: number
  /** Advantage / disadvantage — два поля к20 (только mode=d20). */
  advantageMode?: DeskRollMode
  /** Для mode=formula: выражение вроде `2d6+3` / `1к10`. */
  formula?: string | null
  /** Mark d4 / Bless — ввод лицом, не цифровой RNG. */
  bonusDice?: BonusDiePart[] | null
  busy?: boolean
  onClose: () => void
  onConfirm: (payload: EnterOwnNumberConfirm) => void
  /** SC-02: укрытие / состояния цели в окне «кубики на столе». */
  modifiersSlot?: ReactNode
}

type BonusSlot = {
  key: string
  label: string
  sides: number
  partIndex: number
  faceIndex: number
}

function expandBonusSlots(parts: BonusDiePart[] | null | undefined): BonusSlot[] {
  if (!parts?.length) return []
  const out: BonusSlot[] = []
  parts.forEach((part, partIndex) => {
    const match = String(part.dice).trim().match(/^(\d*)[dк](\d+)$/i)
    if (!match) return
    const count = Math.max(1, Number(match[1] || 1))
    const sides = Math.max(2, Number(match[2]))
    for (let faceIndex = 0; faceIndex < count; faceIndex += 1) {
      out.push({
        key: `${partIndex}-${faceIndex}`,
        label: count > 1 ? `${part.label} · к${sides} #${faceIndex + 1}` : part.label,
        sides,
        partIndex,
        faceIndex,
      })
    }
  })
  return out
}

/**
 * T-01: «Ввести своё число» у любого броска — пометка «кубик на столе» в ленте.
 * Physical-режим: adv/disadv (два к20), формула урона/лечения, доп. кости вводом.
 */
export function EnterOwnNumberDialog({
  open,
  title = 'Ввести своё число',
  mode = 'total',
  modifier = 0,
  advantageMode = 'normal',
  formula = null,
  bonusDice = null,
  busy = false,
  onClose,
  onConfirm,
  modifiersSlot,
}: Props) {
  const needsTwoD20 = mode === 'd20' && advantageMode !== 'normal'
  const parsed = useMemo(
    () => (mode === 'formula' ? parseDamageExpression(formula ?? '') : null),
    [mode, formula],
  )
  const faceCount = parsed ? parsed.count : 0
  const bonusSlots = useMemo(() => expandBonusSlots(bonusDice), [bonusDice])

  const [value, setValue] = useState<number | null>(null)
  const [value2, setValue2] = useState<number | null>(null)
  const [faces, setFaces] = useState<Array<number | null>>([])
  const [bonusFaces, setBonusFaces] = useState<Array<number | null>>([])

  useEffect(() => {
    if (!open) {
      setValue(null)
      setValue2(null)
      setFaces([])
      setBonusFaces([])
      return
    }
    setValue(null)
    setValue2(null)
    setFaces(mode === 'formula' && faceCount > 0 ? Array(faceCount).fill(null) : [])
    setBonusFaces(bonusSlots.length ? Array(bonusSlots.length).fill(null) : [])
  }, [open, mode, faceCount, bonusSlots.length])

  const keptD20 = useMemo(() => {
    if (mode !== 'd20' || value == null) return null
    if (!needsTwoD20 || value2 == null) return value
    return advantageMode === 'advantage' ? Math.max(value, value2) : Math.min(value, value2)
  }, [mode, value, value2, needsTwoD20, advantageMode])

  const facesReady =
    mode !== 'formula' ||
    (parsed != null &&
      faces.length === faceCount &&
      faces.every((n) => n != null && Number.isFinite(n)))

  const bonusReady =
    bonusSlots.length === 0 ||
    (bonusFaces.length === bonusSlots.length &&
      bonusFaces.every((n) => n != null && Number.isFinite(n)))

  const bonusSum = bonusFaces.reduce<number>((acc, n) => acc + (n ?? 0), 0)

  const formulaSum =
    mode === 'formula' && parsed
      ? faces.reduce<number>((acc, n) => acc + (n ?? 0), 0) + parsed.modifier
      : null

  const total = useMemo(() => {
    if (mode === 'd20') {
      if (keptD20 == null) return null
      if (needsTwoD20 && value2 == null) return null
      return keptD20 + modifier + bonusSum
    }
    if (mode === 'formula') {
      if (parsed) {
        if (formulaSum == null || !facesReady) return null
        return formulaSum + bonusSum
      }
      // Unparsed formula — single total field.
      if (value == null) return null
      return value + bonusSum
    }
    if (value == null) return null
    return value + bonusSum
  }, [
    mode,
    keptD20,
    needsTwoD20,
    value2,
    modifier,
    bonusSum,
    formulaSum,
    facesReady,
    value,
    parsed,
  ])

  const canConfirm = total != null && facesReady && bonusReady && (mode !== 'd20' || value != null)

  const advLabel =
    advantageMode === 'advantage'
      ? 'преимущество — берём большее'
      : advantageMode === 'disadvantage'
        ? 'помеха — берём меньшее'
        : null

  return (
    <Dialog
      open={open}
      title={title}
      primaryLabel="Записать"
      secondaryLabel="Отмена"
      busy={busy}
      onSecondary={onClose}
      onPrimary={() => {
        if (total == null || !canConfirm) return
        const filledFaces =
          mode === 'formula'
            ? faces.map((n) => Math.floor(n as number))
            : undefined
        const filledBonus =
          bonusSlots.length > 0
            ? bonusFaces.map((n) => Math.floor(n as number))
            : undefined
        const bits: string[] = []
        if (mode === 'd20' && keptD20 != null) {
          if (needsTwoD20 && value != null && value2 != null) {
            bits.push(`к20: ${value}/${value2} → ${keptD20}`)
          } else {
            bits.push(`к20: ${keptD20}`)
          }
          if (modifier) bits.push(modifier > 0 ? `+${modifier}` : String(modifier))
        } else if (mode === 'formula' && parsed && filledFaces) {
          bits.push(
            `${parsed.count}d${parsed.sides}: ${filledFaces.join('+')}${
              parsed.modifier
                ? parsed.modifier > 0
                  ? `+${parsed.modifier}`
                  : String(parsed.modifier)
                : ''
            }`,
          )
        }
        if (filledBonus?.length) {
          bits.push(
            bonusSlots
              .map((slot, i) => `+${filledBonus[i]} (${slot.label})`)
              .join(' · '),
          )
        }
        onConfirm({
          total,
          ...(mode === 'd20' && keptD20 != null ? { d20: keptD20 } : {}),
          ...(mode === 'd20' && needsTwoD20 && value2 != null
            ? { d20Secondary: value2 }
            : {}),
          ...(filledFaces ? { faces: filledFaces } : {}),
          ...(filledBonus ? { bonusValues: filledBonus } : {}),
          physical_dice: true,
          ...(bits.length ? { breakdown: bits.join(' · ') } : {}),
        })
      }}
      size="default"
    >
      <div data-testid="enter-own-number">
      <Stack gap={12}>
        <Text tone="muted">
          Число с живого кубика. В ленту уйдёт с пометкой «кубик на столе».
        </Text>
        {modifiersSlot}
        {mode === 'd20' ? (
          <>
            {advLabel ? (
              <Text tone="muted" data-testid="enter-own-adv-hint">
                {advLabel}
              </Text>
            ) : null}
            <Field label={needsTwoD20 ? 'Выпало на к20 (1)' : 'Выпало на d20'}>
              <NumberInput
                value={value}
                min={1}
                max={20}
                integer
                emptyValue={null}
                disabled={busy}
                onValueChange={setValue}
                data-testid="enter-own-d20-a"
              />
            </Field>
            {needsTwoD20 ? (
              <Field label="Выпало на к20 (2)">
                <NumberInput
                  value={value2}
                  min={1}
                  max={20}
                  integer
                  emptyValue={null}
                  disabled={busy}
                  onValueChange={setValue2}
                  data-testid="enter-own-d20-b"
                />
              </Field>
            ) : null}
            <Text tone="muted">
              Модификатор {modifier >= 0 ? `+${modifier}` : modifier}
              {keptD20 != null && (!needsTwoD20 || value2 != null)
                ? ` → кость ${keptD20}, итог ${keptD20 + modifier}${
                    bonusSum ? ` (+${bonusSum} доп.)` : ''
                  }`
                : ''}
            </Text>
          </>
        ) : null}
        {mode === 'formula' ? (
          <>
            <Text tone="muted" data-testid="enter-own-formula-hint">
              Формула: {formula?.trim() || '—'}
              {parsed
                ? ` · введите ${parsed.count}×к${parsed.sides}${
                    parsed.modifier
                      ? parsed.modifier > 0
                        ? ` +${parsed.modifier}`
                        : ` ${parsed.modifier}`
                      : ''
                  }`
                : ' · нет распознанных костей — введите итог ниже'}
            </Text>
            {parsed
              ? faces.map((face, i) => (
                  <Field key={`face-${i}`} label={`Кость ${i + 1} (к${parsed.sides})`}>
                    <NumberInput
                      value={face}
                      min={1}
                      max={parsed.sides}
                      integer
                      emptyValue={null}
                      disabled={busy}
                      onValueChange={(v) => {
                        setFaces((prev) => {
                          const next = [...prev]
                          next[i] = v
                          return next
                        })
                      }}
                      data-testid={`enter-own-face-${i}`}
                    />
                  </Field>
                ))
              : (
                  <Field label="Итог">
                    <NumberInput
                      value={value}
                      min={-99}
                      max={999}
                      integer
                      emptyValue={null}
                      disabled={busy}
                      onValueChange={setValue}
                      data-testid="enter-own-total"
                    />
                  </Field>
                )}
            {parsed && formulaSum != null && facesReady ? (
              <Text tone="muted">
                Сумма костей + мод = {formulaSum}
                {bonusSum ? ` · с доп. ${formulaSum + bonusSum}` : ''}
              </Text>
            ) : null}
          </>
        ) : null}
        {mode === 'total' ? (
          <Field label="Итог">
            <NumberInput
              value={value}
              min={-99}
              max={999}
              integer
              emptyValue={null}
              disabled={busy}
              onValueChange={setValue}
              data-testid="enter-own-total"
            />
          </Field>
        ) : null}
        {bonusSlots.length ? (
          <div data-testid="enter-own-bonus-dice">
          <Stack gap={8}>
            <Text tone="muted">Доп. кости — введите выпавшее:</Text>
            {bonusSlots.map((slot, i) => (
              <Field key={slot.key} label={`${slot.label} (к${slot.sides})`}>
                <NumberInput
                  value={bonusFaces[i] ?? null}
                  min={1}
                  max={slot.sides}
                  integer
                  emptyValue={null}
                  disabled={busy}
                  onValueChange={(v) => {
                    setBonusFaces((prev) => {
                      const next = [...prev]
                      next[i] = v
                      return next
                    })
                  }}
                  data-testid={`enter-own-bonus-${i}`}
                />
              </Field>
            ))}
          </Stack>
          </div>
        ) : null}
      </Stack>
      </div>
    </Dialog>
  )
}
