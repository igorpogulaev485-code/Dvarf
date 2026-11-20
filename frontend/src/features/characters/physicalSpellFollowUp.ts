/**
 * После каста при «кубики на столе»: предложить ввод атаки / урона / лечения.
 * При выключенной галке не вызывается — digital-поведение каста не меняется.
 */
import { parseDamageExpression, type DeskRollMode } from './deskRolls'

export type PhysicalSpellFollowUpApi = {
  diceOnTable?: boolean
  openEnterOwnNumber?: (o: {
    title: string
    mode?: 'total' | 'd20' | 'formula'
    modifier?: number
    advantageMode?: DeskRollMode
    formula?: string | null
    onDone?: (total: number) => void
  }) => void
}

export function spellNeedsAttackRoll(attackOrSave: string | null | undefined): boolean {
  const text = String(attackOrSave ?? '').trim()
  if (!text) return false
  // «дальняя атака», «ближняя атака», «атака» — не спасбросок.
  if (/спас/i.test(text)) return false
  return /атак/i.test(text)
}

export function spellEffectIsHeal(input: {
  name?: string | null
  attack_or_save?: string | null
  description?: string | null
  effect?: string | null
}): boolean {
  const blob = [
    input.name,
    input.attack_or_save,
    input.description,
    input.effect,
  ]
    .map((s) => String(s ?? ''))
    .join(' ')
  return /лечен|исцел|хит(?:ов|а|ы)?\b|heal|cure|восстанов/i.test(blob)
}

/** Вытащить выражение костей из строки эффекта (`1к10 огонь`, `2d8+4`). */
export function extractSpellDiceFormula(effect: string | null | undefined): string | null {
  const text = String(effect ?? '').trim()
  if (!text) return null
  if (!parseDamageExpression(text)) return null
  // Берём кусок до словесного суффикса типа урона / «×N».
  const match = text.match(/(\d+\s*[dк]\s*\d+(?:\s*[+-]\s*\d+)*)/i)
  return match ? match[1].replace(/\s+/g, '') : text
}

/**
 * Открыть окна ввода: сначала атака заклинанием (если есть), затем урон/лечение.
 */
export function offerPhysicalSpellFollowUp(opts: {
  te: PhysicalSpellFollowUpApi | null | undefined
  spellName: string
  attackOrSave?: string | null
  effect?: string | null
  spellAttackBonus?: number
  advantageMode?: DeskRollMode
  description?: string | null
}): void {
  const te = opts.te
  if (!te?.diceOnTable || !te.openEnterOwnNumber) return

  const formula = extractSpellDiceFormula(opts.effect)
  const needsAttack = spellNeedsAttackRoll(opts.attackOrSave)
  const heal = spellEffectIsHeal({
    name: opts.spellName,
    attack_or_save: opts.attackOrSave,
    description: opts.description,
    effect: opts.effect,
  })
  const rollTitle = heal
    ? `Лечение: ${opts.spellName}`
    : `Урон: ${opts.spellName}`

  const openDamageOrHeal = () => {
    if (!formula) return
    te.openEnterOwnNumber?.({
      title: rollTitle,
      mode: 'formula',
      formula,
    })
  }

  if (needsAttack) {
    te.openEnterOwnNumber({
      title: `Атака заклинанием: ${opts.spellName}`,
      mode: 'd20',
      modifier: Math.floor(opts.spellAttackBonus ?? 0),
      advantageMode: opts.advantageMode ?? 'normal',
      onDone: () => {
        // Урон после атаки — только если есть кости в эффекте.
        openDamageOrHeal()
      },
    })
    return
  }

  openDamageOrHeal()
}
