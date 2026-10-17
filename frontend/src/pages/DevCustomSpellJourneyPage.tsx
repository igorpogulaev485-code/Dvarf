import { useMemo, useState } from 'react'
import type { ClassLevelEntry } from '../shared/dnd/classLevels'
import { PlayDeskSpellsCompact } from '../features/characters/PlayDeskSpellsCompact'
import { SpellsSettingsDialog } from '../features/characters/SpellsSettingsDialog'
import {
  createCustomSheetSpell,
  type SpellsState,
} from '../features/characters/spells'
import type { AbilityKey } from '../features/characters/sheetTypes'
import { Stack, Text } from '../ui'

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
    id: 'class-sorcerer-preview',
    name: 'Чародей',
    catalog_id: null,
    level: 5,
    subclass_name: '',
    subclass_catalog_id: null,
  },
]

function initialSpells(): SpellsState {
  const sample = createCustomSheetSpell({
    name: 'Искра (пример)',
    level: 0,
    casting_time: '1 действие',
    range: '60 футов',
    damage: '1к8 огонь',
    school: 'evocation',
    components: { v: true, s: true },
  })
  return {
    casting_ability: 'cha',
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
    known: [{ ...sample, prepared: true }],
    has_spell_focus: true,
    has_component_pouch: false,
  }
}

/**
 * Full path preview (no auth):
 * Стол → Заклинания → Настройки → Гримуар → Своё
 * Route: /dev/custom-spell-journey
 */
export function DevCustomSpellJourneyPage() {
  const [spells, setSpells] = useState<SpellsState>(() => initialSpells())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [toasts, setToasts] = useState<string[]>([])

  const learnBudget = useMemo(
    () => ({
      mode: 'known' as const,
      cantrips: 5,
      leveledKnown: 6,
      maxPrepared: null,
    }),
    [],
  )

  function pushToast(message: string) {
    setToasts((prev) => [message, ...prev].slice(0, 3))
  }

  return (
    <main className="page page--app custom-spell-journey">
      <div className="custom-spell-journey__chrome">
        <Stack gap={8}>
          <Text as="h1">Путь: своё заклинание</Text>
          <Text tone="muted">
            Как на живом столе персонажа. Жми по порядку — это те же компоненты, что в
            проде.
          </Text>
          <ol className="custom-spell-journey__steps">
            <li>
              На панели <b>Заклинания</b> нажми <b>Настройки</b>
            </li>
            <li>
              В настройках нажми <b>Гримуар</b>
            </li>
            <li>
              В гримуаре нажми <b>Своё</b> (рядом с поиском)
            </li>
            <li>Заполни карточку и добавь на лист</li>
          </ol>
          {toasts.length > 0 ? (
            <div className="chip-row">
              {toasts.map((toast) => (
                <span key={toast} className="sheet-chip is-on">
                  {toast}
                </span>
              ))}
            </div>
          ) : null}
        </Stack>
      </div>

      <div className="custom-spell-journey__desk play-desk">
        <header className="custom-spell-journey__desk-head">
          <div>
            <Text as="h2">Араэль · Чародей 5</Text>
            <Text tone="muted">Стол персонажа · сцена Бой · панель Заклинания</Text>
          </div>
          <span className="sheet-chip is-on">превью пути</span>
        </header>

        <div className="custom-spell-journey__stage">
          <PlayDeskSpellsCompact
            spells={spells}
            abilities={ABILITIES}
            proficiencyBonus={3}
            learnBudget={learnBudget}
            edition="2014"
            settingsLabel="Настройки"
            onOpenSettings={() => setSettingsOpen(true)}
            onSpellsChange={setSpells}
            onCastSpell={(spell) => pushToast(`Каст (превью): ${spell.name}`)}
          />
        </div>
      </div>

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
        onToast={pushToast}
      />
    </main>
  )
}
