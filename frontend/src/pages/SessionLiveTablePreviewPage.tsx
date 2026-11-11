/**
 * Превью A3: экран сессии как в продукте (без dev-переключателей).
 * Видимость берётся из настроек лобби; мастер = владелец лобби.
 * /dev/session-live-table-preview
 */
import { useMemo, useState } from 'react'
import { AddCombatantDialog } from '../features/lobby/AddCombatantDialog'
import { ApplyConditionDialog } from '../features/lobby/ApplyConditionDialog'
import { ApplyEffectDialog } from '../features/lobby/ApplyEffectDialog'
import { AwardLootDialog } from '../features/lobby/AwardLootDialog'
import { AwardXpDialog } from '../features/lobby/AwardXpDialog'
import { CombatTrack } from '../features/lobby/CombatTrack'
import { EncounterGenerateDialog } from '../features/lobby/EncounterGenerateDialog'
import { EncounterTemplatesDialog } from '../features/lobby/EncounterTemplatesDialog'
import { EnemyCard } from '../features/lobby/EnemyCard'
import { SessionLoreBindDialog } from '../features/lobby/SessionLoreBindDialog'
import { SessionLorePanel } from '../features/lobby/SessionLorePanel'
import { SessionQuestStatusDialog } from '../features/lobby/SessionQuestStatusDialog'
import { SettingPagePreviewDialog } from '../features/lobby/SettingPagePreviewDialog'
import { SettingTableHandoffDialog } from '../features/lobby/SettingTableHandoffDialog'
import { SettingTableRevealDialog } from '../features/lobby/SettingTableRevealDialog'
import { draftFromCombatant, type SettingHandoffDraft } from '../features/lobby/settingHandoff'
import { ManualRollForm } from '../features/lobby/ManualRollForm'
import { SessionEventFeed } from '../features/lobby/SessionEventFeed'
import { SessionLiveTabs, type SessionLiveTabId } from '../features/lobby/SessionLiveTabs'
import { SessionTableCard } from '../features/lobby/SessionTableCard'
import { StartCombatDialog } from '../features/lobby/StartCombatDialog'
import {
  applyVisibilityPreset,
  defaultVisibilityProfile,
} from '../features/lobby/visibilityProfile'
import type {
  EncounterGenerateResult,
  EncounterTemplate,
  SessionCombat,
  SessionCombatant,
  SessionEvent,
  SessionLorePage,
  SessionSeat,
  SettingPage,
  SettingPageTemplate,
} from '../shared/api/lobbies'
import { Button, Dialog, Field, Input, Panel, Stack, Text, Toast } from '../ui'

const DEMO_SEATS: SessionSeat[] = [
  {
    character_id: 'c1',
    character_name: 'Эларион',
    character_level: 5,
    character_class_name: 'Паладин',
    character_race_name: 'Высший эльф',
    hp_current: 48,
    hp_max: 48,
    ac: 18,
    speed: 30,
    dex_mod: 2,
    inspiration: true,
    conditions: [],
    effects: [
      {
        id: 'fx-bless-c1',
        name: 'Благословение',
        source_character_id: 'c2',
        source_name: 'Вирра',
        linked_concentration: true,
      },
    ],
    companions: [
      {
        id: 'comp1',
        name: 'Скакун',
        hp_current: 19,
        hp_max: 19,
        ac: 11,
        conditions: [],
      },
    ],
    passive_perception: 12,
    passive_insight: 11,
    passive_investigation: 10,
    seated_at: new Date().toISOString(),
  },
  {
    character_id: 'c2',
    character_name: 'Вирра',
    character_level: 5,
    character_class_name: 'Жрец',
    character_race_name: 'Человек',
    hp_current: 22,
    hp_max: 38,
    ac: 16,
    speed: 30,
    inspiration: false,
    conditions: [{ slug: 'poisoned', name: 'Отравленный', catalog_id: null }],
    concentration: { spell_id: 'bless', name: 'Благословение' },
    effect_suggestions: ['Благословение', 'Щит веры'],
    effects: [],
    companions: [],
    passive_perception: 15,
    passive_insight: 15,
    passive_investigation: 11,
    seated_at: new Date().toISOString(),
  },
  {
    character_id: 'c3',
    character_name: 'Грок',
    character_level: 5,
    character_class_name: 'Варвар',
    character_race_name: 'Полуорк',
    hp_current: 0,
    hp_max: 55,
    ac: 14,
    speed: 40,
    inspiration: false,
    passive_perception: 13,
    passive_insight: 9,
    passive_investigation: 8,
    seated_at: new Date().toISOString(),
  },
  {
    character_id: 'c4',
    character_name: 'Лира',
    character_level: 5,
    character_class_name: 'Плут',
    character_race_name: 'Полурослик',
    hp_current: 31,
    hp_max: 31,
    ac: 15,
    speed: 25,
    inspiration: false,
    passive_perception: 16,
    passive_insight: 12,
    passive_investigation: 14,
    seated_at: new Date().toISOString(),
  },
  {
    character_id: 'c5',
    character_name: 'Торин',
    character_level: 4,
    character_class_name: 'Волшебник',
    character_race_name: 'Гном',
    hp_current: 18,
    hp_max: 26,
    ac: 12,
    speed: 25,
    inspiration: true,
    passive_perception: 11,
    passive_insight: 11,
    passive_investigation: 16,
    seated_at: new Date().toISOString(),
  },
  {
    character_id: 'c6',
    character_name: 'Селена',
    character_level: 5,
    character_class_name: 'Следопыт',
    character_race_name: 'Лесной эльф',
    hp_current: 40,
    hp_max: 44,
    ac: 15,
    speed: 35,
    inspiration: false,
    passive_perception: 17,
    passive_insight: 13,
    passive_investigation: 12,
    seated_at: new Date().toISOString(),
  },
]

