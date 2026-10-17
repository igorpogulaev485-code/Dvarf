import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  deleteCharacter,
  type CharacterSummary,
} from '../../shared/api/characters'
import { ApiRequestError } from '../../shared/api/client'
import { Button, Dialog, Stack, Text } from '../../ui'
import type { CharacterListTag } from './characterListPrefs'

type CharacterCardProps = {
  character: CharacterSummary
  tags?: CharacterListTag[]
  onDeleted?: (id: string) => void
}

function hpParts(character: CharacterSummary): {
  label: string
  ratio: number | null
  low: boolean
} {
  const cur = character.hp_current
  const max = character.hp_max
  if (cur == null && max == null) {
    return { label: 'HP —', ratio: null, low: false }
  }
  const label = `${cur ?? '—'}/${max ?? '—'}`
  if (cur == null || max == null || max <= 0) {
    return { label, ratio: null, low: false }
  }
  const ratio = Math.max(0, Math.min(1, cur / max))
  return { label, ratio, low: ratio <= 0.25 }
}

export function CharacterCard({ character, tags = [], onDeleted }: CharacterCardProps) {
  const navigate = useNavigate()
  const subtitleBits = [
    character.race_name,
    character.class_name
      ? `${character.class_name} ${character.level}`
      : character.level
        ? `ур. ${character.level}`
        : null,
    character.rules_edition,
  ].filter(Boolean)
  const subtitle = subtitleBits.join(' · ')
  const isDraft = Boolean(character.is_draft)
  const initial = character.name.slice(0, 1).toUpperCase() || '?'
  const href = isDraft ? `/characters/create/${character.id}` : `/characters/${character.id}`
  const hp = hpParts(character)

  const menuId = useId()
  const [actionsOpen, setActionsOpen] = useState(false)
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
      <div className="character-card">
        <div className="character-card__menu">
          <Button
            type="button"
            variant="ghost"
            className="character-card__menu-btn"
            aria-label="Действия с персонажем"
            aria-haspopup="dialog"
            aria-expanded={actionsOpen}
            aria-controls={menuId}
            onClick={() => setActionsOpen(true)}
          >
            ⋯
          </Button>
        </div>

        <Link className="character-card__main" to={href}>
          <div className="character-card__avatar" aria-hidden="true">
            {character.avatar_url ? (
              <img src={character.avatar_url} alt="" />
            ) : (
              initial
            )}
          </div>
          <div className="character-card__body">
            <div className="character-card__title-row">
              <Text as="h3" className="character-card__name">
                {character.name}
              </Text>
              {isDraft ? <span className="character-card__draft-badge">Черновик</span> : null}
            </div>
            <Text tone="muted" className="character-card__meta">
              {subtitle || (isDraft ? 'Создание не завершено' : 'Без расы/класса')}
            </Text>
            <div
              className={`character-card__hp${hp.low ? ' is-low' : ''}${hp.ratio == null ? ' is-empty' : ''}`}
            >
              <span className="character-card__hp-label">{hp.label}</span>
              {hp.ratio != null ? (
                <span className="character-card__hp-track" aria-hidden="true">
                  <span
                    className="character-card__hp-fill"
                    style={{ width: `${Math.round(hp.ratio * 100)}%` }}
                  />
                </span>
              ) : null}
            </div>
            {tags.length ? (
              <div className="character-card__tags" aria-label="Теги">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="character-list-tag character-list-tag--sm"
                    style={{ ['--tag-color' as string]: tag.color }}
                    title={tag.name}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </Link>

        <div className="character-card__side">
          <Link className="ui-button ui-button--secondary character-card__open" to={href}>
            {isDraft ? 'Продолжить' : 'Открыть'}
          </Link>
        </div>
      </div>

      <Dialog
        open={actionsOpen}
        title={character.name}
        primaryLabel="Закрыть"
        secondaryLabel="Отмена"
        onPrimary={() => setActionsOpen(false)}
        onSecondary={() => setActionsOpen(false)}
        closeOnBackdrop
      >
        <div className="character-card__actions-sheet" id={menuId} role="menu">
          {!isDraft ? (
            <button
              type="button"
              role="menuitem"
              className="character-card__actions-item"
              onClick={() => {
                // navigate first — closing the dialog unmounts a <Link> mid-tap on iOS
                // and cancels the route change (user stays on /characters or hits «Открыть»).
                const classicPath = `/characters/${character.id}/classic`
                setActionsOpen(false)
                navigate(classicPath)
              }}
            >
              Классический лист
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="character-card__actions-item character-card__actions-item--danger"
            onClick={() => {
              setActionsOpen(false)
              setDeleteError(null)
              setConfirmOpen(true)
            }}
          >
            Удалить
          </button>
        </div>
      </Dialog>

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
