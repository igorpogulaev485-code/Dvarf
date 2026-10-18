/**
 * DIALOG-ONLY harness — НЕ лист персонажа, НЕ Play Desk.
 * Только реальные Dialog из tip для скринов пути:
 * Настройки → Гримуар → Своё.
 * См. docs/PLAY_DESK_SOURCE_OF_TRUTH.md
 */
import { useMemo, useState } from 'react'
import type { ClassLevelEntry } from '../shared/dnd/classLevels'
import { SpellsSettingsDialog } from '../features/characters/SpellsSettingsDialog'
import { GrimoireDialog } from '../features/characters/GrimoireDialog'
import { CustomSpellDialog } from '../features/characters/CustomSpellDialog'
import {
  createCustomSheetSpell,
  type SpellsState,
} from '../features/characters/spells'
import type { AbilityKey } from '../features/characters/sheetTypes'
import { Button, Stack, Text } from '../ui'

const ABILITIES: Record<AbilityKey, number> = {
  str: 10,
  dex: 14,
  con: 14,
  int: 12,
  wis: 10,
  cha: 16,
}

const CLASSES: ClassLevelEntry[] = [
  {
    id: 'class-sorcerer-harness',
    name: 'Чародей',
    catalog_id: null,
    level: 5,
    subclass_name: '',
    subclass_catalog_id: null,
  },
]

function initialSpells(): SpellsState {
  return {
    casting_ability: 'cha',
    max_prepared: null,
    slots: {
      '1': { max: 4, used: 0 },
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
    known: [
      {
        ...createCustomSheetSpell({
          name: 'Искра',
          level: 0,
          casting_time: '1 действие',
          range: '60 футов',
          damage: '1к8 огонь',
          school: 'evocation',
          components: { v: true, s: true },
        }),
        prepared: true,
      },
    ],
    has_spell_focus: true,
  }
}

export function DevSpellDialogsHarnessPage() {
  const [spells, setSpells] = useState<SpellsState>(() => initialSpells())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [grimoireOpen, setGrimoireOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const learnBudget = useMemo(
    () => ({
      mode: 'known' as const,
      cantrips: 5,
      leveledKnown: 6,
      maxPrepared: null as number | null,
      labelRu: 'Чародей',
      slug: 'sorcerer',
    }),
    [],
  )

  return (
    <main className="page page--app" style={{ maxWidth: 720, margin: '0 auto', padding: 20 }}>
      <Stack gap={12}>
        <Text as="h1">dialog-only · harness спеллов</Text>
        <Text tone="danger">
          Это НЕ лист и НЕ Play Desk. Только диалоги tip для сверки кнопок. Эталон
          стола — прод + доски desk-header / desk-chrome.
        </Text>
        <Text tone="muted">
          На живом столе: панель Заклинания → Настройки → Гримуар → Своё.
        </Text>
        <div className="chip-row">
          <Button variant="primary" onClick={() => setSettingsOpen(true)}>
            1. Настройки заклинаний
          </Button>
          <Button variant="secondary" onClick={() => setGrimoireOpen(true)}>
            2. Гримуар
          </Button>
          <Button variant="secondary" onClick={() => setCustomOpen(true)}>
            3. Своё (форма)
          </Button>
        </div>
      </Stack>

      <SpellsSettingsDialog
        open={settingsOpen}
        edition="2014"
        className="Чародей"
        level={5}
        classes={CLASSES}
        spells={spells}
        abilities={ABILITIES}
        proficiencyBonus={3}
        suggestion={null}
        knownCaster
        title="Настройки заклинаний"
        onChange={setSpells}
        onClose={() => setSettingsOpen(false)}
      />

      <GrimoireDialog
        open={grimoireOpen}
        edition="2014"
        spells={spells}
        knownCaster
        learnBudget={learnBudget}
        classes={CLASSES}
        onChange={setSpells}
        onClose={() => setGrimoireOpen(false)}
      />

      <CustomSpellDialog
        open={customOpen}
        mode="known"
        onClose={() => setCustomOpen(false)}
        onSave={(input) => {
          setSpells((prev) => ({
            ...prev,
            known: [
              ...prev.known,
              { ...createCustomSheetSpell(input), prepared: true },
            ],
          }))
          setCustomOpen(false)
        }}
      />
    </main>
  )
}
