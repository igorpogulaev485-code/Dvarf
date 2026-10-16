/**
 * Spell material components — parse M text, match inventory, cheapest consume.
 * Parser results cached by raw M string (cast path must stay cheap).
 */

import { gearCostToGp, type GearCost } from '../../shared/dnd/gearCatalog'
import type { SpellFocusFlags } from './spellFocus'
import { hasFreeMaterialCoverage } from './spellFocus'

export type MaterialRequirement = {
  /** Original M text (may be empty string = unspecified free M). */
  raw: string
  /** 0 = no gold cost (focus/pouch ok). */
  minCostGp: number
  consumed: boolean
  /** Normalized tokens for inventory name matching. */
  keywords: string[]
}

export type MaterialInventoryItem = {
  id: string
  name: string
  qty: number
  cost_gp?: number | null
}

export type MaterialCandidate = {
  item: MaterialInventoryItem
  costGp: number
}

export type MaterialCheck = {
  requirement: MaterialRequirement | null
  /** Free M covered by focus/pouch flags. */
  freeCovered: boolean
  /** Costly M: inventory candidates with cost >= min, cheapest first. */
  candidates: MaterialCandidate[]
  /** Cast allowed for material rules. */
  ok: boolean
  /** Short RU reason when !ok or for UI. */
  message: string
  /** Cheapest sufficient item (for default consume). */
  cheapest: MaterialCandidate | null
}

const STOPWORDS = new Set(
  [
    'и',
    'или',
    'с',
    'из',
    'для',
    'на',
    'в',
    'к',
    'по',
    'не',
    'как',
    'минимум',
    'менее',
    'не менее',
    'стоящий',
    'стоящая',
    'стоящее',
    'стоимостью',
    'расходуемый',
    'расходуемая',
    'расходуемое',
    'расходуемые',
    'расходуемых',
    'поглощаемый',
    'поглощаемая',
    'поглощаемые',
    'заклинанием',
    'заклинания',
    'который',
    'которая',
    'которое',
    'которых',
    'a',
    'an',
    'the',
    'of',
    'worth',
    'at',
    'least',
    'gp',
    'sp',
    'cp',
    'зм',
    'см',
    'мм',
    'which',
    'spell',
    'consumes',
    'consumed',
  ].map((s) => s.toLowerCase()),
)

const parseCache = new Map<string, MaterialRequirement | null>()

function normalizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
}

function parseCostToGp(amountRaw: string, unitRaw: string): number {
  const amount = Number(amountRaw.replace(/\s+/g, '').replace(',', '.'))
  if (!Number.isFinite(amount)) return 0
  const unit = unitRaw.toLowerCase()
  if (unit === 'gp' || unit === 'зм') return amount
  if (unit === 'sp' || unit === 'см') return amount / 10
  if (unit === 'cp' || unit === 'мм') return amount / 100
  return amount
}

function extractKeywords(raw: string): string[] {
  const cleaned = normalizeName(
    raw
      .replace(
        /\d[\d\s.,]*\s*(зм|см|мм|gp|sp|cp)\b/gi,
        ' ',
      )
      .replace(
        /стоящ\w*|стоимост\w*|минимум|не\s+менее|расход\w*|поглощ\w*|заклинани\w*|worth|at\s+least|consumed|consumes/gi,
        ' ',
      ),
  )
  const out: string[] = []
  const seen = new Set<string>()
  for (const token of cleaned.split(' ')) {
    if (token.length < 3) continue
    if (STOPWORDS.has(token)) continue
    if (seen.has(token)) continue
    seen.add(token)
    out.push(token)
  }
  return out.slice(0, 8)
}

function isConsumedText(raw: string): boolean {
  return /расход|поглощ|consumed|consumes|which the spell consumes/i.test(raw)
}

/**
 * Parse material component text. Cached by exact string.
 * `undefined` → no M. `""` → free unspecified M.
 */
