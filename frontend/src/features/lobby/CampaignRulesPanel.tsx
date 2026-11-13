/** L-08/L-16: раздел «Правила кампании» в настройках лобби. */
import { useEffect, useState } from 'react'
import { listCatalogEntries, type CatalogEntry } from '../../shared/api/catalog'
import { Button, Field, NumberInput, Panel, Stack, Text } from '../../ui'
import { mutuallyExclusiveRestFlags } from '../../shared/dnd/o04DmgAdvanced'
import {
  BOOK_SOURCE_CATALOG,
  HOMEBREW_CATALOG,
  MASTER_HOMEBREW_KEYS,
  summarizeStartRules,
  type CampaignRules,
  type HomebrewKey,
  type HpOnLevelUp,
  type ProgressionMode,
  type StartAbilityMethod,
  type StartingKitMode,
  summarizeEnabledRules,
} from './campaignRules'

const MASTER_KEY_SET = new Set<HomebrewKey>(MASTER_HOMEBREW_KEYS)
const LEGACY_HOMEBREW_CATALOG = HOMEBREW_CATALOG.filter((e) => !MASTER_KEY_SET.has(e.key))
const MASTER_HOMEBREW_CATALOG = HOMEBREW_CATALOG.filter((e) => MASTER_KEY_SET.has(e.key))
import type { EventHistoryMode } from './visibilityProfile'

type Props = {
  rules: CampaignRules
  /** Режим ленты лобби — броски мастера без второго флага. */
  eventHistory: EventHistoryMode
  readOnly?: boolean
  onChange: (next: CampaignRules) => void
  onEventHistoryChange: (mode: EventHistoryMode) => void
  /** Кнопка «Создать героя для этого лобби» (один пайплайн). */
  createHeroHref?: string | null
}

function RuleTip({ tip, source }: { tip: string; source: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="campaign-rule-tip">
      <button
        type="button"
        className="campaign-rule-tip__btn"
        aria-label="Подсказка"
        title={`${tip} · ${source}`}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
      >
        ?
      </button>
      {open ? (
        <span className="campaign-rule-tip__bubble" role="tooltip">
          {tip}
          <span className="campaign-rule-tip__source">{source}</span>
        </span>
      ) : null}
    </span>
  )
}

function ToggleRow({
  label,
  tip,
  source,
  checked,
  disabled,
  onChange,
}: {
  label: string
  tip: string
  source: string
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label className="campaign-rule-row">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="campaign-rule-row__label">
        {label}
        <RuleTip tip={tip} source={source} />
      </span>
    </label>
  )
}

