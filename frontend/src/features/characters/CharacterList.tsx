import type { ReactNode } from 'react'
import type { CharacterSummary } from '../../shared/api/characters'
import { EmptyState } from '../../ui'
import { CharacterCard } from './CharacterCard'
import {
  tagsForCharacter,
  type CharacterCardSize,
  type CharacterListPrefs,
} from './characterListPrefs'

type CharacterListProps = {
  characters: CharacterSummary[]
  prefs: CharacterListPrefs
  cardSize: CharacterCardSize
  /** True when the full account list is empty (not just a tag filter). */
  listEmpty?: boolean
  emptyAction?: ReactNode
  onDeleted?: (id: string) => void
}

export function CharacterList({
  characters,
  prefs,
  cardSize,
  listEmpty = false,
  emptyAction,
  onDeleted,
}: CharacterListProps) {
  if (!characters.length) {
    return (
      <EmptyState
        title={listEmpty ? 'Пока нет персонажей' : 'Нет совпадений'}
        description={
          listEmpty
            ? 'Создайте первого — откроется страница листа.'
            : 'Сбросьте фильтр тегов или назначьте теги другим персонажам.'
        }
        action={emptyAction}
      />
    )
  }

  return (
    <div className={`character-grid character-grid--${cardSize}`}>
      {characters.map((character) => (
        <CharacterCard
          key={character.id}
          character={character}
          tags={tagsForCharacter(prefs, character.id)}
          onDeleted={onDeleted}
        />
      ))}
    </div>
  )
}
