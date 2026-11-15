/**
 * DEV-only preview for P24-01 Playwright: create-character CTA + lobby edition field.
 * No API — pure UI contract while RULES_EDITION_2024_OPEN is off.
 */
import { useState, type FormEvent } from 'react'
import { CreateCharacterButton } from '../features/characters/CreateCharacterButton'
import { Button, Field, Input, Panel, Select, Stack, Text } from '../ui'
import type { LobbyRulesEdition } from '../shared/api/lobbies'

export function P24EditionPreviewPage() {
  const [editionLog, setEditionLog] = useState<string>('—')
  const [name, setName] = useState('Стол 2014')
  const [rulesEdition, setRulesEdition] = useState<LobbyRulesEdition>('2014')
  const [createdEdition, setCreatedEdition] = useState<string | null>(null)

  function onCreateLobby(e: FormEvent) {
    e.preventDefault()
    setCreatedEdition(rulesEdition)
  }

  return (
    <main className="page page--app" data-testid="p24-01-preview">
      <Stack gap={20}>
        <h1 className="ui-text">P24-01 preview</h1>
        <Panel title="Создать персонажа">
          <CreateCharacterButton
            onCreate={(req) => setEditionLog(req.edition)}
          />
          <p className="ui-text ui-text--muted" data-testid="create-edition-log">
            Выбрано: {editionLog}
          </p>
          <Text tone="muted">
            Кнопки «D&D 2024» быть не должно, пока флаг открытия выключен.
          </Text>
        </Panel>

        <Panel title="Создать лобби">
          <form className="inline-form" onSubmit={onCreateLobby}>
            <Field label="Название">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="lobby-preview-name"
              />
            </Field>
            <Field
              label="Редакция"
              hint="Задаётся при создании и больше не меняется."
            >
              <Select
                value={rulesEdition}
                onChange={(e) =>
                  setRulesEdition(e.target.value === '2024' ? '2024' : '2014')
                }
                data-testid="lobby-create-rules-edition"
                aria-label="Редакция лобби"
              >
                <option value="2014">D&D 2014</option>
                <option value="2024">D&D 2024</option>
              </Select>
            </Field>
            <Button type="submit" data-testid="lobby-preview-submit">
              Создать лобби
            </Button>
          </form>
          {createdEdition ? (
            <p className="ui-text" data-testid="lobby-created-edition">
              Лобби создано · редакция {createdEdition} · после создания не меняется
            </p>
          ) : null}
        </Panel>
      </Stack>
    </main>
  )
}