function StartRulesEditor({
  rules,
  readOnly,
  onChange,
  races,
  classes,
}: {
  rules: CampaignRules
  readOnly?: boolean
  onChange: (next: CampaignRules) => void
  races: CatalogEntry[]
  classes: CatalogEntry[]
}) {
  const start = rules.start

  function patchStart(partial: Partial<CampaignRules['start']>) {
    if (readOnly) return
    onChange({ ...rules, start: { ...rules.start, ...partial } })
  }

  function toggleSource(id: string) {
    if (readOnly) return
    const has = start.allowed_sources.includes(id)
    const next = has
      ? start.allowed_sources.filter((s) => s !== id)
      : [...start.allowed_sources, id]
    patchStart({ allowed_sources: next.length ? next : ['phb'] })
  }

  function toggleSlug(
    key: 'banned_races' | 'banned_classes',
    slug: string,
  ) {
    if (readOnly) return
    const list = start[key]
    const has = list.includes(slug)
    patchStart({
      [key]: has ? list.filter((s) => s !== slug) : [...list, slug],
    })
  }

  const methodOpts: { id: StartAbilityMethod; label: string }[] = [
    { id: 'any', label: 'Любой' },
    { id: 'standard_array', label: 'Стандартный набор' },
    { id: 'point_buy', label: 'Покупка очков' },
    { id: 'roll', label: 'Броски' },
  ]
  const kitOpts: { id: StartingKitMode; label: string }[] = [
    { id: 'class_equipment', label: 'Снаряжение класса' },
    { id: 'class_gold', label: 'Золото класса' },
    { id: 'fixed_gold', label: 'Фикс. золото' },
  ]

  return (
    <div className="campaign-start-rules">
      <Text as="h3">Правила старта</Text>
      <Text tone="muted">
        Уровень, метод характеристик, книги, стартовый набор, запреты рас и классов.
      </Text>
      <Stack gap={12}>
        <Field label="Стартовый уровень" hint="Создание «для этого лобби» — ровно этот уровень">
          <NumberInput
            min={1}
            max={20}
            emptyValue={1}
            value={start.level}
            disabled={readOnly}
            onValueChange={(v) =>
              patchStart({ level: Math.max(1, Math.min(20, v ?? 1)) })
            }
          />
        </Field>

        <div>
          <Text tone="muted">Метод характеристик</Text>
          <div className="chip-row">
            {methodOpts.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={readOnly}
                className={`sheet-chip${start.ability_method === opt.id ? ' is-on' : ''}`}
                onClick={() => patchStart({ ability_method: opt.id })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Text tone="muted">Разрешённые книги</Text>
          <Text tone="muted">По умолчанию только PHB (+ SRD). Остальное — явно.</Text>
          <div className="chip-row campaign-start-rules__books">
            {BOOK_SOURCE_CATALOG.map((book) => (
              <button
                key={book.id}
                type="button"
                disabled={readOnly}
                className={`sheet-chip${start.allowed_sources.includes(book.id) ? ' is-on' : ''}`}
                onClick={() => toggleSource(book.id)}
                title={book.aliases.join(', ')}
              >
                {book.id.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Text tone="muted">Стартовый набор</Text>
          <div className="chip-row">
            {kitOpts.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={readOnly}
                className={`sheet-chip${start.starting_kit.mode === opt.id ? ' is-on' : ''}`}
                onClick={() => {
                  if (opt.id === 'fixed_gold') {
                    const gp =
                      start.starting_kit.mode === 'fixed_gold' ? start.starting_kit.gp : 0
                    patchStart({ starting_kit: { mode: 'fixed_gold', gp } })
                  } else {
                    patchStart({ starting_kit: { mode: opt.id } })
                  }
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {start.starting_kit.mode === 'fixed_gold' ? (
            <Field label="Золото (зм)" hint="Целое ≥ 0">
              <NumberInput
                min={0}
                max={1_000_000}
                emptyValue={0}
                value={start.starting_kit.gp}
                disabled={readOnly}
                onValueChange={(v) =>
                  patchStart({
                    starting_kit: { mode: 'fixed_gold', gp: Math.max(0, v ?? 0) },
                  })
                }
              />
            </Field>
          ) : null}
        </div>

        <div>
          <Text tone="muted">Запрещённые расы</Text>
          <div className="chip-row">
            {races.map((row) => (
              <button
                key={row.id}
                type="button"
                disabled={readOnly}
                className={`sheet-chip${start.banned_races.includes(row.slug) ? ' is-on' : ''}`}
                onClick={() => toggleSlug('banned_races', row.slug)}
              >
                {row.name_ru || row.slug}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Text tone="muted">Запрещённые классы</Text>
          <div className="chip-row">
            {classes.map((row) => (
              <button
                key={row.id}
                type="button"
                disabled={readOnly}
                className={`sheet-chip${start.banned_classes.includes(row.slug) ? ' is-on' : ''}`}
                onClick={() => toggleSlug('banned_classes', row.slug)}
              >
                {row.name_ru || row.slug}
              </button>
            ))}
          </div>
        </div>
      </Stack>
    </div>
  )
}

export function CampaignRulesPanel({
  rules,
  eventHistory,
  readOnly,
  onChange,
  onEventHistoryChange,
  createHeroHref,
}: Props) {
  const [customDraft, setCustomDraft] = useState('')
  const [races, setRaces] = useState<CatalogEntry[]>([])
  const [classes, setClasses] = useState<CatalogEntry[]>([])
  const summary = summarizeEnabledRules(rules)
  const startSummary = summarizeStartRules(rules.start)

  useEffect(() => {
    let active = true
    Promise.all([
      listCatalogEntries({ kind: 'race', edition: '2014' }),
      listCatalogEntries({ kind: 'class', edition: '2014' }),
    ])
      .then(([raceRows, classRows]) => {
        if (!active) return
        setRaces(raceRows.filter((r) => !r.parent_id))
        setClasses(classRows.filter((r) => !r.parent_id))
      })
      .catch(() => {
        /* каталог опционален для формы */
      })
    return () => {
      active = false
    }
  }, [])

  function patchHomebrew(key: HomebrewKey, value: boolean) {
    if (readOnly) return
    if (key === 'gritty_rest' || key === 'dmg_epic_heroism') {
      const rest = mutuallyExclusiveRestFlags({
        key,
        value,
        current: {
          gritty_rest: Boolean(rules.homebrew.gritty_rest),
          dmg_epic_heroism: Boolean(rules.homebrew.dmg_epic_heroism),
        },
      })
      onChange({
        ...rules,
        homebrew: { ...rules.homebrew, ...rest },
      })
      return
    }
    onChange({
      ...rules,
      homebrew: { ...rules.homebrew, [key]: value },
    })
  }

  function patchEdition(partial: Partial<CampaignRules['edition_2014']>) {
    if (readOnly) return
    onChange({
      ...rules,
      edition_2014: { ...rules.edition_2014, ...partial },
    })
  }

  function addCustom() {
    if (readOnly) return
    const text = customDraft.trim()
    if (!text) return
    onChange({
      ...rules,
      custom_rules: [...rules.custom_rules, text].slice(0, 50),
    })
    setCustomDraft('')
  }

  function removeCustom(index: number) {
    if (readOnly) return
    onChange({
      ...rules,
      custom_rules: rules.custom_rules.filter((_, i) => i !== index),
    })
  }

  if (readOnly) {
    return (
      <Panel title="Правила кампании">
        <Stack gap={12}>
          <Text tone="muted">Сводка включённых правил. Править может мастер или сомастер.</Text>
          {summary.length ? (
            <ul className="campaign-rules-summary">
              {summary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <Text tone="muted">Нет включённых особых правил.</Text>
          )}
          <div>
            <Text as="h3">Правила старта</Text>
            <ul className="campaign-rules-summary">
              {startSummary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          {createHeroHref ? (
            <a className="ui-button ui-button--secondary" href={createHeroHref}>
              Создать героя для этого лобби
            </a>
          ) : null}
        </Stack>
      </Panel>
    )
  }

  return (
    <Panel title="Правила кампании">
      <Stack gap={16}>
        <div>
          <Text as="h3">Варианты 2014</Text>
          <Stack gap={8}>
            <ToggleRow
              label="Черты вместо ASI"
              tip="При повышении уровня можно выбрать черту вместо увеличения характеристик. Выкл — только ASI."
              source="PHB 2014"
              checked={rules.edition_2014.feats_instead_of_asi}
              onChange={(v) => patchEdition({ feats_instead_of_asi: v })}
            />
            <ToggleRow
              label="Мультикласс"
              tip="Разрешить брать уровни других классов при повышении."
              source="PHB 2014"
              checked={rules.edition_2014.multiclass}
              onChange={(v) => patchEdition({ multiclass: v })}
            />
            <div>
              <Text tone="muted">Хиты при повышении</Text>
              <div className="chip-row">
                {(
                  [
                    { id: 'average' as HpOnLevelUp, label: 'Среднее' },
                    { id: 'roll' as HpOnLevelUp, label: 'Бросок' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`sheet-chip${rules.edition_2014.hp_on_level_up === opt.id ? ' is-on' : ''}`}
                    onClick={() => patchEdition({ hp_on_level_up: opt.id })}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {/* flanking / encumbrance — те же ключи в блоке домашних, без дубля */}
          </Stack>
        </div>

        <div>
          <Text as="h3">Прогрессия</Text>
          <div className="chip-row">
            {(
              [
                { id: 'xp' as ProgressionMode, label: 'Опыт' },
                { id: 'milestones' as ProgressionMode, label: 'Вехи' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`sheet-chip${rules.progression.mode === opt.id ? ' is-on' : ''}`}
                onClick={() =>
                  onChange({
                    ...rules,
                    progression: {
                      ...rules.progression,
                      mode: opt.id,
                    },
                  })
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Text tone="muted">
            Окно «Награды» на сессии читает этот режим: опыт или повышение по вехам.
          </Text>
        </div>

        <div>
          <Text as="h3">Вдохновение после броска</Text>
          <ToggleRow
            label="Вдохновение после броска (переброс)"
            tip="Потратить вдохновение можно после броска как переброс. По умолчанию выкл: преимущество до броска (RAW 2014)."
            source="S-03"
            checked={rules.inspiration_after_roll}
            onChange={(v) => onChange({ ...rules, inspiration_after_roll: v })}
          />
        </div>

        <div>
          <Text as="h3">Домашние правила</Text>
          <Stack gap={8}>
            {LEGACY_HOMEBREW_CATALOG.map((entry) => (
              <div key={entry.key}>
                <ToggleRow
                  label={entry.label}
                  tip={entry.tip}
                  source={entry.source}
                  checked={rules.homebrew[entry.key]}
                  onChange={(v) => patchHomebrew(entry.key, v)}
                />
                {entry.key === 'inspiration_stack' && rules.homebrew.inspiration_stack ? (
                  <Field label="Максимум вдохновения" hint="По умолчанию 3">
                    <NumberInput
                      min={1}
                      max={20}
                      emptyValue={3}
                      value={rules.homebrew.inspiration_stack_max}
                      onValueChange={(v) =>
                        onChange({
                          ...rules,
                          homebrew: {
                            ...rules.homebrew,
                            inspiration_stack_max: Math.max(1, Math.min(20, v ?? 3)),
                          },
                        })
                      }
                    />
                  </Field>
                ) : null}
              </div>
            ))}
          </Stack>
        </div>

        <div>
          <Text as="h3">Правила мастера (DMG / Xanathar)</Text>
          <Text tone="muted">
            Варианты из DMG гл. 9 и XGE. Каждый переключатель по умолчанию выкл.; подсказка «?» —
            текст и источник.
          </Text>
          <Stack gap={8}>
            {MASTER_HOMEBREW_CATALOG.map((entry) => (
              <div key={entry.key}>
                <ToggleRow
                  label={entry.label}
                  tip={entry.tip}
                  source={entry.source}
                  checked={rules.homebrew[entry.key]}
                  onChange={(v) => patchHomebrew(entry.key, v)}
                />
              </div>
            ))}
          </Stack>
        </div>

        <div>
          <Text as="h3">Свободный список</Text>
          <Text tone="muted">Строки «как у нас принято» — без механики, видны всем в сводке.</Text>
          <ul className="campaign-rules-custom">
            {rules.custom_rules.map((line, index) => (
              <li key={`${line}-${index}`}>
                <span>{line}</span>
                <Button type="button" variant="ghost" onClick={() => removeCustom(index)}>
                  Убрать
                </Button>
              </li>
            ))}
          </ul>
          <div className="campaign-rules-custom-add">
            <input
              className="ui-input"
              value={customDraft}
              placeholder="Например: без критических провалов на навыках"
              onChange={(e) => setCustomDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustom()
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={addCustom}>
              Добавить
            </Button>
          </div>
        </div>

        <div>
          <Text as="h3">Скрытность</Text>
          <Stack gap={8}>
            <div>
              <Text tone="muted">Броски мастера</Text>
              <div className="chip-row">
                <button
                  type="button"
                  className={`sheet-chip${eventHistory === 'active' ? ' is-on' : ''}`}
                  onClick={() => onEventHistoryChange('active')}
                >
                  Видны
                </button>
                <button
                  type="button"
                  className={`sheet-chip${eventHistory === 'hide_master_rolls' || eventHistory === 'off' ? ' is-on' : ''}`}
                  onClick={() => onEventHistoryChange('hide_master_rolls')}
                >
                  Скрыты
                </button>
              </div>
            </div>
            <div>
              <Text tone="muted">КД врагов для игроков</Text>
              <div className="chip-row">
                <button
                  type="button"
                  className={`sheet-chip${!rules.enemies_ac_visible ? ' is-on' : ''}`}
                  onClick={() => onChange({ ...rules, enemies_ac_visible: false })}
                >
                  Скрыт
                </button>
                <button
                  type="button"
                  className={`sheet-chip${rules.enemies_ac_visible ? ' is-on' : ''}`}
                  onClick={() => onChange({ ...rules, enemies_ac_visible: true })}
                >
                  Виден
                </button>
              </div>
              <Text tone="muted">
                По умолчанию скрыт. «Показать / Изучить» (G12) не ломается.
              </Text>
            </div>
            <Text tone="muted">
              Спасброски от смерти — переключатель «Скрытые спасброски от смерти» выше (дефолт
              вкл.).
            </Text>
          </Stack>
        </div>

        <StartRulesEditor
          rules={rules}
          onChange={onChange}
          races={races}
          classes={classes}
        />

        {createHeroHref ? (
          <a className="ui-button ui-button--secondary" href={createHeroHref}>
            Создать героя для этого лобби
          </a>
        ) : null}
      </Stack>
    </Panel>
  )
}
