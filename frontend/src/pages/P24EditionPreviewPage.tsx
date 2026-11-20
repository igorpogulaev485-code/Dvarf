/**
 * DEV-only preview for P24-01 Playwright: create-character CTA + lobby form.
 * With RULES_EDITION_2024_OPEN off — lobby form matches main (no edition field).
 */
import { useState, type FormEvent } from 'react'
import { CreateCharacterButton } from '../features/characters/CreateCharacterButton'
import { RULES_EDITION_2024_OPEN } from '../shared/dnd/rulesEdition2024'
import { Button, Field, Input, Panel, Select, Stack, Text } from '../ui'
import type { LobbyRulesEdition } from '../shared/api/lobbies'

export function P24EditionPreviewPage() {
  const [editionLog, setEditionLog] = useState<string>('—')
  const [name, setName] = useState('Стол 2014')
  const [rulesEdition, setRulesEdition] = useState<LobbyRulesEdition>('2014')
  const [created, setCreated] = useState(false)

  function onCreateLobby(e: FormEvent) {
    e.preventDefault()
    setCreated(true)
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
          <form
            className="inline-form lobbies-create-form"
            onSubmit={onCreateLobby}
            data-testid="lobby-create-form"
          >
            <Field label="Название">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="lobby-preview-name"
              />
            </Field>
            {RULES_EDITION_2024_OPEN ? (
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
            ) : null}
            <Button type="submit" data-testid="lobby-preview-submit">
              Создать лобби
            </Button>
          </form>
          {created ? (
            <p className="ui-text" data-testid="lobby-created-ok">
              Лобби создано
            </p>
          ) : null}
        </Panel>
      </Stack>
    </main>
  )
}
