import type { ReactNode } from 'react'
import type { CharacterSummary } from '../../shared/api/characters'
import { EmptyState } from '../../ui'
import { CharacterCard } from './CharacterCard'

type CharacterListProps = {
  characters: CharacterSummary[]
  emptyAction?: ReactNode
}

export function CharacterList({ characters, emptyAction }: CharacterListProps) {
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
        <CharacterCard key={character.id} character={character} />
      ))}
    </div>
  )
}
