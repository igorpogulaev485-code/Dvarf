/**
 * W-03: редактор полей страницы вики «Бой» (волны, лут, уровни партии).
 */
import { useState } from 'react'
import { CatalogCombobox } from '../catalog'
import type { CatalogEntry } from '../../shared/api/catalog'
import type { CombatEstimate } from '../../shared/api/lobbies'
import { Button, Field, Input, NumberInput, Stack, Text } from '../../ui'
import {
  WAVE_CONDITION_PRESETS,
  type CombatPageFields,
  type CombatWaveCombatant,
  type CombatWaveField,
} from './combatPageFields'

export {
  WAVE_CONDITION_PRESETS,
  emptyCombatPageFields,
  normalizeCombatPageFields,
  type CombatLootPrep,
  type CombatPageFields,
  type CombatWaveCombatant,
  type CombatWaveField,
} from './combatPageFields'

type Props = {
  value: CombatPageFields
  estimate?: CombatEstimate | null
  onChange: (fields: CombatPageFields) => void
  busy?: boolean
  disabled?: boolean
}

const BAND_LABELS: Record<string, string> = {
  easy: 'лёгкий',
  medium: 'средний',
  hard: 'сложный',
  deadly: 'смертельный',
  beyond: 'сверхсмертельный',
}

export function CombatPageEditor({
  value,
  estimate,
  onChange,
  busy = false,
  disabled = false,
}: Props) {
  const locked = busy || disabled
  const [levelsDraft, setLevelsDraft] = useState(() => value.party_levels.join(', '))
  const levelsKey = value.party_levels.join(',')
  const [pinnedLevelsKey, setPinnedLevelsKey] = useState(levelsKey)
  if (levelsKey !== pinnedLevelsKey) {
    setPinnedLevelsKey(levelsKey)
    setLevelsDraft(value.party_levels.join(', '))
  }

  function patch(next: CombatPageFields) {
    onChange(next)
  }

  function updateWave(index: number, wave: CombatWaveField) {
    patch({
      ...value,
      waves: value.waves.map((w) => (w.index === index ? wave : w)),
    })
  }

  function addWave() {
    const nextIndex = value.waves.length + 1
    patch({
      ...value,
      waves: [
        ...value.waves,
        {
          index: nextIndex,
          condition_text: 'когда пала предыдущая',
          combatants: [],
        },
      ],
    })
  }

  function removeWave(index: number) {
    if (value.waves.length <= 1) return
    const waves = value.waves
      .filter((w) => w.index !== index)
      .map((w, i) => ({
        ...w,
        index: i + 1,
        condition_text:
          i === 0
            ? w.condition_text || 'сразу'
            : w.condition_text || 'когда пала предыдущая',
      }))
    patch({ ...value, waves })
  }

  function addBestiaryCombatant(waveIndex: number, entry: CatalogEntry) {
    const wave = value.waves.find((w) => w.index === waveIndex)
    if (!wave) return
    updateWave(waveIndex, {
      ...wave,
      combatants: [
        ...wave.combatants,
        {
          slug: entry.slug,
          catalog_id: entry.id,
          name: entry.name_ru || entry.slug,
          count: 1,
          custom: false,
          actions: [],
        },
      ],
    })
  }

  function addCustomCombatant(waveIndex: number) {
    const wave = value.waves.find((w) => w.index === waveIndex)
    if (!wave) return
    updateWave(waveIndex, {
      ...wave,
      combatants: [
        ...wave.combatants,
        {
          name: 'НПС',
          count: 1,
          hp_max: 30,
          ac: 15,
          custom: true,
          slug: null,
          catalog_id: null,
          actions: [],
        },
      ],
    })
  }

  function updateCombatant(
    waveIndex: number,
    combatantIdx: number,
    next: CombatWaveCombatant,
  ) {
    const wave = value.waves.find((w) => w.index === waveIndex)
    if (!wave) return
    updateWave(waveIndex, {
      ...wave,
      combatants: wave.combatants.map((c, i) => (i === combatantIdx ? next : c)),
    })
  }

  function removeCombatant(waveIndex: number, combatantIdx: number) {
    const wave = value.waves.find((w) => w.index === waveIndex)
    if (!wave) return
    updateWave(waveIndex, {
      ...wave,
      combatants: wave.combatants.filter((_, i) => i !== combatantIdx),
    })
  }

  function addLootItem() {
    patch({
      ...value,
      loot: {
        ...value.loot,
        items: [...value.loot.items, { name: '', qty: 1 }],
      },
    })
  }

  return (
    <Stack gap={12}>
      <Text as="h3">Волны боя</Text>
      {value.waves.map((wave) => (
        <div key={wave.index} className="setting-wiki-fields">
          <div className="inline-actions" style={{ alignItems: 'flex-end' }}>
            <Field label={`Волна ${wave.index} · условие`}>
              <select
                className="ui-input"
                value={wave.condition_text || 'сразу'}
                disabled={locked}
                onChange={(e) =>
                  updateWave(wave.index, {
                    ...wave,
                    condition_text: e.target.value,
                  })
                }
              >
                {WAVE_CONDITION_PRESETS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            {value.waves.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                disabled={locked}
                onClick={() => removeWave(wave.index)}
              >
                Убрать волну
              </Button>
            ) : null}
          </div>

          {wave.combatants.map((c, ci) => (
            <div key={`${wave.index}-${ci}`} className="inline-actions">
              {c.custom ? (
                <>
                  <Field label="Имя">
                    <Input
                      value={c.name}
                      disabled={locked}
                      onChange={(e) =>
                        updateCombatant(wave.index, ci, {
                          ...c,
                          name: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="HP">
                    <NumberInput
                      value={c.hp_max ?? null}
                      min={1}
                      disabled={locked}
                      onValueChange={(n) =>
                        updateCombatant(wave.index, ci, { ...c, hp_max: n })
                      }
                    />
                  </Field>
                  <Field label="КД">
                    <NumberInput
                      value={c.ac ?? null}
                      min={0}
                      disabled={locked}
                      onValueChange={(n) =>
                        updateCombatant(wave.index, ci, { ...c, ac: n })
                      }
                    />
                  </Field>
                </>
              ) : (
                <Field label="Бестиарий">
                  <Input value={c.name || c.slug || ''} disabled readOnly />
                </Field>
              )}
              <Field label="Кол-во">
                <NumberInput
                  value={c.count}
                  min={1}
                  max={20}
                  disabled={locked}
                  onValueChange={(n) =>
                    updateCombatant(wave.index, ci, {
                      ...c,
                      count: Math.max(1, Math.min(20, n ?? 1)),
                    })
                  }
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                disabled={locked}
                onClick={() => removeCombatant(wave.index, ci)}
              >
                ×
              </Button>
            </div>
          ))}

          <WaveBestiaryAdd
            disabled={locked}
            onAdd={(entry) => addBestiaryCombatant(wave.index, entry)}
          />
          <div className="inline-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={locked}
              onClick={() => addCustomCombatant(wave.index)}
            >
              + Свой НПС
            </Button>
          </div>
        </div>
      ))}
      <div className="inline-actions">
        <Button type="button" variant="secondary" disabled={locked} onClick={addWave}>
          + Волна
        </Button>
      </div>

      <Text as="h3">Лут (заготовка)</Text>
      <div className="inline-actions">
        {(['cp', 'sp', 'ep', 'gp', 'pp'] as const).map((k) => (
          <Field key={k} label={k.toUpperCase()}>
            <NumberInput
              value={value.loot.coins[k] ?? 0}
              min={0}
              disabled={locked}
              onValueChange={(n) =>
                patch({
                  ...value,
                  loot: {
                    ...value.loot,
                    coins: { ...value.loot.coins, [k]: Math.max(0, n ?? 0) },
                  },
                })
              }
            />
          </Field>
        ))}
      </div>
      {value.loot.items.map((item, i) => (
        <div key={i} className="inline-actions">
          <Field label="Предмет">
            <Input
              value={item.name}
              disabled={locked}
              placeholder="Зелье лечения"
              onChange={(e) => {
                const items = value.loot.items.map((it, idx) =>
                  idx === i ? { ...it, name: e.target.value } : it,
                )
                patch({ ...value, loot: { ...value.loot, items } })
              }}
            />
          </Field>
          <Field label="Кол-во">
            <NumberInput
              value={item.qty}
              min={1}
              disabled={locked}
              onValueChange={(n) => {
                const items = value.loot.items.map((it, idx) =>
                  idx === i ? { ...it, qty: Math.max(1, n ?? 1) } : it,
                )
                patch({ ...value, loot: { ...value.loot, items } })
              }}
            />
          </Field>
          <Button
            type="button"
            variant="ghost"
            disabled={locked}
            onClick={() => {
              const items = value.loot.items.filter((_, idx) => idx !== i)
              patch({ ...value, loot: { ...value.loot, items } })
            }}
          >
            ×
          </Button>
        </div>
      ))}
      <div className="inline-actions">
        <Button type="button" variant="secondary" disabled={locked} onClick={addLootItem}>
          + Предмет
        </Button>
      </div>

      <Field
        label="Уровни партии"
        hint="Через запятую, например 3, 3, 4, 5 — для оценки DMG"
      >
        <Input
          value={levelsDraft}
          disabled={locked}
          placeholder="3, 3, 4, 5"
          onChange={(e) => {
            const raw = e.target.value
            setLevelsDraft(raw)
            const levels = raw
              .split(/[,;\s]+/)
              .map((s) => Number(s.trim()))
              .filter((n) => Number.isFinite(n) && n >= 1)
              .map((n) => Math.max(1, Math.min(20, Math.round(n))))
              .slice(0, 12)
            const next = { ...value, party_levels: levels }
            setPinnedLevelsKey(levels.join(','))
            patch(next)
          }}
        />
      </Field>

      <Field label="Заметки мастера (в полях)">
        <textarea
          className="ui-input ui-textarea"
          rows={3}
          value={value.gm_notes ?? ''}
          disabled={locked}
          onChange={(e) => patch({ ...value, gm_notes: e.target.value })}
          placeholder="Тактика, триггеры волн…"
        />
      </Field>

      {estimate ? (
        <Stack gap={4}>
          <Text as="h3">Оценка сложности</Text>
          <Text>
            {estimate.monster_count} сущ. · XP сырой {estimate.xp_raw} · с множителем{' '}
            {estimate.xp_adjusted}
            {estimate.unknown_xp_count
              ? ` · без XP: ${estimate.unknown_xp_count}`
              : ''}
            {estimate.band
              ? ` · ${BAND_LABELS[estimate.band] ?? estimate.band}`
              : ''}
          </Text>
          {estimate.thresholds ? (
            <Text tone="muted">
              Пороги: лёг {estimate.thresholds.easy ?? '—'} / ср{' '}
              {estimate.thresholds.medium ?? '—'} / сл{' '}
              {estimate.thresholds.hard ?? '—'} / см{' '}
              {estimate.thresholds.deadly ?? '—'}
            </Text>
          ) : null}
          {estimate.note ? <Text tone="muted">{estimate.note}</Text> : null}
        </Stack>
      ) : null}
    </Stack>
  )
}

function WaveBestiaryAdd({
  disabled,
  onAdd,
}: {
  disabled?: boolean
  onAdd: (entry: CatalogEntry) => void
}) {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<CatalogEntry | null>(null)
  return (
    <div className="inline-actions" style={{ alignItems: 'flex-end' }}>
      <Field label="Добавить из бестиария">
        <CatalogCombobox
          kind="bestiary"
          edition="2014"
          value={query}
          disabled={disabled}
          placeholder="Гоблин, огр…"
          onChange={(label, entry) => {
            setQuery(label)
            setPicked(entry)
          }}
        />
      </Field>
      <Button
        type="button"
        variant="secondary"
        disabled={disabled || !picked}
        onClick={() => {
          if (!picked) return
          onAdd(picked)
          setQuery('')
          setPicked(null)
        }}
      >
        + Добавить
      </Button>
    </div>
  )
}
