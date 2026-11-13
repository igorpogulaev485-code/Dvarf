/**
 * Slot math for Conjure Animals / Conjure Fey (PHB) and the three TCE
 * summon-spirit spells a druid actually prepares. Cast preview and the
 * companion card share this so the sheet and the cast window agree.
 */

export type SummonPreview = {
  effect: string
  scaled: boolean
  lines: string[]
}

function normName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
}

function slotOf(slotLevel: number, min: number): number {
  return Math.max(min, Math.floor(slotLevel) || min)
}

/** PHB: ×2 at 5th, ×3 at 7th, ×4 at 9th. */
export function conjureAnimalsMultiplier(slotLevel: number): number {
  const slot = Math.max(3, Math.floor(slotLevel) || 3)
  if (slot >= 9) return 4
  if (slot >= 7) return 3
  if (slot >= 5) return 2
  return 1
}

export type ConjureAnimalsCount = {
  multiplier: number
  cr2: number
  cr1: number
  crHalf: number
  crQuarter: number
}

export function conjureAnimalsCounts(slotLevel: number): ConjureAnimalsCount {
  const multiplier = conjureAnimalsMultiplier(slotLevel)
  return {
    multiplier,
    cr2: 1 * multiplier,
    cr1: 2 * multiplier,
    crHalf: 4 * multiplier,
    crQuarter: 8 * multiplier,
  }
}

/** PHB Conjure Woodland Beings / Minor Elementals: ×2 at 6th, ×3 at 8th. */
export function conjureWoodlandOrMinorMultiplier(slotLevel: number): number {
  const slot = Math.max(4, Math.floor(slotLevel) || 4)
  if (slot >= 8) return 3
  if (slot >= 6) return 2
  return 1
}

export function conjureWoodlandOrMinorCounts(slotLevel: number): ConjureAnimalsCount {
  const multiplier = conjureWoodlandOrMinorMultiplier(slotLevel)
  return {
    multiplier,
    cr2: 1 * multiplier,
    cr1: 2 * multiplier,
    crHalf: 4 * multiplier,
    crQuarter: 8 * multiplier,
  }
}

/** PHB Conjure Fey: CR 6, +1 for each slot level above 6th. */
export function conjureFeyCrMax(slotLevel: number): number {
  const slot = slotOf(slotLevel, 6)
  return 6 + Math.max(0, slot - 6)
}

/** PHB Conjure Elemental: CR 5, +1 per slot above 5th. */
export function conjureElementalCrMax(slotLevel: number): number {
  const slot = slotOf(slotLevel, 5)
  return 5 + Math.max(0, slot - 5)
}

/** PHB Conjure Celestial: CR ≤4, CR ≤5 at 9th. */
export function conjureCelestialCrMax(slotLevel: number): number {
  const slot = slotOf(slotLevel, 7)
  return slot >= 9 ? 5 : 4
}

export type TceSpiritStats = {
  titleRu: string
  ac: number
  hp: number
  hpAlt: number | null
  hpAltLabel: string | null
  attacks: number
  attackRu: string
  speedRu: string
}

/** Half the slot, rounded down, at least one attack. */
function attackCount(slot: number): number {
  return Math.max(1, Math.floor(slot / 2))
}

export function tceSpiritStats(
  kind: 'beast' | 'fey' | 'elemental',
  slotLevel: number,
): TceSpiritStats {
  if (kind === 'beast') {
    const slot = slotOf(slotLevel, 2)
    const above = slot - 2
    return {
      titleRu: 'Дух зверя',
      ac: 11 + slot,
      hp: 30 + 5 * above,
      hpAlt: 20 + 5 * above,
      hpAltLabel: 'воздух',
      attacks: attackCount(slot),
      attackRu: `1к8+4+${slot} колющего`,
      speedRu: '30; земля — лазание 30, воздух — полёт 60, вода — плавание 30',
    }
  }
  if (kind === 'fey') {
    const slot = slotOf(slotLevel, 3)
    return {
      titleRu: 'Дух феи',
      ac: 12 + slot,
      hp: 30 + 10 * (slot - 3),
      hpAlt: null,
      hpAltLabel: null,
      attacks: attackCount(slot),
      attackRu: `1к6+3+${slot} колющего`,
      speedRu: '40',
    }
  }
  const slot = slotOf(slotLevel, 4)
  return {
    titleRu: 'Дух стихии',
    ac: 11 + slot,
    hp: 50 + 10 * (slot - 4),
    hpAlt: null,
    hpAltLabel: null,
    attacks: attackCount(slot),
    attackRu: `1к10+4+${slot} дробящего`,
    speedRu: '40',
  }
}

