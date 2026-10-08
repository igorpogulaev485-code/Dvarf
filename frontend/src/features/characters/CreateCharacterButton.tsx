import { useState } from 'react'
import type { RulesEdition } from '../../shared/api/characters'
import { clampCharacterLevel } from '../../shared/dnd/experience'
import { Button, Field, NumberInput, Stack, Text } from '../../ui'

export type CreateCharacterRequest = {
  edition: RulesEdition
  /** 1–20; wizard will cover picks up to this class level. */
  startingLevel: number
}

type CreateCharacterButtonProps = {
  pending?: boolean
  onCreate: (request: CreateCharacterRequest) => void
}

export function CreateCharacterButton({ pending, onCreate }: CreateCharacterButtonProps) {
  const [open, setOpen] = useState(false)
  const [startingLevel, setStartingLevel] = useState(1)

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} disabled={pending}>
        Создать персонажа
      </Button>
    )
  }

  const level = clampCharacterLevel(startingLevel || 1)

  function submit(edition: RulesEdition) {
    onCreate({ edition, startingLevel: level })
    setOpen(false)
    setStartingLevel(1)
  }

  return (
    <div className="create-character">
      <Stack gap={10}>
        <Text>Выберите редакцию правил</Text>
        <Text tone="muted">Потом можно будет поменять в листе персонажа.</Text>
        <Field
          label="Стартовый уровень"
          hint="Можно сразу 13: после выбора класса мастер проведёт через умения и ASI до этого уровня."
        >
          <NumberInput
            value={level}
            min={1}
            max={20}
            onValueChange={(value) => setStartingLevel(clampCharacterLevel(value ?? 1))}
          />
        </Field>
        <div className="create-character__actions">
          <Button disabled={pending} onClick={() => submit('2014')}>
            {pending ? '...' : 'D&D 2014'}
          </Button>
          <Button variant="secondary" disabled={pending} onClick={() => submit('2024')}>
            {pending ? '...' : 'D&D 2024'}
          </Button>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setOpen(false)
              setStartingLevel(1)
            }}
          >
            Отмена
          </Button>
        </div>
      </Stack>
    </div>
  )
}
