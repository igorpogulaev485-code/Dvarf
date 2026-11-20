/**
 * P24-M02B Arcane Archer (AU) — 2024 Arcane Shot options («…выстрел»).
 * Does NOT replace 2014 XGE `arcaneShots.ts` («…стрела»).
 */

export type ArcaneShot2024Def = {
  id: string
  nameRu: string
  nameEn: string
  /** Dice of the Arcane Shot Die applied by this option (1 or 2). */
  dieCount: 1 | 2
  /** Attack roll required? Seeking / Piercing resolve on a save instead. */
  requiresAttackRoll: boolean
  saveAbility?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
  summaryRu: string
}

/** Кость чародейного выстрела: к6 → к8 (10) → к10 (15) → к12 (18). */
export function arcaneShotDie2024(fighterLevel: number): 'd6' | 'd8' | 'd10' | 'd12' {
  const lv = Math.max(0, Math.floor(fighterLevel) || 0)
  if (lv >= 18) return 'd12'
  if (lv >= 15) return 'd10'
  if (lv >= 10) return 'd8'
  return 'd6'
}

export function arcaneShotDieLabelRu2024(fighterLevel: number): string {
  return arcaneShotDie2024(fighterLevel).replace('d', 'к')
}

/** Known options: 2 at 3, then +1 at 7 / 10 / 15 / 18 → 2/3/4/5/6. */
export function arcaneShotsKnown2024(fighterLevel: number): number {
  const lv = Math.max(0, Math.floor(fighterLevel) || 0)
  if (lv < 3) return 0
  let known = 2
  if (lv >= 7) known += 1
  if (lv >= 10) known += 1
  if (lv >= 15) known += 1
  if (lv >= 18) known += 1
  return known
}

export const ARCANE_SHOTS_2024: ArcaneShot2024Def[] = [
  {
    id: 'bursting_shot',
    nameRu: 'Взрывной выстрел',
    nameEn: 'Bursting Shot',
    dieCount: 2,
    requiresAttackRoll: true,
    summaryRu:
      'После урона атаки: цель и каждое существо в исходящей от неё 10-футовой Эманации получают Силовой урон = два броска Кости чародейного выстрела.',
  },
  {
    id: 'banishing_shot',
    nameRu: 'Изгоняющий выстрел',
    nameEn: 'Banishing Shot',
    dieCount: 1,
    requiresAttackRoll: true,
    saveAbility: 'cha',
    summaryRu:
      'Попадание: доп. Психический = одна Кость; спас Харизмы или изгнание (Недееспособный, Скорость 0) до конца своего следующего хода → возврат в оставленное (или ближайшее свободное) пространство.',
  },
  {
    id: 'seeking_shot',
    nameRu: 'Ищущий выстрел',
    nameEn: 'Seeking Shot',
    dieCount: 2,
    requiresAttackRoll: false,
    saveAbility: 'dex',
    summaryRu:
      'Без броска атаки. Цель — существо, виденное за последнюю минуту. Боеприпас игнорирует укрытие ½ и ¾, огибает углы. В пределах макс. дистанции оружия: спас Ловкости; провал — узнаёте местоположение + урон как от попадания + Силовой = две Кости; успех — половина этого урона.',
  },
  {
    id: 'enfeebling_shot',
    nameRu: 'Ослабляющий выстрел',
    nameEn: 'Enfeebling Shot',
    dieCount: 1,
    requiresAttackRoll: true,
    saveAbility: 'con',
    summaryRu:
      'Попадание: доп. Некротический = одна Кость; спас Телосложения или Отравленный до конца своего следующего хода. Пока Отравленный так: при попадании своей атакой вычитает из урона бросок одной вашей Кости.',
  },
  {
    id: 'piercing_shot',
    nameRu: 'Пронзающий выстрел',
    nameEn: 'Piercing Shot',
    dieCount: 2,
    requiresAttackRoll: false,
    saveAbility: 'dex',
    summaryRu:
      'Без броска атаки. Линия 30 фт. × 1 фт. от вас, игнорирует укрытия. Каждое существо в линии: спас Ловкости; провал — урон как от попадания + Колющий = две Кости; успех — половина.',
  },
  {
    id: 'shadow_shot',
    nameRu: 'Тьмяной выстрел',
    nameEn: 'Shadow Shot',
    dieCount: 1,
    requiresAttackRoll: true,
    saveAbility: 'wis',
    summaryRu:
      'Попадание: доп. Психический = одна Кость; спас Мудрости или Ослеплённый до конца своего следующего хода.',
  },
  {
    id: 'grasping_shot',
    nameRu: 'Удерживающий выстрел',
    nameEn: 'Grasping Shot',
    dieCount: 1,
    requiresAttackRoll: true,
    saveAbility: 'str',
    summaryRu:
      'Попадание: доп. Рубящий = одна Кость; спас Силы или Опутанный на 1 минуту (или пока снова не примените этот вариант). Цель или существо в досягаемости — действием проверка Силы (Атлетика) против вашей Сл → снять Опутанный.',
  },
  {
    id: 'beguiling_shot',
    nameRu: 'Чарующий выстрел',
    nameEn: 'Beguiling Shot',
    dieCount: 2,
    requiresAttackRoll: true,
    saveAbility: 'wis',
    summaryRu:
      'Попадание: доп. Психический = две Кости; спас Мудрости или Очарованный до конца своего следующего хода; источник очарования — вы или союзник в 30 фт. (ваш выбор). Раньше кончается, если источник атакует цель / наносит урон / заставляет совершить спас.',
  },
]

export const ARCANE_SHOT_IDS_2024 = ARCANE_SHOTS_2024.map((row) => row.id)

export function arcaneShot2024ById(id: string | null | undefined): ArcaneShot2024Def | null {
  if (!id) return null
  const key = id.trim().toLowerCase().replace(/-/g, '_')
  return ARCANE_SHOTS_2024.find((row) => row.id === key) ?? null
}

/** Save DC = 8 + Int mod + proficiency bonus. */
export function arcaneShotSaveDc2024(intScore: number, proficiencyBonus: number): number {
  const mod = Math.floor((Math.max(1, Math.floor(intScore) || 10) - 10) / 2)
  return 8 + mod + Math.max(0, Math.floor(proficiencyBonus) || 0)
}
