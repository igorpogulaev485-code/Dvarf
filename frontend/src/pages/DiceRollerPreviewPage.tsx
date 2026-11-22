/**
 * DEV harness for DICE — real Play Desk fixture + dice FAB.
 * ?edition=2014|2024 · ?open=1 · ?clean=1 · ?heal=1 · ?bless=1
 * Deferred physical: ?dying=1 · ?companion=1 · ?breath=1 · ?heroic=1 · ?hd=1 · ?smite=1
 */
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MinimalSheetEditor } from '../features/characters/MinimalSheetEditor'
import { DiceRollerHost } from '../features/diceRoller'
import { sampleClassic2014Character } from '../features/classicSheet/sampleClassicCharacter'
import type { CharacterDetail } from '../shared/api/characters'
import type { DiceLogEntry } from '../features/diceRoller/types'
import { buildBuffEffect } from '../shared/dnd/activeEffects'
import { Text } from '../ui'
import { AppShell } from '../features/shell/AppShell'
import type { User } from '../shared/api/auth'
import { DIVINE_SMITE_FEATURE_ID } from '../features/characters/divineSmite'
import { breathWeaponResourceId } from '../shared/dnd/o06StylesBreathInvocations'

const CURE_WOUNDS_PREVIEW = {
  id: 'preview-cure-wounds',
  name: 'Лечение ран',
  level: 1,
  prepared: true,
  school: 'evocation',
  casting_time: '1 действие',
  range: 'Касание',
  duration: 'Мгновенная',
  attack_or_save: '',
  damage: '1к8+3',
  concentration: false,
  components: { v: true, s: true },
  description:
    'Существо, которого вы касаетесь, восстанавливает количество хитов, равное 1к8 + ваш модификатор заклинательной характеристики.',
}

type PreviewOpts = {
  heal?: boolean
  bless?: boolean
  dying?: boolean
  companion?: boolean
  breath?: boolean
  heroic?: boolean
  hd?: boolean
  smite?: boolean
  rogue20?: boolean
}

function withPreviewOpts(
  character: CharacterDetail,
  opts?: PreviewOpts,
): CharacterDetail {
  if (!opts) return character
  const sheet = { ...(character.sheet ?? {}) } as Record<string, unknown>
  const combat = { ...((sheet.combat as Record<string, unknown> | undefined) ?? {}) }

  if (opts.heal) {
    const spells = { ...((sheet.spells as Record<string, unknown> | undefined) ?? {}) }
    const known = Array.isArray(spells.known) ? [...spells.known] : []
    if (!known.some((row) => (row as { id?: string })?.id === CURE_WOUNDS_PREVIEW.id)) {
      known.push(CURE_WOUNDS_PREVIEW)
    }
    spells.known = known
    sheet.spells = spells
  }
  if (opts.bless) {
    const bless = buildBuffEffect({
      name: 'Благословение',
      slug: 'bless',
      sourceCharacterId: character.id,
      sourceName: 'Превью',
    })
    combat.effects = bless ? [bless] : []
  }
  if (opts.dying) {
    combat.is_dying = true
    combat.death_successes = 0
    combat.death_fails = 0
    combat.hp_current = 0
  }
  if (opts.hd) {
    // Pool die must be canonical HitDie ('d6'..), not «к6».
    combat.hit_dice_by_class = [
      {
        classEntryId: 'preview-wizard',
        className: 'Волшебник',
        die: 'd6',
        current: 3,
        max: 5,
      },
    ]
    combat.hit_die = 'd6'
    combat.hp_dice_current = 3
  }
  if (opts.heroic) {
    combat.inspiration = true
  }
  sheet.combat = combat

  if (opts.dying) {
    character = { ...character, hp_current: 0 }
  }

  if (opts.companion) {
    const companions = Array.isArray(sheet.companions) ? [...sheet.companions] : []
    const ally = companions.find(
      (row) => (row as { id?: string })?.id === 'comp-lirael',
    ) as Record<string, unknown> | undefined
    if (ally) {
      ally.active = true
      ally.actions = 'Длинный лук +6 1к8+3 колющий'
    } else {
      companions.push({
        id: 'comp-lirael',
        kind: 'ally',
        name: 'Лираэль',
        active: true,
        catalog_ref: null,
        source: null,
        stats: { hp: 28, ac: 14, speed: 30 },
        actions: 'Длинный лук +6 1к8+3 колющий',
        notes: 'Превью напарника для physical dice',
      })
    }
    sheet.companions = companions
  }

  if (opts.breath) {
    sheet.race_grant = {
      slug: 'dragonborn',
      raceCatalogId: 'dragonborn',
      ancestryId: 'brass',
      parentSlug: null,
      speed: 30,
      size: 'medium',
      darkvision: 60,
      abilityBonuses: {},
      languages: [],
      skills: [],
      tools: [],
      armorKeys: [],
      weaponNames: [],
      traitsText: '',
      traitCards: [],
      featNoteRu: null,
      naturalArmor: null,
      naturalWeapons: [],
      movement: { climb: null, swim: null, fly: null },
      activatedMovement: [],
      damageResistances: [],
      combatBonuses: { initiative: null },
      racialSpells: [],
      rollBonuses: [],
      racialResources: [],
    }
    const resources = Array.isArray(sheet.resources) ? [...sheet.resources] : []
    const breathId = breathWeaponResourceId()
    if (!resources.some((row) => (row as { id?: string })?.id === breathId)) {
      resources.push({
        id: breathId,
        name: 'Оружие дыхания',
        max: 1,
        used: 0,
        reset: 'short',
      })
    }
    sheet.resources = resources
    character = {
      ...character,
      race_name: 'Драконорождённый (латунный)',
    }
  }

  if (opts.smite) {
    const features = Array.isArray(sheet.features) ? [...sheet.features] : []
    if (!features.some((row) => (row as { id?: string })?.id === DIVINE_SMITE_FEATURE_ID)) {
      features.push({
        id: DIVINE_SMITE_FEATURE_ID,
        name_ru: 'Божественная кара',
        classEntryId: 'preview-paladin',
        classLevel: 5,
        slot_spend: {
          kind: 'spell_slot',
          min_slot: 1,
          dice_base: 2,
          dice_per_slot: 1,
          dice_size: 8,
        },
      })
    }
    sheet.features = features
    const spells = { ...((sheet.spells as Record<string, unknown> | undefined) ?? {}) }
    spells.slots = { '1': { max: 4, used: 0 }, '2': { max: 2, used: 0 } }
    sheet.spells = spells
    character = {
      ...character,
      class_name: 'Паладин',
      name: 'Торин Камнебород (кара)',
    }
  }

  return { ...character, sheet }
}

