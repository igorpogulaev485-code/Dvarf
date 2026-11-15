import type { CharacterDetail } from '../../shared/api/characters'
import { asRecord } from '../characters/sheetTypes'
import { readClassLevels } from '../characters/classLevels'
import { syncHitDicePools } from '../../shared/dnd/classHitDice'
import { isHitDie, type HitDie } from '../../shared/dnd/hitDice'

/** PHB die → печатная запись «к8». */
export function hitDieRu(die: HitDie): string {
  return `к${die.slice(1)}`
}

/**
 * «Всего» костей хитов для бланка: «3к8» или «3к10+2к8+2к6+1к8».
 * Группирует по типу кости в порядке появления классов.
 */
export function classicHitDiceTotalLabel(character: CharacterDetail): string {
  const sheet = asRecord(character.sheet)
  const classes = readClassLevels(sheet, {
    className: character.class_name ?? '',
    level: character.level ?? 1,
    subclassName: '',
    classCatalogId: null,
  })
  if (classes.length > 0) {
    const pools = syncHitDicePools({ classes })
    const order: HitDie[] = []
    const counts = new Map<HitDie, number>()
    for (const pool of pools) {
      if (pool.max <= 0) continue
      const die = isHitDie(pool.die) ? pool.die : 'd8'
      if (!counts.has(die)) order.push(die)
      counts.set(die, (counts.get(die) ?? 0) + pool.max)
    }
    if (order.length > 0) {
      return order.map((die) => `${counts.get(die)}${hitDieRu(die)}`).join('+')
    }
  }
  const level =
    typeof character.level === 'number' && Number.isFinite(character.level)
      ? Math.max(0, Math.floor(character.level))
      : 0
  const legacy = asRecord(asRecord(character.sheet).combat).hit_die
  const dieRaw = typeof legacy === 'string' ? legacy.trim().toLowerCase() : ''
  const die: HitDie =
    isHitDie(dieRaw) ? dieRaw : isHitDie(`d${dieRaw.replace(/^к/, '')}`) ? (`d${dieRaw.replace(/^к/, '')}` as HitDie) : 'd8'
  if (level <= 0) return ''
  return `${level}${hitDieRu(die)}`
}

/** Текущие кости: число или пусто → линия под карандаш. */
export function classicHitDiceCurrentLabel(character: CharacterDetail): string {
  const combat = asRecord(asRecord(character.sheet).combat)
  const raw = combat.hp_dice_current
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(Math.floor(raw))
  if (typeof raw === 'string' && raw.trim() !== '') return raw.trim()
  return ''
}
