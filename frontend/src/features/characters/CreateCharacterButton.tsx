import { useState } from 'react'
import type { RulesEdition } from '../../shared/api/characters'
import { RULES_EDITION_2024_OPEN } from '../../shared/dnd/rulesEdition2024'
import { EDITION_HINT } from '../onboarding'
import { Button, Stack, Text } from '../../ui'

export type CreateCharacterRequest = {
  edition: RulesEdition
}

type CreateCharacterButtonProps = {
  pending?: boolean
  onCreate: (request: CreateCharacterRequest) => void
  /** Circle «+» on the character list. One control, not a second toolbar button. */
  fab?: boolean
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Одна кнопка «Создать персонажа» → выбор редакции (как до hide2024 / d604d99a^).
 * Пока RULES_EDITION_2024_OPEN выключен — только 2014 без выбора.
 */
export function CreateCharacterButton({ pending, onCreate, fab = false }: CreateCharacterButtonProps) {
  const [open, setOpen] = useState(false)

  if (!RULES_EDITION_2024_OPEN) {
    if (fab) {
      return (
        <button
          type="button"
          className="fab-create"
          disabled={pending}
          aria-label="Создать персонажа"
          onClick={() => onCreate({ edition: '2014' })}
          data-testid="create-character-2014"
        >
          <PlusIcon />
        </button>
      )
    }
    return (
      <Button
        disabled={pending}
        onClick={() => onCreate({ edition: '2014' })}
        data-testid="create-character-2014"
      >
        {pending ? '...' : 'Создать персонажа'}
      </Button>
    )
  }

  if (!open) {
    if (fab) {
      return (
        <button
          type="button"
          className="fab-create"
          disabled={pending}
          aria-label="Создать персонажа"
          onClick={() => setOpen(true)}
          data-testid="create-character-open"
        >
          <PlusIcon />
        </button>
      )
    }
    return (
      <Button
        onClick={() => setOpen(true)}
        disabled={pending}
        data-testid="create-character-open"
      >
        Создать персонажа
      </Button>
    )
  }

  if (fab) {
    return (
      <>
        <button
          type="button"
          className="fab-create"
          aria-label="Закрыть"
          onClick={() => setOpen(false)}
        >
          <PlusIcon />
        </button>
        <div className="fab-create-pop" data-testid="create-character-edition">
          <Stack gap={10}>
            <Text>Выберите редакцию правил</Text>
            <Text tone="muted">{EDITION_HINT}</Text>
            <div className="create-character__actions">
              <Button
                disabled={pending}
                onClick={() => {
                  onCreate({ edition: '2014' })
                  setOpen(false)
                }}
                data-testid="create-character-2014"
              >
                {pending ? '...' : 'D&D 2014'}
              </Button>
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => {
                  onCreate({ edition: '2024' })
                  setOpen(false)
                }}
                data-testid="create-character-2024"
              >
                {pending ? '...' : 'D&D 2024'}
              </Button>
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => setOpen(false)}
                data-testid="create-character-cancel"
              >
                Отмена
              </Button>
            </div>
          </Stack>
        </div>
      </>
    )
  }

  function submit(edition: RulesEdition) {
    onCreate({ edition })
    setOpen(false)
  }

  return (
    <div className="create-character" data-testid="create-character-edition">
      <Stack gap={10}>
        <Text>Выберите редакцию правил</Text>
        <Text tone="muted">{EDITION_HINT}</Text>
        <div className="create-character__actions">
          <Button
            disabled={pending}
            onClick={() => submit('2014')}
            data-testid="create-character-2014"
          >
            {pending ? '...' : 'D&D 2014'}
          </Button>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => submit('2024')}
            data-testid="create-character-2024"
          >
            {pending ? '...' : 'D&D 2024'}
          </Button>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => setOpen(false)}
            data-testid="create-character-cancel"
          >
            Отмена
          </Button>
        </div>
      </Stack>
    </div>
  )
}
