import { Text } from '../../ui'

export type CatalogCardItem = {
  id: string
  title: string
  subtitle?: string
  disabled?: boolean
}

type CatalogCardListProps = {
  items: CatalogCardItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  emptyText?: string
}

export function CatalogCardList({
  items,
  selectedId,
  onSelect,
  emptyText = 'Ничего не найдено',
}: CatalogCardListProps) {
  if (!items.length) {
    return <Text tone="muted">{emptyText}</Text>
  }

  return (
    <ul className="create-pipeline__card-list">
      {items.map((item) => {
        const selected = item.id === selectedId
        return (
          <li key={item.id}>
            <button
              type="button"
              className={
                selected
                  ? 'create-pipeline__card create-pipeline__card--selected'
                  : 'create-pipeline__card'
              }
              disabled={item.disabled}
              onClick={() => onSelect(item.id)}
            >
              <span className="create-pipeline__card-title">{item.title}</span>
              {item.subtitle ? (
                <span className="create-pipeline__card-sub">{item.subtitle}</span>
              ) : null}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
