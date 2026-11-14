/**
 * /dev/uikit03-header-preview — реальные PlayDeskHeader + effects + HotBar.
 * Сиды без БД: ?seed=cleric | ?seed=multi | ?seed=max (дефолт max).
 */
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ActiveEffectsPanel } from '../features/characters/ActiveEffectsPanel'
import { PlayDeskHeader } from '../features/characters/PlayDeskHeader'
import { PlayDeskHotBar } from '../features/characters/PlayDeskHotBar'
import type { PlayState } from '../features/characters/play'
import type { ActiveEffect } from '../shared/dnd/activeEffects'
import type { ClassLevelEntry } from '../shared/dnd/classLevels'
import { emptyTurnEconomy } from '../shared/dnd/turnEconomy'
import { Text } from '../ui'

type SeedId = 'cleric' | 'multi' | 'max'

type Seed = {
  id: SeedId
  name: string
  raceName: string
  className: string
  alignment: string
  level: number
  experience: number
  classes: ClassLevelEntry[]
  hpCurrent: number
  hpMax: number
  hpTemp: number
  autoAc: number
  acHint: string
  speed: number
  climbSpeed: number | null
  swimSpeed: number | null
  flySpeed: number | null
  jumpLongFt: number
  jumpHighFt: number
  proficiencyBonus: number
  initiative: number
  inspiration: boolean
  exhaustion: number
  coins: { cp: number; sp: number; ep: number; gp: number; pp: number }
  companions: number
  concentrationName: string
  effects: ActiveEffect[]
  resources: PlayState['resources']
}

const CLERIC_EFFECTS: ActiveEffect[] = [
  {
    id: 'fx-mage-armor',
    name: 'Усиленная защита',
    slug: 'mage_armor',
    ac_bonus: 1,
    source_name: 'Доспех мага',
  },
  {
    id: 'fx-bless',
    name: 'Благословение',
    slug: 'bless',
    source_name: 'Союзник',
    linked_concentration: true,
    duration: { unit: 'rounds', value: 10, remaining_rounds: 9 },
  },
  {
    id: 'fx-fire-res',
    name: 'Сопротивление огню',
    slug: 'fire_resistance',
    source_name: 'Кольцо',
  },
  {
    id: 'fx-haste',
    name: 'Ускорение',
    slug: 'haste',
    ac_bonus: 2,
    source_name: 'Союзник',
    linked_concentration: true,
    duration: { unit: 'rounds', value: 10, remaining_rounds: 8 },
  },
  {
    id: 'fx-heroism',
    name: 'Героизм',
    slug: 'heroism',
    source_name: 'Союзник',
    linked_concentration: true,
    mods: [{ target: 'temp_hp', op: 'set', value: 3 }],
    duration: { unit: 'rounds', value: 10, remaining_rounds: 7 },
  },
  {
    id: 'fx-sof',
    name: 'Щит веры',
    slug: 'shield_of_faith',
    ac_bonus: 2,
    source_name: 'Даррак',
    linked_concentration: true,
    duration: { unit: 'rounds', value: 10, remaining_rounds: 9 },
  },
]

const MAX_EFFECTS: ActiveEffect[] = [
  ...CLERIC_EFFECTS,
  {
    id: 'fx-barkskin',
    name: 'Дубовая кожа',
    slug: 'barkskin',
    source_name: 'Друид',
    linked_concentration: true,
    duration: { unit: 'rounds', value: 60, remaining_rounds: 40 },
  },
  {
    id: 'fx-longstrider',
    name: 'Скороход +10 фт',
    slug: 'longstrider',
    source_name: 'Свиток',
    duration: { unit: 'hours', value: 1, remaining_rounds: 600 },
  },
  {
    id: 'fx-aid',
    name: 'Подмога +5 хитов',
    slug: 'aid',
    source_name: 'Жрец',
    duration: { unit: 'hours', value: 8, remaining_rounds: 4800 },
  },
  {
    id: 'fx-prot-energy',
    name: 'Защита от энергии',
    slug: 'protection_from_energy',
    source_name: 'Союзник',
    linked_concentration: true,
    duration: { unit: 'rounds', value: 10, remaining_rounds: 6 },
  },
]

