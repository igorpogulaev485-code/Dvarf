import type { RulesEdition } from '../../shared/api/characters'
import { Button } from '../../ui'

export type CreateCharacterRequest = {
  edition: RulesEdition
}

type CreateCharacterButtonProps = {
  pending?: boolean
  onCreate: (request: CreateCharacterRequest) => void
}

/** Единственный доступный путь — 2014; выбор редакции скрыт до готовности 2024. */
export function CreateCharacterButton({ pending, onCreate }: CreateCharacterButtonProps) {
  return (
    <Button
      disabled={pending}
      onClick={() => onCreate({ edition: '2014' })}
    >
      {pending ? '...' : 'Создать персонажа'}
    </Button>
  )
}
