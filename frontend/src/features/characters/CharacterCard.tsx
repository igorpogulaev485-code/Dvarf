import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  deleteCharacter,
  type CharacterSummary,
} from '../../shared/api/characters'
import { ApiRequestError } from '../../shared/api/client'
import { Button, Dialog, Stack, Text } from '../../ui'

type CharacterCardProps = {
  character: CharacterSummary
  onDeleted?: (id: string) => void
}

function hpLabel(character: CharacterSummary): string {
  if (character.hp_current == null && character.hp_max == null) {
    return 'HP —'
  }
  return `HP ${character.hp_current ?? '—'}/${character.hp_max ?? '—'}`
}

export function CharacterCard({ character, onDeleted }: CharacterCardProps) {
  const subtitle = [character.race_name, character.class_name]
    .filter(Boolean)
    .join(' — ')
  const isDraft = Boolean(character.is_draft)
  const initial = character.name.slice(0, 1).toUpperCase() || '?'
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleConfirmDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteCharacter(character.id)
      setConfirmOpen(false)
      onDeleted?.(character.id)
    } catch (err) {
      setDeleteError(
        err instanceof ApiRequestError ? err.message : 'Не удалось удалить персонажа',
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <article className="character-card__wrap">
      <Link
        className="character-card"
        to={isDraft ? `/characters/create/${character.id}` : `/characters/${character.id}`}
      >
        <div className="character-card__avatar" aria-hidden="true">
          {character.avatar_url ? (
            <img src={character.avatar_url} alt="" />
          ) : (
            initial
          )}
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
        <Button
          type="button"
          variant="ghost"
          className="character-card__delete"
          onClick={() => {
            setDeleteError(null)
            setConfirmOpen(true)
          }}
        >
          Удалить
        </Button>
      </div>

      <Dialog
        open={confirmOpen}
        title="Удалить персонажа?"
        primaryLabel={deleting ? 'Удаляем…' : 'Удалить'}
        primaryVariant="danger"
        secondaryLabel="Отмена"
        busy={deleting}
        onPrimary={() => void handleConfirmDelete()}
        onSecondary={() => {
          if (deleting) return
          setConfirmOpen(false)
          setDeleteError(null)
        }}
      >
        <Stack gap={10}>
          <Text>
            Персонаж «{character.name}» будет удалён из вашего списка. Это действие нельзя
            отменить.
          </Text>
          {deleteError ? <Text tone="danger">{deleteError}</Text> : null}
        </Stack>
      </Dialog>
    </article>
  )
}