const SEEDS: Record<SeedId, Seed> = {
  cleric: {
    id: 'cleric',
    name: 'Даррак Железный Кулак',
    raceName: 'Дварф (горный)',
    className: 'Жрец 3',
    alignment: 'Хаотично-нейтральный',
    level: 3,
    experience: 900,
    classes: [
      {
        id: 'cleric',
        name: 'Жрец',
        catalog_id: 'cleric',
        level: 3,
        subclass_name: 'Домен бури',
        subclass_catalog_id: 'tempest',
      },
    ],
    hpCurrent: 13,
    hpMax: 27,
    hpTemp: 0,
    autoAc: 23,
    acHint: 'Доспех + щит + эффекты',
    speed: 25,
    climbSpeed: 10,
    swimSpeed: 10,
    flySpeed: 10,
    jumpLongFt: 14,
    jumpHighFt: 5,
    proficiencyBonus: 2,
    initiative: 0,
    inspiration: false,
    exhaustion: 0,
    coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    companions: 2,
    concentrationName: 'Щит веры',
    effects: CLERIC_EFFECTS,
    resources: [
      { id: 'wrath', name: 'Гнев бури', max: 3, used: 1, reset: 'short' },
      {
        id: 'channel',
        name: 'Божественный канал',
        max: 1,
        used: 0,
        reset: 'short',
      },
    ],
  },
  multi: {
    id: 'multi',
    name: 'Брум Камнегрыз',
    raceName: 'Гном',
    className: 'Воин 2 / Плут 1 / Волшебник 1',
    alignment: 'Нейтральный',
    level: 4,
    experience: 2700,
    classes: [
      {
        id: 'fighter',
        name: 'Воин',
        catalog_id: 'fighter',
        level: 2,
        subclass_name: 'Мастер боевых искусств',
        subclass_catalog_id: 'battle_master',
      },
      {
        id: 'rogue',
        name: 'Плут',
        catalog_id: 'rogue',
        level: 1,
        subclass_name: '',
        subclass_catalog_id: null,
      },
      {
        id: 'wizard',
        name: 'Волшебник',
        catalog_id: 'wizard',
        level: 1,
        subclass_name: 'Школа воплощения',
        subclass_catalog_id: 'evocation',
      },
      {
        id: 'bard',
        name: 'Бард',
        catalog_id: 'bard',
        level: 1,
        subclass_name: 'Коллегия доблести',
        subclass_catalog_id: 'valor',
      },
    ],
    hpCurrent: 16,
    hpMax: 16,
    hpTemp: 0,
    autoAc: 10,
    acHint: 'Без доспеха',
    speed: 30,
    climbSpeed: null,
    swimSpeed: null,
    flySpeed: null,
    jumpLongFt: 10,
    jumpHighFt: 3,
    proficiencyBonus: 2,
    initiative: 0,
    inspiration: false,
    exhaustion: 0,
    coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    companions: 0,
    concentrationName: '',
    effects: [],
    resources: [],
  },
  max: {
    id: 'max',
    name: 'Торбин Громовержец Железной Горы',
    raceName: 'Дварф холмов (щитовой, клан Громовой Кузни)',
    className: 'Мультикласс 8',
    alignment: 'Законно-добрый',
    level: 8,
    experience: 34000,
    classes: [
      {
        id: 'fighter',
        name: 'Воин',
        catalog_id: 'fighter',
        level: 3,
        subclass_name: 'Мастер боевых искусств',
        subclass_catalog_id: 'battle_master',
      },
      {
        id: 'rogue',
        name: 'Плут',
        catalog_id: 'rogue',
        level: 2,
        subclass_name: 'Вор',
        subclass_catalog_id: 'thief',
      },
      {
        id: 'wizard',
        name: 'Волшебник',
        catalog_id: 'wizard',
        level: 2,
        subclass_name: 'Школа воплощения',
        subclass_catalog_id: 'evocation',
      },
      {
        id: 'bard',
        name: 'Бард',
        catalog_id: 'bard',
        level: 1,
        subclass_name: 'Коллегия доблести',
        subclass_catalog_id: 'valor',
      },
    ],
    hpCurrent: 48,
    hpMax: 62,
    hpTemp: 12,
    autoAc: 21,
    acHint: 'Кольчуга + щит + эффекты',
    speed: 35,
    climbSpeed: 20,
    swimSpeed: 20,
    flySpeed: 30,
    jumpLongFt: 18,
    jumpHighFt: 7,
    proficiencyBonus: 3,
    initiative: 4,
    inspiration: true,
    exhaustion: 2,
    coins: { cp: 0, sp: 0, ep: 0, gp: 1234567, pp: 0 },
    companions: 3,
    concentrationName: 'Щит веры',
    effects: MAX_EFFECTS,
    resources: [
      { id: 'wrath', name: 'Гнев бури', max: 3, used: 1, reset: 'short' },
      {
        id: 'channel',
        name: 'Божественный канал',
        max: 2,
        used: 0,
        reset: 'short',
      },
      { id: 'ki', name: 'Ци', max: 4, used: 1, reset: 'short' },
    ],
  },
}

