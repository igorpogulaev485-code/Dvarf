import type { ReactNode } from 'react'
import type { CharacterSummary } from '../../shared/api/characters'
import { EmptyState } from '../../ui'
import { CharacterCard } from './CharacterCard'

type CharacterListProps = {
  characters: CharacterSummary[]
  emptyAction?: ReactNode
  onDeleted?: (id: string) => void
}

export function CharacterList({ characters, emptyAction, onDeleted }: CharacterListProps) {
  if (!characters.length) {
    return (
      <EmptyState
        title="Пока нет персонажей"
        description="Создайте первого — откроется страница листа."
        action={emptyAction}
      />
    )
  }

  return (
    <div className="character-grid">
      {characters.map((character) => (
        <CharacterCard
          key={character.id}
          character={character}
          onDeleted={onDeleted}
        />
      ))}
    </div>
  )
}