function soloEnemy(
  id: string,
  name: string,
  opts: {
    hp: number
    ac: number
    cr: string
    xp: number
    type_ru: string
    dead?: boolean
    action?: string
  },
): SessionCombatant {
  const dead = Boolean(opts.dead)
  return {
    id,
    name,
    hp_current: dead ? 0 : opts.hp,
    hp_max: opts.hp,
    alive_count: dead ? 0 : 1,
    member_count: 1,
    ac: opts.ac,
    speed: 30,
    cr: opts.cr,
    type_ru: opts.type_ru,
    xp: opts.xp,
    xp_claimed_count: 0,
    actions: opts.action
      ? [{ name_ru: opts.action, text_ru: 'См. бестиарий.' }]
      : [],
    members: [
      {
        id: `${id}-m`,
        name,
        hp_current: dead ? 0 : opts.hp,
        hp_max: opts.hp,
      },
    ],
  }
}

const DEMO_COMBATANTS: SessionCombatant[] = [
  // Пачка одинаковых — XP × число мёртвых
  {
    id: 'e-gob-pack',
    name: 'Гоблин',
    hp_current: 7,
    hp_max: 7,
    alive_count: 3,
    member_count: 20,
    ac: 15,
    speed: 30,
    cr: '1/4',
    slug: 'goblin',
    source_book: 'MM',
    type_ru: 'гуманоид',
    dex_mod: 2,
    xp: 50,
    xp_claimed_count: 0,
    actions: [
      {
        name_ru: 'Скимитар',
        text_ru: 'Рукопашная атака оружием: +4 к попаданию, досягаемость 5 фт.',
      },
    ],
    traits: [
      {
        name_ru: 'Проворное исчезновение',
        text_ru: 'Бонусным действием Засада или Отход.',
      },
    ],
    members: Array.from({ length: 20 }, (_, i) => ({
      id: `g${i + 1}`,
      name: `Гоблин ${i + 1}`,
      hp_current: i < 17 ? 0 : i === 17 ? 3 : 7,
      hp_max: 7,
    })),
  },
  // Семь разных — каждая карточка своей строкой в XP
  soloEnemy('e-wolf', 'Волк', {
    hp: 11,
    ac: 13,
    cr: '1/4',
    xp: 50,
    type_ru: 'зверь',
    dead: true,
    action: 'Укус',
  }),
  soloEnemy('e-orc', 'Орк', {
    hp: 15,
    ac: 13,
    cr: '1/2',
    xp: 100,
    type_ru: 'гуманоид',
    dead: true,
    action: 'Секира',
  }),
  soloEnemy('e-bugbear', 'Багбер', {
    hp: 27,
    ac: 16,
    cr: '1',
    xp: 200,
    type_ru: 'гуманоид',
    dead: true,
    action: 'Моргенштерн',
  }),
  soloEnemy('e-ogre', 'Огр', {
    hp: 59,
    ac: 11,
    cr: '2',
    xp: 450,
    type_ru: 'великан',
    dead: true,
    action: 'Дубина',
  }),
  soloEnemy('e-owlbear', 'Совомедведь', {
    hp: 59,
    ac: 13,
    cr: '3',
    xp: 700,
    type_ru: 'монстр',
    dead: true,
    action: 'Клюв',
  }),
  soloEnemy('e-troll', 'Тролль', {
    hp: 84,
    ac: 15,
    cr: '5',
    xp: 1800,
    type_ru: 'великан',
    dead: true,
    action: 'Мультиатака',
  }),
  soloEnemy('e-mage', 'Маг', {
    hp: 40,
    ac: 12,
    cr: '6',
    xp: 2300,
    type_ru: 'гуманоид',
    dead: true,
    action: 'Огненный шар',
  }),
]

const DEMO_SETTING_TEMPLATES: SettingPageTemplate[] = [
  {
    id: 't-npc',
    setting_id: null,
    page_kind: 'npc',
    name: 'НПС',
    body_seed: '',
    schema: [
      { key: 'role', label: 'Роль', type: 'text' },
      {
        key: 'disposition',
        label: 'Отношение',
        type: 'select',
        options: ['дружелюбный', 'нейтральный', 'враждебный', 'неизвестно'],
      },
    ],
    enabled: true,
    is_system: true,
  },
  {
    id: 't-note',
    setting_id: null,
    page_kind: 'note',
    name: 'Заметка',
    body_seed: '',
    schema: [],
    enabled: true,
    is_system: true,
  },
]