function playFromSeed(seed: Seed, effects: ActiveEffect[]): PlayState {
  return {
    conditions: [],
    exhaustion: seed.exhaustion,
    resources: seed.resources,
    hpTemp: seed.hpTemp,
    hitDie: 'd8',
    hitDiceCurrent: seed.level,
    hitDiceByClass: [],
    isDying: false,
    deathSuccesses: 0,
    deathFails: 0,
    concentration: seed.concentrationName
      ? {
          name: seed.concentrationName,
          spell_id: 'shield_of_faith',
        }
      : null,
    effects,
    turnEconomy: emptyTurnEconomy(),
  }
}

export function UiKit03HeaderPreviewPage() {
  const [params] = useSearchParams()
  const seedParam = (params.get('seed') || 'max') as SeedId
  const seed = SEEDS[seedParam] ?? SEEDS.max

  const [effects, setEffects] = useState<ActiveEffect[]>(seed.effects)
  const [play, setPlay] = useState<PlayState>(() => playFromSeed(seed, seed.effects))
  const [inspiration, setInspiration] = useState(seed.inspiration)
  const [resources, setResources] = useState(seed.resources)

  useEffect(() => {
    setEffects(seed.effects)
    setPlay(playFromSeed(seed, seed.effects))
    setInspiration(seed.inspiration)
    setResources(seed.resources)
  }, [seed])

  const coins = useMemo(() => seed.coins, [seed])

  return (
    <main className="page page--app" data-uikit03-preview data-seed={seed.id}>
      <Text tone="muted">
        /dev/uikit03-header-preview?seed={seed.id} · UIKIT-03 скрины
      </Text>
      <div
        className="play-desk play-desk--wide"
        data-testid="uikit03-desk"
        style={{
          marginTop: 8,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 220px) minmax(0, 1fr)',
          gap: 12,
          alignItems: 'start',
        }}
      >
        <aside
          aria-hidden
          style={{
            minHeight: 120,
            borderRadius: 12,
            background: 'color-mix(in srgb, var(--accent-soft) 40%, #fff)',
            border: '1px solid var(--line)',
            padding: 8,
            fontSize: 12,
            color: 'var(--muted)',
          }}
        >
          rail (preview)
        </aside>
        <div style={{ minWidth: 0 }}>
        <div className="play-desk__top" data-onboarding="combat-header">
          <PlayDeskHeader
            name={seed.name}
            raceName={seed.raceName}
            className={seed.className}
            alignment={seed.alignment}
            rulesEdition="2014"
            level={seed.level}
            experience={seed.experience}
            classes={seed.classes}
            hitDie="d8"
            constitutionMod={2}
            hpCurrent={seed.hpCurrent}
            hpMax={seed.hpMax}
            play={{ ...play, effects, resources, hpTemp: seed.hpTemp }}
            autoAc={seed.autoAc}
            acHint={seed.acHint}
            shieldInHand
            shieldAvailable
            onToggleShield={() => undefined}
            onOpenAc={() => undefined}
            speed={seed.speed}
            climbSpeed={seed.climbSpeed}
            swimSpeed={seed.swimSpeed}
            flySpeed={seed.flySpeed}
            jumpLongFt={seed.jumpLongFt}
            jumpHighFt={seed.jumpHighFt}
            proficiencyBonus={seed.proficiencyBonus}
            initiative={seed.initiative}
            inspiration={inspiration}
            coins={coins}
            xpHistory={[]}
            onOpenRest={() => undefined}
            onExperienceChange={() => undefined}
            onToggleInspiration={() => setInspiration((v) => !v)}
            onExhaustionChange={(n) =>
              setPlay((prev) => ({ ...prev, exhaustion: n }))
            }
            onOpenInitiative={() => undefined}
            onOpenSpeed={() => undefined}
            onPlayChange={setPlay}
            onCoinsChange={() => undefined}
            onCombatChange={() => undefined}
            onToast={() => undefined}
          />
          {(effects.length > 0 || seed.companions > 0) && (
            <div className="play-desk__top-extras">
              <ActiveEffectsPanel
                effects={effects}
                onChange={(next) => {
                  setEffects(next)
                  setPlay((prev) => ({ ...prev, effects: next }))
                }}
                onToast={() => undefined}
                onHeroismTurnStart={() => undefined}
              />
              {seed.companions > 0 ? (
                <button type="button" className="play-desk__dock-chip">
                  Напарники {seed.companions}
                </button>
              ) : null}
            </div>
          )}
        </div>

        <div style={{ marginTop: 10 }} data-testid="uikit03-hot">
          <PlayDeskHotBar
            conditionNames={[]}
            exhaustion={play.exhaustion}
            concentration={play.concentration}
            resources={resources}
            onOpenConditions={() => undefined}
            onClearConcentration={() =>
              setPlay((prev) => ({ ...prev, concentration: null }))
            }
            onResourceUsedChange={(id, used) =>
              setResources((prev) =>
                prev.map((row) => (row.id === id ? { ...row, used } : row)),
              )
            }
          />
        </div>
        </div>
      </div>
    </main>
  )
}
