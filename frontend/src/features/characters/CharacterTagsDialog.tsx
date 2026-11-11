import { useMemo, useState } from 'react'
import type { CharacterSummary } from '../../shared/api/characters'
import { Button, Dialog, Field, Input, Stack, Text } from '../../ui'
import {
  TAG_COLOR_OPTIONS,
  newTagId,
  type CharacterListPrefs,
  type CharacterListTag,
} from './characterListPrefs'

type CharacterTagsDialogProps = {
  open: boolean
  characters: CharacterSummary[]
  prefs: CharacterListPrefs
  onClose: () => void
  onChange: (next: CharacterListPrefs) => void
}

export function CharacterTagsDialog({
  open,
  characters,
  prefs,
  onClose,
  onChange,
}: CharacterTagsDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(TAG_COLOR_OPTIONS[0])
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  const editingTag = useMemo(
    () => (editingId ? prefs.tags.find((tag) => tag.id === editingId) ?? null : null),
    [editingId, prefs.tags],
  )

  function resetForm() {
    setEditingId(null)
    setName('')
    setColor(TAG_COLOR_OPTIONS[0])
    setSelectedCharacterIds([])
    setFormError(null)
  }

  function startCreate() {
    resetForm()
  }

  function startEdit(tag: CharacterListTag) {
    setEditingId(tag.id)
    setName(tag.name)
    setColor(tag.color)
    const assigned = characters
      .filter((character) => (prefs.assignments[character.id] ?? []).includes(tag.id))
      .map((character) => character.id)
    setSelectedCharacterIds(assigned)
    setFormError(null)
  }

  function toggleCharacter(id: string) {
    setSelectedCharacterIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  function saveTag() {
    const trimmed = name.trim()
    if (!trimmed) {
      setFormError('Введите название тега')
      return
    }
    const id = editingId ?? newTagId()
    const nextTag: CharacterListTag = {
      id,
      name: trimmed.slice(0, 40),
      color: color || TAG_COLOR_OPTIONS[0],
    }
    const tags = editingId
      ? prefs.tags.map((tag) => (tag.id === id ? nextTag : tag))
      : [...prefs.tags, nextTag]

    const assignments: Record<string, string[]> = { ...prefs.assignments }
    for (const character of characters) {
      const current = new Set(assignments[character.id] ?? [])
      if (selectedCharacterIds.includes(character.id)) {
        current.add(id)
      } else {
        current.delete(id)
      }
      const list = [...current]
      if (list.length) assignments[character.id] = list
      else delete assignments[character.id]
    }

    onChange({ ...prefs, tags, assignments })
    resetForm()
  }

  function deleteTag(tagId: string) {
    const tags = prefs.tags.filter((tag) => tag.id !== tagId)
    const assignments: Record<string, string[]> = {}
    for (const [characterId, tagIds] of Object.entries(prefs.assignments)) {
      const next = tagIds.filter((id) => id !== tagId)
      if (next.length) assignments[characterId] = next
    }
    onChange({ ...prefs, tags, assignments })
    if (editingId === tagId) resetForm()
  }

  return (
    <Dialog
      open={open}
      title="Теги персонажей"
      size="wide"
      primaryLabel={editingId ? 'Сохранить' : 'Создать'}
      secondaryLabel="Закрыть"
      onPrimary={saveTag}
      onSecondary={() => {
        resetForm()
        onClose()
      }}
    >
      <Stack gap={16}>
        <Text tone="muted">
          Теги хранятся в этом браузере — удобно фильтровать список кампаний и статусов.
        </Text>

        {prefs.tags.length ? (
          <div className="character-tags-dialog__list">
            {prefs.tags.map((tag) => (
              <div key={tag.id} className="character-tags-dialog__row">
                <button
                  type="button"
                  className="character-list-tag"
                  style={{ ['--tag-color' as string]: tag.color }}
                  onClick={() => startEdit(tag)}
                >
                  {tag.name}
                </button>
                <Button type="button" variant="ghost" onClick={() => startEdit(tag)}>
                  Изменить
                </Button>
                <Button type="button" variant="ghost" onClick={() => deleteTag(tag.id)}>
                  Удалить
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <Text tone="muted">Пока нет тегов — создайте первый ниже.</Text>
        )}

        <div className="character-tags-dialog__form">
          <div className="character-tags-dialog__form-head">
            <Text as="h3">{editingTag ? `Тег «${editingTag.name}»` : 'Новый тег'}</Text>
            {editingId ? (
              <Button type="button" variant="ghost" onClick={startCreate}>
                Новый
              </Button>
            ) : null}
          </div>
          <Field label="Название">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
              placeholder="Например, кампания или статус"
            />
          </Field>
          <Field label="Цвет">
            <div className="character-tags-dialog__swatches" role="listbox" aria-label="Цвет тега">
              {TAG_COLOR_OPTIONS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  role="option"
                  aria-selected={color === swatch}
                  className={`character-tags-dialog__swatch${color === swatch ? ' is-on' : ''}`}
                  style={{ background: swatch }}
                  onClick={() => setColor(swatch)}
                />
              ))}
            </div>
          </Field>
          <Field label="Персонажи">
            {characters.length ? (
              <div className="character-tags-dialog__chars">
                {characters.map((character) => {
                  const checked = selectedCharacterIds.includes(character.id)
                  return (
                    <label key={character.id} className="character-tags-dialog__char">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCharacter(character.id)}
                      />
                      <span>{character.name}</span>
                    </label>
                  )
                })}
              </div>
            ) : (
              <Text tone="muted">Сначала создайте персонажа.</Text>
            )}
          </Field>
          {formError ? <Text tone="danger">{formError}</Text> : null}
        </div>
      </Stack>
    </Dialog>
  )
}
