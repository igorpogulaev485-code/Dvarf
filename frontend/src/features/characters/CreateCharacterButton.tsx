import type { RulesEdition } from '../../shared/api/characters'
import { RULES_EDITION_2024_OPEN } from '../../shared/dnd/rulesEdition2024'
import { Button } from '../../ui'

export type CreateCharacterRequest = {
  edition: RulesEdition
}

type CreateCharacterButtonProps = {
  pending?: boolean
  onCreate: (request: CreateCharacterRequest) => void
}

/**
 * P24-01: кнопка «D&D 2024» скрыта, пока RULES_EDITION_2024_OPEN выключен (открытие — P24-M06).
 */
export function CreateCharacterButton({ pending, onCreate }: CreateCharacterButtonProps) {
  if (!RULES_EDITION_2024_OPEN) {
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

  return (
    <div className="create-character-edition" data-testid="create-character-edition">
      <Button
        disabled={pending}
        onClick={() => onCreate({ edition: '2014' })}
        data-testid="create-character-2014"
      >
        {pending ? '...' : 'D&D 2014'}
      </Button>
      <Button
        disabled={pending}
        onClick={() => onCreate({ edition: '2024' })}
        data-testid="create-character-2024"
      >
        {pending ? '...' : 'D&D 2024'}
      </Button>
    </div>
  )
}
