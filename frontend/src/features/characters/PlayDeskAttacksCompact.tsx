import type { SheetResource } from '../../shared/dnd/rest'
import { formatAttackRoll, type DeskRollMode } from './deskRolls'
import {
  abilityModifier,
  formatModifier,
  type AbilityKey,
} from './sheetTypes'
import type { WeaponAttack } from './AttacksPanel'
import type { InventoryItem } from './inventory'

type PlayDeskAttacksCompactProps = {
  weapons: WeaponAttack[]
  abilities: Record<AbilityKey, number>
  proficiencyBonus: number
  gearBonusesByItem?: Record<string, { attackBonus: number; damageBonus: number }>
  resources: SheetResource[]
  inventoryItems: InventoryItem[]
  onToggleHeld?: (attack: WeaponAttack) => void
  onSpendResource?: (id: string) => void
  onToast?: (message: string) => void
  onOpenFull: () => void
  rollMode?: DeskRollMode
}

const CONSUMABLE_RE =
  /болт|стрел|дротик|снаряд|патрон|камень|flask|зелье|порошок|кислот|огонь|масло|яд/i

export function PlayDeskAttacksCompact({
  weapons,
  abilities,
  proficiencyBonus,
  gearBonusesByItem = {},
  resources,
  inventoryItems,
  onToggleHeld,
  onSpendResource,
  onToast,
  onOpenFull,
  rollMode = 'normal',
}: PlayDeskAttacksCompactProps) {
  const named = weapons.filter((row) => row.name.trim())
  const combatResources = resources.filter(
    (row) => row.max > 0 && row.name.trim() && row.used < row.max,
  )
  const consumables = inventoryItems.filter((item) => {
    if (!item.name.trim() || (item.qty ?? 0) <= 0) return false
    return CONSUMABLE_RE.test(item.name)
  })

  return (
    <div className="play-desk-compact">
      <div className="play-desk-compact__head">
        <h3>Атаки</h3>
        <button type="button" className="play-desk-compact__link" onClick={onOpenFull}>
          полностью
        </button>
      </div>

      <div className="play-desk-compact__list play-desk-compact__list--dense">
        {named.length === 0 ? (
          <p className="play-desk-compact__empty">Нет атак — добавьте в полной панели</p>
        ) : (
          named.map((attack) => {
            const mod = abilityModifier(abilities[attack.ability])
            const gear = attack.inventory_item_id
              ? gearBonusesByItem[attack.inventory_item_id]
              : undefined
            const attackBonus =
              mod +
              (attack.is_proficient ? proficiencyBonus : 0) +
              (gear?.attackBonus ?? 0)
            const dmgBonus = gear?.damageBonus ?? 0
            const dmg =
              attack.damage +
              (dmgBonus ? ` ${dmgBonus >= 0 ? '+' : ''}${dmgBonus}` : '')
            const dmgLine = `${dmg || '—'}${attack.damage_type ? ` ${attack.damage_type}` : ''}`
            return (
              <div key={attack.id} className="play-desk-compact__row is-dense">
                <button
                  type="button"
                  className="play-desk-compact__hit"
                  title="Бросок атаки и урона"
                  onClick={() =>
                    onToast?.(
                      formatAttackRoll({
                        name: attack.name,
                        attackBonus,
                        damageExpr: dmg || attack.damage,
                        damageType: attack.damage_type,
                        mode: rollMode,
                      }),
                    )
                  }
                >
                  <div className="play-desk-compact__row-main">
                    <b>{attack.name}</b>
                    {attack.qty != null && attack.qty > 1 ? (
                      <span className="play-desk-compact__tag">×{attack.qty}</span>
                    ) : null}
                    {attack.held ? (
                      <span className="play-desk-compact__tag is-on">в руках</span>
                    ) : null}
                  </div>
                  <span className="play-desk-compact__mod">{formatModifier(attackBonus)}</span>
                  <span className="play-desk-compact__dmg">{dmgLine}</span>
                </button>
                {onToggleHeld && attack.inventory_item_id ? (
                  <button
                    type="button"
                    className="play-desk-compact__hold"
                    onClick={() => onToggleHeld(attack)}
                  >
                    {attack.held ? 'убрать' : 'взять'}
                  </button>
                ) : null}
              </div>
            )
          })
        )}

        {combatResources.map((row) => {
          const remaining = Math.max(0, row.max - row.used)
          return (
            <div key={row.id} className="play-desk-compact__row is-dense is-resource">
              <button
                type="button"
                className="play-desk-compact__hit"
                disabled={!onSpendResource || remaining <= 0}
                onClick={() => onSpendResource?.(row.id)}
              >
                <div className="play-desk-compact__row-main">
                  <b>{row.name}</b>
                  <span className="play-desk-compact__tag">ресурс</span>
                </div>
                <span className="play-desk-compact__mod">
                  {remaining}/{row.max}
                </span>
                <span className="play-desk-compact__dmg">потратить</span>
              </button>
            </div>
          )
        })}
      </div>

      {consumables.length > 0 ? (
        <div className="play-desk-compact__consumables">
          <div className="play-desk-compact__subhead">Расходники</div>
          {consumables.slice(0, 6).map((item) => (
            <button
              key={item.id}
              type="button"
              className="play-desk-compact__cons-row is-action"
              onClick={() => onToast?.(`${item.name}: ×${item.qty ?? 0}`)}
            >
              <span>{item.name}</span>
              <b>{item.qty ?? 0}</b>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
