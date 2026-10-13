import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

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
        <div className="character-card__menu" ref={menuRef}>
          <Button
            type="button"
            variant="ghost"
            className="character-card__menu-btn"
            aria-label="Действия с персонажем"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
          >
            ⋯
          </Button>
          {menuOpen ? (
            <div className="character-card__menu-pop" id={menuId} role="menu">
              {!isDraft ? (
                <Link
                  role="menuitem"
                  to={`/characters/${character.id}/classic`}
                  onClick={() => setMenuOpen(false)}
                >
                  Классический лист
                </Link>
              ) : null}
              <button
                type="button"
                role="menuitem"
                className="character-card__menu-danger"
                onClick={() => {
                  setMenuOpen(false)
                  setDeleteError(null)
                  setConfirmOpen(true)
                }}
              >
                Удалить
              </button>
            </div>
          ) : null}
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
