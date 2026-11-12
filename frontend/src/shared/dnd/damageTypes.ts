/** Canonical 2014 damage types. Gear JSON uses English keys; the sheet shows Russian. */

export const DAMAGE_TYPES = [
  'acid',
  'cold',
  'fire',
  'force',
  'lightning',
  'necrotic',
  'poison',
  'psychic',
  'radiant',
  'thunder',
  'bludgeoning',
  'piercing',
  'slashing',
] as const

export type DamageType = (typeof DAMAGE_TYPES)[number]

const LABELS: Record<DamageType, string> = {
  acid: 'кислота',
  cold: 'холод',
  fire: 'огонь',
  force: 'силовое поле',
  lightning: 'электричество',
  necrotic: 'некротическая энергия',
  poison: 'яд',
  psychic: 'психическая энергия',
  radiant: 'излучение',
  thunder: 'звук',
  bludgeoning: 'дробящий',
  piercing: 'колющий',
  slashing: 'рубящий',
}

const ALIASES: Record<string, DamageType> = {
  acid: 'acid',
  кислота: 'acid',
  кислотой: 'acid',
  кислотный: 'acid',
  cold: 'cold',
  холод: 'cold',
  холодом: 'cold',
  fire: 'fire',
  огонь: 'fire',
  огнём: 'fire',
  огнем: 'fire',
  огню: 'fire',
  force: 'force',
  силовое: 'force',
  'силовое поле': 'force',
  'силовым полем': 'force',
  lightning: 'lightning',
  электричество: 'lightning',
  электричеством: 'lightning',
  молния: 'lightning',
  молнией: 'lightning',
  necrotic: 'necrotic',
  некротический: 'necrotic',
  'некротическая энергия': 'necrotic',
  'некротической энергией': 'necrotic',
  poison: 'poison',
  яд: 'poison',
  ядом: 'poison',
  psychic: 'psychic',
  'психическая энергия': 'psychic',
  'психической энергией': 'psychic',
  психический: 'psychic',
  radiant: 'radiant',
  излучение: 'radiant',
  излучением: 'radiant',
  thunder: 'thunder',
  звук: 'thunder',
  звуком: 'thunder',
  bludgeoning: 'bludgeoning',
  дробящий: 'bludgeoning',
  дробящим: 'bludgeoning',
  piercing: 'piercing',
  колющий: 'piercing',
  колющим: 'piercing',
  slashing: 'slashing',
  рубящий: 'slashing',
  рубящим: 'slashing',
}

export function damageTypeLabel(type: DamageType): string {
  return LABELS[type]
}

export function isPhysicalDamage(type: DamageType): boolean {
  return type === 'bludgeoning' || type === 'piercing' || type === 'slashing'
}

/** Map a catalog or race string onto a damage type. Unknown text stays out of the list. */
export function normalizeDamageType(raw: string | null | undefined): DamageType | null {
  const text = raw?.trim().toLowerCase().replace(/ё/g, 'е') ?? ''
  if (!text) return null
  if (ALIASES[text]) return ALIASES[text]
  if ((DAMAGE_TYPES as readonly string[]).includes(text)) return text as DamageType
  return null
}

export type DefenseLine = {
  type: DamageType
  /** Resistance applies only when the hit is marked nonmagical. */
  nonmagical: boolean
  sources: string[]
}

export type IncomingDamageProfile = {
  resistances: DefenseLine[]
  vulnerabilities: DefenseLine[]
  immunities: DefenseLine[]
}

export function emptyDamageProfile(): IncomingDamageProfile {
  return { resistances: [], vulnerabilities: [], immunities: [] }
}

function pushLine(lines: DefenseLine[], type: DamageType, nonmagical: boolean, source: string) {
  const found = lines.find((row) => row.type === type && row.nonmagical === nonmagical)
  if (!found) {
    lines.push({ type, nonmagical, sources: source ? [source] : [] })
    return
  }
  if (source && !found.sources.includes(source)) found.sources.push(source)
}

export function addDefense(
  lines: DefenseLine[],
  rawType: string,
  source: string,
  nonmagical = false,
): void {
  const type = normalizeDamageType(rawType)
  if (!type) return
  pushLine(lines, type, nonmagical, source)
}

export function formatDefenseSummary(profile: IncomingDamageProfile): string {
  const parts: string[] = []
  const resistances = formatDefenseList(profile.resistances)
  const vulnerabilities = formatDefenseList(profile.vulnerabilities)
  const immunities = formatDefenseList(profile.immunities)
  if (resistances) parts.push(`Сопротивления: ${resistances}`)
  if (vulnerabilities) parts.push(`Уязвимости: ${vulnerabilities}`)
  if (immunities) parts.push(`Иммунитеты: ${immunities}`)
  return parts.join(' · ')
}

export function formatDefenseList(lines: DefenseLine[]): string {
  const labels: string[] = []
  for (const row of lines) {
    const label = damageTypeLabel(row.type)
    const text = row.nonmagical ? `немагический ${label}` : label
    if (!labels.includes(text)) labels.push(text)
  }
  return labels.join(', ')
}

function lineMatches(row: DefenseLine, type: DamageType, nonmagical: boolean): boolean {
  if (row.type !== type) return false
  if (row.nonmagical && !nonmagical) return false
  return true
}

/**
 * One resistance still halves (round down), even if race and an item share the type.
 * Resistance and vulnerability to the same hit cancel. Immunity reduces the hit to 0.
 */
export function adjustIncomingDamage(input: {
  amount: number
  type: DamageType | null
  nonmagical: boolean
  profile: IncomingDamageProfile
}): { amount: number; note: string } {
  const amount = Math.max(0, Math.floor(input.amount))
  if (!input.type || amount === 0) return { amount, note: '' }
  const immune = input.profile.immunities.some((row) =>
    lineMatches(row, input.type as DamageType, input.nonmagical),
  )
  if (immune) {
    return {
      amount: 0,
      note: `Иммунитет (${damageTypeLabel(input.type)}): ${amount} → 0`,
    }
  }
  const resist = input.profile.resistances.some((row) =>
    lineMatches(row, input.type as DamageType, input.nonmagical),
  )
  const vuln = input.profile.vulnerabilities.some((row) => row.type === input.type)
  if (resist && vuln) {
    return {
      amount,
      note: `Сопротивление и уязвимость (${damageTypeLabel(input.type)}) взаимно гасятся: ${amount}`,
    }
  }
  if (resist) {
    const next = Math.floor(amount / 2)
    return {
      amount: next,
      note: `Сопротивление (${damageTypeLabel(input.type)}): ${amount} → ${next}`,
    }
  }
  if (vuln) {
    const next = amount * 2
    return {
      amount: next,
      note: `Уязвимость (${damageTypeLabel(input.type)}): ${amount} → ${next}`,
    }
  }
  return { amount, note: '' }
}
