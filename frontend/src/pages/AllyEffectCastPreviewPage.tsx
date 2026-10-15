/**
 * Превью: стандартный каст + N select’ов целей (себя можно выбрать).
 * /dev/ally-effect-cast-preview
 */
import { useMemo, useState } from 'react'
import { CastSpellDialog } from '../features/characters/CastSpellDialog'
import { UseAllyAbilityDialog } from '../features/characters/UseAllyAbilityDialog'
import type { SheetSpell, SpellsState } from '../features/characters/spells'
import type { AllyPickDemo } from '../features/lobby/useLobbyParty'
import { Button, Panel, Stack, Text, Toast } from '../ui'

const DEMO_ALLIES: AllyPickDemo = {
  lobbyName: 'Лобби «Эхо Рассвета»',
  members: [
    { character_id: 'self', character_name: 'Вирра' },
    { character_id: 'c1', character_name: 'Эларион' },
    { character_id: 'c3', character_name: 'Грок' },
    { character_id: 'c4', character_name: 'Лира' },
  ],
}

const BLESS: SheetSpell = {
  id: 'spell-bless',
  name: 'Благословение',
  catalog_id: null,
  level: 1,
  prepared: true,
  notes: '',
  casting_time: '1 действие',
  range: '30 футов',
  attack_or_save: '',
  damage: '',
  concentration: true,
  applies_to_allies: true,
  ally_target_count: 3,
}

const EMPTY_SPELLS: SpellsState = {
  casting_ability: 'wis',
  max_prepared: null,
  slots: {
    '1': { max: 4, used: 1 },
    '2': { max: 3, used: 0 },
    '3': { max: 2, used: 0 },
    '4': { max: 0, used: 0 },
    '5': { max: 0, used: 0 },
    '6': { max: 0, used: 0 },
    '7': { max: 0, used: 0 },
    '8': { max: 0, used: 0 },
    '9': { max: 0, used: 0 },
  },
  pact_slots: null,
  known: [BLESS],
}

export function AllyEffectCastPreviewPage() {
  const [mode, setMode] = useState<'cast' | 'ability' | null>('cast')
  const [toast, setToast] = useState<string | null>(null)
  const [spells, setSpells] = useState(EMPTY_SPELLS)

  const castSpell = useMemo(() => (mode === 'cast' ? BLESS : null), [mode])

  return (
    <main className="page page--app page--lobby-hub">
      <Stack gap={16}>
        <header className="app-header">
          <div>
            <Text as="h1">Каст с целями</Text>
            <Text tone="muted">
              Превью B2 · ячейка + выпадающие списки целей (себя можно выбрать)
            </Text>
          </div>
        </header>

        <Text tone="muted">/dev/ally-effect-cast-preview · только для скринов</Text>

        <Panel title="Жесты">
          <Stack gap={12}>
            <Text tone="muted">
              Стандартная форма каста: ячейка, затем N select’ов (для Благословения — 3). В
              каждом — «На себя» или союзник.
            </Text>
            <div className="session-table-toolbar">
              <Button type="button" onClick={() => setMode('cast')}>
                Каст: Благословение
              </Button>
              <Button type="button" variant="secondary" onClick={() => setMode('ability')}>
                Трата: Вдохновение барда
              </Button>
            </div>
          </Stack>
        </Panel>
      </Stack>

      <CastSpellDialog
        open={mode === 'cast'}
        spell={castSpell}
        spells={spells}
        characterId="self"
        allyDemo={DEMO_ALLIES}
        onConfirm={(choice) => {
          setSpells((prev) => ({
            ...prev,
            slots: {
              ...prev.slots,
              [String(choice.slotLevel)]: {
                ...prev.slots[String(choice.slotLevel)],
                used: (prev.slots[String(choice.slotLevel)]?.used ?? 0) + 1,
              },
            },
          }))
          setToast(`Каст: Благословение · целей ${choice.allyTargetIds.length}`)
          setMode(null)
        }}
        onClose={() => setMode(null)}
      />

      <UseAllyAbilityDialog
        open={mode === 'ability'}
        characterId="self"
        characterName="Селена"
        abilityName="Вдохновение барда"
        targetCount={1}
        allyDemo={DEMO_ALLIES}
        onClose={() => setMode(null)}
        onSpent={() => undefined}
        onToast={(msg) => {
          setToast(msg)
          setMode(null)
        }}
      />

      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  )
}
