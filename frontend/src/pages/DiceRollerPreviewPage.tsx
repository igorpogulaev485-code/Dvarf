/**
 * DEV harness for DICE-01 — real Play Desk fixture + dice FAB.
 * ?edition=2014|2024 · ?open=1 · ?clean=1
 */
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MinimalSheetEditor } from '../features/characters/MinimalSheetEditor'
import { DiceRollerHost } from '../features/diceRoller'
import { sampleClassic2014Character } from '../features/classicSheet/sampleClassicCharacter'
import type { CharacterDetail } from '../shared/api/characters'
import type { DiceLogEntry } from '../features/diceRoller/types'
import { Text } from '../ui'

function editionCharacter(
  edition: '2014' | '2024',
  opts?: { rogue20?: boolean },
): CharacterDetail {
  const base = sampleClassic2014Character
  if (opts?.rogue20) {
    const sheet = { ...(base.sheet ?? {}) } as Record<string, unknown>
    const identity = {
      ...((sheet.identity as Record<string, unknown> | undefined) ?? {}),
      subclass_name: 'Вор',
    }
    sheet.identity = identity
    if (edition === '2024') {
      const ui = { ...((sheet.ui as Record<string, unknown> | undefined) ?? {}) }
      ui.classic_sheet_layout = '2024'
      sheet.ui = ui
    }
    return {
      ...base,
      id: edition === '2024' ? 'preview-dice-rogue20-2024' : 'preview-dice-rogue20-2014',
      rules_edition: edition,
      name: 'Тень Удачливая',
      class_name: 'Плут',
      level: 20,
      race_name: 'Халифлинг (легконогий)',
      sheet,
    } as CharacterDetail
  }
  if (edition === '2014') {
    return {
      ...base,
      id: 'preview-dice-2014',
      rules_edition: '2014',
      name: 'Торин Камнебород',
    }
  }
  const sheet = { ...(base.sheet ?? {}) } as Record<string, unknown>
  const ui = { ...((sheet.ui as Record<string, unknown> | undefined) ?? {}) }
  ui.classic_sheet_layout = '2024'
  sheet.ui = ui
  return {
    ...base,
    id: 'preview-dice-2024',
    rules_edition: '2024',
    name: 'Элара Ветрокрылая',
    class_name: 'Плут',
    race_name: 'Эльф (высший)',
    sheet,
  } as CharacterDetail
}

const DEMO_LOG: DiceLogEntry[] = [
  {
    id: 'demo-1',
    at: Date.now() - 60_000,
    expression: '1d20+5',
    advantageMode: 'none',
    total: 25,
    modifierTotal: 5,
    dice: [{ sides: 20, value: 20, dropped: false, nat: '20' }],
  },
  {
    id: 'demo-2',
    at: Date.now() - 120_000,
    expression: '1d20+2',
    advantageMode: 'advantage',
    total: 18,
    modifierTotal: 2,
    dice: [
      { sides: 20, value: 16, dropped: false },
      { sides: 20, value: 4, dropped: true },
    ],
  },
  {
    id: 'demo-3',
    at: Date.now() - 180_000,
    expression: '2d6+3',
    advantageMode: 'none',
    total: 11,
    modifierTotal: 3,
    dice: [
      { sides: 6, value: 5, dropped: false },
      { sides: 6, value: 3, dropped: false },
    ],
  },
  {
    id: 'demo-4',
    at: Date.now() - 240_000,
    expression: '1d20',
    advantageMode: 'none',
    total: 1,
    modifierTotal: 0,
    dice: [{ sides: 20, value: 1, dropped: false, nat: '1' }],
  },
]

export function DiceRollerPreviewPage() {
  const [params] = useSearchParams()
  const edition = params.get('edition') === '2024' ? '2024' : '2014'
  const open = params.get('open') === '1'
  const clean = params.get('clean') === '1'
  const withLog = params.get('log') === '1'
  const rogue20 = params.get('rogue20') === '1'
  const withMiss = params.get('miss') === '1' || rogue20
  const [character, setCharacter] = useState(() =>
    editionCharacter(edition, { rogue20 }),
  )

  const missSeed: DiceLogEntry[] = useMemo(
    () =>
      withMiss
        ? [
            {
              id: 'luck-miss-1',
              at: Date.now() - 5_000,
              expression: '1d20+7',
              advantageMode: 'none',
              total: 9,
              modifierTotal: 7,
              dice: [{ sides: 20, value: 2, dropped: false, nat: '1' }],
              title: 'Скрытность',
              toastText: 'Скрытность: 9 (d20:2 +7)',
              source: 'sheet',
              repeatable: true,
            },
          ]
        : [],
    [withMiss],
  )

  const seedLog = useMemo(() => {
    if (withLog) return DEMO_LOG
    if (missSeed.length) return missSeed
    return undefined
  }, [withLog, missSeed])

  return (
    <main
      className={`page page--app${clean ? ' dice-preview--clean' : ''}`}
      data-testid="dice-roller-preview"
      data-edition={edition}
    >
      {!clean ? (
        <Text tone="muted">
          /dev/dice-roller-preview · издание {edition} · тестовые данные
        </Text>
      ) : null}
      <MinimalSheetEditor
        key={character.id}
        character={character}
        onSaved={setCharacter}
        onToast={() => undefined}
      />
      <DiceRollerHost
        characterId={character.id}
        defaultOpen={open}
        initialLog={seedLog}
        openSessionId={
          params.get('session') === '1' ? 'preview-session-open' : null
        }
      />
    </main>
  )
}
