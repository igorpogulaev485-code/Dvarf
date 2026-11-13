/**
 * W-03: нормализация полей страницы вики «Бой» (без React).
 */

export const WAVE_CONDITION_PRESETS = [
  'сразу',
  'через 1 раунд',
  'через 2 раунда',
  'через 3 раунда',
  'когда пала предыдущая',
] as const

export type CombatWaveCombatant = {
  slug?: string | null
  catalog_id?: string | null
  name: string
  count: number
  hp_max?: number | null
  ac?: number | null
  xp?: number | null
  custom?: boolean
  actions?: unknown[]
}

export type CombatWaveField = {
  index: number
  condition_text?: string | null
  combatants: CombatWaveCombatant[]
}

export type CombatLootPrep = {
  items: Array<{ id?: string; name: string; qty: number; notes?: string | null }>
  coins: { cp?: number; sp?: number; ep?: number; gp?: number; pp?: number }
}

export type CombatPageFields = {
  waves: CombatWaveField[]
  loot: CombatLootPrep
  party_levels: number[]
  gm_notes?: string
}

export function emptyCombatPageFields(): CombatPageFields {
  return {
    waves: [{ index: 1, condition_text: 'сразу', combatants: [] }],
    loot: { items: [], coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 } },
    party_levels: [],
    gm_notes: '',
  }
}

export function normalizeCombatPageFields(raw: unknown): CombatPageFields {
  const base = emptyCombatPageFields()
  if (!raw || typeof raw !== 'object') return base
  const obj = raw as Record<string, unknown>
  const wavesRaw = Array.isArray(obj.waves) ? obj.waves : []
  const waves: CombatWaveField[] = []
  for (let i = 0; i < wavesRaw.length; i++) {
    const w = wavesRaw[i]
    if (!w || typeof w !== 'object') continue
    const row = w as Record<string, unknown>
    const combatants: CombatWaveCombatant[] = []
    for (const c of Array.isArray(row.combatants) ? row.combatants : []) {
      if (!c || typeof c !== 'object') continue
      const cr = c as Record<string, unknown>
      const name = String(cr.name ?? '').trim()
      const slug = cr.slug != null ? String(cr.slug).trim() : ''
      const catalogId = cr.catalog_id != null ? String(cr.catalog_id).trim() : ''
      const custom = Boolean(cr.custom) || (!slug && !catalogId)
      if (custom && !name) continue
      if (!custom && !slug && !catalogId) continue
      combatants.push({
        slug: custom ? null : slug || null,
        catalog_id: custom ? null : catalogId || null,
        name: name || slug || 'Враг',
        count: Math.max(1, Math.min(20, Number(cr.count) || 1)),
        hp_max: cr.hp_max == null || cr.hp_max === '' ? null : Number(cr.hp_max),
        ac: cr.ac == null || cr.ac === '' ? null : Number(cr.ac),
        xp: cr.xp == null || cr.xp === '' ? null : Number(cr.xp),
        custom,
        actions: Array.isArray(cr.actions) ? cr.actions : [],
      })
    }
    waves.push({
      index: Math.max(1, Number(row.index) || i + 1),
      condition_text:
        String(row.condition_text ?? '').trim() ||
        (i === 0 ? 'сразу' : 'когда пала предыдущая'),
      combatants,
    })
  }
  if (waves.length === 0) waves.push(...base.waves)
  waves.sort((a, b) => a.index - b.index)
  waves.forEach((w, i) => {
    w.index = i + 1
  })

  const lootRaw =
    obj.loot && typeof obj.loot === 'object' ? (obj.loot as Record<string, unknown>) : {}
  const coinsRaw =
    lootRaw.coins && typeof lootRaw.coins === 'object'
      ? (lootRaw.coins as Record<string, unknown>)
      : {}
  const items: CombatLootPrep['items'] = []
  for (const it of Array.isArray(lootRaw.items) ? lootRaw.items : []) {
    if (!it || typeof it !== 'object') continue
    const row = it as Record<string, unknown>
    const name = String(row.name ?? '').trim()
    if (!name) continue
    items.push({
      id: row.id != null ? String(row.id) : undefined,
      name,
      qty: Math.max(1, Number(row.qty) || 1),
      notes: row.notes != null ? String(row.notes) : null,
    })
  }
  const levels: number[] = []
  for (const lvl of Array.isArray(obj.party_levels) ? obj.party_levels : []) {
    const n = Number(lvl)
    if (Number.isFinite(n)) levels.push(Math.max(1, Math.min(20, Math.round(n))))
  }

  return {
    waves,
    loot: {
      items,
      coins: {
        cp: Math.max(0, Number(coinsRaw.cp) || 0),
        sp: Math.max(0, Number(coinsRaw.sp) || 0),
        ep: Math.max(0, Number(coinsRaw.ep) || 0),
        gp: Math.max(0, Number(coinsRaw.gp) || 0),
        pp: Math.max(0, Number(coinsRaw.pp) || 0),
      },
    },
    party_levels: levels.slice(0, 12),
    gm_notes: String(obj.gm_notes ?? ''),
  }
}