function editionCharacter(
  edition: '2014' | '2024',
  opts?: PreviewOpts,
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
    return withPreviewOpts(
      {
        ...base,
        id: edition === '2024' ? 'preview-dice-rogue20-2024' : 'preview-dice-rogue20-2014',
        rules_edition: edition,
        name: 'Тень Удачливая',
        class_name: 'Плут',
        level: 20,
        race_name: 'Халифлинг (легконогий)',
        sheet,
      } as CharacterDetail,
      opts,
    )
  }
  if (edition === '2014') {
    return withPreviewOpts(
      {
        ...base,
        id: 'preview-dice-2014',
        rules_edition: '2014',
        name: 'Торин Камнебород',
      },
      opts,
    )
  }
  const sheet = { ...(base.sheet ?? {}) } as Record<string, unknown>
  const ui = { ...((sheet.ui as Record<string, unknown> | undefined) ?? {}) }
  ui.classic_sheet_layout = '2024'
  sheet.ui = ui
  return withPreviewOpts(
    {
      ...base,
      id: 'preview-dice-2024',
      rules_edition: '2024',
      name: 'Элара Ветрокрылая',
      class_name: 'Плут',
      race_name: 'Эльф (высший)',
      sheet,
    } as CharacterDetail,
    opts,
  )
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
  const heal = params.get('heal') === '1'
  const bless = params.get('bless') === '1'
  const dying = params.get('dying') === '1'
  const companion = params.get('companion') === '1'
  const breath = params.get('breath') === '1'
  const heroic = params.get('heroic') === '1' || edition === '2024'
  const hd = params.get('hd') === '1'
  const smite = params.get('smite') === '1'
  const withMiss = params.get('miss') === '1' || rogue20
  const [character, setCharacter] = useState(() =>
    editionCharacter(edition, {
      rogue20,
      heal,
      bless,
      dying,
      companion,
      breath,
      heroic,
      hd,
      smite,
    }),
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

  const previewUser: User = {
    id: 'preview',
    email: null,
    login: null,
    display_name: 'Игрок',
    full_name: null,
    phone: null,
    avatar_url: null,
    email_verified_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    providers: [],
  }
  const withShell = params.get('shell') === '1'

  const sheet = (
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

  if (!withShell) return sheet

  return (
    <AppShell
      section="chars"
      title="Лист"
      hideTitles
      chrome="sheet"
      user={previewUser}
      showDice={false}
      leading={
        <div className="sheet-shell-actions">
          <button type="button" className="sheet-shell-actions__btn">
            {edition === '2024' ? 'Классический лист 2024' : 'Классический лист 2014'}
          </button>
          <button type="button" className="sheet-shell-actions__btn">
            В лобби
          </button>
        </div>
      }
    >
      {sheet}
    </AppShell>
  )
}
