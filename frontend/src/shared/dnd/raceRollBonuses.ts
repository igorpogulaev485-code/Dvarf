/**
 * Race roll_bonuses (ERLW dragonmarks, pale elf, …) — structured skill/tool dice
 * and unconditional check advantage. Edition 2014 only; never parse traits_text.
 */

export type RaceRollBonus = {
  id: string
  nameRu: string
  /** Extra die on matching skill/tool checks, e.g. `1d4`. */
  dice: string | null
  skills: string[]
  /** Tool display names (RU) or tokens like `artisan_tools` / `land_vehicles`. */
  tools: string[]
  /** Unconditional advantage on listed skill checks. */
  advantage: boolean
}

const ARTISAN_TOOL_RE =
  /инструмент(?:ы)?\s+(?:алхимика|пивовара|каллиграфа|плотника|картографа|сапожника|повара|стеклодува|ювелира|кожевника|каменщика|живописца|гончара|кузнеца|жестянщика|ткача|резчика|фальсификатора)|набор\s+травника/i

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const t = item.trim()
    if (!t) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

function normalizeDice(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim().toLowerCase().replace('к', 'd')
  const m = t.match(/^(\d*)d(\d+)$/i)
  if (!m) return null
  const count = m[1] ? Math.max(1, Number(m[1])) : 1
  const sides = Math.max(2, Number(m[2]))
  if (!Number.isFinite(count) || !Number.isFinite(sides)) return null
  return `${count}d${sides}`
}

/** Parse catalog / ledger `roll_bonuses` / `rollBonuses`. */
export function readRaceRollBonuses(raw: unknown): RaceRollBonus[] {
  if (!Array.isArray(raw)) return []
  const out: RaceRollBonus[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const row = asRecord(item)
    const id =
      typeof row.id === 'string'
        ? row.id.trim()
        : typeof row.slug === 'string'
          ? row.slug.trim()
          : ''
    const nameRu =
      typeof row.name_ru === 'string'
        ? row.name_ru.trim()
        : typeof row.nameRu === 'string'
          ? row.nameRu.trim()
          : ''
    if (!id || !nameRu || seen.has(id)) continue
    const skills = readStringList(row.skills).map((s) => s.toLowerCase())
    const tools = readStringList(row.tools)
    const dice = normalizeDice(row.dice)
    const advantage = Boolean(row.advantage)
    if (!dice && !advantage) continue
    if (!skills.length && !tools.length) continue
    seen.add(id)
    out.push({ id, nameRu, dice, skills, tools, advantage })
  }
  return out
}

function toolMatches(spec: string, toolName: string): boolean {
  const needle = spec.trim().toLowerCase()
  const hay = toolName.trim().toLowerCase()
  if (!needle || !hay) return false
  if (needle === 'artisan_tools' || needle === 'artisan') {
    return ARTISAN_TOOL_RE.test(toolName) || /ремеслен/i.test(toolName)
  }
  if (
    needle === 'land_vehicles' ||
    needle === 'наземный транспорт' ||
    needle === 'транспорт (наземный)'
  ) {
    return /наземн|land\s*vehicle|транспорт\s*\(наземный\)/i.test(toolName)
  }
  if (hay === needle) return true
  return hay.includes(needle) || needle.includes(hay)
}

export function raceRollBonusMatches(input: {
  bonus: RaceRollBonus
  skillKey?: string | null
  toolName?: string | null
}): boolean {
  const skill = (input.skillKey || '').trim().toLowerCase()
  if (skill && input.bonus.skills.includes(skill)) return true
  const tool = (input.toolName || '').trim()
  if (tool) {
    for (const spec of input.bonus.tools) {
      if (toolMatches(spec, tool)) return true
    }
  }
  return false
}

/** Extra dice chips for a skill/tool check from race roll_bonuses. */
export function raceBonusDiceForCheck(input: {
  rollBonuses: RaceRollBonus[] | null | undefined
  skillKey?: string | null
  toolName?: string | null
  /** Gate: never apply on 2024 sheets. */
  rulesEdition?: string | null
}): Array<{ dice: string; label: string }> {
  const edition = (input.rulesEdition || '2014').trim()
  if (edition === '2024') return []
  const rows = input.rollBonuses ?? []
  const out: Array<{ dice: string; label: string }> = []
  for (const bonus of rows) {
    if (!bonus.dice) continue
    if (!raceRollBonusMatches({ bonus, skillKey: input.skillKey, toolName: input.toolName })) {
      continue
    }
    out.push({ dice: bonus.dice, label: bonus.nameRu })
  }
  return out
}

/** Skills that always roll with advantage from race roll_bonuses. */
export function raceAdvantageSkillKeys(input: {
  rollBonuses: RaceRollBonus[] | null | undefined
  rulesEdition?: string | null
}): Set<string> {
  const edition = (input.rulesEdition || '2014').trim()
  if (edition === '2024') return new Set()
  const out = new Set<string>()
  for (const bonus of input.rollBonuses ?? []) {
    if (!bonus.advantage) continue
    for (const skill of bonus.skills) out.add(skill)
  }
  return out
}

/** Format expression fragment for journal: `+1к4`. */
export function formatRaceBonusDiceExpr(dice: string): string {
  const t = dice.trim().toLowerCase().replace('к', 'd')
  const m = t.match(/^(\d*)d(\d+)$/i)
  if (!m) return ''
  const count = m[1] || '1'
  return `+${count}к${m[2]}`
}