const DEMO_SETTING_PAGES: SettingPage[] = [
  {
    id: 'p-root',
    setting_id: 'set1',
    parent_id: null,
    title: 'Мир',
    body: '',
    gm_body: '',
    sort_order: 0,
    revealed: true,
    page_kind: 'note',
    template_id: 't-note',
    fields: {},
    quest_status: null,
    tags: ['мир'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'p-swamp',
    setting_id: 'set1',
    parent_id: 'p-root',
    title: 'Серые Болота',
    body: 'Туман и топь.',
    gm_body: 'Культ под кочками.',
    sort_order: 0,
    revealed: false,
    page_kind: 'location',
    template_id: null,
    fields: {},
    quest_status: null,
    tags: ['болото', 'секрет'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'p-cult',
    setting_id: 'set1',
    parent_id: 'p-swamp',
    title: 'Культ моста',
    body: '',
    gm_body: '',
    sort_order: 0,
    revealed: false,
    page_kind: 'faction',
    template_id: null,
    fields: {},
    quest_status: null,
    tags: ['культ'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'p-quest',
    setting_id: 'set1',
    parent_id: 'p-swamp',
    title: 'Найти пропавший груз',
    body: 'Капитан Вера ищет ящик с печатями культа.',
    gm_body: 'Груз в катакомбах под портом.',
    sort_order: 1,
    revealed: true,
    page_kind: 'quest',
    template_id: null,
    fields: {},
    quest_status: 'active',
    tags: ['квест', 'порт'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const SEED_TEMPLATES: EncounterTemplate[] = [
  {
    id: 'tpl-bridge',
    name: 'Засада у моста',
    entries: [
      { name: 'Гоблин', count: 6, slug: 'goblin', hp_max: 7, ac: 15, xp: 50 },
      { name: 'Волк', count: 2, slug: 'wolf', hp_max: 11, ac: 13, xp: 50 },
      { name: 'Огр', count: 1, slug: 'ogre', hp_max: 59, ac: 11, xp: 450 },
    ],
    updated_at: new Date().toISOString(),
  },
]

const SEED_EVENTS: SessionEvent[] = [
  {
    id: 'e1',
    session_id: 's1',
    event_type: 'roll',
    character_id: 'c4',
    actor_user_id: 'u4',
    character_name: 'Лира',
    title: 'Скрытность',
    formula: '1d20+8',
    breakdown: '14+8',
    total: 22,
    is_master_roll: false,
    payload: {},
    created_at: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: 'e2',
    session_id: 's1',
    event_type: 'roll',
    character_id: null,
    actor_user_id: 'u0',
    character_name: 'Мастер',
    title: 'Пассивная проверка NPC',
    formula: '1d20+3',
    breakdown: '9+3',
    total: 12,
    is_master_roll: true,
    payload: {},
    created_at: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: 'e3',
    session_id: 's1',
    event_type: 'roll',
    character_id: 'c1',
    actor_user_id: 'u1',
    character_name: 'Эларион',
    title: 'Атака длинным мечом',
    formula: '1d20+7',
    breakdown: '18+7',
    total: 25,
    is_master_roll: false,
    payload: {},
    created_at: new Date(Date.now() - 15000).toISOString(),
  },
]

export function SessionLiveTablePreviewPage() {
  const [liveTab, setLiveTab] = useState<SessionLiveTabId>('table')
  const [rollsOnly, setRollsOnly] = useState(false)
  const [events, setEvents] = useState<SessionEvent[]>(SEED_EVENTS)
  const [toast, setToast] = useState<string | null>(null)
  const [closed, setClosed] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [closeTitle, setCloseTitle] = useState('Итог: Глава 3 — Мост')
  const [closeSummary, setCloseSummary] = useState('')
  const [writeJournal, setWriteJournal] = useState(true)
  const [seats, setSeats] = useState(DEMO_SEATS)
  const [combatants, setCombatants] = useState(DEMO_COMBATANTS)
  const [conditionOpen, setConditionOpen] = useState(false)
  const [effectOpen, setEffectOpen] = useState(false)
  const [combatantOpen, setCombatantOpen] = useState(false)
  const [combatStartOpen, setCombatStartOpen] = useState(false)
  const [xpOpen, setXpOpen] = useState(false)
  const [lootOpen, setLootOpen] = useState(false)
  const [encounterOpen, setEncounterOpen] = useState(false)
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [generatorResult, setGeneratorResult] = useState<EncounterGenerateResult | null>(
    null,
  )
  const [templates, setTemplates] = useState<EncounterTemplate[]>(SEED_TEMPLATES)
  const [combat, setCombat] = useState<SessionCombat>({
    active: false,
    round: 1,
    active_index: 0,
    entries: [],
  })
  const [handoffOpen, setHandoffOpen] = useState(false)
  const [handoffDraft, setHandoffDraft] = useState<SettingHandoffDraft | null>(null)
  const [wikiPages, setWikiPages] = useState<SettingPage[]>(DEMO_SETTING_PAGES)
  const [revealOpen, setRevealOpen] = useState(false)
  const [loreBindOpen, setLoreBindOpen] = useState(false)
  const [locationPageId, setLocationPageId] = useState<string | null>('p-swamp')
  const [involvedPageIds, setInvolvedPageIds] = useState<string[]>(['p-cult', 'p-quest'])
  const [previewPageId, setPreviewPageId] = useState<string | null>(null)
  const [questDialogOpen, setQuestDialogOpen] = useState(false)
  const [questTarget, setQuestTarget] = useState<SessionLorePage | null>(null)

  const locationPage: SessionLorePage | null = useMemo(() => {
    const p = wikiPages.find((x) => x.id === locationPageId)
    if (!p) return null
    return {
      id: p.id,
      title: p.title,
      page_kind: p.page_kind,
      revealed: p.revealed,
    }
  }, [wikiPages, locationPageId])

  const involvedPages: SessionLorePage[] = useMemo(
    () =>
      involvedPageIds
        .map((id) => wikiPages.find((p) => p.id === id))
        .filter(Boolean)
        .map((p) => ({
          id: p!.id,
          title: p!.title,
          page_kind: p!.page_kind,
          revealed: p!.revealed,
          quest_status: p!.quest_status,
        })),
    [wikiPages, involvedPageIds],
  )

  const previewPage = useMemo(
    () => wikiPages.find((p) => p.id === previewPageId) ?? null,
    [wikiPages, previewPageId],
  )

  // Как в продукте: профиль из настроек лобби; здесь — дефолт (всё видно игрокам).
  // Мастер на реальном экране = is_owner лобби, не отдельный переключатель.
  const visibility = useMemo(() => defaultVisibilityProfile(), [])
  const activeEnemyId =
    combat.active && combat.entries[combat.active_index]?.kind === 'enemy'
      ? combat.entries[combat.active_index]?.ref_id
      : null

  const visibleEvents = useMemo(() => {
    let list = events
    if (rollsOnly) list = list.filter((e) => e.event_type === 'roll')
    return [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
  }, [events, rollsOnly])

  return (
    <main className="page page--app page--lobby-hub">
      <Stack gap={16}>
        <header className="app-header">
          <div>
            <Text as="h1">Эхо Рассвета</Text>
            <Text tone="muted">
              Превью A3+T1–T4 · квест на столе · за столом {DEMO_SEATS.length}
            </Text>
          </div>
        </header>

        <Text tone="muted">/dev/session-live-table-preview · только для скринов</Text>

        <div className="lobby-hub-top">
          <Text>
            <span className="back-link">← В лобби «Эхо Рассвета»</span>
          </Text>
          {!closed ? (
            <div className="session-top-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setToast('Состав — через «Кто пришёл» (A2)')}
              >
                Кто пришёл
              </Button>
              <Button type="button" variant="secondary" onClick={() => setCloseOpen(true)}>
                Закрыть сессию
              </Button>
            </div>
          ) : null}
        </div>

        {closed ? (
          <Text tone="muted">Сессия закрыта. Итог — во вкладке «Дневник» лобби.</Text>
        ) : null}

        <Panel title="Сессия">
          <Stack gap={8}>
            <Text as="h2">Глава 3 — Мост</Text>
            <Text tone="muted">
              Мир: Эхо Рассвета · за столом: {DEMO_SEATS.length}
              {closed ? ' · закрыта' : ''}
            </Text>
          </Stack>
        </Panel>

        <Panel title="Живой стол">
          <Stack gap={14}>
            <SessionLiveTabs active={liveTab} onChange={setLiveTab} />

            {liveTab === 'table' ? (
              <Stack gap={12}>
                <SessionLorePanel
                  hasSetting
                  locationPage={locationPage}
                  involvedPages={involvedPages}
                  isOwner={!closed}
                  onOpenPage={(id) => setPreviewPageId(id)}
                  onEdit={() => setLoreBindOpen(true)}
                  onQuestStatus={(page) => {
                    setQuestTarget(page)
                    setQuestDialogOpen(true)
                  }}
                />
                {!closed ? (
                  <div className="session-table-toolbar">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setConditionOpen(true)}
                    >
                      Состояние
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setEffectOpen(true)}
                    >
                      Эффект
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setCombatantOpen(true)}
                    >
                      + Противник
                    </Button>
                    {!combat.active ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setCombatStartOpen(true)}
                      >
                        Бой
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setXpOpen(true)}
                    >
                      XP
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setLootOpen(true)}
                    >
                      Лут
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setEncounterOpen(true)}
                    >
                      Энкаунтер
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setRevealOpen(true)}
                    >
                      Раскрыть
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setGeneratorResult(null)
                        setGeneratorOpen(true)
                      }}
                    >
                      Генератор
                    </Button>
                    <Text tone="muted" className="session-table-toolbar__hint">
                      Генератор — подобрать бой. Энкаунтер — шаблон.
                    </Text>
                  </div>
                ) : null}
                {combat.active ? (
                  <CombatTrack
                    combat={combat}
                    masterControls={!closed}
                    onNext={() => {
                      setCombat((prev) => {
                        const n = prev.entries.length
                        if (!n) return prev
                        const nextIndex = prev.active_index + 1
                        if (nextIndex >= n) {
                          return { ...prev, active_index: 0, round: prev.round + 1 }
                        }
                        return { ...prev, active_index: nextIndex }
                      })
                    }}
                    onPrev={() => {
                      setCombat((prev) => {
                        const n = prev.entries.length
                        if (!n) return prev
                        const nextIndex = prev.active_index - 1
                        if (nextIndex < 0) {
                          return {
                            ...prev,
                            active_index: n - 1,
                            round: Math.max(1, prev.round - 1),
                          }
                        }
                        return { ...prev, active_index: nextIndex }
                      })
                    }}
                    onEnd={() => {
                      setCombat({
                        active: false,
                        round: 1,
                        active_index: 0,
                        entries: [],
                      })
                      setToast('Бой окончен')
                      setXpOpen(true)
                    }}
                    onSelect={(index) => {
                      setCombat((prev) => ({ ...prev, active_index: index }))
                    }}
                  />
                ) : null}
                <div className="session-table-grid">
                  {seats.map((seat) => (
                    <SessionTableCard
                      key={seat.character_id}
                      seat={seat}
                      visibility={visibility}
                      revealAll
                      masterControls={!closed}
                      sheetLabel="Смотреть"
                      onToggleInspiration={(next) => {
                        setSeats((prev) =>
                          prev.map((s) =>
                            s.character_id === seat.character_id
                              ? { ...s, inspiration: next }
                              : s,
                          ),
                        )
                        setToast(next ? 'Вдохновение выдано' : 'Вдохновение снято')
                      }}
                      onRemoveCondition={(condition) => {
                        setSeats((prev) =>
                          prev.map((s) => {
                            if (s.character_id !== seat.character_id) return s
                            return {
                              ...s,
                              conditions: (s.conditions ?? []).filter(
                                (c) => c.slug !== condition.slug,
                              ),
                            }
                          }),
                        )
                        setToast(`Снято: ${condition.name}`)
                      }}
                      onRemoveEffect={(effect) => {
                        setSeats((prev) =>
                          prev.map((s) => {
                            if (s.character_id !== seat.character_id) return s
                            return {
                              ...s,
                              effects: (s.effects ?? []).filter((e) => e.id !== effect.id),
                            }
                          }),
                        )
                        setToast(`Снято: ${effect.name}`)
                      }}
                      onClearConcentration={() => {
                        const casterId = seat.character_id
                        setSeats((prev) =>
                          prev.map((s) => {
                            if (s.character_id === casterId) {
                              return { ...s, concentration: null }
                            }
                            return {
                              ...s,
                              effects: (s.effects ?? []).filter(
                                (e) =>
                                  !(
                                    e.linked_concentration &&
                                    e.source_character_id === casterId
                                  ),
                              ),
                            }
                          }),
                        )
                        setToast('Концентрация снята · связанные эффекты убраны')
                      }}
                      onAddCompanion={() =>
                        setToast('На живой сессии: диалог «+ Напарник»')
                      }
                      onRemoveCompanion={(id) => {
                        setSeats((prev) =>
                          prev.map((s) =>
                            s.character_id === seat.character_id
                              ? {
                                  ...s,
                                  companions: (s.companions ?? []).filter((c) => c.id !== id),
                                }
                              : s,
                          ),
                        )
                      }}
                    />
                  ))}
                </div>

                {combatants.length > 0 ? (
                  <Stack gap={14}>
                    <Stack gap={8}>
                      <Text as="h3" className="session-enemies-title">
                        Противники · мастер
                      </Text>
                      <Text tone="muted" className="session-table-toolbar__hint">
                        Чипы = действия и черты. Цифра → «Нанести урон» или
                        «Вылечить». В пачке цель из «Состава».
                      </Text>
                      <div className="session-table-grid session-enemies-grid">
                        {combatants.map((enemy) => (
                          <EnemyCard
                            key={`m-${enemy.id}`}
                            combatant={enemy}
                            revealAll
                            masterControls={!closed}
                            forceAbilitiesOpen={activeEnemyId === enemy.id}
                            canSaveToSetting={!closed}
                            onSaveToSetting={() => {
                              setHandoffDraft(
                                draftFromCombatant(enemy, {
                                  sessionName: 'Глава 3 — Мост',
                                }),
                              )
                              setHandoffOpen(true)
                            }}
                            onDamage={(amount, memberId) => {
                              setCombatants((prev) =>
                                prev.map((c) => {
                                  if (c.id !== enemy.id) return c
                                  const members = [...(c.members ?? [])]
                                  if (members.length === 0) {
                                    const next = Math.max(
                                      0,
                                      Math.min(c.hp_max, c.hp_current - amount),
                                    )
                                    return { ...c, hp_current: next }
                                  }
                                  let target = memberId
                                    ? members.find((m) => m.id === memberId)
                                    : members.find((m) => m.hp_current > 0)
                                  if (!target && !memberId) target = members[0]
                                  if (!target) return c
                                  const nextMembers = members.map((m) => {
                                    if (m.id !== target!.id) return m
                                    const hp = Math.max(
                                      0,
                                      Math.min(m.hp_max, m.hp_current - amount),
                                    )
                                    return { ...m, hp_current: hp }
                                  })
                                  const alive = nextMembers.filter((m) => m.hp_current > 0)
                                  const focus = alive[0] ?? nextMembers[0]
                                  return {
                                    ...c,
                                    members: nextMembers,
                                    alive_count: alive.length,
                                    member_count: nextMembers.length,
                                    hp_current: focus?.hp_current ?? 0,
                                    hp_max: focus?.hp_max ?? c.hp_max,
                                  }
                                }),
                              )
                            }}
                            onRemove={() => {
                              setCombatants((prev) => prev.filter((c) => c.id !== enemy.id))
                              setToast(`Убран: ${enemy.name}`)
                            }}
                          />
                        ))}
                      </div>
                    </Stack>

                    <Stack gap={8}>
                      <Text as="h3" className="session-enemies-title">
                        Противники · игрок
                      </Text>
                      <Text tone="muted" className="session-table-toolbar__hint">
                        Игрок видит имя · тип · цвет HP. Без КД, цифр и статблока.
                      </Text>
                      <div className="session-table-grid session-enemies-grid">
                        {combatants.map((enemy) => (
                          <EnemyCard
                            key={`p-${enemy.id}`}
                            combatant={enemy}
                            visibility={applyVisibilityPreset('complex_combat')}
                            masterControls={false}
                            revealAll={false}
                          />
                        ))}
                      </div>
                    </Stack>
                  </Stack>
                ) : null}
              </Stack>
            ) : null}

            {liveTab === 'feed' ? (
              <Stack gap={14}>
                <label className="session-feed-filter">
                  <input
                    type="checkbox"
                    checked={rollsOnly}
                    onChange={(e) => setRollsOnly(e.target.checked)}
                  />
                  Только броски
                </label>
                <SessionEventFeed events={visibleEvents} />
                <ManualRollForm
                  seats={seats}
                  ownCharacterIds={new Set(['c1'])}
                  isOwner
                  onSubmit={(payload) => {
                    const next: SessionEvent = {
                      id: `local-${Date.now()}`,
                      session_id: 's1',
                      event_type: 'roll',
                      character_id: payload.character_id ?? null,
                      actor_user_id: 'u-demo',
                      character_name: payload.character_id
                        ? seats.find((s) => s.character_id === payload.character_id)
                            ?.character_name ?? 'Персонаж'
                        : 'Мастер',
                      title: payload.title,
                      formula: payload.formula ?? null,
                      breakdown: payload.breakdown ?? null,
                      total: payload.total,
                      is_master_roll: Boolean(payload.is_master_roll),
                      payload: {},
                      created_at: new Date().toISOString(),
                    }
                    setEvents((prev) => [next, ...prev])
                    setToast('Бросок в ленте')
                    setLiveTab('feed')
                  }}
                />
              </Stack>
            ) : null}

            {liveTab === 'more' ? (
              <Stack gap={10}>
                <Text tone="muted">
                  На живой сессии здесь: быстрая заметка + чаты. Превью заметок:{' '}
                  /dev/lobby-notes-preview · чаты: /dev/lobby-chats-preview
                </Text>
              </Stack>
            ) : null}
          </Stack>
        </Panel>
      </Stack>

      <ApplyConditionDialog
        open={conditionOpen}
        seats={seats}
        onClose={() => setConditionOpen(false)}
        onApply={(condition, characterIds) => {
          setSeats((prev) =>
            prev.map((s) => {
              if (!characterIds.includes(s.character_id)) return s
              const current = s.conditions ?? []
              if (current.some((c) => c.slug === condition.slug)) return s
              return { ...s, conditions: [...current, condition] }
            }),
          )
          setConditionOpen(false)
          setToast(
            characterIds.length === 1
              ? `Состояние: ${condition.name}`
              : `Состояние: ${condition.name} · ${characterIds.length}`,
          )
        }}
      />

      <ApplyEffectDialog
        open={effectOpen}
        seats={seats}
        preferredSourceId="c2"
        onClose={() => setEffectOpen(false)}
        onApply={(effect, characterIds) => {
          setSeats((prev) =>
            prev.map((s) => {
              if (!characterIds.includes(s.character_id)) return s
              const current = s.effects ?? []
              return {
                ...s,
                effects: [...current, { ...effect, id: `${effect.id}-${s.character_id}` }],
              }
            }),
          )
          setEffectOpen(false)
          setToast(
            characterIds.length === 1
              ? `Эффект: ${effect.name}`
              : `Эффект: ${effect.name} · ${characterIds.length}`,
          )
        }}
      />

      <AddCombatantDialog
        open={combatantOpen}
        onClose={() => setCombatantOpen(false)}
        onSubmit={(payload) => {
          const baseName = payload.name?.trim() || 'Противник'
          const n = Math.max(1, Math.min(20, payload.count || 1))
          const hp = payload.hp_max ?? 10
          const members = Array.from({ length: n }, (_, i) => ({
            id: `local-${Date.now()}-${i}`,
            name: n > 1 ? `${baseName} ${i + 1}` : baseName,
            hp_current: hp,
            hp_max: hp,
          }))
          const pack: SessionCombatant = {
            id: `pack-${Date.now()}`,
            name: baseName,
            hp_current: hp,
            hp_max: hp,
            alive_count: n,
            member_count: n,
            ac: payload.ac ?? null,
            speed: payload.speed ?? null,
            slug: payload.slug ?? null,
            catalog_id: payload.catalog_id ?? null,
            custom: !payload.catalog_id,
            type_ru: payload.catalog_id ? undefined : 'НПС',
            actions: payload.actions ?? [],
            members,
          }
          setCombatants((prev) => [...prev, pack])
          setCombatantOpen(false)
          setToast(n > 1 ? `Пачка на столе: ${baseName} × ${n}` : `На столе: ${baseName}`)
        }}
      />

      <StartCombatDialog
        open={combatStartOpen}
        seats={seats}
        combatants={combatants}
        onClose={() => setCombatStartOpen(false)}
        onSubmit={(entries) => {
          const sorted = [...entries].sort((a, b) => {
            if (b.initiative !== a.initiative) return b.initiative - a.initiative
            return (b.dex_mod ?? -99) - (a.dex_mod ?? -99)
          })
          setCombat({
            active: true,
            round: 1,
            active_index: 0,
            entries: sorted.map((e, i) => ({
              id: `ce-${i}-${e.ref_id}`,
              kind: e.kind,
              ref_id: e.ref_id,
              companion_id: e.companion_id,
              name: e.name,
              initiative: e.initiative,
              dex_mod: e.dex_mod,
            })),
          })
          setCombatStartOpen(false)
          setToast('Бой начат')
        }}
      />

      <AwardXpDialog
        open={xpOpen}
        seats={seats}
        combatants={combatants}
        onClose={() => setXpOpen(false)}
        onSubmit={(payload) => {
          const n = payload.character_ids.length || 1
          const each =
            payload.per_character_xp != null
              ? payload.per_character_xp
              : Math.floor((payload.total_xp ?? 0) / n)
          if (payload.claim_combatant_ids?.length) {
            const claim = new Set(payload.claim_combatant_ids)
            setCombatants((prev) =>
              prev.map((c) => {
                if (!claim.has(c.id)) return c
                const dead = (c.members ?? []).filter((m) => m.hp_current <= 0).length
                return {
                  ...c,
                  xp_claimed_count: Math.max(c.xp_claimed_count ?? 0, dead),
                }
              }),
            )
          }
          setXpOpen(false)
          const names = seats
            .filter((s) => payload.character_ids.includes(s.character_id))
            .map((s) => s.character_name)
          setToast(`+${each} XP · ${names.join(', ')}`)
          setEvents((prev) => [
            {
              id: `xp-${Date.now()}`,
              session_id: 's1',
              event_type: 'xp',
              character_id: null,
              actor_user_id: null,
              character_name: 'Мастер',
              title: payload.source === 'combat' ? 'Опыт' : 'Опыт (вручную)',
              formula: `+${each} XP × ${n}`,
              breakdown: names.join(', '),
              total: each * n,
              is_master_roll: false,
              payload: {},
              created_at: new Date().toISOString(),
            },
            ...prev,
          ])
        }}
      />

      <AwardLootDialog
        open={lootOpen}
        seats={seats}
        onClose={() => setLootOpen(false)}
        onSubmit={(payload) => {
          const names = [
            ...new Set(
              payload.grants.map(
                (g) =>
                  seats.find((s) => s.character_id === g.character_id)?.character_name ??
                  '—',
              ),
            ),
          ]
          const bits = payload.grants.map((g) => {
            if (g.item) {
              return g.item.qty > 1 ? `${g.item.name}×${g.item.qty}` : g.item.name
            }
            const c = g.coins
            if (!c) return 'монеты'
            return (
              [
                c.gp ? `${c.gp} зм` : '',
                c.sp ? `${c.sp} см` : '',
                c.cp ? `${c.cp} мм` : '',
              ]
                .filter(Boolean)
                .join(' · ') || 'монеты'
            )
          })
          setLootOpen(false)
          setToast(`Лут: ${bits.slice(0, 4).join(', ')}`)
          setEvents((prev) => [
            {
              id: `loot-${Date.now()}`,
              session_id: 's1',
              event_type: 'loot',
              character_id: null,
              actor_user_id: null,
              character_name: 'Мастер',
              title: 'Лут',
              formula: null,
              breakdown: names.join(', '),
              total: null,
              is_master_roll: false,
              payload: { lines: bits },
              created_at: new Date().toISOString(),
            },
            ...prev,
          ])
        }}
      />

      <EncounterTemplatesDialog
        open={encounterOpen}
        templates={templates}
        canSaveFromTable={combatants.length > 0}
        onClose={() => setEncounterOpen(false)}
        onSaveFromTable={(name) => {
          const entries = combatants.map((c) => ({
            name: c.name,
            count: Math.max(1, c.member_count ?? c.members?.length ?? 1),
            slug: c.slug ?? null,
            hp_max: c.hp_max,
            ac: c.ac,
            xp: c.xp ?? null,
          }))
          setTemplates((prev) => [
            ...prev,
            {
              id: `tpl-${Date.now()}`,
              name,
              entries,
              updated_at: new Date().toISOString(),
            },
          ])
          setToast(`Шаблон «${name}» сохранён`)
        }}
        onDeploy={(templateId) => {
          const tpl = templates.find((t) => t.id === templateId)
          if (!tpl) return
          const stamped = Date.now()
          const next: SessionCombatant[] = tpl.entries.map((entry, i) => {
            const count = Math.max(1, Math.min(20, entry.count))
            const hp = entry.hp_max ?? 10
            const id = `deploy-${stamped}-${i}`
            return {
              id,
              name: entry.name,
              hp_current: hp,
              hp_max: hp,
              alive_count: count,
              member_count: count,
              ac: entry.ac ?? 10,
              speed: entry.speed ?? 30,
              slug: entry.slug ?? undefined,
              xp: entry.xp ?? 0,
              xp_claimed_count: 0,
              actions: [],
              members: Array.from({ length: count }, (_, m) => ({
                id: `${id}-m${m + 1}`,
                name: count > 1 ? `${entry.name} ${m + 1}` : entry.name,
                hp_current: hp,
                hp_max: hp,
              })),
            }
          })
          setCombatants((prev) => [...prev, ...next])
          setEncounterOpen(false)
          setToast('Энкаунтер на столе')
        }}
        onDelete={(templateId) => {
          setTemplates((prev) => prev.filter((t) => t.id !== templateId))
          setToast('Шаблон удалён')
        }}
      />

      <EncounterGenerateDialog
        open={generatorOpen}
        result={generatorResult}
        onClose={() => {
          setGeneratorOpen(false)
          setGeneratorResult(null)
        }}
        onInvalidate={() => setGeneratorResult(null)}
        onGenerate={(payload) => {
          const theme = payload.theme_ids[0] ?? 'orc'
          const bossName =
            theme === 'undead'
              ? 'Вампир'
              : theme === 'demon'
                ? 'Балор'
                : 'Боевой вождь орков'
          const packName =
            theme === 'undead' ? 'Зомби' : theme === 'demon' ? 'Дретч' : 'Орк'
          const budget =
            payload.difficulty === 'deadly'
              ? 4400
              : payload.difficulty === 'hard'
                ? 3000
                : payload.difficulty === 'easy'
                  ? 1000
                  : 2000
          const waveN = Math.max(1, payload.waves)
          const per = Math.floor(budget / waveN)
          setGeneratorResult({
            difficulty: payload.difficulty,
            party_power: 1.35,
            budget_total: budget,
            anti_air_ok: true,
            notes: payload.similar ? ['preview', 'similar'] : ['preview'],
            theme_ids: payload.theme_ids,
            similar: payload.similar,
            environments: payload.environments ?? [],
            waves: Array.from({ length: waveN }, (_, i) => ({
              wave_index: i + 1,
              budget_xp: per,
              boss: {
                role: 'boss',
                suggested_count: 1,
                options: [
                  {
                    slug: `preview-boss-${theme}`,
                    name_ru: bossName,
                    cr: '4',
                    xp: 1100,
                    subtype: theme === 'orc' ? 'орк' : null,
                  },
                  {
                    slug: `preview-boss-alt-${theme}`,
                    name_ru: `${bossName} (альт)`,
                    cr: '3',
                    xp: 700,
                  },
                ],
              },
              pack: {
                role: 'pack',
                suggested_count: theme === 'undead' ? 6 : 4,
                options: [
                  {
                    slug: `preview-pack-${theme}`,
                    name_ru: packName,
                    cr: '1/2',
                    xp: 100,
                    subtype: theme === 'orc' ? 'орк' : null,
                  },
                  {
                    slug: `preview-pack-alt-${theme}`,
                    name_ru: `${packName} разведчик`,
                    cr: '1/4',
                    xp: 50,
                  },
                ],
              },
            })),
          })
        }}
        onSaveAsTemplate={({ name, boss, pack, packCount }) => {
          setTemplates((prev) => [
            ...prev,
            {
              id: `tpl-gen-${Date.now()}`,
              name,
              entries: [
                { name: boss.name_ru, slug: boss.slug, count: 1, xp: boss.xp },
                {
                  name: pack.name_ru,
                  slug: pack.slug,
                  count: Math.max(1, packCount),
                  xp: pack.xp,
                },
              ],
              updated_at: new Date().toISOString(),
            },
          ])
          setToast(`Шаблон «${name}» сохранён`)
        }}
        onDeploy={({ boss, pack, packCount }) => {
          const stamped = Date.now()
          const mk = (
            opt: { slug: string; name_ru: string; xp?: number },
            count: number,
            i: number,
          ): SessionCombatant => {
            const id = `gen-${stamped}-${i}`
            const hp = 15
            return {
              id,
              name: opt.name_ru,
              hp_current: hp,
              hp_max: hp,
              alive_count: count,
              member_count: count,
              ac: 13,
              speed: 30,
              slug: opt.slug,
              xp: opt.xp ?? 100,
              xp_claimed_count: 0,
              actions: [],
              members: Array.from({ length: count }, (_, m) => ({
                id: `${id}-m${m + 1}`,
                name: count > 1 ? `${opt.name_ru} ${m + 1}` : opt.name_ru,
                hp_current: hp,
                hp_max: hp,
              })),
            }
          }
          setCombatants((prev) => [
            ...prev,
            mk(boss, 1, 0),
            mk(pack, Math.max(1, packCount), 1),
          ])
          setGeneratorOpen(false)
          setGeneratorResult(null)
          setToast(
            `На столе: ${boss.name_ru} + ${pack.name_ru}${
              packCount > 1 ? `×${packCount}` : ''
            }`,
          )
        }}
      />

      <Dialog
        open={closeOpen}
        title="Закрыть сессию"
        primaryLabel={writeJournal ? 'Закрыть и в дневник' : 'Закрыть'}
        secondaryLabel="Отмена"
        onPrimary={() => {
          setClosed(true)
          setCloseOpen(false)
          setToast(writeJournal ? 'Сессия закрыта · итог в дневнике' : 'Сессия закрыта')
        }}
        onSecondary={() => setCloseOpen(false)}
      >
        <Stack gap={12}>
          <Text tone="muted">
            Закрытая сессия остаётся в истории. Итог можно сразу записать в дневник лобби.
          </Text>
          <label className="session-feed-filter">
            <input
              type="checkbox"
              checked={writeJournal}
              onChange={(e) => setWriteJournal(e.target.checked)}
            />
            Записать итог в дневник
          </label>
          {writeJournal ? (
            <>
              <Field label="Заголовок">
                <Input value={closeTitle} onChange={(e) => setCloseTitle(e.target.value)} />
              </Field>
              <Field label="Что произошло">
                <textarea
                  className="ui-input ui-textarea"
                  rows={5}
                  value={closeSummary}
                  onChange={(e) => setCloseSummary(e.target.value)}
                  placeholder="Краткий итог сессии для дневника…"
                />
              </Field>
            </>
          ) : null}
        </Stack>
      </Dialog>

      <SessionQuestStatusDialog
        open={questDialogOpen}
        quest={questTarget}
        onClose={() => {
          setQuestDialogOpen(false)
          setQuestTarget(null)
        }}
        onSave={(payload) => {
          setWikiPages((prev) =>
            prev.map((p) =>
              p.id === payload.page_id
                ? { ...p, quest_status: payload.quest_status }
                : p,
            ),
          )
          const page = wikiPages.find((p) => p.id === payload.page_id)
          const labels: Record<string, string> = {
            planned: 'План',
            active: 'Активен',
            done: 'Готово',
            failed: 'Провал',
          }
          const label = labels[payload.quest_status] ?? payload.quest_status
          const title = `Квест: ${label} · ${page?.title ?? ''}`
          setEvents((prev) => [
            {
              id: `ev-quest-${Date.now()}`,
              session_id: 's1',
              event_type: 'quest_status',
              character_id: null,
              actor_user_id: 'u0',
              character_name: 'Мастер',
              title,
              formula: null,
              breakdown: null,
              total: null,
              is_master_roll: false,
              payload: {
                page_id: payload.page_id,
                quest_status: payload.quest_status,
              },
              created_at: new Date().toISOString(),
            },
            ...prev,
          ])
          setQuestDialogOpen(false)
          setQuestTarget(null)
          setToast(
            payload.write_journal ? `${title} · в дневнике` : title,
          )
        }}
      />

      <SessionLoreBindDialog
        open={loreBindOpen}
        pages={wikiPages}
        locationPageId={locationPageId}
        involvedPageIds={involvedPageIds}
        onClose={() => setLoreBindOpen(false)}
        onSave={(payload) => {
          setLocationPageId(payload.location_page_id)
          setInvolvedPageIds(payload.involved_page_ids)
          setLoreBindOpen(false)
          setToast('Лор сессии обновлён')
        }}
      />

      <SettingPagePreviewDialog
        open={Boolean(previewPageId)}
        page={previewPage}
        pages={wikiPages}
        templates={DEMO_SETTING_TEMPLATES}
        isOwner
        settingId="set1"
        onClose={() => setPreviewPageId(null)}
        onOpenPage={(id) => setPreviewPageId(id)}
      />

      <SettingTableRevealDialog
        open={revealOpen}
        settingId="set1"
        settingName="Эхо Рассвета"
        pages={wikiPages}
        onClose={() => setRevealOpen(false)}
        onReveal={(payload) => {
          const root = wikiPages.find((p) => p.id === payload.page_id)
          if (!root) return
          const byParent = new Map<string | null, string[]>()
          for (const p of wikiPages) {
            const list = byParent.get(p.parent_id) ?? []
            list.push(p.id)
            byParent.set(p.parent_id, list)
          }
          const ids = new Set<string>([root.id])
          if (payload.reveal_subtree) {
            const walk = (id: string) => {
              for (const child of byParent.get(id) ?? []) {
                ids.add(child)
                walk(child)
              }
            }
            walk(root.id)
          }
          setWikiPages((prev) =>
            prev.map((p) => (ids.has(p.id) ? { ...p, revealed: true } : p)),
          )
          const title =
            payload.reveal_subtree && ids.size > 1
              ? `Открыто: ${root.title} · ветка`
              : `Открыто: ${root.title}`
          setEvents((prev) => [
            {
              id: `ev-reveal-${Date.now()}`,
              session_id: 's1',
              event_type: 'reveal',
              character_id: null,
              actor_user_id: 'u0',
              character_name: 'Мастер',
              title,
              formula: null,
              breakdown: null,
              total: null,
              is_master_roll: false,
              payload: {
                page_id: root.id,
                reveal_subtree: payload.reveal_subtree,
                affected_count: ids.size,
              },
              created_at: new Date().toISOString(),
            },
            ...prev,
          ])
          setRevealOpen(false)
          setToast(title)
        }}
      />

      <SettingTableHandoffDialog
        open={handoffOpen}
        settingName="Эхо Рассвета"
        draft={handoffDraft}
        templates={DEMO_SETTING_TEMPLATES}
        pages={wikiPages}
        onClose={() => {
          setHandoffOpen(false)
          setHandoffDraft(null)
        }}
        onCreate={(payload) => {
          const id = `p-${Date.now()}`
          setWikiPages((prev) => [
            ...prev,
            {
              id,
              setting_id: 'set1',
              parent_id: payload.parent_id,
              title: payload.title,
              body: payload.body,
              gm_body: payload.gm_body,
              sort_order: prev.length,
              revealed: false,
              page_kind: payload.page_kind,
              template_id: payload.template_id,
              fields: payload.fields,
              quest_status: null,
              tags: payload.tags,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ])
          setHandoffOpen(false)
          setHandoffDraft(null)
          setToast(`В сеттинг: ${payload.title}`)
        }}
      />

      <Toast message={toast} onClose={() => setToast(null)} />
    </main>
  )
}
