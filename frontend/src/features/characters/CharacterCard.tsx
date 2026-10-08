import { Link } from 'react-router-dom'
import type { CharacterSummary } from '../../shared/api/characters'
import { Text } from '../../ui'

type CharacterCardProps = {
  character: CharacterSummary
}

function hpLabel(character: CharacterSummary): string {
  if (character.hp_current == null && character.hp_max == null) {
    return 'HP —'
  }
  return `HP ${character.hp_current ?? '—'}/${character.hp_max ?? '—'}`
}

export function CharacterCard({ character }: CharacterCardProps) {
  const subtitle = [character.race_name, character.class_name]
    .filter(Boolean)
    .join(' — ')
  const isDraft = Boolean(character.is_draft)

  return (
    <article className="character-card__wrap">
      <Link
        className="character-card"
        to={isDraft ? `/characters/create/${character.id}` : `/characters/${character.id}`}
      >
        <div className="character-card__avatar" aria-hidden="true">
          {character.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="character-card__body">
          <Text as="h3" className="character-card__name">
            {character.name}
            {isDraft ? <span className="character-card__draft-badge">Черновик</span> : null}
          </Text>
          <Text tone="muted">
            {subtitle || (isDraft ? 'Создание не завершено' : 'Без расы/класса')} · ур.{' '}
            {character.level} · {character.rules_edition}
          </Text>
          <Text tone="muted">{hpLabel(character)}</Text>
        </div>
      </Link>
      <div className="character-card__actions">
        {isDraft ? (
          <Link to={`/characters/create/${character.id}`}>Продолжить создание</Link>
        ) : (
          <>
            <Link to={`/characters/${character.id}`}>Цифровой лист</Link>
            <Link to={`/characters/${character.id}/classic`}>Классический лист</Link>
          </>
        )}
      </div>
    </article>
  )
}
