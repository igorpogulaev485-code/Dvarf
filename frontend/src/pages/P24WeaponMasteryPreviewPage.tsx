/**
 * DEV preview for P24-M01 Playwright: weapon mastery block + combat chips.
 * Does not open RULES_EDITION_2024_OPEN.
 */
import { useMemo, useState } from 'react'
import { WeaponMasteryPanel } from '../features/characters/WeaponMasteryPanel'
import { WeaponMasteryAttackPanel } from '../features/characters/WeaponMasteryAttackPanel'
import {
  SRD_WEAPONS_2024_MASTERY,
  WEAPON_MASTERY_DICTIONARY,
  applyMasteryProperty,
  characterHasWeaponMastery,
  emptyWeaponMasteryState,
  markLongRestWeaponMasterySwap,
  masteryPropertyNameRu,
  type WeaponMasteryState,
} from '../shared/dnd/weaponMastery'
import { RULES_EDITION_2024_OPEN } from '../shared/dnd/rulesEdition2024'
import { Panel, Stack, Text, Button } from '../ui'
import type { ClassLevelEntry } from '../features/characters/classLevels'

const FIGHTER: ClassLevelEntry[] = [
  {
    id: 'c1',
    name: 'Воин',
    catalog_id: null,
    level: 9,
    subclass_name: '',
    subclass_catalog_id: null,
  },
]

export function P24WeaponMasteryPreviewPage() {
  const [state, setState] = useState<WeaponMasteryState>(() => ({
    ...emptyWeaponMasteryState(),
    known: ['longsword', 'greataxe', 'dagger'],
    sourceClass: 'fighter',
    baseline: ['longsword', 'greataxe', 'dagger'],
    swapAvailable: false,
  }))
  const [log, setLog] = useState('—')
  const [nickUsed, setNickUsed] = useState(false)
  const [cleaveUsed, setCleaveUsed] = useState(false)

  const has2014 = characterHasWeaponMastery('2014', FIGHTER)
  const dictLine = useMemo(
    () => WEAPON_MASTERY_DICTIONARY.map((r) => r.name_ru).join(', '),
    [],
  )

  return (
    <main className="page page--app" data-testid="p24-m01-preview">
      <Stack gap={4}>
        <Text as="h1">P24-M01 · Мастерство оружия</Text>
        <p data-testid="p24-m01-flag">
          Флаг 2024: {RULES_EDITION_2024_OPEN ? 'открыт' : 'закрыт'}
        </p>
        <p data-testid="p24-m01-2014-hidden">
          2014 блок: {has2014 ? 'виден (ошибка)' : 'скрыт'}
        </p>
        <p data-testid="p24-m01-dict">{dictLine}</p>

        <Panel data-testid="p24-m01-sheet-block">
          <WeaponMasteryPanel
            rulesEdition="2024"
            classes={FIGHTER}
            state={state}
            onChange={setState}
            weaponOptions={[...SRD_WEAPONS_2024_MASTERY]}
            onToast={(m) => setLog(m)}
          />
          <Button
            type="button"
            data-testid="p24-m01-long-rest"
            onClick={() => setState((s) => markLongRestWeaponMasterySwap(s))}
          >
            Продолжительный отдых (открыть смену)
          </Button>
        </Panel>

        <Panel data-testid="p24-m01-attack-block">
          <WeaponMasteryAttackPanel
            rulesEdition="2024"
            classes={FIGHTER}
            masteryState={state}
            weaponSlug="greataxe"
            weaponName="Секира"
            hit
            damageDealt
            attackAbilityMod={4}
            proficiencyBonus={4}
            nickUsedThisTurn={nickUsed}
            cleaveUsedThisTurn={cleaveUsed}
            onNickUsed={() => setNickUsed(true)}
            onCleaveUsed={() => setCleaveUsed(true)}
            onToast={(m) => setLog(m)}
          />
          <p data-testid="p24-m01-tactical-hint">
            Тактический мастер: подмена на{' '}
            {['push', 'sap', 'slow'].map(masteryPropertyNameRu).join(' / ')}
          </p>
        </Panel>

        <Panel>
          <p data-testid="p24-m01-nick-check">
            {applyMasteryProperty('nick', { hit: true }).effects.consumes_bonus_action === false
              ? 'Засечка не тратит бонусное'
              : 'ошибка nick'}
          </p>
          <p data-testid="p24-m01-log">{log}</p>
        </Panel>
      </Stack>
    </main>
  )
}
