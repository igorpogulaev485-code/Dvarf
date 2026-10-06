import { useState } from 'react'
import type { RulesEdition } from '../../shared/api/characters'
import { Button, Stack, Text } from '../../ui'

type CreateCharacterButtonProps = {
  pending?: boolean
  onCreate: (edition: RulesEdition) => void
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

  return (
    <div className="create-character">
      <Stack gap={10}>
        <Text>Выберите редакцию правил</Text>
        <Text tone="muted">Потом можно будет поменять в листе персонажа.</Text>
        <div className="create-character__actions">
          <Button
            disabled={pending}
            onClick={() => {
              onCreate('2014')
              setOpen(false)
            }}
          >
            {pending ? '...' : 'D&D 2014'}
          </Button>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => {
              onCreate('2024')
              setOpen(false)
            }}
          >
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
