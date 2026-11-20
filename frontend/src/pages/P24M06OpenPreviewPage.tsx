/**
 * DEV preview for P24-M06: 2024 differences onboarding + CTA gate.
 * Reflects current RULES_EDITION_2024_OPEN (open since 20.11.2026).
 */
import { useState } from 'react'
import { CreateCharacterButton } from '../features/characters/CreateCharacterButton'
import {
  Edition2024DiffDialog,
  EDITION_HINT_2014,
  EDITION_HINT_2024,
  EDITION_2024_DIFF,
} from '../features/onboarding'
import { RULES_EDITION_2024_OPEN } from '../shared/dnd/rulesEdition2024'
import { Button, Panel, Stack, Text } from '../ui'

export function P24M06OpenPreviewPage() {
  const [diffOpen, setDiffOpen] = useState(true)

  return (
    <main className="page page--app" data-testid="p24-m06-preview">
      <Stack gap={20}>
        <h1 className="ui-text">P24-M06 preview · онбординг и путь открытия</h1>
        <Text tone="muted">
          Флаг RULES_EDITION_2024_OPEN = {String(RULES_EDITION_2024_OPEN)}. BE на проде —
          compose default true (выключить: RULES_EDITION_2024_OPEN=false в .env).
        </Text>

        <Panel title={RULES_EDITION_2024_OPEN ? 'Публичный CTA (флаг вкл)' : 'Публичный CTA (флаг выкл)'}>
          <CreateCharacterButton onCreate={() => undefined} />
          <p
            className="ui-text ui-text--muted"
            data-testid={RULES_EDITION_2024_OPEN ? 'p24-m06-flag-on' : 'p24-m06-flag-off'}
          >
            {RULES_EDITION_2024_OPEN ? '2024 открыт' : '2024 закрыт'} · hint 2014:{' '}
            {EDITION_HINT_2014}
          </p>
        </Panel>

        <Panel title="Путь create (открытый флаг — без preview=1)">
          <Text>
            {RULES_EDITION_2024_OPEN ? (
              <>
                Флаг открыт: <code>/characters/create?edition=2024</code>. Legacy{' '}
                <code>?preview=1</code> тоже работает.
              </>
            ) : (
              <>
                Пока флаг false: <code>/characters/create?edition=2024&preview=1</code>. После
                flip — <code>?edition=2024</code> достаточно.
              </>
            )}
          </Text>
          <p className="onboarding-edition-hint" data-testid="edition-hint-2024">
            {EDITION_HINT_2024}
          </p>
          <Button
            type="button"
            variant="ghost"
            data-testid="edition-2024-diff-reopen"
            onClick={() => setDiffOpen(true)}
          >
            {EDITION_2024_DIFF.reopenLabel}
          </Button>
        </Panel>
      </Stack>

      <Edition2024DiffDialog open={diffOpen} onDone={() => setDiffOpen(false)} />
    </main>
  )
}
