import {
  carryingCapacityLb,
  formatLb,
  totalCarriedLb,
} from '../../shared/dnd/weight'
import { filledAttunementCount, MAX_ATTUNEMENTS, type AttunementSlot } from './attunement'
import {
  asWeighableItems,
  equippedArmorPieces,
  type InventoryState,
} from './inventory'

type PlayDeskExploreCompactProps = {
  inventory: InventoryState
  strengthScore: number
  autoAc: number
  acHint: string
  attunements: AttunementSlot[]
  onOpenFull: () => void
  onOpenAttunement?: () => void
  onToast?: (message: string) => void
}

export function PlayDeskExploreCompact({
  inventory,
  strengthScore,
  autoAc,
  acHint,
  attunements,
  onOpenFull,
  onOpenAttunement,
  onToast,
}: PlayDeskExploreCompactProps) {
  const weighable = asWeighableItems(inventory.items)
  const totalLb = totalCarriedLb(inventory.coins, weighable)
  const capacityLb = carryingCapacityLb(strengthScore)
  const over = totalLb > capacityLb
  const pieces = equippedArmorPieces(inventory.items)
  const wornLabel = [
    pieces.armor?.name,
    pieces.shield?.name,
  ]
    .filter(Boolean)
    .join(' + ') || 'без доспеха'
  const coins =
    inventory.coins.gp > 0 || inventory.coins.sp > 0 || inventory.coins.cp > 0
      ? [
          inventory.coins.gp ? `${inventory.coins.gp} зм` : null,
          inventory.coins.sp ? `${inventory.coins.sp} см` : null,
          inventory.coins.cp ? `${inventory.coins.cp} мм` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : 'нет монет'
  const filled = filledAttunementCount(attunements)
  const namedItems = inventory.items
    .filter((item) => item.name.trim() && !item.parent_id)
    .slice(0, 10)

  return (
    <div className="play-desk-compact">
      <div className="play-desk-compact__head">
        <h3>Снаряжение</h3>
        <button type="button" className="play-desk-compact__link" onClick={onOpenFull}>
          полностью
        </button>
      </div>

      <div className="play-desk-compact__cards">
        <div className={`play-desk-compact__card${over ? ' is-warn' : ''}`}>
          <div className="play-desk-compact__card-meta">
            <span>Ноша</span>
            <span className="play-desk-compact__tag">
              {formatLb(totalLb)} / {formatLb(capacityLb)} фнт
            </span>
          </div>
          <p>Монеты: {coins}</p>
        </div>
        <div className="play-desk-compact__card">
          <div className="play-desk-compact__card-meta">
            <span>Надето → КД</span>
            <span className="play-desk-compact__tag is-on">КД {autoAc}</span>
          </div>
          <p>
            {wornLabel}
            {acHint ? ` · ${acHint}` : ''}
          </p>
        </div>
        <button
          type="button"
          className="play-desk-compact__card is-action"
          onClick={() => onOpenAttunement?.()}
        >
          <div className="play-desk-compact__card-meta">
            <span>Настройка</span>
            <span className="play-desk-compact__tag">
              {filled}/{MAX_ATTUNEMENTS}
            </span>
          </div>
          <p>
            {attunements
              .filter((slot) => slot.name.trim())
              .map((slot) => slot.name.trim())
              .join(' · ') || 'слоты пусты'}
          </p>
        </button>
      </div>

      <div className="play-desk-compact__list">
        {namedItems.length === 0 ? (
          <p className="play-desk-compact__empty">Инвентарь пуст</p>
        ) : (
          namedItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="play-desk-compact__row is-action"
              onClick={() =>
                onToast?.(
                  `${item.name}${item.qty > 1 ? ` ×${item.qty}` : ''}${
                    item.equipped ? ' · надето' : ''
                  }`,
                )
              }
            >
              <div className="play-desk-compact__row-main">
                <b>{item.name}</b>
                {item.equipped ? (
                  <span className="play-desk-compact__tag is-on">надето</span>
                ) : null}
              </div>
              <span className="play-desk-compact__mod">
                {item.qty > 1 ? `×${item.qty}` : item.weight_lb != null ? `${formatLb(item.weight_lb * item.qty)} фнт` : '—'}
              </span>
              <span className="play-desk-compact__dmg">
                {item.armor_kind !== 'none'
                  ? 'доспех'
                  : item.requires_attunement
                    ? 'настройка'
                    : item.notes.trim() || 'предмет'}
              </span>
            </button>
          ))
        )}
        {inventory.items.filter((item) => item.name.trim() && !item.parent_id).length >
        namedItems.length ? (
          <p className="play-desk-compact__more">
            + ещё{' '}
            {inventory.items.filter((item) => item.name.trim() && !item.parent_id).length -
              namedItems.length}
          </p>
        ) : null}
      </div>
    </div>
  )
}