function spiritPreview(stats: TceSpiritStats, slot: number): SummonPreview {
  const hp =
    stats.hpAlt != null
      ? `Хиты ${stats.hp} (земля/вода) или ${stats.hpAlt} (${stats.hpAltLabel})`
      : `Хиты ${stats.hp}`
  return {
    effect: `КД ${stats.ac} · ${hp} · атак ${stats.attacks}`,
    scaled: true,
    lines: [
      `Ячейка ${slot}: КД ${stats.ac}`,
      hp,
      `Атак ${stats.attacks} · попадание бонусом заклинания · ${stats.attackRu}`,
      `Скорость ${stats.speedRu}`,
    ],
  }
}

function kindFromName(
  name: string,
):
  | 'animals'
  | 'woodland'
  | 'minor-elementals'
  | 'elemental-phb'
  | 'celestial-phb'
  | 'fey'
  | 'beast'
  | 'spirit-fey'
  | 'elemental'
  | null {
  const key = normName(name)
  if (!key) return null
  if (key.includes('призыв животных') || key.includes('conjure animals')) return 'animals'
  if (key.includes('призыв лесных') || key.includes('conjure woodland')) return 'woodland'
  if (key.includes('малых элементал') || key.includes('conjure minor elemental'))
    return 'minor-elementals'
  if (key.includes('призыв элементаля') || key.includes('conjure elemental'))
    return 'elemental-phb'
  if (key.includes('призыв небожителя') || key.includes('conjure celestial'))
    return 'celestial-phb'
  if (key.includes('призыв духа зверя') || key.includes('summon beast')) return 'beast'
  if (key.includes('призыв духа феи') || key.includes('summon fey')) return 'spirit-fey'
  if (key.includes('призыв духа стихии') || key.includes('summon elemental')) return 'elemental'
  if (key.includes('призыв феи') || key === 'conjure fey') return 'fey'
  return null
}

/** Cast-dialog lines. Null when the spell is not one of these summons. */
export function summonCastPreview(
  spell: { name?: string | null; level?: number },
  slotLevel: number,
): SummonPreview | null {
  const kind = kindFromName(spell.name ?? '')
  if (!kind) return null
  if (kind === 'animals' || kind === 'woodland' || kind === 'minor-elementals') {
    const min = kind === 'animals' ? 3 : 4
    const slot = slotOf(slotLevel, min)
    const counts =
      kind === 'animals'
        ? conjureAnimalsCounts(slot)
        : conjureWoodlandOrMinorCounts(slot)
    return {
      effect: `×${counts.multiplier}: ${counts.cr2}/${counts.cr1}/${counts.crHalf}/${counts.crQuarter}`,
      scaled: counts.multiplier > 1,
      lines: [
        `Ячейка ${slot}: множитель ×${counts.multiplier}`,
        `КР ≤2: ${counts.cr2} существо`,
        `КР ≤1: ${counts.cr1}`,
        `КР ≤½: ${counts.crHalf}`,
        `КР ≤¼: ${counts.crQuarter}`,
      ],
    }
  }
  if (kind === 'fey') {
    const slot = slotOf(slotLevel, 6)
    const cr = conjureFeyCrMax(slot)
    return {
      effect: `одно существо, КР ≤${cr}`,
      scaled: cr > 6,
      lines: [
        `Ячейка ${slot}: предел КР ≤${cr}`,
        'База заклинания — КР 6; +1 за каждый круг ячейки выше 6-го',
        'Одна фея или дух в облике зверя. Карточка берёт предел ячейки, не базовый КР',
      ],
    }
  }
  if (kind === 'elemental-phb') {
    const slot = slotOf(slotLevel, 5)
    const cr = conjureElementalCrMax(slot)
    return {
      effect: `один элементаль, КР ≤${cr}`,
      scaled: cr > 5,
      lines: [`Ячейка ${slot}: предел КР ≤${cr}`, 'При срыве концентрации — враждебен 1 час'],
    }
  }
  if (kind === 'celestial-phb') {
    const slot = slotOf(slotLevel, 7)
    const cr = conjureCelestialCrMax(slot)
    return {
      effect: `один небожитель, КР ≤${cr}`,
      scaled: cr > 4,
      lines: [`Ячейка ${slot}: предел КР ≤${cr}`],
    }
  }
  const spirit =
    kind === 'beast' ? 'beast' : kind === 'spirit-fey' ? 'fey' : 'elemental'
  const min = spirit === 'beast' ? 2 : spirit === 'fey' ? 3 : 4
  return spiritPreview(tceSpiritStats(spirit, slotLevel), slotOf(slotLevel, min))
}
