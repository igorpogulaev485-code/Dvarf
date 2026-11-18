/**
 * DEV preview for P24-M04: desk/lobby assembly surfaces (not sole acceptance proof).
 * Mounts live StartCombat / Initiative / AddCombatant / mastery / heroic UI.
 * Does not open RULES_EDITION_2024_OPEN.
 */
import { useMemo, useState } from 'react'
import { AddCombatantDialog } from '../features/lobby/AddCombatantDialog'
import { InitiativeRollDialog } from '../features/lobby/InitiativeRollDialog'
import { StartCombatDialog } from '../features/lobby/StartCombatDialog'
import { WeaponMasteryAttackPanel } from '../features/characters/WeaponMasteryAttackPanel'
import { emptyWeaponMasteryState } from '../shared/dnd/weaponMastery'
import {
  HEROIC_INSPIRATION_HINT,
  HEROIC_INSPIRATION_TRANSFER_HINT,
  canSpendHeroicInspiration,
  grantHeroicInspiration,
  resolveHeroicReroll,
  spendHeroicInspiration,
} from '../shared/dnd/heroicInspiration'
import { applyLongRest } from '../shared/dnd/rest'
import {
  SURPRISE_2024_HINT,
  initiativeModeWithSurprise2024,
  surpriseRoundAllowed,
} from '../shared/dnd/surprise2024'
import { RULES_EDITION_2024_OPEN } from '../shared/dnd/rulesEdition2024'
import { Button, Panel, Stack, Text } from '../ui'
import type { SessionCombatant, SessionSeat } from '../shared/api/lobbies'

const SEATS: SessionSeat[] = [
  {
    character_id: 'pc-2024-a',
    character_name: 'Ара',
    character_level: 3,
    character_class_name: 'Воин',
    character_race_name: 'Человек',
    hp_current: 28,
    hp_max: 28,
    dex_mod: 2,
    inspiration: true,
    surprise_immune: false,
    seated_at: '2026-01-01T00:00:00Z',
  },
  {
    character_id: 'pc-2024-b',
    character_name: 'Борис',
    character_level: 3,
    character_class_name: 'Плут',
    character_race_name: 'Эльф',
    hp_current: 22,
    hp_max: 22,
    dex_mod: 3,
    inspiration: false,
    surprise_immune: false,
    seated_at: '2026-01-01T00:00:00Z',
  },
]

const COMBATANTS: SessionCombatant[] = [
  {
    id: 'enemy-1',
    name: 'Гоблин',
    hp_current: 7,
    hp_max: 7,
    alive_count: 1,
    member_count: 1,
    dex_mod: 2,
  } as SessionCombatant,
]

