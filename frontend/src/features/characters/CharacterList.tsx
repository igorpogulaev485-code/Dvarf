import { Fragment, useMemo, type ReactNode } from 'react'
import type { CharacterSummary } from '../../shared/api/characters'
import { EmptyState } from '../../ui'
import { EMPTY_CHARACTERS } from '../onboarding'
import { CharacterCard } from './CharacterCard'
import {
  applyCharacterOrder,
  tagsForCharacter,
  type CharacterCardSize,
  type CharacterListPrefs,
} from './characterListPrefs'
import { useHybridTileDrag } from './useHybridTileDrag'

type CharacterListProps = {
  characters: CharacterSummary[]
  prefs: CharacterListPrefs
  cardSize: CharacterCardSize
  /** True when the full account list is empty (not just a tag filter). */
  listEmpty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  onDeleted?: (id: string) => void
  /** Hybrid reorder. Omitted while a tag filter is on. */
  onReorder?: (ids: string[]) => void
}

export function CharacterList({
  characters,
  prefs,
  cardSize,
  listEmpty = false,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onDeleted,
  onReorder,
}: CharacterListProps) {
  const ordered = useMemo(
    () => applyCharacterOrder(characters, prefs.order ?? []),
    [characters, prefs.order],
  )
  const ids = useMemo(() => ordered.map((character) => character.id), [ordered])
  const drag = useHybridTileDrag({
    ids,
    enabled: Boolean(onReorder) && ids.length > 1,
    onCommit: onReorder ?? (() => undefined),
  })
  const byId = useMemo(() => new Map(ordered.map((character) => [character.id, character])), [ordered])
  const shown = drag.visual
    .map((id) => byId.get(id))
    .filter((character): character is CharacterSummary => Boolean(character))

  if (!characters.length) {
    return (
      <EmptyState
        title={
          emptyTitle ??
          (listEmpty ? EMPTY_CHARACTERS.title : 'Нет совпадений')
        }
        description={
          emptyDescription ??
          (listEmpty
            ? EMPTY_CHARACTERS.description
            : 'Сбросьте фильтр тегов или назначьте теги другим персонажам.')
        }
        action={emptyAction}
      />
    )
  }

  return (
    <div
      ref={drag.gridRef}
      className={`character-grid character-grid--${cardSize}${drag.dragging ? ' is-reordering' : ''}`}
    >
      {shown.map((character) => {
        const bind = onReorder ? drag.bind(character.id) : null
        return (
          <Fragment key={character.id}>
            {bind?.placeholder ? (
              <div
                className="tile-placeholder"
                data-tile-slot=""
                style={{ height: bind.placeholderHeight || undefined }}
              />
            ) : null}
            <CharacterCard
              character={character}
              tags={tagsForCharacter(prefs, character.id)}
              onDeleted={onDeleted}
              dragClassName={bind?.className}
              dragStyle={bind?.style}
              onTilePointerDown={bind?.onPointerDown}
              onTileClickCapture={bind?.onClickCapture}
              tileSlot={!bind?.placeholder}
            />
          </Fragment>
        )
      })}
    </div>
  )
}
