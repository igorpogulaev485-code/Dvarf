/** L-08: раздел «Правила кампании» в настройках лобби. */
import { useState } from 'react'
import { Button, Field, NumberInput, Panel, Stack, Text } from '../../ui'
import {
  HOMEBREW_CATALOG,
  type CampaignRules,
  type HomebrewKey,
  type HpOnLevelUp,
  type ProgressionMode,
  summarizeEnabledRules,
} from './campaignRules'
import type { EventHistoryMode } from './visibilityProfile'

type Props = {
  rules: CampaignRules
  /** Режим ленты лобби — броски мастера без второго флага. */
  eventHistory: EventHistoryMode
  readOnly?: boolean
  onChange: (next: CampaignRules) => void
  onEventHistoryChange: (mode: EventHistoryMode) => void
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

export function CampaignRulesPanel({
  rules,
  eventHistory,
  readOnly,
  onChange,
  onEventHistoryChange,
}: Props) {
  const [customDraft, setCustomDraft] = useState('')
  const summary = summarizeEnabledRules(rules)

  function patchHomebrew(key: HomebrewKey, value: boolean) {
    if (readOnly) return
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
          <Text tone="muted" className="campaign-rules-later">
            Правила старта (уровень, характеристики, книги) появятся позже
          </Text>
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
            {HOMEBREW_CATALOG.map((entry) => (
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

        <Text tone="muted" className="campaign-rules-later">
          Правила старта (уровень, характеристики, книги) появятся позже
        </Text>
      </Stack>
    </Panel>
  )
}