export function P24M04DeskCombatPreviewPage() {
  const [combatOpen, setCombatOpen] = useState(false)
  const [initOpen, setInitOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [insp, setInsp] = useState(true)
  const [feed, setFeed] = useState<string[]>([])
  const [transferLog, setTransferLog] = useState('—')
  const [edition, setEdition] = useState<'2014' | '2024'>('2024')

  const rest2024 = useMemo(
    () =>
      applyLongRest({
        resources: [],
        slots: {},
        pact_slots: null,
        exhaustion: 1,
        hp_max: 28,
        hp_current: 10,
        hit_dice_current: 0,
        hit_dice_max: 3,
        rules_edition: '2024',
      }),
    [],
  )

  const masteryKnown = useMemo(
    () => ({
      ...emptyWeaponMasteryState(),
      known: ['longsword', 'greataxe'],
    }),
    [],
  )

  function pushFeed(line: string) {
    setFeed((prev) => [line, ...prev].slice(0, 8))
  }

  function onHeroicReroll() {
    if (!canSpendHeroicInspiration(insp)) {
      pushFeed('нет героического вдохновения')
      return
    }
    const spent = spendHeroicInspiration(insp)
    if (!spent.ok) {
      pushFeed(spent.reason)
      return
    }
    setInsp(Boolean(spent.next))
    const rr = resolveHeroicReroll({ previous: 4, sides: 20, rng: () => 0.9 })
    const line = `Героическое вдохновение · переброс · атака: к20 ${rr.previous} → ${rr.next}`
    pushFeed(line)
  }

  function onTransfer() {
    const g = grantHeroicInspiration({
      current: true,
      allyIdWithout: 'pc-2024-b',
    })
    if (g.ok && g.transferred) {
      setTransferLog(`передано союзнику ${g.allyId}`)
      pushFeed('Героическое вдохновение · передача → Борис')
    } else {
      setTransferLog(g.ok ? 'ok' : g.reason)
    }
  }

  return (
    <main className="page page--app" data-testid="p24-m04-preview">
      <Stack gap={16}>
        <Panel>
          <Stack gap={8}>
            <Text as="h1">P24-M04 · стол и бой 2024</Text>
            <Text tone="muted" data-testid="p24-m04-flag">
              Флаг RULES_EDITION_2024_OPEN = {String(RULES_EDITION_2024_OPEN)} (кнопку игрокам не
              открываем)
            </Text>
            <div className="sheet-chip-row">
              <button
                type="button"
                className={`sheet-chip${edition === '2024' ? ' is-on' : ''}`}
                data-testid="p24-m04-edition-2024"
                onClick={() => setEdition('2024')}
              >
                лобби 2024
              </button>
              <button
                type="button"
                className={`sheet-chip${edition === '2014' ? ' is-on' : ''}`}
                data-testid="p24-m04-edition-2014"
                onClick={() => setEdition('2014')}
              >
                лобби 2014
              </button>
            </div>
          </Stack>
        </Panel>

        <Panel data-testid="p24-m04-heroic">
          <Stack gap={8}>
            <Text as="h2">Героическое вдохновение (лента)</Text>
            <Text tone="muted">{HEROIC_INSPIRATION_HINT}</Text>
            <Text tone="muted">{HEROIC_INSPIRATION_TRANSFER_HINT}</Text>
            <Text data-testid="p24-m04-heroic-status">
              {insp ? 'есть героическое' : 'нет'} · не бардовское
            </Text>
            <div className="sheet-chip-row">
              <button
                type="button"
                className="sheet-chip"
                data-testid="heroic-inspiration-reroll-chip"
                onClick={onHeroicReroll}
              >
                Потратить героическое вдохновение и перебросить
              </button>
              <button
                type="button"
                className="sheet-chip"
                data-testid="heroic-inspiration-transfer"
                onClick={onTransfer}
              >
                Передать союзнику
              </button>
            </div>
            <Text data-testid="p24-m04-transfer-log">{transferLog}</Text>
          </Stack>
        </Panel>

        <Panel data-testid="p24-m04-rest">
          <Stack gap={8}>
            <Text as="h2">Отдых 2024</Text>
            <Text data-testid="rest-2024-hint">
              Длинный: все кости {rest2024.hit_dice_current}/{3}; ≥1 хит; пауза 16 ч
            </Text>
          </Stack>
        </Panel>

        <Panel data-testid="p24-m04-surprise">
          <Stack gap={8}>
            <Text as="h2">Неожиданность</Text>
            <Text data-testid="p24-m04-surprise-hint">
              {edition === '2024' ? SURPRISE_2024_HINT : 'L-21: раунд без действия до конца хода'}
            </Text>
            <Text data-testid="p24-m04-surprise-mode">
              mode=
              {initiativeModeWithSurprise2024('normal', true)} · L-21=
              {surpriseRoundAllowed(edition) ? 'да' : 'нет'}
            </Text>
            <Button type="button" data-testid="p24-m04-open-combat" onClick={() => setCombatOpen(true)}>
              Старт боя
            </Button>
            <Button type="button" data-testid="p24-m04-open-init" onClick={() => setInitOpen(true)}>
              Инициатива
            </Button>
          </Stack>
        </Panel>

        <Panel data-testid="p24-m04-bestiary">
          <Stack gap={8}>
            <Text as="h2">Бестиарий / генератор</Text>
            <Text data-testid="p24-m04-bestiary-edition">редакция лобби: {edition}</Text>
            <Button type="button" data-testid="p24-m04-open-add" onClick={() => setAddOpen(true)}>
              Добавить противника
            </Button>
          </Stack>
        </Panel>

        <Panel data-testid="p24-m04-mastery">
          <Stack gap={8}>
            <Text as="h2">Мастерство оружия в ленте</Text>
            <WeaponMasteryAttackPanel
              rulesEdition="2024"
              classes={[
                {
                  id: 'fighter-1',
                  name: 'Воин',
                  catalog_id: 'fighter',
                  level: 9,
                  subclass_name: '',
                  subclass_catalog_id: null,
                },
              ]}
              masteryState={masteryKnown}
              weaponSlug="longsword"
              weaponName="Длинный меч"
              hit
              damageDealt
              attackAbilityMod={3}
              proficiencyBonus={4}
              targetName="Гоблин"
              nickUsedThisTurn={false}
              cleaveUsedThisTurn={false}
              onNickUsed={() => undefined}
              onCleaveUsed={() => undefined}
              onFeedLine={(line) => pushFeed(line)}
              onToast={(line) => pushFeed(line)}
            />
          </Stack>
        </Panel>

        <Panel data-testid="p24-m04-join">
          <Stack gap={8}>
            <Text as="h2">Посадка</Text>
            <Text tone="muted" data-testid="join-edition-empty">
              Нет персонажей редакции {edition} для этого стола. Смешанный стол 2014+2024 запрещён.
            </Text>
            <Text data-testid="p24-m04-join-code">lobby_rules_edition_mismatch</Text>
          </Stack>
        </Panel>

        <Panel data-testid="p24-m04-feed">
          <Stack gap={6}>
            <Text as="h2">Лента (макет)</Text>
            {feed.length === 0 ? (
              <Text tone="muted">пусто</Text>
            ) : (
              feed.map((line, idx) => (
                <Text key={`${idx}-${line}`} data-testid="p24-m04-feed-line">
                  {line}
                </Text>
              ))
            )}
          </Stack>
        </Panel>
      </Stack>

      <StartCombatDialog
        open={combatOpen}
        seats={SEATS}
        combatants={COMBATANTS}
        rulesEdition={edition}
        onClose={() => setCombatOpen(false)}
        onSubmit={() => {
          pushFeed(
            edition === '2024'
              ? 'Бой: врасплох → помеха к инициативе (без L-21)'
              : 'Бой: L-21 раунд неожиданности',
          )
          setCombatOpen(false)
        }}
      />

      <InitiativeRollDialog
        open={initOpen}
        entry={{
          id: 'e1',
          kind: 'pc',
          ref_id: 'pc-2024-a',
          name: 'Ара',
          initiative: null,
          initiative_pending: true,
          dex_mod: 2,
          surprised: edition === '2024',
        }}
        seat={SEATS[0]}
        rulesEdition={edition}
        onClose={() => setInitOpen(false)}
        onRoll={() => {
          pushFeed(
            edition === '2024'
              ? 'Инициатива с помехой (врасплох 2024)'
              : 'Инициатива (2014)',
          )
          setInitOpen(false)
        }}
        onManual={() => setInitOpen(false)}
      />

      <AddCombatantDialog
        open={addOpen}
        rulesEdition={edition}
        onClose={() => setAddOpen(false)}
        onSubmit={() => {
          pushFeed(`Добавлен противник каталога ${edition}`)
          setAddOpen(false)
        }}
      />
    </main>
  )
}
