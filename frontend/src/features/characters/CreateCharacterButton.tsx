import { useState } from 'react'
import type { RulesEdition } from '../../shared/api/characters'
import { EDITION_HINT } from '../onboarding'
import { Button, Stack, Text } from '../../ui'

export type CreateCharacterRequest = {
  edition: RulesEdition
}

type CreateCharacterButtonProps = {
  pending?: boolean
  onCreate: (request: CreateCharacterRequest) => void
}

export function CreateCharacterButton({ pending, onCreate }: CreateCharacterButtonProps) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} disabled={pending}>
        Создать персонажа
      </Button>
    )
  }

  function submit(edition: RulesEdition) {
    onCreate({ edition })
    setOpen(false)
  }

  return (
    <div className="create-character">
      <Stack gap={10}>
        <Text>Выберите редакцию правил</Text>
        <Text tone="muted">{EDITION_HINT}</Text>
        <Text tone="muted">2014 — пошаговая форма. 2024 — пока путь через лист.</Text>
        <div className="create-character__actions">
          <Button disabled={pending} onClick={() => submit('2014')}>
            {pending ? '...' : 'D&D 2014'}
          </Button>
          <Button variant="secondary" disabled={pending} onClick={() => submit('2024')}>
            {pending ? '...' : 'D&D 2024'}
          </Button>
          <Button variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
            Отмена
          </Button>
        </div>
      </Stack>
    </div>
  )
}