export function parseMaterialRequirement(
  material: string | undefined,
): MaterialRequirement | null {
  if (material == null) return null
  const key = material
  const cached = parseCache.get(key)
  if (cached !== undefined) return cached

  const raw = material.trim()
  // Empty string still means M is required (unspecified free component).
  if (material === '' || raw === '') {
    const req: MaterialRequirement = {
      raw: '',
      minCostGp: 0,
      consumed: false,
      keywords: [],
    }
    parseCache.set(key, req)
    return req
  }

  const costMatch = raw.match(
    /(\d[\d\s]*)\s*(зм|см|мм|gp|sp|cp)\b/i,
  )
  const minCostGp = costMatch
    ? parseCostToGp(costMatch[1], costMatch[2])
    : 0

  const req: MaterialRequirement = {
    raw,
    minCostGp,
    consumed: minCostGp > 0 ? isConsumedText(raw) : false,
    keywords: extractKeywords(raw),
  }
  parseCache.set(key, req)
  return req
}

function itemMatchesKeywords(
  itemName: string,
  keywords: string[],
): boolean {
  if (keywords.length === 0) return true
  const name = normalizeName(itemName)
  if (!name) return false
  // Any strong keyword hit is enough (алмаз ∈ «Алмаз 300 зм»).
  return keywords.some((kw) => name.includes(kw))
}

export function findMaterialCandidates(
  items: MaterialInventoryItem[],
  requirement: MaterialRequirement,
): MaterialCandidate[] {
  const out: MaterialCandidate[] = []
  for (const item of items) {
    if (item.qty <= 0) continue
    const cost =
      item.cost_gp != null && Number.isFinite(item.cost_gp)
        ? item.cost_gp
        : null
    if (requirement.minCostGp > 0) {
      if (cost == null || cost < requirement.minCostGp) continue
      if (!itemMatchesKeywords(item.name, requirement.keywords)) continue
      out.push({ item, costGp: cost })
      continue
    }
    // Free specific component (optional fallback when no focus): name match only.
    if (requirement.keywords.length === 0) continue
    if (!itemMatchesKeywords(item.name, requirement.keywords)) continue
    out.push({ item, costGp: cost ?? 0 })
  }
  out.sort((a, b) => a.costGp - b.costGp || a.item.name.localeCompare(b.item.name, 'ru'))
  return out
}

export function checkSpellMaterials(input: {
  material: string | undefined
  flags: SpellFocusFlags
  items: MaterialInventoryItem[]
}): MaterialCheck {
  const requirement = parseMaterialRequirement(input.material)
  if (!requirement) {
    return {
      requirement: null,
      freeCovered: true,
      candidates: [],
      ok: true,
      message: '',
      cheapest: null,
    }
  }

  if (requirement.minCostGp <= 0) {
    const freeCovered = hasFreeMaterialCoverage(input.flags)
    const candidates = freeCovered
      ? []
      : findMaterialCandidates(input.items, requirement)
    const ok = freeCovered || candidates.length > 0
    return {
      requirement,
      freeCovered,
      candidates,
      ok,
      message: ok
        ? freeCovered
          ? input.flags.has_component_pouch
            ? 'Мешочек с компонентами закрывает М'
            : 'Фокус закрывает М'
          : `Компонент: ${candidates[0]?.item.name ?? '—'}`
        : 'Нужен магический фокус, мешочек с компонентами или сам компонент',
      cheapest: candidates[0] ?? null,
    }
  }

  const candidates = findMaterialCandidates(input.items, requirement)
  const cheapest = candidates[0] ?? null
  const ok = cheapest != null
  const costLabel = Number.isInteger(requirement.minCostGp)
    ? String(requirement.minCostGp)
    : requirement.minCostGp.toFixed(1)
  return {
    requirement,
    freeCovered: false,
    candidates,
    ok,
    message: ok
      ? `${requirement.consumed ? 'Расход' : 'Нужен'}: ≥ ${costLabel} зм` +
        (cheapest ? ` · подойдёт «${cheapest.item.name}» (${cheapest.costGp} зм)` : '')
      : `Нет компонента стоимостью ≥ ${costLabel} зм` +
        (requirement.keywords[0] ? ` (${requirement.keywords[0]})` : ''),
    cheapest,
  }
}

/** Decrement qty of chosen item (remove row at 0). */
export function consumeMaterialItem<T extends MaterialInventoryItem>(
  items: T[],
  itemId: string,
  qty = 1,
): T[] {
  const need = Math.max(1, Math.floor(qty))
  return items
    .map((item) => {
      if (item.id !== itemId) return item
      return { ...item, qty: Math.max(0, item.qty - need) }
    })
    .filter((item) => item.qty > 0)
}

export function costGpFromCatalogCost(cost: GearCost | null | undefined): number | null {
  return gearCostToGp(cost)
}
