import { ABILITY_LABELS, type AbilityKey } from './sheetTypes'

/** One line in the attack-bonus breakdown (U09 / B8). */
export type AttackBonusPart = {
  id: string
  label: string
  value: number
  hint?: string
}

export type AttackBonusBreakdownInput = {
  abilityKey: AbilityKey
  abilityMod: number
  proficient: boolean
  proficiencyBonus: number
  /** Magic weapon / gear attack bonus when held and requirements met. */
  magicBonus?: number
  /** Fighting style (e.g. Archery +2). */
  styleBonus?: number
  /** Artificer infusion on this weapon. */
  infusionBonus?: number
  /** Rage / guided strike / other active-effect flats. */
  effectBonus?: number
}

/** Build BM + ability + magic + other parts; zero-value optional parts omitted. */
export function buildAttackBonusParts(
  input: AttackBonusBreakdownInput,
): AttackBonusPart[] {
  const parts: AttackBonusPart[] = [
    {
      id: 'ability',
      label: ABILITY_LABELS[input.abilityKey],
      value: input.abilityMod,
      hint: 'характеристика',
    },
    {
      id: 'prof',
      label: 'Владение',
      value: input.proficient ? input.proficiencyBonus : 0,
      hint: input.proficient ? 'БМ' : 'нет владения',
    },
  ]

  const magic = Math.floor(input.magicBonus ?? 0)
  if (magic !== 0) {
    parts.push({
      id: 'magic',
      label: 'Магический бонус',
      value: magic,
      hint: 'предмет',
    })
  }

  const style = Math.floor(input.styleBonus ?? 0)
  if (style !== 0) {
    parts.push({
      id: 'style',
      label: 'Боевой стиль',
      value: style,
    })
  }

  const infusion = Math.max(0, Math.floor(input.infusionBonus ?? 0))
  if (infusion !== 0) {
    parts.push({
      id: 'infusion',
      label: 'Инфузия',
      value: infusion,
    })
  }

  const effect = Math.floor(input.effectBonus ?? 0)
  if (effect !== 0) {
    parts.push({
      id: 'effects',
      label: 'Эффекты',
      value: effect,
      hint: 'бафы / ярость / прочее',
    })
  }

  return parts
}

export function sumAttackBonusParts(parts: AttackBonusPart[]): number {
  return parts.reduce((sum, part) => sum + part.value, 0)
}
