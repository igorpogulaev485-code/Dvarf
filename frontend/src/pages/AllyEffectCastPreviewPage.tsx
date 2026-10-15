/**
 * Превью: выбор союзников вшит в каст / трату способности.
 * /dev/ally-effect-cast-preview
 */
import { useMemo, useState } from 'react'
import { CastSpellDialog } from '../features/characters/CastSpellDialog'
import { UseAllyAbilityDialog } from '../features/characters/UseAllyAbilityDialog'
import type { SheetSpell, SpellsState } from '../features/characters/spells'
import type { AllyPickDemo } from '../features/lobby/AllyPickSection'
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
            <Text as="h1">Эффект на союзников</Text>
            <Text tone="muted">Превью B2 · выбор целей вшит в каст / способность</Text>
          </div>
        </header>

        <Text tone="muted">/dev/ally-effect-cast-preview · только для скринов</Text>

        <Panel title="Жесты">
          <Stack gap={12}>
            <Text tone="muted">
              Отдельной кнопки «Раздать» нет: цели выбираются в диалоге каста заклинания с
              меткой «Союзн.» или при трате ресурса «На союзников».
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
          setToast(
            choice.allyTargetIds.length > 0
              ? `Каст: Благословение · союзники ${choice.allyTargetIds.length}`
              : 'Каст: Благословение (концентрация)',
          )
          setMode(null)
        }}
        onClose={() => setMode(null)}
      />

      <UseAllyAbilityDialog
        open={mode === 'ability'}
        characterId="self"
        characterName="Селена"
        abilityName="Вдохновение барда"
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
